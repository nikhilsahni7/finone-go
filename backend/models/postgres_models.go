package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the PostgreSQL database
type User struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	Name              string     `json:"name" db:"name"`
	Email             string     `json:"email" db:"email"`
	PasswordHash      string     `json:"-" db:"password_hash"`
	UserType          string     `json:"user_type" db:"user_type"` // DEMO, PERMANENT
	Role              string     `json:"role" db:"role"`           // USER, ADMIN
	ExpiresAt         *time.Time `json:"expires_at" db:"expires_at"`
	IsActive          bool       `json:"is_active" db:"is_active"`
	MaxSearchesPerDay int        `json:"max_searches_per_day" db:"max_searches_per_day"`
	MaxExportsPerDay  int        `json:"max_exports_per_day" db:"max_exports_per_day"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// Login represents a login record
type Login struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	LoginTime time.Time `json:"login_time" db:"login_time"`
	IPAddress string    `json:"ip_address" db:"ip_address"`
	UserAgent string    `json:"user_agent" db:"user_agent"`
}

// Search represents a search log entry
type Search struct {
	ID              uuid.UUID   `json:"id" db:"id"`
	UserID          uuid.UUID   `json:"user_id" db:"user_id"`
	SearchQuery     interface{} `json:"search_query" db:"search_query"` // JSONB
	SearchTime      time.Time   `json:"search_time" db:"search_time"`
	ResultCount     int         `json:"result_count" db:"result_count"`
	ExecutionTimeMs int         `json:"execution_time_ms" db:"execution_time_ms"`
}

// Export represents an export log entry
type Export struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	SearchID      *uuid.UUID `json:"search_id" db:"search_id"`
	ExportedAt    time.Time  `json:"exported_at" db:"exported_at"`
	RowCount      int        `json:"row_count" db:"row_count"`
	FileSizeBytes int64      `json:"file_size_bytes" db:"file_size_bytes"`
}

// DailyUsage represents daily usage statistics
type DailyUsage struct {
	ID          uuid.UUID `json:"id" db:"id"`
	UserID      uuid.UUID `json:"user_id" db:"user_id"`
	Date        time.Time `json:"date" db:"date"`
	SearchCount int       `json:"search_count" db:"search_count"`
	ExportCount int       `json:"export_count" db:"export_count"`
}

// UserSession represents an active user session
type UserSession struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	UserID       uuid.UUID  `json:"user_id" db:"user_id"`
	SessionToken string     `json:"-" db:"session_token"` // Hash of JWT token
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt    time.Time  `json:"expires_at" db:"expires_at"`
	IsActive     bool       `json:"is_active" db:"is_active"`
	IPAddress    string     `json:"ip_address" db:"ip_address"`
	UserAgent    string     `json:"user_agent" db:"user_agent"`
	LoggedOutAt  *time.Time `json:"logged_out_at" db:"logged_out_at"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token     string    `json:"token"`
	User      User      `json:"user"`
	ExpiresAt time.Time `json:"expires_at"`
	SessionID string    `json:"session_id"`
}

// CreateUserRequest represents the create user request payload
type CreateUserRequest struct {
	Name              string     `json:"name" validate:"required"`
	Email             string     `json:"email" validate:"required,email"`
	Password          string     `json:"password" validate:"required,min=6"`
	UserType          string     `json:"user_type" validate:"required,oneof=DEMO PERMANENT"`
	Role              string     `json:"role" validate:"oneof=USER ADMIN"`
	ExpiresAt         *time.Time `json:"expires_at"`
	MaxSearchesPerDay int        `json:"max_searches_per_day"`
	MaxExportsPerDay  int        `json:"max_exports_per_day"`
}

// UpdateUserRequest represents the update user request payload
type UpdateUserRequest struct {
	Name              *string    `json:"name"`
	Email             *string    `json:"email"`
	Password          *string    `json:"password"`
	UserType          *string    `json:"user_type" validate:"omitempty,oneof=DEMO PERMANENT"`
	IsActive          *bool      `json:"is_active"`
	ExpiresAt         *time.Time `json:"expires_at"`
	MaxSearchesPerDay *int       `json:"max_searches_per_day"`
	MaxExportsPerDay  *int       `json:"max_exports_per_day"`
}

// UserListResponse represents the user list response
type UserListResponse struct {
	Users      []User `json:"users"`
	TotalCount int    `json:"total_count"`
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
}

// UserAnalytics represents user analytics for admin
type UserAnalytics struct {
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	Name           string     `json:"name" db:"name"`
	Email          string     `json:"email" db:"email"`
	TotalSearches  int        `json:"total_searches" db:"total_searches"`
	TodaySearches  int        `json:"today_searches" db:"today_searches"`
	TotalExports   int        `json:"total_exports" db:"total_exports"`
	TodayExports   int        `json:"today_exports" db:"today_exports"`
	LastLogin      *time.Time `json:"last_login" db:"last_login"`
	LastSearchTime *time.Time `json:"last_search_time" db:"last_search_time"`
}

// SearchWithinRequest represents search within previous results
type SearchWithinRequest struct {
	SearchID  string   `json:"search_id" validate:"required"`
	Query     string   `json:"query" validate:"required"`
	Fields    []string `json:"fields"`
	MatchType string   `json:"match_type" validate:"oneof=partial full"`
	Limit     int      `json:"limit" validate:"min=1,max=10000"`
	Offset    int      `json:"offset" validate:"min=0"`
}

// RecentSearch represents a recent search with basic query info
type RecentSearch struct {
	ID              uuid.UUID   `json:"id" db:"id"`
	SearchTime      time.Time   `json:"search_time" db:"search_time"`
	SearchQuery     interface{} `json:"search_query" db:"search_query"`
	ResultCount     int         `json:"result_count" db:"result_count"`
	ExecutionTimeMs int         `json:"execution_time_ms" db:"execution_time_ms"`
}

// UserAnalyticsWithSearches extends UserAnalytics with recent searches
type UserAnalyticsWithSearches struct {
	UserAnalytics
	RecentSearches []RecentSearch `json:"recent_searches"`
}

// UserRegistrationRequest represents a request from users wanting to join the system
type UserRegistrationRequest struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	Name              string     `json:"name" db:"name"`
	Email             string     `json:"email" db:"email"`
	PhoneNumber       string     `json:"phone_number" db:"phone_number"`
	RequestedSearches int        `json:"requested_searches" db:"requested_searches"`
	Status            string     `json:"status" db:"status"` // PENDING, APPROVED, REJECTED
	AdminNotes        *string    `json:"admin_notes" db:"admin_notes"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	ReviewedAt        *time.Time `json:"reviewed_at" db:"reviewed_at"`
	ReviewedBy        *uuid.UUID `json:"reviewed_by" db:"reviewed_by"`
}

// CreateRegistrationRequest represents the request payload for user registration
type CreateRegistrationRequest struct {
	Name              string `json:"name" validate:"required,min=2,max=100"`
	Email             string `json:"email" validate:"required,email"`
	PhoneNumber       string `json:"phone_number" validate:"required,min=10,max=15"`
	RequestedSearches int    `json:"requested_searches" validate:"required,min=1,max=10000"`
}

// UpdateRegistrationRequest represents admin's response to a registration request
type UpdateRegistrationRequest struct {
	Status     string  `json:"status" validate:"required,oneof=APPROVED REJECTED"`
	AdminNotes *string `json:"admin_notes"`
}

// RegistrationRequestListResponse represents the registration request list response
type RegistrationRequestListResponse struct {
	Requests   []UserRegistrationRequest `json:"requests"`
	TotalCount int                       `json:"total_count"`
	Page       int                       `json:"page"`
	Limit      int                       `json:"limit"`
}

// UserPasswordChangeRequest represents a request from users to change their password
type UserPasswordChangeRequest struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	UserID     uuid.UUID  `json:"user_id" db:"user_id"`
	UserName   string     `json:"user_name" db:"user_name"`
	UserEmail  string     `json:"user_email" db:"user_email"`
	Reason     string     `json:"reason" db:"reason"`
	Status     string     `json:"status" db:"status"` // PENDING, COMPLETED, REJECTED
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at" db:"updated_at"`
	AdminID    *uuid.UUID `json:"admin_id" db:"admin_id"`
	AdminNotes *string    `json:"admin_notes" db:"admin_notes"`
}

// CreatePasswordChangeRequest represents the request payload for password change
type CreatePasswordChangeRequest struct {
	Reason string `json:"reason" validate:"required,min=10,max=500"`
}

// UpdatePasswordChangeRequest represents admin's response to a password change request
type UpdatePasswordChangeRequest struct {
	Status     string  `json:"status" validate:"required,oneof=COMPLETED REJECTED"`
	AdminNotes *string `json:"admin_notes"`
}

// PasswordChangeRequestListResponse represents the password change request list response
type PasswordChangeRequestListResponse struct {
	Requests   []UserPasswordChangeRequest `json:"requests"`
	TotalCount int                         `json:"total_count"`
	Page       int                         `json:"page"`
	Limit      int                         `json:"limit"`
}
