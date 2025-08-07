package services

import (
	"context"
	"encoding/json"
	"finone-search-system/database"
	"finone-search-system/models"
	"finone-search-system/utils"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

type SearchService struct{}

func NewSearchService() *SearchService {
	return &SearchService{}
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

	// Auto-detect mobile number searches and use enhanced mobile search
	// Check if this is likely a mobile number search
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

	// Execute the search
	var results []models.Person
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = database.ClickHouseDB.Select(ctx, &results, query, args...)
	if err != nil {
		utils.LogError("Search query failed", err)
		return nil, fmt.Errorf("search failed: %w", err)
	}

	// Get total count for pagination (without LIMIT/OFFSET)
	totalCount, err := s.getTotalCount(req, ctx)
	if err != nil {
		utils.LogError("Failed to get total count", err)
		totalCount = len(results) // Fallback to current page count
	}

	executionTime := int(time.Since(startTime).Milliseconds())

	// Check if there are more results beyond the limit
	hasMore := (req.Offset + len(results)) < totalCount

	// Log the search
	s.logSearch(userID, req, len(results), executionTime, searchID)

	// Log performance metrics to ClickHouse
	s.logSearchPerformance(searchID, userID.String(), query, executionTime, len(results))

	// Only increment user's daily search count if we found results
	if totalCount > 0 {
		if err := authService.IncrementSearchCount(userID); err != nil {
			utils.LogError("Failed to increment search count", err)
		}
	} else {
		utils.LogInfo("No results found, search count not incremented")
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

			if strings.TrimSpace(value) == "" {
				continue
			}

			var condition string
			if req.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, value)
			} else {
				condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
				args = append(args, "%"+value+"%")
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
				condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
				args = append(args, "%"+req.Query+"%")
			}
			conditions = append(conditions, condition)
		}
	}

	// Default search across all fields if no specific fields provided
	if len(conditions) == 0 {
		if req.MatchType == "full" {
			condition := "(mobile = ? OR name = ? OR fname = ? OR address = ? OR alt = ? OR circle = ? OR email = ? OR master_id = ?)"
			conditions = append(conditions, condition)
			for i := 0; i < 8; i++ {
				args = append(args, req.Query)
			}
		} else {
			condition := "(lower(mobile) LIKE lower(?) OR lower(name) LIKE lower(?) OR lower(fname) LIKE lower(?) OR lower(address) LIKE lower(?) OR lower(alt) LIKE lower(?) OR lower(circle) LIKE lower(?) OR lower(email) LIKE lower(?) OR lower(master_id) LIKE lower(?))"
			conditions = append(conditions, condition)
			queryWithWildcard := "%" + req.Query + "%"
			for i := 0; i < 8; i++ {
				args = append(args, queryWithWildcard)
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

	// Add ordering for consistent results
	query += " ORDER BY mobile, name"

	// Add pagination
	if req.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", req.Limit)
	}
	if req.Offset > 0 {
		query += fmt.Sprintf(" OFFSET %d", req.Offset)
	}

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

			if strings.TrimSpace(value) == "" {
				continue
			}

			var condition string
			if req.MatchType == "full" {
				condition = fmt.Sprintf("%s = ?", field)
				args = append(args, value)
			} else {
				condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
				args = append(args, "%"+value+"%")
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
				condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
				args = append(args, "%"+req.Query+"%")
			}
			conditions = append(conditions, condition)
		}
	}

	// Default search across all fields if no specific fields provided
	if len(conditions) == 0 {
		if req.MatchType == "full" {
			condition := "(mobile = ? OR name = ? OR fname = ? OR address = ? OR alt = ? OR circle = ? OR email = ? OR master_id = ?)"
			conditions = append(conditions, condition)
			for i := 0; i < 8; i++ {
				args = append(args, req.Query)
			}
		} else {
			condition := "(lower(mobile) LIKE lower(?) OR lower(name) LIKE lower(?) OR lower(fname) LIKE lower(?) OR lower(address) LIKE lower(?) OR lower(alt) LIKE lower(?) OR lower(circle) LIKE lower(?) OR lower(email) LIKE lower(?) OR lower(master_id) LIKE lower(?))"
			conditions = append(conditions, condition)
			queryWithWildcard := "%" + req.Query + "%"
			for i := 0; i < 8; i++ {
				args = append(args, queryWithWildcard)
			}
		}
	}

	// Join conditions with AND/OR logic
	logicOperator := "OR"
	if req.Logic == "AND" {
		logicOperator = "AND"
	}

	whereClause := "(" + strings.Join(conditions, " "+logicOperator+" ") + ")"
	countQuery := baseQuery + whereClause

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
				condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
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
				condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
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
			condition := "(lower(mobile) LIKE lower(?) OR lower(name) LIKE lower(?) OR lower(fname) LIKE lower(?) OR lower(address) LIKE lower(?) OR lower(alt) LIKE lower(?) OR lower(circle) LIKE lower(?) OR lower(email) LIKE lower(?) OR lower(master_id) LIKE lower(?))"
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
			condition = fmt.Sprintf("lower(%s) LIKE lower(?)", field)
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

	countQuery := baseCountQuery + combinedWhere

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

// logSearch logs a search operation to PostgreSQL
func (s *SearchService) logSearch(userID uuid.UUID, req *models.SearchRequest, resultCount, executionTime int, searchID string) {
	queryData, _ := json.Marshal(req)

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

// SearchWithin performs a search within previous search results
func (s *SearchService) SearchWithin(userID uuid.UUID, req *models.SearchWithinRequest) (*models.SearchResponse, error) {
	startTime := time.Now()

	// Parse the search_id string to UUID
	originalSearchID, err := uuid.Parse(req.SearchID)
	if err != nil {
		return nil, fmt.Errorf("invalid search ID: %w", err)
	}

	// First, get the original search results from PostgreSQL
	var originalSearch models.Search
	query := `SELECT * FROM searches WHERE id = $1 AND user_id = $2`
	err = database.PostgresDB.Get(&originalSearch, query, originalSearchID, userID)
	if err != nil {
		return nil, fmt.Errorf("original search not found: %w", err)
	}

	// Extract the original search parameters
	var originalReq models.SearchRequest

	// Handle the SearchQuery which is stored as interface{} in JSONB
	var queryData []byte
	switch v := originalSearch.SearchQuery.(type) {
	case []byte:
		queryData = v
	case string:
		queryData = []byte(v)
	default:
		// Try to marshal and then unmarshal
		queryData, _ = json.Marshal(originalSearch.SearchQuery)
	}

	if err := json.Unmarshal(queryData, &originalReq); err != nil {
		return nil, fmt.Errorf("failed to parse original search: %w", err)
	}

	// Build a combined query that includes both original and new search criteria
	combinedQuery := s.buildSearchWithinQuery(&originalReq, req)

	utils.LogInfo(fmt.Sprintf("Executing search within query: %s", combinedQuery))

	// Execute the refined search
	var results []models.Person
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = database.ClickHouseDB.Select(ctx, &results, combinedQuery)
	if err != nil {
		utils.LogError("Search within query failed", err)
		return nil, fmt.Errorf("search within failed: %w", err)
	}

	// Get proper total count for SearchWithin using a separate count query
	totalCount, err := s.getSearchWithinTotalCount(&originalReq, req, ctx)
	if err != nil {
		utils.LogError("Failed to get search within total count", err)
		totalCount = len(results) // Fallback to current page count
	}

	executionTime := int(time.Since(startTime).Milliseconds())
	newSearchID := uuid.New().String()

	// Log the search within operation
	searchWithinReq := models.SearchRequest{
		Query:     fmt.Sprintf("WITHIN[%s]: %s", req.SearchID, req.Query),
		Fields:    req.Fields,
		MatchType: req.MatchType,
		Limit:     req.Limit,
		Offset:    req.Offset,
	}
	s.logSearch(userID, &searchWithinReq, len(results), executionTime, newSearchID)

	// Only increment search count if we found results (search within should count as a new search)
	if totalCount > 0 {
		authService := NewAuthService()
		if err := authService.IncrementSearchCount(userID); err != nil {
			utils.LogError("Failed to increment search count for search within", err)
		}
	} else {
		utils.LogInfo("No results found in search within, search count not incremented")
	}

	return &models.SearchResponse{
		Results:       results,
		TotalCount:    totalCount,
		ExecutionTime: executionTime,
		SearchID:      newSearchID,
		HasMore:       (req.Offset + len(results)) < totalCount,
	}, nil
}

// buildSearchWithinQuery builds a query that searches within previous results
func (s *SearchService) buildSearchWithinQuery(originalReq *models.SearchRequest, withinReq *models.SearchWithinRequest) string {
	// Build the original query conditions
	originalConditions := []string{}

	// Check if we have field-specific queries (preferred method)
	if len(originalReq.FieldQueries) > 0 {
		// Field-specific search: each field has its own query value
		for field, value := range originalReq.FieldQueries {
			if !s.isValidField(field) {
				continue
			}
			if strings.TrimSpace(value) == "" {
				continue
			}
			if originalReq.MatchType == "full" {
				originalConditions = append(originalConditions, fmt.Sprintf("%s = '%s'", field, value))
			} else {
				originalConditions = append(originalConditions, fmt.Sprintf("lower(%s) LIKE lower('%%%s%%')", field, value))
			}
		}
	} else if len(originalReq.Fields) > 0 {
		// Legacy method: single query across multiple fields
		for _, field := range originalReq.Fields {
			if !s.isValidField(field) {
				continue
			}
			if originalReq.MatchType == "full" {
				originalConditions = append(originalConditions, fmt.Sprintf("%s = '%s'", field, originalReq.Query))
			} else {
				originalConditions = append(originalConditions, fmt.Sprintf("lower(%s) LIKE lower('%%%s%%')", field, originalReq.Query))
			}
		}
	}

	// Build the new search conditions
	newConditions := []string{}
	fields := withinReq.Fields
	if len(fields) == 0 {
		fields = []string{"mobile", "name", "fname", "address", "alt", "circle", "email", "master_id"}
	}

	for _, field := range fields {
		if !s.isValidField(field) {
			continue
		}
		if withinReq.MatchType == "full" {
			newConditions = append(newConditions, fmt.Sprintf("%s = '%s'", field, withinReq.Query))
		} else {
			newConditions = append(newConditions, fmt.Sprintf("lower(%s) LIKE lower('%%%s%%')", field, withinReq.Query))
		}
	}

	// Combine both conditions
	originalLogic := "OR"
	if originalReq.Logic == "AND" {
		originalLogic = "AND"
	}

	baseQuery := `SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at
	              FROM finone_search.people WHERE `

	// Original conditions
	originalWhere := "(" + strings.Join(originalConditions, " "+originalLogic+" ") + ")"

	// New conditions
	newWhere := "(" + strings.Join(newConditions, " OR ") + ")"

	// Combine with AND (search within means both conditions must be true)
	combinedWhere := originalWhere + " AND " + newWhere

	query := baseQuery + combinedWhere + " ORDER BY mobile, name"

	if withinReq.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", withinReq.Limit)
	}
	if withinReq.Offset > 0 {
		query += fmt.Sprintf(" OFFSET %d", withinReq.Offset)
	}

	return query
}

// isMobileNumber checks if a string looks like a mobile number (10-12 digits)
func (s *SearchService) isMobileNumber(query string) bool {
	// Remove any non-digit characters for validation
	cleaned := regexp.MustCompile(`\D`).ReplaceAllString(query, "")
	// Check if it's 10-12 digits (typical mobile number length)
	return len(cleaned) >= 10 && len(cleaned) <= 12
}

// isValidMasterID checks if a master ID is valid and not a partial/masked ID
func (s *SearchService) isValidMasterID(masterID string) bool {
	if masterID == "" {
		return false
	}

	// Filter out partial/masked master IDs that contain 'x' characters
	// These are typically used to mask sensitive data and should not be used for searching
	if strings.Contains(strings.ToLower(masterID), "x") {
		return false
	}

	// Filter out master IDs that are too short (likely partial matches)
	// Valid master IDs should typically be at least 8-10 characters long
	if len(masterID) < 8 {
		return false
	}

	// Check if it's all digits or contains valid suffix characters
	// Remove any valid suffix characters (letters) from the end
	baseID := regexp.MustCompile(`[A-Za-z]*$`).ReplaceAllString(masterID, "")

	// The base part should be all digits
	if !regexp.MustCompile(`^\d+$`).MatchString(baseID) {
		return false
	}

	// If the original masterID is longer than baseID, it means it has a suffix
	// This is allowed as per requirements (e.g., 718834427584M)

	return true
}

// shouldUseEnhancedMobileSearch determines if the search should use enhanced mobile search
func (s *SearchService) shouldUseEnhancedMobileSearch(req *models.SearchRequest) bool {
	// If explicitly requested
	if req.EnhancedMobile {
		return true
	}

	// Check if the main query looks like a mobile number
	if s.isMobileNumber(req.Query) {
		return true
	}

	// Check field-specific queries for mobile fields
	if len(req.FieldQueries) > 0 {
		for field, value := range req.FieldQueries {
			if (field == "mobile" || field == "alt") && s.isMobileNumber(value) {
				return true
			}
		}
	}

	// Check if fields include mobile/alt and query looks like a number
	if len(req.Fields) > 0 {
		hasMobileField := false
		for _, field := range req.Fields {
			if field == "mobile" || field == "alt" {
				hasMobileField = true
				break
			}
		}
		if hasMobileField && s.isMobileNumber(req.Query) {
			return true
		}
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
// It searches for the mobile number and then finds all records with the same master_ids
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

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second) // Longer timeout for complex query
	defer cancel()

	// Clean the mobile number (remove any non-digit characters)
	cleanedMobile := regexp.MustCompile(`\D`).ReplaceAllString(req.MobileNumber, "")

	utils.LogInfo(fmt.Sprintf("Enhanced mobile search for: %s (cleaned: %s)", req.MobileNumber, cleanedMobile))

	// Step 1: Find all direct mobile number matches (both exact and partial)
	directMatchQuery := `
		SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at
		FROM finone_search.people
		WHERE mobile = ? OR mobile LIKE ? OR mobile LIKE ? OR alt = ? OR alt LIKE ? OR alt LIKE ?
		ORDER BY mobile, name
	`

	// Prepare variations of the mobile number for matching
	mobileVariations := []interface{}{
		cleanedMobile,       // Exact match
		"%" + cleanedMobile, // Ends with
		cleanedMobile + "%", // Starts with
		cleanedMobile,       // Alt exact match
		"%" + cleanedMobile, // Alt ends with
		cleanedMobile + "%", // Alt starts with
	}

	var directMatches []models.Person
	err = database.ClickHouseDB.Select(ctx, &directMatches, directMatchQuery, mobileVariations...)
	if err != nil {
		utils.LogError("Direct mobile search failed", err)
		return nil, fmt.Errorf("direct mobile search failed: %w", err)
	}

	utils.LogInfo(fmt.Sprintf("Found %d direct matches for mobile: %s", len(directMatches), cleanedMobile))

	// Step 2: Extract unique master_ids from direct matches
	masterIDMap := make(map[string]bool)
	for _, person := range directMatches {
		if person.MasterID != "" && s.isValidMasterID(person.MasterID) {
			masterIDMap[person.MasterID] = true
		}
	}

	var masterIDMatches []models.Person
	var uniqueMasterIDs []string

	if len(masterIDMap) > 0 {
		// Convert map to slice for query
		for masterID := range masterIDMap {
			uniqueMasterIDs = append(uniqueMasterIDs, masterID)
		}

		utils.LogInfo(fmt.Sprintf("Found %d unique master_ids, searching for related records", len(uniqueMasterIDs)))

		// Step 3: Find all records with these master_ids (excluding already found direct matches)
		// Build dynamic IN clause for master_ids
		placeholders := make([]string, len(uniqueMasterIDs))
		masterIDArgs := make([]interface{}, len(uniqueMasterIDs))
		for i, masterID := range uniqueMasterIDs {
			placeholders[i] = "?"
			masterIDArgs[i] = masterID
		}

		masterIDQuery := fmt.Sprintf(`
			SELECT id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at
			FROM finone_search.people
			WHERE master_id IN (%s)
			AND id NOT IN (
				SELECT id FROM finone_search.people
				WHERE mobile = ? OR mobile LIKE ? OR mobile LIKE ? OR alt = ? OR alt LIKE ? OR alt LIKE ?
			)
			ORDER BY master_id, mobile, name
		`, strings.Join(placeholders, ","))

		// Combine master_id args with mobile variations for exclusion
		allArgs := append(masterIDArgs, mobileVariations...)

		err = database.ClickHouseDB.Select(ctx, &masterIDMatches, masterIDQuery, allArgs...)
		if err != nil {
			utils.LogError("Master ID search failed", err)
			return nil, fmt.Errorf("master ID search failed: %w", err)
		}

		utils.LogInfo(fmt.Sprintf("Found %d additional records with matching master_ids", len(masterIDMatches)))
	}

	// Step 4: Get total counts for pagination
	totalDirectCount := len(directMatches)
	totalMasterIDCount := len(masterIDMatches)
	totalCount := totalDirectCount + totalMasterIDCount

	// Step 5: Apply pagination to combined results
	var finalDirectMatches, finalMasterIDMatches []models.Person

	if req.Limit > 0 {
		// Apply pagination logic
		if req.Offset < totalDirectCount {
			// We're still in the direct matches range
			endIndex := req.Offset + req.Limit
			if endIndex > totalDirectCount {
				endIndex = totalDirectCount
			}
			finalDirectMatches = directMatches[req.Offset:endIndex]

			// If we have remaining limit, get from master ID matches
			remainingLimit := req.Limit - len(finalDirectMatches)
			if remainingLimit > 0 && len(masterIDMatches) > 0 {
				masterEndIndex := remainingLimit
				if masterEndIndex > len(masterIDMatches) {
					masterEndIndex = len(masterIDMatches)
				}
				finalMasterIDMatches = masterIDMatches[0:masterEndIndex]
			}
		} else {
			// We're in the master ID matches range
			masterOffset := req.Offset - totalDirectCount
			if masterOffset < len(masterIDMatches) {
				endIndex := masterOffset + req.Limit
				if endIndex > len(masterIDMatches) {
					endIndex = len(masterIDMatches)
				}
				finalMasterIDMatches = masterIDMatches[masterOffset:endIndex]
			}
		}
	} else {
		// No pagination, return all results
		finalDirectMatches = directMatches
		finalMasterIDMatches = masterIDMatches
	}

	executionTime := int(time.Since(startTime).Milliseconds())
	hasMore := (req.Offset + len(finalDirectMatches) + len(finalMasterIDMatches)) < totalCount

	// Log the search
	searchReq := &models.SearchRequest{
		Query:          fmt.Sprintf("ENHANCED_MOBILE: %s", req.MobileNumber),
		Fields:         []string{"mobile", "alt"},
		Logic:          "OR",
		MatchType:      "partial",
		Limit:          req.Limit,
		Offset:         req.Offset,
		EnhancedMobile: true,
	}
	s.logSearch(userID, searchReq, totalCount, executionTime, searchID)

	// Log performance metrics
	queryText := fmt.Sprintf("Enhanced mobile search: %s (found %d master_ids)", cleanedMobile, len(uniqueMasterIDs))
	s.logSearchPerformance(searchID, userID.String(), queryText, executionTime, totalCount)

	// Only increment user's daily search count if we found results
	if totalCount > 0 {
		if err := authService.IncrementSearchCount(userID); err != nil {
			utils.LogError("Failed to increment search count", err)
		}
	} else {
		utils.LogInfo("No results found in enhanced mobile search, search count not incremented")
	}

	utils.LogInfo(fmt.Sprintf("Enhanced mobile search completed in %dms. Direct: %d, Master ID: %d, Total: %d",
		executionTime, len(finalDirectMatches), len(finalMasterIDMatches), totalCount))

	return &models.EnhancedMobileSearchResponse{
		DirectMatches:        finalDirectMatches,
		MasterIDMatches:      finalMasterIDMatches,
		TotalDirectMatches:   totalDirectCount,
		TotalMasterIDMatches: totalMasterIDCount,
		TotalCount:           totalCount,
		ExecutionTime:        executionTime,
		SearchID:             searchID,
		HasMore:              hasMore,
		MasterIDs:            uniqueMasterIDs,
	}, nil
}
