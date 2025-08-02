package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"finone-search-system/models"
	"finone-search-system/services"
	"finone-search-system/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	authService *services.AuthService
}

func NewUserHandler() *UserHandler {
	return &UserHandler{
		authService: services.NewAuthService(),
	}
}

// Login handles user authentication
func (h *UserHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	response, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.LogError("Login failed", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	utils.LogInfo("User logged in successfully: " + req.Email)
	c.JSON(http.StatusOK, response)
}

// CreateUser handles user creation (admin only)
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	user, err := h.authService.CreateUser(&req)
	if err != nil {
		utils.LogError("Failed to create user", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	utils.LogInfo("User created successfully: " + user.Email)
	c.JSON(http.StatusCreated, user)
}

// GetUsers handles retrieving paginated list of users (admin only)
func (h *UserHandler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	response, err := h.authService.GetUsers(page, limit)
	if err != nil {
		utils.LogError("Failed to get users", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetUser handles retrieving a specific user (admin only)
func (h *UserHandler) GetUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		utils.LogError("Failed to get user", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateUser handles updating user information (admin only)
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	user, err := h.authService.UpdateUser(userID, &req)
	if err != nil {
		utils.LogError("Failed to update user", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	utils.LogInfo("User updated successfully: " + user.Email)
	c.JSON(http.StatusOK, user)
}

// GetProfile handles retrieving current user's profile
func (h *UserHandler) GetProfile(c *gin.Context) {
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

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		utils.LogError("Failed to get user profile", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// Logout handles user logout (invalidates session)
func (h *UserHandler) Logout(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	tokenString, tokenExists := c.Get("token")
	if !tokenExists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token not found in context"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Invalidate the session
	err = h.authService.InvalidateSession(tokenString.(string), userID)
	if err != nil {
		utils.LogError("Failed to invalidate session", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout", "details": err.Error()})
		return
	}

	utils.LogInfo(fmt.Sprintf("User logged out: %s", userID.String()))

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
		"note":    "Session has been invalidated on the server"})
}

// GetUserAnalytics handles retrieving user analytics (admin only)
func (h *UserHandler) GetUserAnalytics(c *gin.Context) {
	analytics, err := h.authService.GetUserAnalytics()
	if err != nil {
		utils.LogError("Failed to get user analytics", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve analytics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"analytics": analytics})
}

// GetMyAnalytics handles retrieving current user's analytics
func (h *UserHandler) GetMyAnalytics(c *gin.Context) {
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

	analytics, err := h.authService.GetUserAnalyticsByID(userID)
	if err != nil {
		utils.LogError("Failed to get user analytics", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve analytics"})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// GetUserSessions handles retrieving user sessions (admin only)
func (h *UserHandler) GetUserSessions(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	sessions, err := h.authService.GetUserSessions(userID)
	if err != nil {
		utils.LogError("Failed to get user sessions", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// GetAllActiveSessions handles retrieving all active sessions (admin only)
func (h *UserHandler) GetAllActiveSessions(c *gin.Context) {
	sessions, err := h.authService.GetAllActiveSessions()
	if err != nil {
		utils.LogError("Failed to get active sessions", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// InvalidateUserSessions handles invalidating all sessions for a user (admin only)
func (h *UserHandler) InvalidateUserSessions(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.authService.InvalidateAllUserSessions(userID)
	if err != nil {
		utils.LogError("Failed to invalidate user sessions", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invalidate sessions"})
		return
	}

	utils.LogInfo(fmt.Sprintf("Admin invalidated all sessions for user: %s", userID.String()))
	c.JSON(http.StatusOK, gin.H{"message": "All user sessions invalidated successfully"})
}

// CleanupExpiredSessions handles cleanup of expired sessions (admin only)
func (h *UserHandler) CleanupExpiredSessions(c *gin.Context) {
	err := h.authService.CleanupExpiredSessions()
	if err != nil {
		utils.LogError("Failed to cleanup expired sessions", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expired sessions cleaned up successfully"})
}

// ResetDailySearchCounts handles manual reset of daily search counts (admin only)
func (h *UserHandler) ResetDailySearchCounts(c *gin.Context) {
	schedulerService := services.NewSchedulerService()

	err := schedulerService.ManualReset()
	if err != nil {
		utils.LogError("Failed to reset daily search counts", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset daily search counts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Daily search counts reset successfully",
		"note":    "All users' daily search counts have been reset to 0",
	})
}

// GetNextResetTime returns when the next automatic reset will occur (admin only)
func (h *UserHandler) GetNextResetTime(c *gin.Context) {
	schedulerService := services.NewSchedulerService()
	nextReset := schedulerService.GetNextResetTime()

	c.JSON(http.StatusOK, gin.H{
		"next_reset_time":  nextReset.Format("2006-01-02 15:04:05 IST"),
		"next_reset_unix":  nextReset.Unix(),
		"time_until_reset": time.Until(nextReset).String(),
	})
}
