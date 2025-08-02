package utils

import (
	"bufio"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"finone-search-system/database"
	"finone-search-system/models"

	"github.com/google/uuid"
)

// CSVProcessor handles large CSV file processing
type CSVProcessor struct {
	batchSize int
	tempDir   string
	fieldMap  map[string]int
}

// NewCSVProcessor creates a new CSV processor instance
func NewCSVProcessor(batchSize int, tempDir string) *CSVProcessor {
	// Default field mapping based on your plan
	defaultFieldMap := map[string]int{
		"mobile":  0,
		"name":    1,
		"fname":   2,
		"address": 3,
		"alt":     4,
		"circle":  5,
		"id":      6,
		"email":   7,
	}

	return &CSVProcessor{
		batchSize: batchSize,
		tempDir:   tempDir,
		fieldMap:  defaultFieldMap,
	}
}

// ProcessCSVFile processes a large CSV file in batches
func (cp *CSVProcessor) ProcessCSVFile(filePath string, hasHeader bool) (*models.CSVImportResponse, error) {
	LogInfo(fmt.Sprintf("Starting CSV processing for file: %s", filePath))

	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ','
	reader.LazyQuotes = true

	response := &models.CSVImportResponse{
		JobID:     uuid.New().String(),
		Status:    "processing",
		StartTime: time.Now(),
	}

	var batch []models.Person
	lineCount := 0
	errorCount := 0

	// Skip header if present
	if hasHeader {
		if _, err := reader.Read(); err != nil {
			return nil, fmt.Errorf("failed to read header: %w", err)
		}
	}

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			errorCount++
			LogError("Failed to read CSV record", err)
			continue
		}

		person, err := cp.recordToPerson(record)
		if err != nil {
			errorCount++
			LogError("Failed to convert record to person", err)
			continue
		}

		batch = append(batch, *person)
		lineCount++

		// Process batch when it reaches the batch size
		if len(batch) >= cp.batchSize {
			if err := cp.insertBatch(batch); err != nil {
				LogError("Failed to insert batch", err)
				errorCount += len(batch)
			} else {
				response.ProcessedRows += len(batch)
			}
			batch = batch[:0] // Clear the batch
		}

		// Log progress every 50,000 rows
		if lineCount%50000 == 0 {
			LogInfo(fmt.Sprintf("Processed %d rows (%.1f%% complete)", lineCount, float64(lineCount)/float64(100602765)*100))
		}
	}

	// Process remaining records in the final batch
	if len(batch) > 0 {
		if err := cp.insertBatch(batch); err != nil {
			LogError("Failed to insert final batch", err)
			errorCount += len(batch)
		} else {
			response.ProcessedRows += len(batch)
		}
	}

	endTime := time.Now()
	response.EndTime = &endTime
	response.TotalRows = lineCount
	response.ErrorRows = errorCount
	response.Status = "completed"

	LogInfo(fmt.Sprintf("CSV processing completed. Total: %d, Processed: %d, Errors: %d",
		response.TotalRows, response.ProcessedRows, response.ErrorRows))

	return response, nil
}

// recordToPerson converts a CSV record to a Person model
func (cp *CSVProcessor) recordToPerson(record []string) (*models.Person, error) {
	if len(record) < 8 {
		return nil, fmt.Errorf("record has insufficient fields: %d", len(record))
	}

	person := &models.Person{
		ID:        uuid.New().String(),
		Mobile:    strings.TrimSpace(record[cp.fieldMap["mobile"]]),
		Name:      strings.TrimSpace(record[cp.fieldMap["name"]]),
		FName:     strings.TrimSpace(record[cp.fieldMap["fname"]]),
		Address:   strings.TrimSpace(record[cp.fieldMap["address"]]),
		Alt:       strings.TrimSpace(record[cp.fieldMap["alt"]]),
		Circle:    strings.TrimSpace(record[cp.fieldMap["circle"]]),
		MasterID:  strings.TrimSpace(record[cp.fieldMap["id"]]),
		Email:     strings.TrimSpace(record[cp.fieldMap["email"]]),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return person, nil
}

// insertBatch inserts a batch of people into ClickHouse
func (cp *CSVProcessor) insertBatch(batch []models.Person) error {
	if len(batch) == 0 {
		return nil
	}

	ctx := context.Background()

	// Prepare batch insert statement
	batchInsert, err := database.ClickHouseDB.PrepareBatch(ctx,
		`INSERT INTO finone_search.people
		(id, master_id, mobile, name, fname, address, alt, circle, email, created_at, updated_at)`)
	if err != nil {
		return fmt.Errorf("failed to prepare batch: %w", err)
	}

	// Add each record to the batch
	for _, person := range batch {
		err := batchInsert.Append(
			person.ID,
			person.MasterID,
			person.Mobile,
			person.Name,
			person.FName,
			person.Address,
			person.Alt,
			person.Circle,
			person.Email,
			person.CreatedAt,
			person.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to append to batch: %w", err)
		}
	}

	// Execute the batch
	return batchInsert.Send()
}

// EstimateCSVRows estimates the number of rows in a CSV file
func EstimateCSVRows(filePath string) (int, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineCount := 0
	for scanner.Scan() {
		lineCount++
	}

	if err := scanner.Err(); err != nil {
		return 0, err
	}

	return lineCount, nil
}

// ValidateCSVFile validates the CSV file format and structure
func ValidateCSVFile(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ','

	// Read first few rows to validate structure
	for i := 0; i < 5; i++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read CSV: %w", err)
		}

		if len(record) < 8 {
			return fmt.Errorf("invalid CSV format: expected at least 8 columns, got %d", len(record))
		}
	}

	return nil
}

// GetFileSize returns the size of a file in bytes
func GetFileSize(filePath string) (int64, error) {
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return 0, err
	}
	return fileInfo.Size(), nil
}

// FormatFileSize formats file size in human readable format
func FormatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
