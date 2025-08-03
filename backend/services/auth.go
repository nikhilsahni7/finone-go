package services

import (
	"crypto/sha256"
	"finone-search-system/config"
	"finone-search-system/database"
	"finone-search-system/models"
	"finone-search-system/utils"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

// Login authenticates a user and returns a JWT token with session management
func (s *AuthService) Login(email, password string) (*models.LoginResponse, error) {
	var user models.User
	query := `SELECT * FROM users WHERE email = $1 AND is_active = true`

	err := database.PostgresDB.Get(&user, query, email)
	if err != nil {
		utils.LogError("Failed to find user", err)
		return nil, fmt.Errorf("invalid credentials")
	}

	// Check if user has expired (for DEMO users)
	if user.ExpiresAt != nil && user.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("user account has expired")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		utils.LogError("Password verification failed", err)
		return nil, fmt.Errorf("invalid credentials")
	}

	// Generate JWT token
	token, expiresAt, err := s.generateJWT(user.ID.String(), user.Email, user.Role)
	if err != nil {
		utils.LogError("Failed to generate JWT", err)
		return nil, fmt.Errorf("failed to generate token")
	}

	// Create session record
	sessionID, err := s.createSession(user.ID, token, expiresAt, "127.0.0.1", "")
	if err != nil {
		utils.LogError("Failed to create session", err)
		return nil, fmt.Errorf("failed to create session")
	}

	// Log the login
	s.logLogin(user.ID, "127.0.0.1", "")

	// Remove sensitive data
	user.PasswordHash = ""

	return &models.LoginResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt,
		SessionID: sessionID.String(),
	}, nil
}

// CreateUser creates a new user account
func (s *AuthService) CreateUser(req *models.CreateUserRequest) (*models.User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Set defaults
	if req.Role == "" {
		req.Role = "USER"
	}
	if req.MaxSearchesPerDay == 0 {
		req.MaxSearchesPerDay = config.AppConfig.Limits.MaxSearchesPerDay
	}
	if req.MaxExportsPerDay == 0 {
		req.MaxExportsPerDay = config.AppConfig.Limits.MaxExportsPerDay
	}

	// Set expiry for DEMO users
	if req.UserType == "DEMO" && req.ExpiresAt == nil {
		expiryTime := time.Now().AddDate(0, 0, 30) // 30 days
		req.ExpiresAt = &expiryTime
	}

	user := models.User{
		ID:                uuid.New(),
		Name:              req.Name,
		Email:             req.Email,
		PasswordHash:      string(hashedPassword),
		UserType:          req.UserType,
		Role:              req.Role,
		ExpiresAt:         req.ExpiresAt,
		IsActive:          true,
		MaxSearchesPerDay: req.MaxSearchesPerDay,
		MaxExportsPerDay:  req.MaxExportsPerDay,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	query := `INSERT INTO users
		(id, name, email, password_hash, user_type, role, expires_at, is_active,
		 max_searches_per_day, max_exports_per_day, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err = database.PostgresDB.Exec(query,
		user.ID, user.Name, user.Email, user.PasswordHash, user.UserType,
		user.Role, user.ExpiresAt, user.IsActive, user.MaxSearchesPerDay,
		user.MaxExportsPerDay, user.CreatedAt, user.UpdatedAt)

	if err != nil {
		utils.LogError("Failed to create user", err)
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Remove sensitive data
	user.PasswordHash = ""

	utils.LogInfo(fmt.Sprintf("Created new user: %s (%s)", user.Email, user.UserType))
	return &user, nil
}

// UpdateUser updates user information
func (s *AuthService) UpdateUser(userID uuid.UUID, req *models.UpdateUserRequest) (*models.User, error) {
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}

	if req.Email != nil {
		updates = append(updates, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *req.Email)
		argIndex++
	}

	if req.Password != nil {
		// Hash the new password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
		updates = append(updates, fmt.Sprintf("password_hash = $%d", argIndex))
		args = append(args, string(hashedPassword))
		argIndex++
	}

	if req.UserType != nil {
		updates = append(updates, fmt.Sprintf("user_type = $%d", argIndex))
		args = append(args, *req.UserType)
		argIndex++
	}

	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *req.IsActive)
		argIndex++
	}

	if req.ExpiresAt != nil {
		updates = append(updates, fmt.Sprintf("expires_at = $%d", argIndex))
		args = append(args, *req.ExpiresAt)
		argIndex++
	}

	if req.MaxSearchesPerDay != nil {
		updates = append(updates, fmt.Sprintf("max_searches_per_day = $%d", argIndex))
		args = append(args, *req.MaxSearchesPerDay)
		argIndex++
	}

	if req.MaxExportsPerDay != nil {
		updates = append(updates, fmt.Sprintf("max_exports_per_day = $%d", argIndex))
		args = append(args, *req.MaxExportsPerDay)
		argIndex++
	}

	if len(updates) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	args = append(args, userID)

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d",
		strings.Join(updates, ", "), argIndex)

	_, err := database.PostgresDB.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Fetch updated user
	return s.GetUserByID(userID)
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(userID uuid.UUID) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE id = $1`

	err := database.PostgresDB.Get(&user, query, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	user.PasswordHash = ""
	return &user, nil
}

// GetUsers retrieves paginated list of users
func (s *AuthService) GetUsers(page, limit int) (*models.UserListResponse, error) {
	offset := (page - 1) * limit

	var users []models.User
	query := `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`

	err := database.PostgresDB.Select(&users, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	// Remove password hashes
	for i := range users {
		users[i].PasswordHash = ""
	}

	// Get total count
	var totalCount int
	countQuery := `SELECT COUNT(*) FROM users`
	err = database.PostgresDB.Get(&totalCount, countQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get user count: %w", err)
	}

	return &models.UserListResponse{
		Users:      users,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
	}, nil
}

// generateJWT generates a JWT token for the user
func (s *AuthService) generateJWT(userID, email, role string) (string, time.Time, error) {
	expiresAt := time.Now().Add(config.AppConfig.JWT.Expiry)

	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"role":    role,
		"exp":     expiresAt.Unix(),
		"iat":     time.Now().Unix(),
		"jti":     uuid.New().String(), // JWT ID for uniqueness
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWT.Secret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// ValidateJWT validates a JWT token and returns the claims
func (s *AuthService) ValidateJWT(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(config.AppConfig.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// createSession creates a new session record in the database
func (s *AuthService) createSession(userID uuid.UUID, token string, expiresAt time.Time, ipAddress, userAgent string) (uuid.UUID, error) {
	// Generate session ID
	sessionID := uuid.New()

	// Create hash of the token for storage (for security)
	tokenHash := s.hashToken(token)

	query := `INSERT INTO user_sessions (id, user_id, session_token, created_at, expires_at, is_active, ip_address, user_agent)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := database.PostgresDB.Exec(query, sessionID, userID, tokenHash, time.Now(), expiresAt, true, ipAddress, userAgent)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to create session: %w", err)
	}

	return sessionID, nil
}

// validateSession validates both JWT token and session status
func (s *AuthService) ValidateSession(tokenString string) (*models.User, error) {
	// First validate the JWT token
	claims, err := s.ValidateJWT(tokenString)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID in token")
	}

	// Check if session exists and is active
	tokenHash := s.hashToken(tokenString)
	var session models.UserSession
	sessionQuery := `SELECT * FROM user_sessions WHERE session_token = $1 AND user_id = $2 AND is_active = true AND expires_at > now() AND logged_out_at IS NULL`

	err = database.PostgresDB.Get(&session, sessionQuery, tokenHash, userID)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired session")
	}

	// Get user details and verify user is still active
	var user models.User
	userQuery := `SELECT * FROM users WHERE id = $1 AND is_active = true`
	err = database.PostgresDB.Get(&user, userQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found or inactive")
	}

	// Check if user has expired (for DEMO users)
	if user.ExpiresAt != nil && user.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("user account has expired")
	}

	// Remove sensitive data
	user.PasswordHash = ""

	return &user, nil
}

// invalidateSession invalidates a session (logout)
func (s *AuthService) InvalidateSession(tokenString string, userID uuid.UUID) error {
	tokenHash := s.hashToken(tokenString)

	query := `UPDATE user_sessions
			  SET is_active = false, logged_out_at = now()
			  WHERE session_token = $1 AND user_id = $2 AND is_active = true`

	result, err := database.PostgresDB.Exec(query, tokenHash, userID)
	if err != nil {
		return fmt.Errorf("failed to invalidate session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check session invalidation: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("session not found or already invalidated")
	}

	return nil
}

// invalidateAllUserSessions invalidates all sessions for a user (useful for admin actions)
func (s *AuthService) InvalidateAllUserSessions(userID uuid.UUID) error {
	query := `UPDATE user_sessions
			  SET is_active = false, logged_out_at = now()
			  WHERE user_id = $1 AND is_active = true`

	_, err := database.PostgresDB.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to invalidate user sessions: %w", err)
	}

	return nil
}

// cleanupExpiredSessions removes old expired sessions from database
func (s *AuthService) CleanupExpiredSessions() error {
	query := `DELETE FROM user_sessions
			  WHERE expires_at < now() OR (logged_out_at IS NOT NULL AND logged_out_at < now() - INTERVAL '7 days')`

	result, err := database.PostgresDB.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to cleanup expired sessions: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil {
		utils.LogInfo(fmt.Sprintf("Cleaned up %d expired sessions", rowsAffected))
	}

	return nil
}

// hashToken creates a SHA256 hash of the token for secure storage
func (s *AuthService) hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", hash)
}

// GetUserSessions returns active sessions for a user (admin function)
func (s *AuthService) GetUserSessions(userID uuid.UUID) ([]models.UserSession, error) {
	var sessions []models.UserSession
	query := `SELECT id, user_id, created_at, expires_at, is_active, ip_address, user_agent, logged_out_at
			  FROM user_sessions
			  WHERE user_id = $1
			  ORDER BY created_at DESC`

	err := database.PostgresDB.Select(&sessions, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user sessions: %w", err)
	}

	return sessions, nil
}

// GetAllActiveSessions returns all active sessions (admin function)
func (s *AuthService) GetAllActiveSessions() ([]models.UserSession, error) {
	var sessions []models.UserSession
	query := `SELECT s.id, s.user_id, s.created_at, s.expires_at, s.is_active, s.ip_address, s.user_agent, s.logged_out_at
			  FROM user_sessions s
			  WHERE s.is_active = true AND s.expires_at > now() AND s.logged_out_at IS NULL
			  ORDER BY s.created_at DESC`

	err := database.PostgresDB.Select(&sessions, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get active sessions: %w", err)
	}

	return sessions, nil
}

// logLogin logs a user login
func (s *AuthService) logLogin(userID uuid.UUID, ipAddress, userAgent string) {
	query := `INSERT INTO logins (user_id, ip_address, user_agent) VALUES ($1, $2, $3)`
	_, err := database.PostgresDB.Exec(query, userID, ipAddress, userAgent)
	if err != nil {
		utils.LogError("Failed to log login", err)
	}
}

// CheckSearchLimit checks if user can perform more searches today
func (s *AuthService) CheckSearchLimit(userID uuid.UUID) (bool, error) {
	// Get user's daily limit
	var user models.User
	query := `SELECT max_searches_per_day FROM users WHERE id = $1 AND is_active = true`
	err := database.PostgresDB.Get(&user, query, userID)
	if err != nil {
		return false, fmt.Errorf("failed to get user: %w", err)
	}

	// Get today's search count (IST timezone)
	istNow := time.Now().Add(5*time.Hour + 30*time.Minute) // Convert to IST
	today := istNow.Format("2006-01-02")

	var searchCount int
	countQuery := `SELECT COALESCE(search_count, 0) FROM daily_usage WHERE user_id = $1 AND date = $2`
	err = database.PostgresDB.Get(&searchCount, countQuery, userID, today)
	if err != nil {
		// No record exists yet, so count is 0
		searchCount = 0
	}

	return searchCount < user.MaxSearchesPerDay, nil
}

// IncrementSearchCount increments the user's daily search count
func (s *AuthService) IncrementSearchCount(userID uuid.UUID) error {
	istNow := time.Now().Add(5*time.Hour + 30*time.Minute) // Convert to IST
	today := istNow.Format("2006-01-02")

	query := `INSERT INTO daily_usage (user_id, date, search_count, export_count)
	          VALUES ($1, $2, 1, 0)
	          ON CONFLICT (user_id, date)
	          DO UPDATE SET search_count = daily_usage.search_count + 1`

	_, err := database.PostgresDB.Exec(query, userID, today)
	return err
}

// GetUserAnalytics returns analytics for all users (admin only)
func (s *AuthService) GetUserAnalytics() ([]models.UserAnalytics, error) {
	istNow := time.Now().Add(5*time.Hour + 30*time.Minute)
	today := istNow.Format("2006-01-02")

	query := `
	SELECT
		u.id as user_id,
		u.name,
		u.email,
		COALESCE(total_searches.count, 0) as total_searches,
		COALESCE(today_usage.search_count, 0) as today_searches,
		COALESCE(total_exports.count, 0) as total_exports,
		COALESCE(today_usage.export_count, 0) as today_exports,
		last_login.login_time as last_login,
		last_search.search_time as last_search_time
	FROM users u
	LEFT JOIN (
		SELECT user_id, COUNT(*) as count
		FROM searches
		GROUP BY user_id
	) total_searches ON u.id = total_searches.user_id
	LEFT JOIN (
		SELECT user_id, COUNT(*) as count
		FROM exports
		GROUP BY user_id
	) total_exports ON u.id = total_exports.user_id
	LEFT JOIN (
		SELECT user_id, search_count, export_count
		FROM daily_usage
		WHERE date = $1
	) today_usage ON u.id = today_usage.user_id
	LEFT JOIN (
		SELECT user_id, MAX(login_time) as login_time
		FROM logins
		GROUP BY user_id
	) last_login ON u.id = last_login.user_id
	LEFT JOIN (
		SELECT user_id, MAX(search_time) as search_time
		FROM searches
		GROUP BY user_id
	) last_search ON u.id = last_search.user_id
	ORDER BY u.created_at DESC`

	var analytics []models.UserAnalytics
	err := database.PostgresDB.Select(&analytics, query, today)
	return analytics, err
}

// GetUserAnalyticsByID returns analytics for a specific user
func (s *AuthService) GetUserAnalyticsByID(userID uuid.UUID) (*models.UserAnalytics, error) {
	istNow := time.Now().Add(5*time.Hour + 30*time.Minute)
	today := istNow.Format("2006-01-02")

	query := `
	SELECT
		u.id as user_id,
		u.name,
		u.email,
		COALESCE(total_searches.count, 0) as total_searches,
		COALESCE(today_usage.search_count, 0) as today_searches,
		COALESCE(total_exports.count, 0) as total_exports,
		COALESCE(today_usage.export_count, 0) as today_exports,
		last_login.login_time as last_login,
		last_search.search_time as last_search_time
	FROM users u
	LEFT JOIN (
		SELECT user_id, COUNT(*) as count
		FROM searches
		GROUP BY user_id
	) total_searches ON u.id = total_searches.user_id
	LEFT JOIN (
		SELECT user_id, COUNT(*) as count
		FROM exports
		GROUP BY user_id
	) total_exports ON u.id = total_exports.user_id
	LEFT JOIN (
		SELECT user_id, search_count, export_count
		FROM daily_usage
		WHERE date = $1
	) today_usage ON u.id = today_usage.user_id
	LEFT JOIN (
		SELECT user_id, MAX(login_time) as login_time
		FROM logins
		GROUP BY user_id
	) last_login ON u.id = last_login.user_id
	LEFT JOIN (
		SELECT user_id, MAX(search_time) as search_time
		FROM searches
		GROUP BY user_id
	) last_search ON u.id = last_search.user_id
	WHERE u.id = $2`

	var analytics models.UserAnalytics
	err := database.PostgresDB.Get(&analytics, query, today, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user analytics: %w", err)
	}

	return &analytics, nil
}

// GetUserRecentSearches returns recent search history for a user (admin only)
func (s *AuthService) GetUserRecentSearches(userID uuid.UUID, limit int) ([]models.RecentSearch, error) {
	if limit <= 0 || limit > 50 {
		limit = 10 // Default to 10 recent searches
	}

	query := `
	SELECT id, search_time, search_query, result_count, execution_time_ms
	FROM searches
	WHERE user_id = $1
	ORDER BY search_time DESC
	LIMIT $2`

	var searches []models.RecentSearch
	err := database.PostgresDB.Select(&searches, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent searches: %w", err)
	}

	return searches, nil
}

// GetUserAnalyticsWithSearches returns analytics with recent searches for a user (admin only)
func (s *AuthService) GetUserAnalyticsWithSearches(userID uuid.UUID) (*models.UserAnalyticsWithSearches, error) {
	// Get basic analytics
	analytics, err := s.GetUserAnalyticsByID(userID)
	if err != nil {
		return nil, err
	}

	// Get recent searches
	recentSearches, err := s.GetUserRecentSearches(userID, 10)
	if err != nil {
		return nil, err
	}

	return &models.UserAnalyticsWithSearches{
		UserAnalytics:  *analytics,
		RecentSearches: recentSearches,
	}, nil
}

// DeleteUser deletes a user and all related data with cascade
func (s *AuthService) DeleteUser(userID uuid.UUID) error {
	// Start a transaction to ensure all deletions happen atomically
	tx, err := database.PostgresDB.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // This will be ignored if tx.Commit() succeeds

	// Delete in reverse order of dependencies to avoid foreign key constraints

	// 1. Delete daily usage records
	_, err = tx.Exec("DELETE FROM daily_usage WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete daily usage records: %w", err)
	}

	// 2. Delete exports (references searches, but ON DELETE SET NULL handles this)
	_, err = tx.Exec("DELETE FROM exports WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete export records: %w", err)
	}

	// 3. Delete searches
	_, err = tx.Exec("DELETE FROM searches WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete search records: %w", err)
	}

	// 4. Delete user sessions
	_, err = tx.Exec("DELETE FROM user_sessions WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete user sessions: %w", err)
	}

	// 5. Delete login records
	_, err = tx.Exec("DELETE FROM logins WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete login records: %w", err)
	}

	// 6. Finally, delete the user
	result, err := tx.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	// Commit the transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
