package services

import (
	"context"
	"encoding/json"
	"finone-search-system/database"
	"finone-search-system/models"
	"finone-search-system/utils"
	"fmt"
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

	// Increment user's daily search count
	if err := authService.IncrementSearchCount(userID); err != nil {
		utils.LogError("Failed to increment search count", err)
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
