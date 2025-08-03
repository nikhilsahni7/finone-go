package models

import (
	"time"
)

// Person represents a person record in ClickHouse
type Person struct {
	ID        string    `json:"id" ch:"id"`
	MasterID  string    `json:"master_id" ch:"master_id"`
	Mobile    string    `json:"mobile" ch:"mobile"`
	Name      string    `json:"name" ch:"name"`
	FName     string    `json:"fname" ch:"fname"`
	Address   string    `json:"address" ch:"address"`
	Alt       string    `json:"alt" ch:"alt"`
	Circle    string    `json:"circle" ch:"circle"`
	Email     string    `json:"email" ch:"email"`
	CreatedAt time.Time `json:"created_at" ch:"created_at"`
	UpdatedAt time.Time `json:"updated_at" ch:"updated_at"`
}

// SearchRequest represents a search request payload
type SearchRequest struct {
	Query          string            `json:"query" validate:"required"`
	Fields         []string          `json:"fields" validate:"required"`               // mobile, name, fname, address, email, circle
	FieldQueries   map[string]string `json:"field_queries,omitempty"`                  // Field-specific queries
	Logic          string            `json:"logic" validate:"oneof=AND OR"`            // AND or OR logic
	SearchWithin   bool              `json:"search_within"`                            // Search within previous results
	MatchType      string            `json:"match_type" validate:"oneof=partial full"` // partial or full match
	Limit          int               `json:"limit" validate:"min=1,max=10000"`         // Max results
	Offset         int               `json:"offset" validate:"min=0"`                  // Pagination
	EnhancedMobile bool              `json:"enhanced_mobile"`                          // Enhanced mobile search with master_id lookup
}

// EnhancedMobileSearchRequest represents an enhanced mobile search request
type EnhancedMobileSearchRequest struct {
	MobileNumber string `json:"mobile_number" validate:"required"`
	Limit        int    `json:"limit" validate:"min=1,max=10000"`
	Offset       int    `json:"offset" validate:"min=0"`
}

// EnhancedMobileSearchResponse represents an enhanced mobile search response
type EnhancedMobileSearchResponse struct {
	DirectMatches        []Person `json:"direct_matches"`    // Direct mobile number matches
	MasterIDMatches      []Person `json:"master_id_matches"` // Additional records with same master_ids
	TotalDirectMatches   int      `json:"total_direct_matches"`
	TotalMasterIDMatches int      `json:"total_master_id_matches"`
	TotalCount           int      `json:"total_count"`
	ExecutionTime        int      `json:"execution_time_ms"`
	SearchID             string   `json:"search_id"`
	HasMore              bool     `json:"has_more"`
	MasterIDs            []string `json:"master_ids"` // List of unique master_ids found
}

// SearchResponse represents a search response
type SearchResponse struct {
	Results       []Person `json:"results"`
	TotalCount    int      `json:"total_count"`
	ExecutionTime int      `json:"execution_time_ms"`
	SearchID      string   `json:"search_id"`
	HasMore       bool     `json:"has_more"`
}

// CSVImportRequest represents a CSV import request
type CSVImportRequest struct {
	FilePath  string         `json:"file_path" validate:"required"`
	BatchSize int            `json:"batch_size" validate:"min=1000,max=1000000"`
	HasHeader bool           `json:"has_header"`
	Delimiter string         `json:"delimiter"`
	FieldMap  map[string]int `json:"field_map"` // Maps CSV column names to field positions
}

// CSVImportResponse represents a CSV import response
type CSVImportResponse struct {
	JobID         string     `json:"job_id"`
	Status        string     `json:"status"`
	TotalRows     int        `json:"total_rows"`
	ProcessedRows int        `json:"processed_rows"`
	ErrorRows     int        `json:"error_rows"`
	StartTime     time.Time  `json:"start_time"`
	EndTime       *time.Time `json:"end_time,omitempty"`
	Errors        []string   `json:"errors,omitempty"`
}

// SearchPerformance represents search performance metrics in ClickHouse
type SearchPerformance struct {
	QueryID         string    `json:"query_id" ch:"query_id"`
	UserID          string    `json:"user_id" ch:"user_id"`
	QueryText       string    `json:"query_text" ch:"query_text"`
	ExecutionTimeMs int       `json:"execution_time_ms" ch:"execution_time_ms"`
	ResultCount     int       `json:"result_count" ch:"result_count"`
	Timestamp       time.Time `json:"timestamp" ch:"timestamp"`
}

// ExportRequest represents an export request
type ExportRequest struct {
	SearchID *string        `json:"search_id,omitempty"` // Export specific search results
	Query    *SearchRequest `json:"query,omitempty"`     // Or provide new search query
	Format   string         `json:"format" validate:"oneof=csv json"`
	FileName string         `json:"file_name"`
}

// ExportResponse represents an export response
type ExportResponse struct {
	DownloadURL string    `json:"download_url"`
	FileName    string    `json:"file_name"`
	FileSize    int64     `json:"file_size"`
	RowCount    int       `json:"row_count"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// BatchInsertResult represents the result of a batch insert operation
type BatchInsertResult struct {
	SuccessCount int           `json:"success_count"`
	ErrorCount   int           `json:"error_count"`
	Errors       []string      `json:"errors,omitempty"`
	Duration     time.Duration `json:"duration"`
}
