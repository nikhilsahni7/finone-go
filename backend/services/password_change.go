package services

import (
	"fmt"
	"time"

	"finone-search-system/database"
	"finone-search-system/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PasswordChangeService struct {
	db *sqlx.DB
}

func NewPasswordChangeService() *PasswordChangeService {
	return &PasswordChangeService{
		db: database.PostgresDB,
	}
}

// CreatePasswordChangeRequest creates a new password change request
func (s *PasswordChangeService) CreatePasswordChangeRequest(userID uuid.UUID, userName, userEmail string, req models.CreatePasswordChangeRequest) (*models.UserPasswordChangeRequest, error) {
	// Check if user already has a pending request
	var existingRequest models.UserPasswordChangeRequest
	err := s.db.Get(&existingRequest, `
		SELECT id FROM user_password_change_requests
		WHERE user_id = $1 AND status = 'PENDING'
	`, userID)

	if err == nil {
		return nil, fmt.Errorf("you already have a pending password change request")
	}

	// Create new password change request
	passwordChangeRequest := models.UserPasswordChangeRequest{
		ID:        uuid.New(),
		UserID:    userID,
		UserName:  userName,
		UserEmail: userEmail,
		Reason:    req.Reason,
		Status:    "PENDING",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	query := `
		INSERT INTO user_password_change_requests
		(id, user_id, user_name, user_email, reason, status, created_at, updated_at)
		VALUES (:id, :user_id, :user_name, :user_email, :reason, :status, :created_at, :updated_at)
	`

	_, err = s.db.NamedExec(query, passwordChangeRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create password change request: %w", err)
	}

	return &passwordChangeRequest, nil
}

// GetPasswordChangeRequests gets paginated list of password change requests (admin only)
func (s *PasswordChangeService) GetPasswordChangeRequests(page, limit int, status string) (*models.PasswordChangeRequestListResponse, error) {
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
	countQuery := "SELECT COUNT(*) FROM user_password_change_requests" + whereClause
	var totalCount int
	err := s.db.Get(&totalCount, countQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get requests
	query := `
		SELECT * FROM user_password_change_requests
	` + whereClause + `
		ORDER BY created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argIndex) + ` OFFSET $` + fmt.Sprintf("%d", argIndex+1)

	args = append(args, limit, offset)

	var requests []models.UserPasswordChangeRequest
	err = s.db.Select(&requests, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get password change requests: %w", err)
	}

	return &models.PasswordChangeRequestListResponse{
		Requests:   requests,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
	}, nil
}

// GetPasswordChangeRequest gets a single password change request by ID
func (s *PasswordChangeService) GetPasswordChangeRequest(id uuid.UUID) (*models.UserPasswordChangeRequest, error) {
	var request models.UserPasswordChangeRequest
	query := `SELECT * FROM user_password_change_requests WHERE id = $1`

	err := s.db.Get(&request, query, id)
	if err != nil {
		return nil, fmt.Errorf("password change request not found: %w", err)
	}

	return &request, nil
}

// UpdatePasswordChangeRequest updates a password change request status (admin only)
func (s *PasswordChangeService) UpdatePasswordChangeRequest(id uuid.UUID, req models.UpdatePasswordChangeRequest, adminID uuid.UUID) (*models.UserPasswordChangeRequest, error) {
	// Get existing request
	existingRequest, err := s.GetPasswordChangeRequest(id)
	if err != nil {
		return nil, err
	}

	if existingRequest.Status != "PENDING" {
		return nil, fmt.Errorf("password change request has already been processed")
	}

	// Update the request
	now := time.Now()
	query := `
		UPDATE user_password_change_requests
		SET status = $1, admin_notes = $2, admin_id = $3, updated_at = $4
		WHERE id = $5
	`

	_, err = s.db.Exec(query, req.Status, req.AdminNotes, adminID, now, id)
	if err != nil {
		return nil, fmt.Errorf("failed to update password change request: %w", err)
	}

	// Return updated request
	return s.GetPasswordChangeRequest(id)
}

// GetUserPasswordChangeRequests gets password change requests for a specific user
func (s *PasswordChangeService) GetUserPasswordChangeRequests(userID uuid.UUID, page, limit int) (*models.PasswordChangeRequestListResponse, error) {
	offset := (page - 1) * limit

	// Get total count
	var totalCount int
	err := s.db.Get(&totalCount, "SELECT COUNT(*) FROM user_password_change_requests WHERE user_id = $1", userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get requests
	query := `
		SELECT * FROM user_password_change_requests
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	var requests []models.UserPasswordChangeRequest
	err = s.db.Select(&requests, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get password change requests: %w", err)
	}

	return &models.PasswordChangeRequestListResponse{
		Requests:   requests,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
	}, nil
}

// DeletePasswordChangeRequest deletes a password change request
func (s *PasswordChangeService) DeletePasswordChangeRequest(id uuid.UUID) error {
	query := "DELETE FROM user_password_change_requests WHERE id = $1"
	result, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete password change request: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("password change request not found")
	}

	return nil
}
