package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"finone-search-system/config"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

var ClickHouseDB driver.Conn

func InitClickHouse() error {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d",
			config.AppConfig.Database.ClickHouse.Host,
			config.AppConfig.Database.ClickHouse.Port)},
		Auth: clickhouse.Auth{
			Database: config.AppConfig.Database.ClickHouse.Database,
			Username: config.AppConfig.Database.ClickHouse.User,
			Password: config.AppConfig.Database.ClickHouse.Password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout: time.Duration(10) * time.Second,
	})

	if err != nil {
		return fmt.Errorf("failed to connect to ClickHouse: %w", err)
	}

	// Test the connection
	if err := conn.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	ClickHouseDB = conn
	log.Println("Successfully connected to ClickHouse")
	return nil
}

func CloseClickHouse() error {
	if ClickHouseDB != nil {
		return ClickHouseDB.Close()
	}
	return nil
}

// RunClickHouseMigrations executes the ClickHouse schema migrations
func RunClickHouseMigrations() error {
	migrationQueries := []string{
		`CREATE DATABASE IF NOT EXISTS finone_search`,

		`CREATE TABLE IF NOT EXISTS finone_search.people
		(
			id UUID DEFAULT generateUUIDv4(),
			master_id String,
			mobile String,
			name String,
			fname String,
			address String,
			alt String,
			circle String,
			email String,
			created_at DateTime DEFAULT now(),
			updated_at DateTime DEFAULT now()
		)
		ENGINE = MergeTree()
		ORDER BY (mobile, name, master_id)
		SETTINGS index_granularity = 8192,
		         max_compress_block_size = 1048576,
		         min_compress_block_size = 65536`,

		`CREATE TABLE IF NOT EXISTS finone_search.search_performance
		(
			query_id String,
			user_id String,
			query_text String,
			execution_time_ms UInt32,
			result_count UInt32,
			timestamp DateTime DEFAULT now()
		)
		ENGINE = MergeTree()
		ORDER BY timestamp`,
	}

	for i, query := range migrationQueries {
		log.Printf("Running ClickHouse migration %d", i+1)
		if err := ClickHouseDB.Exec(context.Background(), query); err != nil {
			return fmt.Errorf("failed to run ClickHouse migration %d: %w", i+1, err)
		}
	}

	log.Println("All ClickHouse migrations completed successfully")
	return nil
}

// Health check for ClickHouse
func ClickHouseHealthCheck() error {
	if ClickHouseDB == nil {
		return fmt.Errorf("ClickHouse connection is nil")
	}

	return ClickHouseDB.Ping(context.Background())
}

// Utility function to execute queries with timeout
func ExecuteClickHouseQuery(query string, args ...interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return ClickHouseDB.Exec(ctx, query, args...)
}

// Utility function to select data with timeout
func SelectClickHouseData(dest interface{}, query string, args ...interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return ClickHouseDB.Select(ctx, dest, query, args...)
}
