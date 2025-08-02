package services

import (
	"fmt"
	"strings"
	"time"

	"finone-search-system/config"
	"finone-search-system/database"
	"finone-search-system/models"
	"finone-search-system/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

// Login authenticates a user and returns a JWT token
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

	// Log the login
	s.logLogin(user.ID, "127.0.0.1", "")

	// Remove sensitive data
	user.PasswordHash = ""

	return &models.LoginResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt,
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
