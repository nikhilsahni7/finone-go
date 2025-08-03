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

type PasswordChangeHandler struct {
	passwordChangeService *services.PasswordChangeService
}

func NewPasswordChangeHandler() *PasswordChangeHandler {
	return &PasswordChangeHandler{
		passwordChangeService: services.NewPasswordChangeService(),
	}
}

// CreatePasswordChangeRequest creates a new password change request
func (h *PasswordChangeHandler) CreatePasswordChangeRequest(c *gin.Context) {
	var req models.CreatePasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate required fields
	if req.Reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reason is required"})
		return
	}

	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	user, ok := userInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user type in context"})
		return
	}

	// Create password change request
	passwordChangeRequest, err := h.passwordChangeService.CreatePasswordChangeRequest(
		user.ID,
		user.Name,
		user.Email,
		req,
	)
	if err != nil {
		utils.LogError("Failed to create password change request", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	utils.LogInfo("Password change request created by user: " + user.ID.String())
	c.JSON(http.StatusCreated, passwordChangeRequest)
}

// GetPasswordChangeRequests gets paginated list of password change requests (admin only)
func (h *PasswordChangeHandler) GetPasswordChangeRequests(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// Get password change requests
	response, err := h.passwordChangeService.GetPasswordChangeRequests(page, limit, status)
	if err != nil {
		utils.LogError("Failed to get password change requests", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get password change requests"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetPasswordChangeRequest gets a single password change request by ID
func (h *PasswordChangeHandler) GetPasswordChangeRequest(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid password change request ID"})
		return
	}

	passwordChangeRequest, err := h.passwordChangeService.GetPasswordChangeRequest(id)
	if err != nil {
		utils.LogError("Failed to get password change request", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Password change request not found"})
		return
	}

	c.JSON(http.StatusOK, passwordChangeRequest)
}

// UpdatePasswordChangeRequest updates a password change request status (admin only)
func (h *PasswordChangeHandler) UpdatePasswordChangeRequest(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid password change request ID"})
		return
	}

	var req models.UpdatePasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate status
	if req.Status != "APPROVED" && req.Status != "REJECTED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be either 'APPROVED' or 'REJECTED'"})
		return
	}

	// Get admin user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	user, ok := userInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user type in context"})
		return
	}

	// Update password change request
	updatedRequest, err := h.passwordChangeService.UpdatePasswordChangeRequest(id, req, user.ID)
	if err != nil {
		utils.LogError("Failed to update password change request", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	utils.LogInfo("Password change request updated by admin: " + user.ID.String())
	c.JSON(http.StatusOK, updatedRequest)
}

// GetUserPasswordChangeRequests gets password change requests for the authenticated user
func (h *PasswordChangeHandler) GetUserPasswordChangeRequests(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// Get user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	user, ok := userInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user type in context"})
		return
	}

	// Get user's password change requests
	response, err := h.passwordChangeService.GetUserPasswordChangeRequests(user.ID, page, limit)
	if err != nil {
		utils.LogError("Failed to get user password change requests", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get password change requests"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// DeletePasswordChangeRequest deletes a password change request (admin only)
func (h *PasswordChangeHandler) DeletePasswordChangeRequest(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid password change request ID"})
		return
	}

	// Get admin user from context
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	user, ok := userInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user type in context"})
		return
	}

	err = h.passwordChangeService.DeletePasswordChangeRequest(id)
	if err != nil {
		utils.LogError("Failed to delete password change request", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	utils.LogInfo("Password change request deleted by admin: " + user.ID.String())
	c.JSON(http.StatusOK, gin.H{"message": "Password change request deleted successfully"})
}
