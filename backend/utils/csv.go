package utils

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"os"
)

// CSVProcessor handles CSV file processing
// Note: Since data is now managed directly via OpenSearch, the CSV import
// functionality is disabled. This struct is kept for validation and estimation utilities.
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
