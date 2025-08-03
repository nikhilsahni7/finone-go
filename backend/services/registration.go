package services

import (
	"fmt"
	"time"

	"finone-search-system/database"
	"finone-search-system/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type RegistrationService struct {
	db *sqlx.DB
}

func NewRegistrationService() *RegistrationService {
	return &RegistrationService{
		db: database.PostgresDB,
	}
}

// CreateRegistrationRequest creates a new user registration request
func (s *RegistrationService) CreateRegistrationRequest(req models.CreateRegistrationRequest) (*models.UserRegistrationRequest, error) {
	// Check if email already exists in registration requests
	var existingRequest models.UserRegistrationRequest
	err := s.db.Get(&existingRequest, `
		SELECT id, email, status FROM user_registration_requests
		WHERE email = $1 AND status = 'PENDING'
	`, req.Email)

	if err == nil {
		return nil, fmt.Errorf("registration request with this email already exists and is pending")
	}

	// Check if user already exists
	var existingUser models.User
	err = s.db.Get(&existingUser, `SELECT id, email FROM users WHERE email = $1`, req.Email)
	if err == nil {
		return nil, fmt.Errorf("user with this email already exists")
	}

	// Create new registration request
	registrationRequest := models.UserRegistrationRequest{
		ID:                uuid.New(),
		Name:              req.Name,
		Email:             req.Email,
		PhoneNumber:       req.PhoneNumber,
		RequestedSearches: req.RequestedSearches,
		Status:            "PENDING",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	query := `
		INSERT INTO user_registration_requests
		(id, name, email, phone_number, requested_searches, status, created_at, updated_at)
		VALUES (:id, :name, :email, :phone_number, :requested_searches, :status, :created_at, :updated_at)
	`

	_, err = s.db.NamedExec(query, registrationRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create registration request: %w", err)
	}

	return &registrationRequest, nil
}

// GetRegistrationRequests gets paginated list of registration requests (admin only)
func (s *RegistrationService) GetRegistrationRequests(page, limit int, status string) (*models.RegistrationRequestListResponse, error) {
	offset := (page - 1) * limit

	// Build WHERE clause
	whereClause := ""
	args := []interface{}{}
	argIndex := 1

	if status != "" {
		whereClause = " WHERE status = $" + fmt.Sprintf("%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM user_registration_requests" + whereClause
	var totalCount int
	err := s.db.Get(&totalCount, countQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get requests
	query := `
		SELECT r.id, r.name, r.email, r.phone_number, r.requested_searches, r.status,
		       r.admin_notes, r.created_at, r.updated_at, r.reviewed_at, r.reviewed_by
		FROM user_registration_requests r
	` + whereClause + `
		ORDER BY r.created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argIndex) + ` OFFSET $` + fmt.Sprintf("%d", argIndex+1)

	args = append(args, limit, offset)

	var requests []models.UserRegistrationRequest
	err = s.db.Select(&requests, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get registration requests: %w", err)
	}

	return &models.RegistrationRequestListResponse{
		Requests:   requests,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
	}, nil
}

// GetRegistrationRequest gets a single registration request by ID
func (s *RegistrationService) GetRegistrationRequest(id uuid.UUID) (*models.UserRegistrationRequest, error) {
	var request models.UserRegistrationRequest
	query := `
		SELECT id, name, email, phone_number, requested_searches, status,
		       admin_notes, created_at, updated_at, reviewed_at, reviewed_by
		FROM user_registration_requests
		WHERE id = $1
	`

	err := s.db.Get(&request, query, id)
	if err != nil {
		return nil, fmt.Errorf("registration request not found: %w", err)
	}

	return &request, nil
}

// UpdateRegistrationRequest updates a registration request status (admin only)
func (s *RegistrationService) UpdateRegistrationRequest(id uuid.UUID, req models.UpdateRegistrationRequest, adminID uuid.UUID) (*models.UserRegistrationRequest, error) {
	// Get existing request
	existingRequest, err := s.GetRegistrationRequest(id)
	if err != nil {
		return nil, err
	}

	if existingRequest.Status != "PENDING" {
		return nil, fmt.Errorf("registration request has already been reviewed")
	}

	// Update the request
	now := time.Now()
	query := `
		UPDATE user_registration_requests
		SET status = $1, admin_notes = $2, reviewed_at = $3, reviewed_by = $4, updated_at = $5
		WHERE id = $6
	`

	_, err = s.db.Exec(query, req.Status, req.AdminNotes, now, adminID, now, id)
	if err != nil {
		return nil, fmt.Errorf("failed to update registration request: %w", err)
	}

	// Return updated request
	return s.GetRegistrationRequest(id)
} // DeleteRegistrationRequest deletes a registration request (admin only)
func (s *RegistrationService) DeleteRegistrationRequest(id uuid.UUID) error {
	query := "DELETE FROM user_registration_requests WHERE id = $1"
	result, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete registration request: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("registration request not found")
	}

	return nil
}
