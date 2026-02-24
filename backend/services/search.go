package services

import (
	"bytes"
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
	"github.com/opensearch-project/opensearch-go/v3/opensearchapi"
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

	if time.Since(entry.Timestamp) > 10*time.Minute {
		return nil, false
	}

	return entry, true
}

// setCachedResult stores a search result in cache
func (s *SearchService) setCachedResult(fingerprint string, results []models.Person, totalCount int, executionTime int) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	if len(s.cache) > 1000 {
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

// computeSearchFingerprint generates a stable fingerprint for a search request
func (s *SearchService) computeSearchFingerprint(req *models.SearchRequest) string {
	logic := strings.ToUpper(strings.TrimSpace(req.Logic))
	if logic != "AND" {
		logic = "OR"
	}
	matchType := strings.ToLower(strings.TrimSpace(req.MatchType))
	if matchType != "full" {
		matchType = "partial"
	}

	sortedFields := make([]string, 0, len(req.Fields))
	sortedFields = append(sortedFields, req.Fields...)
	sort.Strings(sortedFields)

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

// isDuplicateSearchToday checks if a search with the same fingerprint already exists today
func (s *SearchService) isDuplicateSearchToday(userID uuid.UUID, fingerprint string) (bool, error) {
	query := `SELECT 1 FROM searches WHERE user_id = $1 AND search_time::date = CURRENT_DATE AND search_query ->>'fingerprint' = $2 LIMIT 1`
	var tmp int
	err := database.PostgresDB.Get(&tmp, query, userID, fingerprint)
	if err != nil {
		return false, nil
	}
	return true, nil
}

// -----------------------------------------------------------------------
// OpenSearch query builders — matching the actual index schema
//
// Schema (from templates/people_v1.json):
//   mobile:  keyword (normalizer: lowercase_keyword)
//   name:    text (analyzer: name_analyzer) + name.keyword + name.exact (standard)
//   fname:   text (analyzer: name_analyzer) + fname.keyword
//   address: text (analyzer: address_analyzer, tokenizer splits on !) + address.keyword + address.parts (standard)
//   alt:     keyword (normalizer: lowercase_keyword) + alt.text (standard)
//   id:      keyword (normalizer: lowercase_keyword) + id.text (standard)
//   oid:     keyword (normalizer: lowercase_keyword)
//   email:   keyword (normalizer: lowercase_keyword) + email.text (standard)
//   region:  keyword (normalizer: lowercase_keyword)
// -----------------------------------------------------------------------

// tokenize splits a value into lowercase alphanumeric tokens
func tokenize(value string) []string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	lower := strings.ToLower(trimmed)
	split := strings.FieldsFunc(lower, func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	})
	normalized := make([]string, 0, len(split))
	for _, token := range split {
		if token != "" {
			normalized = append(normalized, token)
		}
	}
	return normalized
}

// mapFieldName maps frontend field names to OpenSearch field names
// e.g. "master_id" from the finone frontend → "id" in OpenSearch
func mapFieldName(field string) string {
	switch field {
	case "master_id":
		return "id"
	default:
		return field
	}
}

// buildFieldQuery creates the appropriate OpenSearch query clause for a field + value.
// Matches the notorious backend's buildFieldQuery exactly, aligned with the index template.
func buildFieldQuery(field, value string) map[string]interface{} {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	valueLower := strings.ToLower(value)

	// Remap field names from frontend to OpenSearch
	osField := mapFieldName(field)

	// --- Phone number fields: mobile, alt (keyword with lowercase normalizer) ---
	if osField == "mobile" || osField == "alt" {
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []map[string]interface{}{
					{"term": map[string]interface{}{osField: valueLower}},
					{"prefix": map[string]interface{}{osField: valueLower}},
				},
				"minimum_should_match": 1,
			},
		}
	}

	// --- ID fields: id, oid (keyword with lowercase normalizer) ---
	if osField == "id" || osField == "oid" {
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []map[string]interface{}{
					{"term": map[string]interface{}{osField: valueLower}},
					{"prefix": map[string]interface{}{osField: valueLower}},
				},
				"minimum_should_match": 1,
			},
		}
	}

	// --- Email (keyword with lowercase normalizer) ---
	if osField == "email" {
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []map[string]interface{}{
					{"term": map[string]interface{}{osField: valueLower}},
					{"prefix": map[string]interface{}{osField: valueLower}},
				},
				"minimum_should_match": 1,
			},
		}
	}

	// --- Name field (text with name_analyzer + name.keyword + name.exact) ---
	if osField == "name" {
		tokens := tokenize(value)
		shouldClauses := []map[string]interface{}{
			// Exact keyword match (lowercased via normalizer)
			{
				"term": map[string]interface{}{
					"name.keyword": map[string]interface{}{
						"value":            value,
						"case_insensitive": true,
					},
				},
			},
		}

		// Token-level AND match using name.exact (standard analyzer sub-field)
		if len(tokens) > 0 {
			mustTerms := make([]map[string]interface{}, 0, len(tokens))
			for _, token := range tokens {
				mustTerms = append(mustTerms, map[string]interface{}{
					"term": map[string]interface{}{
						"name.exact": token,
					},
				})
			}
			shouldClauses = append(shouldClauses, map[string]interface{}{
				"bool": map[string]interface{}{"must": mustTerms},
			})
		}

		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should":               shouldClauses,
				"minimum_should_match": 1,
			},
		}
	}

	// --- Father Name field (text with name_analyzer + fname.keyword, NO fname.exact) ---
	if osField == "fname" {
		tokens := tokenize(value)
		shouldClauses := []map[string]interface{}{
			// Exact keyword match
			{
				"term": map[string]interface{}{
					"fname.keyword": map[string]interface{}{
						"value":            value,
						"case_insensitive": true,
					},
				},
			},
		}

		// Use match query on the base field (uses name_analyzer which has edge_ngram)
		if len(tokens) > 0 {
			// Match on the base fname field which uses name_analyzer
			shouldClauses = append(shouldClauses, map[string]interface{}{
				"match": map[string]interface{}{
					"fname": map[string]interface{}{
						"query":    value,
						"operator": "and",
					},
				},
			})
		}

		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should":               shouldClauses,
				"minimum_should_match": 1,
			},
		}
	}

	// --- Address field (text with address_analyzer using ! delimiter + address.keyword + address.parts) ---
	if osField == "address" {
		tokens := tokenize(value)
		shouldClauses := []map[string]interface{}{
			// Exact keyword match
			{
				"term": map[string]interface{}{
					"address.keyword": map[string]interface{}{
						"value":            value,
						"case_insensitive": true,
					},
				},
			},
		}

		// Token-level AND match using address.parts (standard analyzer)
		if len(tokens) > 0 {
			mustTerms := make([]map[string]interface{}, 0, len(tokens))
			for _, token := range tokens {
				mustTerms = append(mustTerms, map[string]interface{}{
					"term": map[string]interface{}{
						"address.parts": token,
					},
				})
			}
			shouldClauses = append(shouldClauses, map[string]interface{}{
				"bool": map[string]interface{}{"must": mustTerms},
			})
		}

		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should":               shouldClauses,
				"minimum_should_match": 1,
			},
		}
	}

	// --- Pincode — search across address fields ---
	// Uses match queries which are fast (no leading wildcard scans).
	// Works when pincode appears as a separate token in the address.
	if osField == "pincode" {
		digits := regexp.MustCompile(`\D`).ReplaceAllString(value, "")
		if len(digits) < 4 {
			return nil
		}
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []map[string]interface{}{
					// Match on address.parts (standard analyzer — finds space-separated pincodes)
					{"match": map[string]interface{}{
						"address.parts": digits,
					}},
					// Match on address base field (address_analyzer)
					{"match": map[string]interface{}{
						"address": digits,
					}},
					// Also search alt_address
					{"match": map[string]interface{}{
						"alt_address.parts": digits,
					}},
					{"match": map[string]interface{}{
						"alt_address": digits,
					}},
				},
				"minimum_should_match": 1,
			},
		}
	}

	// --- Circle — keyword term match ---
	if osField == "circle" {
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []map[string]interface{}{
					{"term": map[string]interface{}{osField: valueLower}},
					{"prefix": map[string]interface{}{osField: valueLower}},
				},
				"minimum_should_match": 1,
			},
		}
	}

	// Default: term match
	return map[string]interface{}{
		"term": map[string]interface{}{
			osField: map[string]interface{}{
				"value":            valueLower,
				"case_insensitive": true,
			},
		},
	}
}

// addRegionFilter adds delhi-ncr region filter to the query
func addRegionFilter(query map[string]interface{}) map[string]interface{} {
	boolQuery, exists := query["bool"].(map[string]interface{})
	if !exists {
		originalQuery := make(map[string]interface{})
		for k, v := range query {
			originalQuery[k] = v
		}
		boolQuery = make(map[string]interface{})
		if len(originalQuery) > 0 {
			boolQuery["must"] = []map[string]interface{}{originalQuery}
		}
		query = map[string]interface{}{
			"bool": boolQuery,
		}
	}

	filters, _ := boolQuery["filter"].([]map[string]interface{})
	filters = append(filters, map[string]interface{}{
		"term": map[string]interface{}{
			"region": "delhi-ncr",
		},
	})
	boolQuery["filter"] = filters

	return query
}

// -----------------------------------------------------------------------
// OpenSearch execution
// -----------------------------------------------------------------------

// osDocToFinonePerson converts an OpenSearch _source document to a finone Person model
func osDocToFinonePerson(raw json.RawMessage) (models.Person, error) {
	var doc struct {
		Mobile     string `json:"mobile"`
		Name       string `json:"name"`
		Fname      string `json:"fname"`
		Address    string `json:"address"`
		AltAddress string `json:"alt_address"`
		Alt        string `json:"alt"`
		ID         string `json:"id"`
		OID        string `json:"oid"`
		Email      string `json:"email"`
		Circle     string `json:"circle"`
		Region     string `json:"region"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		return models.Person{}, err
	}

	masterID := doc.ID
	if masterID == "" {
		masterID = doc.OID
	}

	return models.Person{
		ID:       doc.OID,
		MasterID: masterID,
		Mobile:   doc.Mobile,
		Name:     doc.Name,
		FName:    doc.Fname,
		Address:  doc.Address,
		Alt:      doc.Alt,
		Circle:   doc.Circle,
		Email:    doc.Email,
	}, nil
}

// executeOpenSearch runs a search body against OpenSearch and returns parsed hits + total
func executeOpenSearch(body map[string]interface{}, timeoutSeconds int) ([]models.Person, int, int, error) {
	bodyJSON, _ := json.Marshal(body)
	utils.LogInfo(fmt.Sprintf("OpenSearch query: %s", string(bodyJSON)))

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	startTime := time.Now()
	resp, err := database.OpenSearchAPI.Search(
		ctx,
		&opensearchapi.SearchReq{
			Indices: database.OpenSearchIndices,
			Body:    bytes.NewReader(bodyJSON),
			Params: opensearchapi.SearchParams{
				RequestCache: opensearchapi.ToPointer(true),
			},
		},
	)
	queryDuration := time.Since(startTime)

	if err != nil {
		utils.LogError(fmt.Sprintf("OpenSearch query failed after %v", queryDuration), err)
		return nil, 0, int(queryDuration.Milliseconds()), fmt.Errorf("search failed: %w", err)
	}

	utils.LogInfo(fmt.Sprintf("OpenSearch completed in %v (took: %dms, total hits: %d)",
		queryDuration, resp.Took, resp.Hits.Total.Value))

	var persons []models.Person
	for _, hit := range resp.Hits.Hits {
		p, err := osDocToFinonePerson(hit.Source)
		if err != nil {
			utils.LogError("Failed to parse OpenSearch document", err)
			continue
		}
		persons = append(persons, p)
	}

	return persons, resp.Hits.Total.Value, int(queryDuration.Milliseconds()), nil
}

// -----------------------------------------------------------------------
// Public search methods
// -----------------------------------------------------------------------

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
		"id":        true,
		"oid":       true,
		"pincode":   true,
	}
	return validFields[field]
}

// Search performs a search operation using OpenSearch
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

		s.logSearch(userID, req, cached.TotalCount, cached.ExecutionTime, searchID, fingerprint)

		start := req.Offset
		if start > len(cached.Results) {
			start = len(cached.Results)
		}
		end := start + req.Limit
		if end > len(cached.Results) {
			end = len(cached.Results)
		}
		pageResults := cached.Results[start:end]

		return &models.SearchResponse{
			Results:       pageResults,
			TotalCount:    cached.TotalCount,
			ExecutionTime: cached.ExecutionTime,
			SearchID:      searchID,
			HasMore:       (req.Offset + len(pageResults)) < cached.TotalCount,
		}, nil
	}

	// Auto-detect mobile number searches
	if s.shouldUseEnhancedMobileSearch(req) {
		utils.LogInfo("Detected mobile number pattern, using enhanced mobile search")

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
			} else {
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

	searchID := uuid.New().String()

	// Build the OpenSearch query
	query := s.buildOpenSearchQuery(req)

	// Add region filter
	query = addRegionFilter(query)

	// Pagination
	size := req.Limit
	if size <= 0 {
		size = 1000
	}
	if size > 10000 {
		size = 10000
	}
	from := req.Offset
	if from < 0 {
		from = 0
	}

	searchBody := map[string]interface{}{
		"query":   query,
		"size":    size,
		"from":    from,
		"_source": true,
		"timeout": "15s",
		"sort": []map[string]interface{}{
			{"_score": map[string]string{"order": "desc"}},
		},
	}

	results, totalCount, executionTime, err := executeOpenSearch(searchBody, 30)
	if err != nil {
		utils.LogError("Search query failed", err)
		return nil, fmt.Errorf("search failed: %w", err)
	}

	hasMore := (req.Offset + len(results)) < totalCount

	// Cache the result
	s.setCachedResult(fingerprint, results, totalCount, executionTime)

	// Check for duplicates
	isDup, _ := s.isDuplicateSearchToday(userID, fingerprint)

	// Log the search
	s.logSearch(userID, req, len(results), executionTime, searchID, fingerprint)

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

// buildOpenSearchQuery constructs the OpenSearch query from the search request.
// The frontend sends field_queries like {"name": "john", "mobile": "98765", "email": "foo@bar.com"}
// and logic "AND" or "OR" to combine them.
func (s *SearchService) buildOpenSearchQuery(req *models.SearchRequest) map[string]interface{} {
	var clauses []map[string]interface{}

	// Primary method: field_queries map (each key → separate field query)
	if len(req.FieldQueries) > 0 {
		for field, value := range req.FieldQueries {
			if !s.isValidField(field) {
				continue
			}
			val := strings.TrimSpace(value)
			if val == "" {
				continue
			}
			q := buildFieldQuery(field, val)
			if q != nil {
				clauses = append(clauses, q)
			}
		}
	}

	// Fallback: fields array with single query string
	if len(clauses) == 0 && len(req.Fields) > 0 && strings.TrimSpace(req.Query) != "" {
		for _, field := range req.Fields {
			if !s.isValidField(field) {
				continue
			}
			q := buildFieldQuery(field, req.Query)
			if q != nil {
				clauses = append(clauses, q)
			}
		}
	}

	// Fallback: search all fields
	if len(clauses) == 0 {
		queryTerm := strings.TrimSpace(req.Query)
		if queryTerm == "" {
			return map[string]interface{}{
				"match_none": map[string]interface{}{},
			}
		}

		allFields := []string{"mobile", "name", "fname", "address", "alt", "circle", "email", "id"}
		for _, field := range allFields {
			q := buildFieldQuery(field, queryTerm)
			if q != nil {
				clauses = append(clauses, q)
			}
		}
	}

	if len(clauses) == 0 {
		return map[string]interface{}{
			"match_none": map[string]interface{}{},
		}
	}

	// Join conditions with AND/OR logic
	operator := "should"
	if strings.ToUpper(req.Logic) == "AND" {
		operator = "must"
	}

	boolQ := map[string]interface{}{
		operator: clauses,
	}

	// For "should" (OR), set minimum_should_match to 1 to require at least one match
	if operator == "should" {
		boolQ["minimum_should_match"] = 1
	}

	return map[string]interface{}{
		"bool": boolQ,
	}
}

// GetPersonByID retrieves a person by ID using OpenSearch
func (s *SearchService) GetPersonByID(id string) (*models.Person, error) {
	query := map[string]interface{}{
		"bool": map[string]interface{}{
			"should": []map[string]interface{}{
				{"term": map[string]interface{}{"id": strings.ToLower(id)}},
				{"term": map[string]interface{}{"oid": strings.ToLower(id)}},
			},
			"minimum_should_match": 1,
		},
	}

	query = addRegionFilter(query)

	searchBody := map[string]interface{}{
		"query":   query,
		"size":    1,
		"_source": true,
	}

	results, _, _, err := executeOpenSearch(searchBody, 10)
	if err != nil {
		return nil, fmt.Errorf("person not found: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("person not found")
	}

	return &results[0], nil
}

// GetSearchStats returns search statistics from PostgreSQL
func (s *SearchService) GetSearchStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	perfQuery := `SELECT COALESCE(AVG(execution_time_ms), 0), COUNT(*)
	              FROM searches
	              WHERE search_time >= NOW() - INTERVAL '1 day'`
	var avgTime float64
	var searchCount int64
	err := database.PostgresDB.QueryRow(perfQuery).Scan(&avgTime, &searchCount)
	if err != nil {
		utils.LogError("Failed to get search performance stats", err)
		avgTime = 0
		searchCount = 0
	}

	stats["avg_search_time_ms"] = avgTime
	stats["searches_last_24h"] = searchCount

	countBody := map[string]interface{}{
		"query": addRegionFilter(map[string]interface{}{
			"match_all": map[string]interface{}{},
		}),
		"size":             0,
		"track_total_hits": true,
	}
	_, totalRecords, _, err := executeOpenSearch(countBody, 10)
	if err != nil {
		utils.LogError("Failed to count total records", err)
		totalRecords = 0
	}
	stats["total_records"] = totalRecords

	return stats, nil
}

// logSearch logs a search operation to PostgreSQL
func (s *SearchService) logSearch(userID uuid.UUID, req *models.SearchRequest, resultCount, executionTime int, searchID, fingerprint string) {
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

// isMobileNumber checks if a string looks like a mobile number
func (s *SearchService) isMobileNumber(query string) bool {
	cleaned := regexp.MustCompile(`\D`).ReplaceAllString(query, "")
	return len(cleaned) >= 10 && len(cleaned) <= 12
}

func (s *SearchService) shouldUseEnhancedMobileSearch(req *models.SearchRequest) bool {
	if req.EnhancedMobile {
		return true
	}

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
		return false
	}

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

	if s.isMobileNumber(req.Query) {
		return true
	}

	return false
}

func (s *SearchService) extractMobileNumber(req *models.SearchRequest) string {
	if len(req.FieldQueries) > 0 {
		for field, value := range req.FieldQueries {
			if (field == "mobile" || field == "alt") && s.isMobileNumber(value) {
				return value
			}
		}
	}

	if s.isMobileNumber(req.Query) {
		return req.Query
	}

	return ""
}

// EnhancedMobileSearch performs an enhanced mobile number search using OpenSearch
func (s *SearchService) EnhancedMobileSearch(userID uuid.UUID, req *models.EnhancedMobileSearchRequest) (*models.EnhancedMobileSearchResponse, error) {
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

	cleanedMobile := regexp.MustCompile(`\D`).ReplaceAllString(req.MobileNumber, "")
	utils.LogInfo(fmt.Sprintf("Enhanced mobile search for: %s (cleaned: %s)", req.MobileNumber, cleanedMobile))

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

	// Step 1: Direct mobile/alt search
	initialQuery := map[string]interface{}{
		"bool": map[string]interface{}{
			"should": []map[string]interface{}{
				{"term": map[string]interface{}{"mobile": strings.ToLower(cleanedMobile)}},
				{"term": map[string]interface{}{"alt": strings.ToLower(cleanedMobile)}},
			},
			"minimum_should_match": 1,
		},
	}
	initialQuery = addRegionFilter(initialQuery)

	initialBody := map[string]interface{}{
		"query":   initialQuery,
		"size":    100,
		"_source": true,
		"timeout": "5s",
	}

	initialResults, _, _, err := executeOpenSearch(initialBody, 10)
	if err != nil {
		return nil, fmt.Errorf("initial mobile search failed: %w", err)
	}

	if len(initialResults) == 0 {
		executionTime := int(time.Since(startTime).Milliseconds())
		return &models.EnhancedMobileSearchResponse{
			DirectMatches:        []models.Person{},
			MasterIDMatches:      []models.Person{},
			TotalDirectMatches:   0,
			TotalMasterIDMatches: 0,
			TotalCount:           0,
			ExecutionTime:        executionTime,
			SearchID:             searchID,
			HasMore:              false,
			MasterIDs:            []string{},
		}, nil
	}

	// Step 2: Collect master IDs from initial results
	masterIDSet := make(map[string]bool)
	for _, p := range initialResults {
		if p.MasterID != "" && isValidMasterID(p.MasterID) {
			masterIDSet[p.MasterID] = true
		}
	}

	// Step 3: Build comprehensive query
	var comprehensiveShould []map[string]interface{}

	// Direct mobile/alt with boost
	comprehensiveShould = append(comprehensiveShould, map[string]interface{}{
		"bool": map[string]interface{}{
			"should": []map[string]interface{}{
				{"term": map[string]interface{}{"mobile": strings.ToLower(cleanedMobile)}},
				{"term": map[string]interface{}{"alt": strings.ToLower(cleanedMobile)}},
			},
			"minimum_should_match": 1,
			"boost":                3.0,
		},
	})

	// Master ID searches
	if len(masterIDSet) > 0 {
		for masterID := range masterIDSet {
			comprehensiveShould = append(comprehensiveShould, map[string]interface{}{
				"bool": map[string]interface{}{
					"should": []map[string]interface{}{
						{"term": map[string]interface{}{"id": masterID}},
						{"prefix": map[string]interface{}{"id": masterID}},
					},
					"minimum_should_match": 1,
					"boost":                2.0,
				},
			})
		}
	} else {
		// Fallback: name+fname+address matching
		for _, doc := range initialResults {
			if doc.Name != "" && doc.FName != "" && doc.Address != "" {
				comprehensiveShould = append(comprehensiveShould, map[string]interface{}{
					"bool": map[string]interface{}{
						"must": []map[string]interface{}{
							{"term": map[string]interface{}{"name.keyword": map[string]interface{}{"value": strings.TrimSpace(doc.Name), "case_insensitive": true}}},
							{"term": map[string]interface{}{"fname.keyword": map[string]interface{}{"value": strings.TrimSpace(doc.FName), "case_insensitive": true}}},
						},
						"boost": 1.5,
					},
				})
			}
		}
	}

	comprehensiveQuery := map[string]interface{}{
		"bool": map[string]interface{}{
			"should":               comprehensiveShould,
			"minimum_should_match": 1,
		},
	}
	comprehensiveQuery = addRegionFilter(comprehensiveQuery)

	pageLimit := req.Limit
	if pageLimit <= 0 {
		pageLimit = 1000
	}

	comprehensiveSize := 500
	if len(masterIDSet) == 0 {
		comprehensiveSize = 100
	}

	comprehensiveBody := map[string]interface{}{
		"query":            comprehensiveQuery,
		"size":             comprehensiveSize,
		"track_total_hits": comprehensiveSize,
		"_source":          true,
		"timeout":          "10s",
		"sort": []map[string]interface{}{
			{"_score": map[string]string{"order": "desc"}},
		},
	}

	allResults, totalCount, _, err := executeOpenSearch(comprehensiveBody, 15)
	if err != nil {
		utils.LogError("Comprehensive search failed, using initial results", err)
		allResults = initialResults
		totalCount = len(initialResults)
	}

	// Apply pagination
	start := req.Offset
	if start > len(allResults) {
		start = len(allResults)
	}
	end := start + pageLimit
	if end > len(allResults) {
		end = len(allResults)
	}
	pageResults := allResults[start:end]
	hasMore := end < totalCount

	executionTime := int(time.Since(startTime).Milliseconds())

	s.setCachedResult(cacheKey, allResults, totalCount, executionTime)

	if totalCount > 0 {
		if err := authService.IncrementSearchCount(userID); err != nil {
			utils.LogError("Failed to increment search count", err)
		}
	}

	masterIDs := make([]string, 0, len(masterIDSet))
	for id := range masterIDSet {
		masterIDs = append(masterIDs, id)
	}

	return &models.EnhancedMobileSearchResponse{
		DirectMatches:        pageResults,
		MasterIDMatches:      []models.Person{},
		TotalDirectMatches:   totalCount,
		TotalMasterIDMatches: 0,
		TotalCount:           totalCount,
		ExecutionTime:        executionTime,
		SearchID:             searchID,
		HasMore:              hasMore,
		MasterIDs:            masterIDs,
	}, nil
}

// isValidMasterID checks if a Master ID is valid (not masked with 'x' characters)
func isValidMasterID(masterID string) bool {
	if masterID == "" {
		return false
	}
	xCount := 0
	totalChars := len(masterID)
	for _, ch := range strings.ToLower(masterID) {
		if ch == 'x' {
			xCount++
		}
	}
	if totalChars > 0 && float64(xCount)/float64(totalChars) > 0.3 {
		return false
	}
	if totalChars >= 4 && strings.HasPrefix(strings.ToLower(masterID), "xxxx") {
		return false
	}
	if totalChars < 8 {
		return false
	}
	return true
}

// BuildSearchQuery builds and returns the OpenSearch query body (used by export handler)
func (s *SearchService) BuildSearchQuery(req *models.SearchRequest, limit int, offset int) (map[string]interface{}, error) {
	r := *req
	if limit > 0 {
		r.Limit = limit
	}
	if offset >= 0 {
		r.Offset = offset
	}

	query := s.buildOpenSearchQuery(&r)
	query = addRegionFilter(query)

	size := r.Limit
	if size <= 0 {
		size = 25
	}
	from := r.Offset
	if from < 0 {
		from = 0
	}

	return map[string]interface{}{
		"query":   query,
		"size":    size,
		"from":    from,
		"_source": true,
		"timeout": "15s",
		"sort": []map[string]interface{}{
			{"_score": map[string]string{"order": "desc"}},
		},
	}, nil
}

// SearchWithin performs a search within previous search results
func (s *SearchService) SearchWithin(userID uuid.UUID, req *models.SearchWithinRequest) (*models.SearchResponse, error) {
	startTime := time.Now()
	searchID := uuid.New().String()

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

	response.SearchID = searchID
	response.ExecutionTime = int(time.Since(startTime).Milliseconds())

	return response, nil
}
