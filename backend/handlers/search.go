package handlers

import (
	"finone-search-system/models"
	"finone-search-system/services"
	"finone-search-system/utils"
	"fmt"
	"net/http"
	"os"
	"strconv"

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

	// Set defaults
	if req.BatchSize == 0 {
		req.BatchSize = 200000 // Use larger batch for big files
	}

	utils.LogInfo("Starting CSV import from path: " + req.FilePath)

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

	// TODO: Implement export functionality
	// For now, return a placeholder response
	response := models.ExportResponse{
		DownloadURL: "/api/downloads/export_" + userID.String() + ".csv",
		FileName:    "search_results.csv",
		FileSize:    0,
		RowCount:    0,
	}

	c.JSON(http.StatusOK, response)
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

	utils.LogInfo(fmt.Sprintf("Enhanced mobile search completed successfully - Direct: %d, Master ID: %d",
		len(response.DirectMatches), len(response.MasterIDMatches)))
	c.JSON(http.StatusOK, response)
}
