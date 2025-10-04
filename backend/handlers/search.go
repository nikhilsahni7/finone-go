package handlers

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"finone-search-system/database"
	"finone-search-system/models"
	"finone-search-system/services"
	"finone-search-system/utils"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SearchHandler struct {
	searchService *services.SearchService
}

func NewSearchHandler() *SearchHandler {
	return &SearchHandler{
		searchService: services.NewSearchService(),
	}
}

// Search handles search requests
func (h *SearchHandler) Search(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Debug logging to see what we received
	utils.LogInfo(fmt.Sprintf("Raw request received - Query: %s, Fields: %v, FieldQueries: %v, Logic: %s",
		req.Query, req.Fields, req.FieldQueries, req.Logic))

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 1000
	}
	if req.Limit > 10000 {
		req.Limit = 10000 // Max limit from config
	}
	if req.Logic == "" {
		req.Logic = "AND"
	}
	if req.MatchType == "" {
		req.MatchType = "partial"
	}

	// Debug logging
	utils.LogInfo(fmt.Sprintf("Search request - Query: %s, Logic: %s, Fields: %v, Limit: %d",
		req.Query, req.Logic, req.Fields, req.Limit))

	response, err := h.searchService.Search(userID, &req)
	if err != nil {
		utils.LogError("Search failed", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	// Add message if no results found
	if response.TotalCount == 0 {
		utils.LogInfo("Search completed successfully - No results found")
		// Create response with no results message
		responseWithMessage := gin.H{
			"results":           response.Results,
			"total_count":       response.TotalCount,
			"execution_time_ms": response.ExecutionTime,
			"search_id":         response.SearchID,
			"has_more":          response.HasMore,
			"message":           "No results found for your search criteria",
		}
		c.JSON(http.StatusOK, responseWithMessage)
		return
	}

	utils.LogInfo("Search completed successfully")
	c.JSON(http.StatusOK, response)
}

// GetPerson handles retrieving a specific person by ID
func (h *SearchHandler) GetPerson(c *gin.Context) {
	personID := c.Param("id")
	if personID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Person ID is required"})
		return
	}

	person, err := h.searchService.GetPersonByID(personID)
	if err != nil {
		utils.LogError("Failed to get person", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Person not found"})
		return
	}

	c.JSON(http.StatusOK, person)
}

// GetStats handles retrieving search statistics
func (h *SearchHandler) GetStats(c *gin.Context) {
	stats, err := h.searchService.GetSearchStats()
	if err != nil {
		utils.LogError("Failed to get search stats", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve statistics"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ImportCSV handles CSV file import (admin only)
func (h *SearchHandler) ImportCSV(c *gin.Context) {
	// Get file from form data
	file, header, err := c.Request.FormFile("csv_file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Get batch size from form (optional)
	batchSizeStr := c.DefaultPostForm("batch_size", "100000")
	batchSize, err := strconv.Atoi(batchSizeStr)
	if err != nil || batchSize < 1000 {
		batchSize = 100000
	}

	// Get has_header flag
	hasHeader := c.DefaultPostForm("has_header", "true") == "true"

	utils.LogInfo("Starting CSV import: " + header.Filename)

	// Save uploaded file temporarily
	tempFilePath := "/tmp/" + header.Filename
	if err := c.SaveUploadedFile(header, tempFilePath); err != nil {
		utils.LogError("Failed to save uploaded file", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Ensure temp file cleanup regardless of success or failure
	defer func() {
		if err := os.Remove(tempFilePath); err != nil {
			utils.LogError("Failed to cleanup temp file: "+tempFilePath, err)
		} else {
			utils.LogInfo("Cleaned up temp file: " + tempFilePath)
		}
	}()

	// Process the CSV file
	processor := utils.NewCSVProcessor(batchSize, "/tmp")
	response, err := processor.ProcessCSVFile(tempFilePath, hasHeader)
	if err != nil {
		utils.LogError("CSV processing failed", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "CSV processing failed"})
		return
	}

	utils.LogInfo("CSV import completed successfully")
	c.JSON(http.StatusOK, response)
}

// ImportCSVFromPath handles CSV file import from direct file path (admin only)
func (h *SearchHandler) ImportCSVFromPath(c *gin.Context) {
	var req struct {
		FilePath  string `json:"file_path" validate:"required"`
		BatchSize int    `json:"batch_size"`
		HasHeader bool   `json:"has_header"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Set defaults - optimize for large files
	if req.BatchSize == 0 {
		req.BatchSize = 1000000 // 1 million rows per batch for better performance
	}

	utils.LogInfo(fmt.Sprintf("Starting CSV import from path: %s (batch size: %d)", req.FilePath, req.BatchSize))

	// Check if file exists
	if _, err := os.Stat(req.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File not found: " + req.FilePath})
		return
	}

	// Process the CSV file directly (no temp file needed)
	processor := utils.NewCSVProcessor(req.BatchSize, "/tmp")
	response, err := processor.ProcessCSVFile(req.FilePath, req.HasHeader)
	if err != nil {
		utils.LogError("CSV processing failed", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "CSV processing failed"})
		return
	}

	utils.LogInfo("CSV import completed successfully")
	c.JSON(http.StatusOK, response)
}

// ExportSearchResults handles exporting search results to CSV
func (h *SearchHandler) ExportSearchResults(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Enforce daily export limit
	authService := services.NewAuthService()
	canExport, err := authService.CheckExportLimit(userID)
	if err != nil {
		utils.LogError("Failed to check export limit", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate export quota"})
		return
	}
	if !canExport {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Daily export limit reached"})
		return
	}

	// Ensure downloads directory exists
	downloadDir := "./downloads"
	if err := os.MkdirAll(downloadDir, 0755); err != nil {
		utils.LogError("Failed to create downloads directory", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare export directory"})
		return
	}

	// Build filename
	if req.FileName == "" {
		req.FileName = fmt.Sprintf("search_export_%s_%d.csv", userID.String(), time.Now().Unix())
	}
	filePath := filepath.Join(downloadDir, req.FileName)

	file, err := os.Create(filePath)
	if err != nil {
		utils.LogError("Failed to create export file", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create export file"})
		return
	}
	defer file.Close()

	csvWriter := csv.NewWriter(file)
	defer csvWriter.Flush()

	// CSV header (exclude master_id, add meta columns)
	header := []string{"query_index", "query_time", "query_text", "id", "mobile", "name", "fname", "address", "alt", "circle", "email"}
	if err := csvWriter.Write(header); err != nil {
		utils.LogError("Failed to write CSV header", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV"})
		return
	}

	rowsWritten := 0

	// Helper to dump up to 25 rows for a given SearchRequest and metadata
	dumpQueryResults := func(idx int, when time.Time, sr *models.SearchRequest) error {
		// Use limit 25 regardless of original
		query, args := h.searchService.BuildSearchSQL(sr, 25, 0)

		// Execute in ClickHouse directly
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()
		var results []models.Person
		if err := database.ClickHouseDB.Select(ctx, &results, query, args...); err != nil {
			return fmt.Errorf("failed query for export: %w", err)
		}

		// Write rows
		for _, p := range results {
			row := []string{
				fmt.Sprintf("%d", idx),
				when.Format(time.RFC3339),
				sr.Query,
				p.ID,
				p.Mobile,
				p.Name,
				p.FName,
				p.Address,
				p.Alt,
				p.Circle,
				p.Email,
			}
			if err := csvWriter.Write(row); err != nil {
				return fmt.Errorf("failed to write CSV row: %w", err)
			}
			rowsWritten++
		}
		return nil
	}

	// Export strategy
	if req.Scope == "today" {
		// Retrieve today's searches for this user (ordered by time)
		istNow := time.Now().Add(5*time.Hour + 30*time.Minute)
		today := istNow.Format("2006-01-02")
		var searches []models.Search
		q := `SELECT id, user_id, search_query, search_time, result_count, execution_time_ms FROM searches WHERE user_id = $1 AND search_time::date = $2 ORDER BY search_time ASC`
		if err := database.PostgresDB.Select(&searches, q, userID, today); err != nil {
			utils.LogError("Failed to load today's searches", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load searches"})
			return
		}

		// For each search, parse request and export up to 25
		for i, srec := range searches {
			var sr models.SearchRequest
			// search_query is JSONB (interface{}). Normalize to bytes then unmarshal
			var raw []byte
			switch v := srec.SearchQuery.(type) {
			case []byte:
				raw = v
			case string:
				raw = []byte(v)
			default:
				raw, _ = json.Marshal(srec.SearchQuery)
			}
			if err := json.Unmarshal(raw, &sr); err != nil {
				utils.LogError("Failed to parse stored search query", err)
				// skip bad record
				continue
			}

			// Default defensive values
			if sr.MatchType == "" {
				sr.MatchType = "partial"
			}
			if sr.Logic == "" {
				sr.Logic = "AND"
			}

			if err := dumpQueryResults(i+1, srec.SearchTime, &sr); err != nil {
				utils.LogError("Failed dumping query results", err)
			}
		}
	} else {
		// Fallback: export by provided search_id or query
		if req.SearchID == nil && req.Query == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Either search_id, query, or scope must be provided"})
			return
		}

		if req.Query != nil {
			if req.Query.MatchType == "" {
				req.Query.MatchType = "partial"
			}
			if req.Query.Logic == "" {
				req.Query.Logic = "AND"
			}
			if err := dumpQueryResults(1, time.Now(), req.Query); err != nil {
				utils.LogError("Failed dumping direct query results", err)
			}
		} else if req.SearchID != nil {
			// Load stored search by ID
			sid, err := uuid.Parse(*req.SearchID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid search_id"})
				return
			}
			var srec models.Search
			q := `SELECT id, user_id, search_query, search_time, result_count, execution_time_ms FROM searches WHERE id = $1 AND user_id = $2`
			if err := database.PostgresDB.Get(&srec, q, sid, userID); err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Search not found"})
				return
			}
			var sr models.SearchRequest
			var raw []byte
			switch v := srec.SearchQuery.(type) {
			case []byte:
				raw = v
			case string:
				raw = []byte(v)
			default:
				raw, _ = json.Marshal(srec.SearchQuery)
			}
			if err := json.Unmarshal(raw, &sr); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse stored search"})
				return
			}
			if sr.MatchType == "" {
				sr.MatchType = "partial"
			}
			if sr.Logic == "" {
				sr.Logic = "AND"
			}
			if err := dumpQueryResults(1, srec.SearchTime, &sr); err != nil {
				utils.LogError("Failed dumping search-id results", err)
			}
		}
	}

	// Finalize CSV
	csvWriter.Flush()
	if err := csvWriter.Error(); err != nil {
		utils.LogError("CSV writer error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize CSV"})
		return
	}

	// File stats
	fileInfo, _ := os.Stat(filePath)
	fileSize := int64(0)
	if fileInfo != nil {
		fileSize = fileInfo.Size()
	}

	// Log export and increment daily export count
	_ = authService.IncrementExportCount(userID)

	// Return response with download URL
	downloadURL := "/api/v1/downloads/" + req.FileName
	resp := models.ExportResponse{
		DownloadURL: downloadURL,
		FileName:    req.FileName,
		FileSize:    fileSize,
		RowCount:    rowsWritten,
		ExpiresAt:   time.Now().Add(24 * time.Hour),
	}
	c.JSON(http.StatusOK, resp)
}

// SearchWithin handles searching within previous results
func (h *SearchHandler) SearchWithin(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.SearchWithinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 1000
	}
	if req.Limit > 10000 {
		req.Limit = 10000
	}
	if req.MatchType == "" {
		req.MatchType = "partial"
	}

	response, err := h.searchService.SearchWithin(userID, &req)
	if err != nil {
		utils.LogError("Search within failed", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Add message if no results found
	if response.TotalCount == 0 {
		utils.LogInfo("Search within completed successfully - No results found")
		// Create response with no results message
		responseWithMessage := gin.H{
			"results":           response.Results,
			"total_count":       response.TotalCount,
			"execution_time_ms": response.ExecutionTime,
			"search_id":         response.SearchID,
			"has_more":          response.HasMore,
			"message":           "No results found within previous search results",
		}
		c.JSON(http.StatusOK, responseWithMessage)
		return
	}

	utils.LogInfo("Search within completed successfully")
	c.JSON(http.StatusOK, response)
}

// EnhancedMobileSearch handles enhanced mobile number searches
func (h *SearchHandler) EnhancedMobileSearch(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.EnhancedMobileSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate mobile number
	if req.MobileNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mobile number is required"})
		return
	}

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 1000
	}
	if req.Limit > 10000 {
		req.Limit = 10000
	}

	utils.LogInfo(fmt.Sprintf("Enhanced mobile search request - Mobile: %s, Limit: %d, Offset: %d",
		req.MobileNumber, req.Limit, req.Offset))

	response, err := h.searchService.EnhancedMobileSearch(userID, &req)
	if err != nil {
		utils.LogError("Enhanced mobile search failed", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Enhanced mobile search failed"})
		return
	}

	// Add message if no results found
	if response.TotalCount == 0 {
		utils.LogInfo("Enhanced mobile search completed successfully - No results found")
		// Create response with no results message
		responseWithMessage := gin.H{
			"direct_matches":          response.DirectMatches,
			"master_id_matches":       response.MasterIDMatches,
			"total_direct_matches":    response.TotalDirectMatches,
			"total_master_id_matches": response.TotalMasterIDMatches,
			"total_count":             response.TotalCount,
			"execution_time_ms":       response.ExecutionTime,
			"search_id":               response.SearchID,
			"has_more":                response.HasMore,
			"master_ids":              response.MasterIDs,
			"message":                 fmt.Sprintf("No results found for mobile number: %s", req.MobileNumber),
		}
		c.JSON(http.StatusOK, responseWithMessage)
		return
	}

	utils.LogInfo(fmt.Sprintf("Enhanced mobile search completed successfully - Direct: %d, Master ID: %d",
		len(response.DirectMatches), len(response.MasterIDMatches)))
	c.JSON(http.StatusOK, response)
}
