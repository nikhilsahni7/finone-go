package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"finone-search-system/config"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var PostgresDB *sqlx.DB

func InitPostgres() error {
	connectionString := config.AppConfig.GetPostgresConnectionString()

	db, err := sqlx.Connect("postgres", connectionString)
	if err != nil {
		return fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	PostgresDB = db
	log.Println("Successfully connected to PostgreSQL")
	return nil
}

func ClosePostgres() error {
	if PostgresDB != nil {
		return PostgresDB.Close()
	}
	return nil
}

// RunPostgresMigrations executes the PostgreSQL schema migrations
func RunPostgresMigrations() error {
	migrationFiles := []string{
		"migrations/001_postgres_schema.sql",
		"migrations/003_user_sessions.sql",
		"migrations/004_system_logs.sql",
		"migrations/005_user_registration_requests.sql",
	}

	for _, file := range migrationFiles {
		log.Printf("Running migration: %s", file)
		if err := runMigrationFile(file); err != nil {
			return fmt.Errorf("failed to run migration %s: %w", file, err)
		}
	}

	log.Println("All PostgreSQL migrations completed successfully")
	return nil
}

func runMigrationFile(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	_, err = PostgresDB.Exec(string(content))
	return err
}

// Utility functions for database operations
func WithTransaction(fn func(tx *sqlx.Tx) error) error {
	tx, err := PostgresDB.Beginx()
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	err = fn(tx)
	return err
}

// Health check for PostgreSQL
func PostgresHealthCheck() error {
	if PostgresDB == nil {
		return fmt.Errorf("PostgreSQL connection is nil")
	}

	var result int
	err := PostgresDB.Get(&result, "SELECT 1")
	if err != nil {
		return fmt.Errorf("PostgreSQL health check failed: %w", err)
	}

	return nil
}
