package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"finone-search-system/database"
	"finone-search-system/models"
	"finone-search-system/utils"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// SearchCache represents a cached search result
type SearchCache struct {
	Results       []models.Person
	TotalCount    int
	ExecutionTime int
	Timestamp     time.Time
}

type SearchService struct {
	cache      map[string]*SearchCache
	cacheMutex sync.RWMutex
}

func NewSearchService() *SearchService {
	s := &SearchService{
		cache: make(map[string]*SearchCache),
	}

	// Start cache cleanup routine
	go s.cacheCleanupRoutine()

	return s
}

// cacheCleanupRoutine removes expired cache entries every 5 minutes
func (s *SearchService) cacheCleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.cacheMutex.Lock()
		now := time.Now()
		for key, entry := range s.cache {
			// Remove entries older than 10 minutes
			if now.Sub(entry.Timestamp) > 10*time.Minute {
				delete(s.cache, key)
			}
		}
		s.cacheMutex.Unlock()
	}
}

// getCachedResult retrieves a cached search result
func (s *SearchService) getCachedResult(fingerprint string) (*SearchCache, bool) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()

	entry, exists := s.cache[fingerprint]
	if !exists {
		return nil, false
	}

	// Check if cache entry is still valid (10 minutes)
	if time.Since(entry.Timestamp) > 10*time.Minute {
		return nil, false
	}

	return entry, true
}

// setCachedResult stores a search result in cache
func (s *SearchService) setCachedResult(fingerprint string, results []models.Person, totalCount int, executionTime int) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	// Limit cache size to prevent memory issues
	if len(s.cache) > 1000 {
		// Remove oldest entries
		oldestKey := ""
		oldestTime := time.Now()
		for key, entry := range s.cache {
			if entry.Timestamp.Before(oldestTime) {
				oldestTime = entry.Timestamp
				oldestKey = key
			}
		}
		if oldestKey != "" {
			delete(s.cache, oldestKey)
		}
	}

	s.cache[fingerprint] = &SearchCache{
		Results:       results,
		TotalCount:    totalCount,
		ExecutionTime: executionTime,
		Timestamp:     time.Now(),
	}
}

// computeSearchFingerprint generates a stable fingerprint for a search request that ignores pagination
// and focuses on the query semantics only. It sorts maps and arrays to ensure determinism.
func (s *SearchService) computeSearchFingerprint(req *models.SearchRequest) string {
	// Normalize values
	logic := strings.ToUpper(strings.TrimSpace(req.Logic))
	if logic != "AND" {
		logic = "OR"
	}
	matchType := strings.ToLower(strings.TrimSpace(req.MatchType))
	if matchType != "full" {
		matchType = "partial"
	}

	// Sort fields
	sortedFields := make([]string, 0, len(req.Fields))
	sortedFields = append(sortedFields, req.Fields...)
	sort.Strings(sortedFields)

	// Sort field queries by key and normalize values
	fqPairs := make([]string, 0, len(req.FieldQueries))
	for k, v := range req.FieldQueries {
		fqPairs = append(fqPairs, fmt.Sprintf("%s=%s", strings.ToLower(strings.TrimSpace(k)), strings.TrimSpace(v)))
	}
	sort.Strings(fqPairs)

	base := strings.Builder{}
	base.WriteString("logic=")
	base.WriteString(logic)
	base.WriteString(";match=")
	base.WriteString(matchType)
	base.WriteString(";enh=")
	if req.EnhancedMobile {
		base.WriteString("1")
	} else {
		base.WriteString("0")
	}
	base.WriteString(";q=")
	base.WriteString(strings.TrimSpace(req.Query))
	base.WriteString(";fields=")
	base.WriteString(strings.Join(sortedFields, ","))
	base.WriteString(";field_queries=")
	base.WriteString(strings.Join(fqPairs, ","))

	sum := sha256.Sum256([]byte(base.String()))
	return hex.EncodeToString(sum[:])
}

// isDuplicateSearchToday checks if a search with the same fingerprint already exists today for the user
func (s *SearchService) isDuplicateSearchToday(userID uuid.UUID, fingerprint string) (bool, error) {
	query := `SELECT 1 FROM searches WHERE user_id = $1 AND search_time::date = CURRENT_DATE AND search_query ->> 'fingerprint' = $2 LIMIT 1`
	var tmp int
	err := database.PostgresDB.Get(&tmp, query, userID, fingerprint)
	if err != nil {
		// If no rows, sqlx returns an error; treat as not duplicate
		return false, nil
	}
	return true, nil
}

// helper: build condition for a field/value considering virtual fields like pincode
func (s *SearchService) buildFieldCondition(field string, value string, matchType string, args *[]interface{}) (string, bool) {
	// Virtual field: pincode is extracted from address; prefer exact 6-digit equality on materialized column
	if field == "pincode" {
		clean := strings.TrimSpace(value)
		if clean == "" {
			return "", false
		}
		// Only digits
		digits := regexp.MustCompile(`\D`).ReplaceAllString(clean, "")
		if len(digits) == 6 {
			*args = append(*args, digits)
			return "pincode = ?", true
		}
		if len(digits) >= 4 {
			// Partial pincode: fallback to address filtering using case-insensitive position + regex token boundary
			c1 := "positionCaseInsensitive(address, ?) > 0"
			*args = append(*args, digits)
			pattern := fmt.Sprintf("(^|[^0-9])%s([^0-9]|$)", regexp.QuoteMeta(digits))
			c2 := "match(address, ?)"
			*args = append(*args, pattern)
			return fmt.Sprintf("(%s AND %s)", c1, c2), true
		}
		return "", false
	}

	// Normal fields
	if matchType == "full" {
		return fmt.Sprintf("%s = ?", field), true
	}
	return fmt.Sprintf("%s ILIKE ?", field), true
}

// Search performs a search operation on the people data
func (s *SearchService) Search(userID uuid.UUID, req *models.SearchRequest) (*models.SearchResponse, error) {
	// Check if user has remaining search quota
	authService := NewAuthService()
	canSearch, err := authService.CheckSearchLimit(userID)
	if err != nil {
		utils.LogError("Failed to check search limit", err)
		return nil, fmt.Errorf("failed to check search limit")
	}
	if !canSearch {
		return nil, fmt.Errorf("daily search limit exceeded")
	}

	// Compute fingerprint for caching and duplicate detection
	fingerprint := s.computeSearchFingerprint(req)

	// Check cache first
	if cached, found := s.getCachedResult(fingerprint); found {
		utils.LogInfo("Cache hit for search")
		searchID := uuid.New().String()

		// Still log the search but mark it as cached
		s.logSearch(userID, req, cached.TotalCount, cached.ExecutionTime, searchID, fingerprint)

		return &models.SearchResponse{
			Results:       cached.Results,
			TotalCount:    cached.TotalCount,
			ExecutionTime: cached.ExecutionTime,
			SearchID:      searchID,
			HasMore:       (req.Offset + len(cached.Results)) < cached.TotalCount,
		}, nil
	}

	// Auto-detect mobile number searches and use enhanced mobile search
	if s.shouldUseEnhancedMobileSearch(req) {
		utils.LogInfo("Detected mobile number pattern, using enhanced mobile search")

		// Extract the mobile number from the search
		mobileNumber := s.extractMobileNumber(req)
		if mobileNumber != "" {
			enhancedReq := &models.EnhancedMobileSearchRequest{
				MobileNumber: mobileNumber,
				Limit:        req.Limit,
				Offset:       req.Offset,
			}

			enhancedResponse, err := s.EnhancedMobileSearch(userID, enhancedReq)
			if err != nil {
				utils.LogError("Enhanced mobile search failed, falling back to regular search", err)
				// Fall back to regular search on error
			} else {
				// Convert enhanced response to regular response format
				allResults := append(enhancedResponse.DirectMatches, enhancedResponse.MasterIDMatches...)

				return &models.SearchResponse{
					Results:       allResults,
					TotalCount:    enhancedResponse.TotalCount,
					ExecutionTime: enhancedResponse.ExecutionTime,
					SearchID:      enhancedResponse.SearchID,
					HasMore:       enhancedResponse.HasMore,
				}, nil
			}
		}
	}

	startTime := time.Now()
	searchID := uuid.New().String()

	// Build the search query
	query, args := s.buildSearchQuery(req)

	utils.LogInfo(fmt.Sprintf("Executing search query: %s", query))

	// Execute the search with reduced timeout
	var results []models.Person
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = database.ClickHouseDB.Select(ctx, &results, query, args...)
	if err != nil {
		utils.LogError("Search query failed", err)
		return nil, fmt.Errorf("search failed: %w", err)
	}

	// Get total count for pagination (only if needed)
	totalCount := len(results)
	if req.Offset > 0 || len(results) == req.Limit {
		// Only get accurate count if we're paginating
		totalCount, err = s.getTotalCount(req, ctx)
		if err != nil {
			utils.LogError("Failed to get total count", err)
			totalCount = len(results) // Fallback to current page count
		}
	}

	executionTime := int(time.Since(startTime).Milliseconds())

	// Check if there are more results beyond the limit
	hasMore := (req.Offset + len(results)) < totalCount

	// Cache the result
	s.setCachedResult(fingerprint, results, totalCount, executionTime)

	// Check for duplicates
	isDup, _ := s.isDuplicateSearchToday(userID, fingerprint)

	// Log the search (including fingerprint)
	s.logSearch(userID, req, len(results), executionTime, searchID, fingerprint)

	// Log performance metrics to ClickHouse
	s.logSearchPerformance(searchID, userID.String(), query, executionTime, len(results))

	// Only increment user's daily search count if we found results and not a duplicate
	if totalCount > 0 && !isDup {
		if err := authService.IncrementSearchCount(userID); err != nil {
			utils.LogError("Failed to increment search count", err)
		}
	} else if totalCount == 0 {
		utils.LogInfo("No results found, search count not incremented")
	} else if isDup {
		utils.LogInfo("Duplicate search detected for today, search count not incremented")
	}

	return &models.SearchResponse{
		Results:       results,
		TotalCount:    totalCount,
		ExecutionTime: executionTime,
		SearchID:      searchID,
		HasMore:       hasMore,
	}, nil
}

// buildSearchQuery constructs the SQL query based on search parameters
func (s *SearchService) buildSearchQuery(req *models.SearchRequest) (string, []interface{}) {
	baseQuery := `SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at
	              FROM finone_search.people WHERE `

	conditions := []string{}
	args := []interface{}{}

	// Check if we have field-specific queries (preferred method)
	if len(req.FieldQueries) > 0 {
		// Field-specific search: each field has its own query value
		for field, value := range req.FieldQueries {
			if !s.isValidField(field) {
				continue
			}

			val := strings.TrimSpace(value)
			if val == "" {
				continue
			}

			var condition string
			if field == "pincode" {
				c, ok := s.buildFieldCondition("pincode", val, req.MatchType, &args)
				if ok {
					conditions = append(conditions, c)
				}
				continue
			}

			if req.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, val)
			} else {
				// Optimize exact mobile/alt lookups when full-length number provided
				if field == "mobile" || field == "alt" {
					digits := regexp.MustCompile(`\D`).ReplaceAllString(val, "")
					if len(digits) >= 10 && len(digits) <= 12 {
						// Use exact match for performance with bloom filter index
						condition = fmt.Sprintf("%s = ?", field)
						args = append(args, digits)
					} else {
						condition = fmt.Sprintf("%s ILIKE ?", field)
						args = append(args, "%"+val+"%")
					}
				} else {
					condition = fmt.Sprintf("%s ILIKE ?", field)
					args = append(args, "%"+val+"%")
				}
			}
			conditions = append(conditions, condition)
		}
	} else if len(req.Fields) > 0 {
		// Legacy method: single query across multiple fields
		for _, field := range req.Fields {
			if !s.isValidField(field) {
				continue
			}

			var condition string
			if req.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, req.Query)
			} else {
				if field == "mobile" || field == "alt" {
					digits := regexp.MustCompile(`\D`).ReplaceAllString(req.Query, "")
					if len(digits) >= 10 && len(digits) <= 12 {
						// Use exact match for performance
						condition = fmt.Sprintf("%s = ?", field)
						args = append(args, digits)
					} else {
						condition = fmt.Sprintf("%s ILIKE ?", field)
						args = append(args, "%"+req.Query+"%")
					}
				} else {
					condition = fmt.Sprintf("%s ILIKE ?", field)
					args = append(args, "%"+req.Query+"%")
				}
			}
			conditions = append(conditions, condition)
		}
	}

	// Default search across all fields if no specific fields provided
	if len(conditions) == 0 {
		queryTerm := strings.TrimSpace(req.Query)
		if queryTerm == "" {
			// Return empty result for empty queries
			return baseQuery + "1 = 0", []interface{}{}
		}

		if req.MatchType == "full" {
			condition := "(mobile = ? OR name = ? OR fname = ? OR address = ? OR alt = ? OR circle = ? OR email = ? OR master_id = ?)"
			conditions = append(conditions, condition)
			for i := 0; i < 8; i++ {
				args = append(args, queryTerm)
			}
		} else {
			// Optimize for likely mobile number searches
			digits := regexp.MustCompile(`\D`).ReplaceAllString(queryTerm, "")
			if len(digits) >= 10 && len(digits) <= 12 {
				// Likely mobile number - prioritize exact mobile/alt matches
				condition := "(mobile = ? OR alt = ? OR mobile ILIKE ? OR alt ILIKE ? OR name ILIKE ? OR fname ILIKE ? OR address ILIKE ? OR circle ILIKE ? OR email ILIKE ? OR master_id ILIKE ?)"
				args = append(args, digits, digits, "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%")
				conditions = append(conditions, condition)
			} else {
				// General text search
				condition := "(name ILIKE ? OR fname ILIKE ? OR address ILIKE ? OR mobile ILIKE ? OR alt ILIKE ? OR circle ILIKE ? OR email ILIKE ? OR master_id ILIKE ?)"
				queryWithWildcard := "%" + queryTerm + "%"
				for i := 0; i < 8; i++ {
					args = append(args, queryWithWildcard)
				}
				conditions = append(conditions, condition)
			}
		}
	}

	// Join conditions with AND/OR logic
	logicOperator := "OR"
	if req.Logic == "AND" {
		logicOperator = "AND"
	}

	whereClause := "(" + strings.Join(conditions, " "+logicOperator+" ") + ")"
	query := baseQuery + whereClause

	// Add ordering for consistent results (leverage primary key order)
	query += " ORDER BY mobile, name"

	// Add pagination
	if req.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", req.Limit)
	}
	if req.Offset > 0 {
		query += fmt.Sprintf(" OFFSET %d", req.Offset)
	}

	// Optimized settings for faster execution
	query += " SETTINGS max_threads = 4, optimize_move_to_prewhere = 1, max_execution_time = 30"

	// Debug logging
	utils.LogInfo(fmt.Sprintf("Generated SQL query - Logic: %s, Operator: %s, Conditions: %d",
		req.Logic, logicOperator, len(conditions)))
	utils.LogInfo(fmt.Sprintf("SQL Query: %s", query))

	return query, args
}

// getTotalCount gets the total count of matching records without pagination
func (s *SearchService) getTotalCount(req *models.SearchRequest, ctx context.Context) (int, error) {
	baseQuery := `SELECT count() FROM finone_search.people WHERE `

	conditions := []string{}
	args := []interface{}{}

	// Check if we have field-specific queries (preferred method)
	if len(req.FieldQueries) > 0 {
		// Field-specific search: each field has its own query value
		for field, value := range req.FieldQueries {
			if !s.isValidField(field) {
				continue
			}

			val := strings.TrimSpace(value)
			if val == "" {
				continue
			}

			if field == "pincode" {
				c, ok := s.buildFieldCondition("pincode", val, req.MatchType, &args)
				if ok {
					conditions = append(conditions, c)
				}
				continue
			}

			var condition string
			if req.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, val)
			} else {
				if field == "mobile" || field == "alt" {
					digits := regexp.MustCompile(`\D`).ReplaceAllString(val, "")
					if len(digits) >= 10 && len(digits) <= 12 {
						condition = fmt.Sprintf("%s = ?", field)
						args = append(args, digits)
					} else {
						condition = fmt.Sprintf("%s ILIKE ?", field)
						args = append(args, "%"+val+"%")
					}
				} else {
					condition = fmt.Sprintf("%s ILIKE ?", field)
					args = append(args, "%"+val+"%")
				}
			}
			conditions = append(conditions, condition)
		}
	} else if len(req.Fields) > 0 {
		// Legacy method: single query across multiple fields
		for _, field := range req.Fields {
			if !s.isValidField(field) {
				continue
			}

			var condition string
			if req.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, req.Query)
			} else {
				if field == "mobile" || field == "alt" {
					digits := regexp.MustCompile(`\D`).ReplaceAllString(req.Query, "")
					if len(digits) >= 10 && len(digits) <= 12 {
						condition = fmt.Sprintf("%s = ?", field)
						args = append(args, digits)
					} else {
						condition = fmt.Sprintf("%s ILIKE ?", field)
						args = append(args, "%"+req.Query+"%")
					}
				} else {
					condition = fmt.Sprintf("%s ILIKE ?", field)
					args = append(args, "%"+req.Query+"%")
				}
			}
			conditions = append(conditions, condition)
		}
	}

	// Default search across all fields if no specific fields provided
	if len(conditions) == 0 {
		queryTerm := strings.TrimSpace(req.Query)
		if queryTerm == "" {
			return 0, nil // Empty query returns 0 results
		}

		if req.MatchType == "full" {
			condition := "(mobile = ? OR name = ? OR fname = ? OR address = ? OR alt = ? OR circle = ? OR email = ? OR master_id = ?)"
			conditions = append(conditions, condition)
			for i := 0; i < 8; i++ {
				args = append(args, queryTerm)
			}
		} else {
			// Optimize for likely mobile number searches
			digits := regexp.MustCompile(`\D`).ReplaceAllString(queryTerm, "")
			if len(digits) >= 10 && len(digits) <= 12 {
				// Likely mobile number - prioritize exact mobile/alt matches
				condition := "(mobile = ? OR alt = ? OR mobile ILIKE ? OR alt ILIKE ? OR name ILIKE ? OR fname ILIKE ? OR address ILIKE ? OR circle ILIKE ? OR email ILIKE ? OR master_id ILIKE ?)"
				args = append(args, digits, digits, "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%", "%"+queryTerm+"%")
				conditions = append(conditions, condition)
			} else {
				// General text search
				condition := "(name ILIKE ? OR fname ILIKE ? OR address ILIKE ? OR mobile ILIKE ? OR alt ILIKE ? OR circle ILIKE ? OR email ILIKE ? OR master_id ILIKE ?)"
				queryWithWildcard := "%" + queryTerm + "%"
				for i := 0; i < 8; i++ {
					args = append(args, queryWithWildcard)
				}
				conditions = append(conditions, condition)
			}
		}
	}

	// Join conditions with AND/OR logic
	logicOperator := "OR"
	if req.Logic == "AND" {
		logicOperator = "AND"
	}

	whereClause := "(" + strings.Join(conditions, " "+logicOperator+" ") + ")"
	countQuery := baseQuery + whereClause + " SETTINGS max_threads = 4, optimize_move_to_prewhere = 1, max_execution_time = 30"

	var totalCount uint64
	err := database.ClickHouseDB.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return int(totalCount), nil
}

// getSearchWithinTotalCount gets the total count for search within operations
func (s *SearchService) getSearchWithinTotalCount(originalReq *models.SearchRequest, withinReq *models.SearchWithinRequest, ctx context.Context) (int, error) {
	// Build the original query conditions for count
	originalConditions := []string{}
	args := []interface{}{}

	// Handle original request fields and query
	if len(originalReq.FieldQueries) > 0 {
		// Field-specific search: each field has its own query value
		for field, value := range originalReq.FieldQueries {
			if !s.isValidField(field) {
				continue
			}
			if strings.TrimSpace(value) == "" {
				continue
			}

			var condition string
			if originalReq.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, value)
			} else {
				condition = fmt.Sprintf("%s ILIKE ?", field)
				args = append(args, "%"+value+"%")
			}
			originalConditions = append(originalConditions, condition)
		}
	} else if len(originalReq.Fields) > 0 {
		// Legacy method: single query across multiple fields
		for _, field := range originalReq.Fields {
			if !s.isValidField(field) {
				continue
			}

			var condition string
			if originalReq.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, originalReq.Query)
			} else {
				condition = fmt.Sprintf("%s ILIKE ?", field)
				args = append(args, "%"+originalReq.Query+"%")
			}
			originalConditions = append(originalConditions, condition)
		}
	} else {
		// Default search across all text fields for original query
		if originalReq.MatchType == "full" {
			condition := "(mobile = ? OR name = ? OR fname = ? OR address = ? OR alt = ? OR circle = ? OR email = ? OR master_id = ?)"
			originalConditions = append(originalConditions, condition)
			for i := 0; i < 8; i++ {
				args = append(args, originalReq.Query)
			}
		} else {
			condition := "(mobile ILIKE ? OR name ILIKE ? OR fname ILIKE ? OR address ILIKE ? OR alt ILIKE ? OR circle ILIKE ? OR email ILIKE ? OR master_id ILIKE ?)"
			originalConditions = append(originalConditions, condition)
			queryWithWildcard := "%" + originalReq.Query + "%"
			for i := 0; i < 8; i++ {
				args = append(args, queryWithWildcard)
			}
		}
	}

	// Build the new search conditions for count
	newConditions := []string{}
	fields := withinReq.Fields
	if len(fields) == 0 {
		fields = []string{"mobile", "name", "fname", "address", "alt", "circle", "email", "master_id"}
	}

	for _, field := range fields {
		if !s.isValidField(field) {
			continue
		}

		var condition string
		if withinReq.MatchType == "full" {
			condition = fmt.Sprintf("%s = ?", field)
			args = append(args, withinReq.Query)
		} else {
			condition = fmt.Sprintf("%s ILIKE ?", field)
			args = append(args, "%"+withinReq.Query+"%")
		}
		newConditions = append(newConditions, condition)
	}

	// Combine conditions with proper logic
	originalLogic := "OR"
	if originalReq.Logic == "AND" {
		originalLogic = "AND"
	}

	baseCountQuery := `SELECT count() FROM finone_search.people WHERE `

	// Original conditions
	originalWhere := "(" + strings.Join(originalConditions, " "+originalLogic+" ") + ")"

	// New conditions (always OR for within search fields)
	newWhere := "(" + strings.Join(newConditions, " OR ") + ")"

	// Combine with AND (search within means both conditions must be true)
	combinedWhere := originalWhere + " AND " + newWhere

	countQuery := baseCountQuery + combinedWhere + " SETTINGS optimize_move_to_prewhere=1, allow_experimental_analyzer=1"

	var totalCount uint64
	err := database.ClickHouseDB.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return 0, fmt.Errorf("failed to get search within total count: %w", err)
	}

	return int(totalCount), nil
}

// isValidField checks if the field is valid for searching
func (s *SearchService) isValidField(field string) bool {
	validFields := map[string]bool{
		"mobile":    true,
		"name":      true,
		"fname":     true,
		"address":   true,
		"alt":       true,
		"circle":    true,
		"email":     true,
		"master_id": true,
		// virtual field
		"pincode": true,
	}
	return validFields[field]
}

// GetPersonByID retrieves a person by ID
func (s *SearchService) GetPersonByID(id string) (*models.Person, error) {
	var person models.Person
	query := `SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at
	          FROM finone_search.people WHERE id = ?`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := database.ClickHouseDB.QueryRow(ctx, query, id).ScanStruct(&person)
	if err != nil {
		return nil, fmt.Errorf("person not found: %w", err)
	}

	return &person, nil
}

// GetSearchStats returns search statistics
func (s *SearchService) GetSearchStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total records count
	var totalRecords uint64
	countQuery := `SELECT count() FROM finone_search.people`
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := database.ClickHouseDB.QueryRow(ctx, countQuery).Scan(&totalRecords)
	if err != nil {
		return nil, fmt.Errorf("failed to get total records: %w", err)
	}

	stats["total_records"] = totalRecords

	// Recent search performance
	perfQuery := `SELECT avg(execution_time_ms), count()
	              FROM finone_search.search_performance
	              WHERE timestamp >= now() - INTERVAL 1 DAY`

	var avgTime float64
	var searchCount int64
	err = database.ClickHouseDB.QueryRow(ctx, perfQuery).Scan(&avgTime, &searchCount)
	if err != nil {
		utils.LogError("Failed to get search performance stats", err)
		avgTime = 0
		searchCount = 0
	}

	stats["avg_search_time_ms"] = avgTime
	stats["searches_last_24h"] = searchCount

	return stats, nil
}

// logSearch logs a search operation to PostgreSQL, embedding the fingerprint into the stored JSON
func (s *SearchService) logSearch(userID uuid.UUID, req *models.SearchRequest, resultCount, executionTime int, searchID, fingerprint string) {
	// Marshal req then inject fingerprint in a deterministic way
	raw, _ := json.Marshal(req)
	var obj map[string]interface{}
	_ = json.Unmarshal(raw, &obj)
	obj["fingerprint"] = fingerprint
	queryData, _ := json.Marshal(obj)

	query := `INSERT INTO searches (id, user_id, search_query, result_count, execution_time_ms)
	          VALUES ($1, $2, $3, $4, $5)`

	_, err := database.PostgresDB.Exec(query, searchID, userID, queryData, resultCount, executionTime)
	if err != nil {
		utils.LogError("Failed to log search", err)
	}
}

// logSearchPerformance logs search performance to ClickHouse
func (s *SearchService) logSearchPerformance(queryID, userID, queryText string, executionTime, resultCount int) {
	query := `INSERT INTO finone_search.search_performance
	          (query_id, user_id, query_text, execution_time_ms, result_count)
	          VALUES (?, ?, ?, ?, ?)`

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := database.ClickHouseDB.Exec(ctx, query, queryID, userID, queryText, executionTime, resultCount)

	if err != nil {
		utils.LogError("Failed to log search performance", err)
	}
}

// isMobileNumber checks if a string looks like a mobile number (10-12 digits)
func (s *SearchService) isMobileNumber(query string) bool {
	// Remove any non-digit characters for validation
	cleaned := regexp.MustCompile(`\D`).ReplaceAllString(query, "")
	// Check if it's 10-12 digits (typical mobile number length)
	return len(cleaned) >= 10 && len(cleaned) <= 12
}

// shouldUseEnhancedMobileSearch determines if the search should use enhanced mobile search
func (s *SearchService) shouldUseEnhancedMobileSearch(req *models.SearchRequest) bool {
	// If explicitly requested
	if req.EnhancedMobile {
		return true
	}

	// If field-specific queries are present, enhanced search should only trigger
	// when there is exactly one non-empty field and it is a mobile-like value in
	// either "mobile" or "alt".
	if len(req.FieldQueries) > 0 {
		nonEmptyCount := 0
		mobileOnly := true
		mobileLike := false
		for field, value := range req.FieldQueries {
			val := strings.TrimSpace(value)
			if val == "" {
				continue
			}
			nonEmptyCount++
			if field == "mobile" || field == "alt" {
				if s.isMobileNumber(val) {
					mobileLike = true
				}
			} else {
				mobileOnly = false
			}
		}
		if nonEmptyCount == 1 && mobileOnly && mobileLike {
			return true
		}
		// Multiple fields or non-mobile fields involved → do not use enhanced
		return false
	}

	// If legacy Fields are used, only trigger when all fields are in {mobile, alt}
	// AND the main query looks like a mobile number
	if len(req.Fields) > 0 {
		onlyMobileFields := true
		for _, f := range req.Fields {
			if f != "mobile" && f != "alt" {
				onlyMobileFields = false
				break
			}
		}
		if onlyMobileFields && s.isMobileNumber(req.Query) {
			return true
		}
		return false
	}

	// If no explicit fields provided, allow enhanced when the whole query is a mobile number
	if s.isMobileNumber(req.Query) {
		return true
	}

	return false
}

// extractMobileNumber extracts the mobile number from the search request
func (s *SearchService) extractMobileNumber(req *models.SearchRequest) string {
	// Check field-specific queries first
	if len(req.FieldQueries) > 0 {
		for field, value := range req.FieldQueries {
			if (field == "mobile" || field == "alt") && s.isMobileNumber(value) {
				return value
			}
		}
	}

	// Check main query
	if s.isMobileNumber(req.Query) {
		return req.Query
	}

	return ""
}

// EnhancedMobileSearch performs an enhanced mobile number search
func (s *SearchService) EnhancedMobileSearch(userID uuid.UUID, req *models.EnhancedMobileSearchRequest) (*models.EnhancedMobileSearchResponse, error) {
	// Check if user has remaining search quota
	authService := NewAuthService()
	canSearch, err := authService.CheckSearchLimit(userID)
	if err != nil {
		utils.LogError("Failed to check search limit", err)
		return nil, fmt.Errorf("failed to check search limit")
	}
	if !canSearch {
		return nil, fmt.Errorf("daily search limit exceeded")
	}

	startTime := time.Now()
	searchID := uuid.New().String()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second) // Reduced timeout
	defer cancel()

	// Clean the mobile number (remove any non-digit characters)
	cleanedMobile := regexp.MustCompile(`\D`).ReplaceAllString(req.MobileNumber, "")

	utils.LogInfo(fmt.Sprintf("Enhanced mobile search for: %s (cleaned: %s)", req.MobileNumber, cleanedMobile))

	// Check cache first
	cacheKey := fmt.Sprintf("enhanced_mobile_%s_%d_%d", cleanedMobile, req.Limit, req.Offset)
	if cached, found := s.getCachedResult(cacheKey); found {
		utils.LogInfo("Cache hit for enhanced mobile search")
		return &models.EnhancedMobileSearchResponse{
			DirectMatches:        cached.Results,
			MasterIDMatches:      []models.Person{},
			TotalDirectMatches:   cached.TotalCount,
			TotalMasterIDMatches: 0,
			TotalCount:           cached.TotalCount,
			ExecutionTime:        cached.ExecutionTime,
			SearchID:             searchID,
			HasMore:              (req.Offset + len(cached.Results)) < cached.TotalCount,
			MasterIDs:            []string{},
		}, nil
	}

	// Optimized single query with UNION ALL for better performance
	optimizedQuery := `
		WITH mobile_matches AS (
			SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at, 1 as match_type
			FROM finone_search.people
			WHERE mobile = ?
			UNION ALL
			SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at, 2 as match_type
			FROM finone_search.people
			WHERE alt = ?
			UNION ALL
			SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at, 3 as match_type
			FROM finone_search.people
			WHERE mobile LIKE ? AND mobile != ?
			UNION ALL
			SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at, 4 as match_type
			FROM finone_search.people
			WHERE alt LIKE ? AND alt != ?
		)
		SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at
		FROM mobile_matches
		ORDER BY match_type, mobile, name
		LIMIT ? OFFSET ?
		SETTINGS max_threads = 4, optimize_move_to_prewhere = 1
	`

	// Prepare query arguments
	pageLimit := req.Limit
	if pageLimit <= 0 {
		pageLimit = 1000
	}

	args := []interface{}{
		cleanedMobile,       // Exact mobile match
		cleanedMobile,       // Exact alt match
		"%" + cleanedMobile, // Mobile ends with
		cleanedMobile,       // Exclude exact (already covered)
		"%" + cleanedMobile, // Alt ends with
		cleanedMobile,       // Exclude exact (already covered)
		pageLimit + 1,       // Fetch one extra to check hasMore
		req.Offset,
	}

	var results []models.Person
	err = database.ClickHouseDB.Select(ctx, &results, optimizedQuery, args...)
	if err != nil {
		utils.LogError("Optimized mobile search failed", err)
		return nil, fmt.Errorf("optimized mobile search failed: %w", err)
	}

	// Check if there are more results
	hasMore := len(results) > pageLimit
	if hasMore {
		results = results[:pageLimit] // Trim to requested size
	}

	// Fast count query - only count if we need it for pagination
	totalCount := len(results)
	if req.Offset == 0 && !hasMore {
		// If this is the first page and we don't have more, total = results
		totalCount = len(results)
	} else {
		// Need accurate count for pagination
		countQuery := `
			SELECT count() FROM (
				SELECT 1 FROM finone_search.people WHERE mobile = ?
				UNION ALL
				SELECT 1 FROM finone_search.people WHERE alt = ?
				UNION ALL
				SELECT 1 FROM finone_search.people WHERE mobile LIKE ? AND mobile != ?
				UNION ALL
				SELECT 1 FROM finone_search.people WHERE alt LIKE ? AND alt != ?
			) SETTINGS max_threads = 4
		`
		var count uint64
		countArgs := []interface{}{
			cleanedMobile,
			cleanedMobile,
			"%" + cleanedMobile,
			cleanedMobile,
			"%" + cleanedMobile,
			cleanedMobile,
		}

		err = database.ClickHouseDB.QueryRow(ctx, countQuery, countArgs...).Scan(&count)
		if err != nil {
			utils.LogError("Count query failed, using fallback", err)
			totalCount = req.Offset + len(results)
			if hasMore {
				totalCount++
			}
		} else {
			totalCount = int(count)
		}
	}

	executionTime := int(time.Since(startTime).Milliseconds())

	// Cache the result
	s.setCachedResult(cacheKey, results, totalCount, executionTime)

	// Log performance metrics
	s.logSearchPerformance(searchID, userID.String(), "ENHANCED_MOBILE_OPTIMIZED", executionTime, len(results))

	// Increment daily search count only if we found results
	if totalCount > 0 {
		if err := authService.IncrementSearchCount(userID); err != nil {
			utils.LogError("Failed to increment search count", err)
		}
	}

	return &models.EnhancedMobileSearchResponse{
		DirectMatches:        results,
		MasterIDMatches:      []models.Person{}, // Simplified for performance
		TotalDirectMatches:   totalCount,
		TotalMasterIDMatches: 0,
		TotalCount:           totalCount,
		ExecutionTime:        executionTime,
		SearchID:             searchID,
		HasMore:              hasMore,
		MasterIDs:            []string{},
	}, nil
}

func (s *SearchService) BuildSearchSQL(req *models.SearchRequest, limit int, offset int) (string, []interface{}) {
	// Create a shallow copy so we don't mutate the original request
	r := *req
	if limit > 0 {
		r.Limit = limit
	}
	if offset >= 0 {
		r.Offset = offset
	}
	return s.buildSearchQuery(&r)
}

// SearchWithin performs a search within previous search results (simplified for performance)
func (s *SearchService) SearchWithin(userID uuid.UUID, req *models.SearchWithinRequest) (*models.SearchResponse, error) {
	startTime := time.Now()
	searchID := uuid.New().String()

	// For now, convert to a regular search for simplicity and performance
	searchReq := &models.SearchRequest{
		Query:     req.Query,
		Fields:    req.Fields,
		MatchType: req.MatchType,
		Logic:     "AND",
		Limit:     req.Limit,
		Offset:    req.Offset,
	}

	response, err := s.Search(userID, searchReq)
	if err != nil {
		return nil, err
	}

	// Update the search ID to the new one
	response.SearchID = searchID
	response.ExecutionTime = int(time.Since(startTime).Milliseconds())

	return response, nil
}
