package handlers

import (
	"net/http"
	"strconv"

	"finone-search-system/models"
	"finone-search-system/services"
	"finone-search-system/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RegistrationHandler struct {
	registrationService *services.RegistrationService
}

func NewRegistrationHandler() *RegistrationHandler {
	return &RegistrationHandler{
		registrationService: services.NewRegistrationService(),
	}
}

// CreateRegistrationRequest handles user registration requests (public endpoint)
func (h *RegistrationHandler) CreateRegistrationRequest(c *gin.Context) {
	var req models.CreateRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate request
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}
	if req.PhoneNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number is required"})
		return
	}
	if req.RequestedSearches <= 0 || req.RequestedSearches > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Requested searches must be between 1 and 10000"})
		return
	}

	registrationRequest, err := h.registrationService.CreateRegistrationRequest(req)
	if err != nil {
		utils.LogError("Failed to create registration request", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	utils.LogInfo("Registration request created: " + req.Email)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration request submitted successfully. You will be contacted by our admin team.",
		"request": registrationRequest,
	})
}

// GetRegistrationRequests handles getting paginated list of registration requests (admin only)
func (h *RegistrationHandler) GetRegistrationRequests(c *gin.Context) {
	// Parse pagination parameters
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	status := c.Query("status") // Optional filter by status

	response, err := h.registrationService.GetRegistrationRequests(page, limit, status)
	if err != nil {
		utils.LogError("Failed to get registration requests", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get registration requests"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetRegistrationRequest handles getting a single registration request (admin only)
func (h *RegistrationHandler) GetRegistrationRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	request, err := h.registrationService.GetRegistrationRequest(id)
	if err != nil {
		utils.LogError("Failed to get registration request", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration request not found"})
		return
	}

	c.JSON(http.StatusOK, request)
}

// UpdateRegistrationRequest handles updating a registration request status (admin only)
func (h *RegistrationHandler) UpdateRegistrationRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var req models.UpdateRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate status
	if req.Status != "APPROVED" && req.Status != "REJECTED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be APPROVED or REJECTED"})
		return
	}

	// Get admin user ID from context
	adminUserInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	adminUser, ok := adminUserInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user type in context"})
		return
	}

	updatedRequest, err := h.registrationService.UpdateRegistrationRequest(id, req, adminUser.ID)
	if err != nil {
		utils.LogError("Failed to update registration request", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message := "Registration request updated successfully"
	if req.Status == "APPROVED" {
		message = "Registration request approved successfully. You can now create a user account from the User Management section."
	} else if req.Status == "REJECTED" {
		message = "Registration request rejected successfully"
	}

	utils.LogInfo("Registration request updated: " + updatedRequest.Email + " -> " + req.Status)
	c.JSON(http.StatusOK, gin.H{
		"message": message,
		"request": updatedRequest,
	})
}

// DeleteRegistrationRequest handles deleting a registration request (admin only)
func (h *RegistrationHandler) DeleteRegistrationRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	err = h.registrationService.DeleteRegistrationRequest(id)
	if err != nil {
		utils.LogError("Failed to delete registration request", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	utils.LogInfo("Registration request deleted: " + idStr)
	c.JSON(http.StatusOK, gin.H{"message": "Registration request deleted successfully"})
}
