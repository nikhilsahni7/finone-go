package database

import (
	"context"
	"crypto/tls"
	"finone-search-system/config"
	"fmt"
	"log"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

var ClickHouseDB driver.Conn

func InitClickHouse() error {
	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d",
			config.AppConfig.Database.ClickHouse.Host,
			config.AppConfig.Database.ClickHouse.Port)},
		Auth: clickhouse.Auth{
			Database: config.AppConfig.Database.ClickHouse.Database,
			Username: config.AppConfig.Database.ClickHouse.User,
			Password: config.AppConfig.Database.ClickHouse.Password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time":          60,
			"allow_experimental_analyzer": 1,
			"optimize_move_to_prewhere":   1,
			"use_uncompressed_cache":      0,
		},
		Compression: &clickhouse.Compression{Method: clickhouse.CompressionLZ4},
		DialTimeout: time.Duration(10) * time.Second,
	}

	// Configure protocol/TLS for ClickHouse Cloud
	if config.AppConfig.Database.ClickHouse.Secure || config.AppConfig.Database.ClickHouse.UseHTTP {
		// TLS enabled for both native TLS:9440 or HTTPS:8443
		tlsCfg := &tls.Config{
			ServerName:         config.AppConfig.Database.ClickHouse.Host,
			InsecureSkipVerify: config.AppConfig.Database.ClickHouse.SkipVerify,
		}
		options.TLS = tlsCfg
	}
	if config.AppConfig.Database.ClickHouse.UseHTTP {
		options.Protocol = clickhouse.HTTP
	}

	// Attempt primary connection
	conn, err := clickhouse.Open(options)
	if err == nil {
		if pingErr := conn.Ping(context.Background()); pingErr == nil {
			ClickHouseDB = conn
			log.Println("Successfully connected to ClickHouse (primary settings)")
			return nil
		} else {
			err = fmt.Errorf("failed to ping ClickHouse: %w", pingErr)
		}
	}
	log.Printf("Primary ClickHouse connection failed: %v", err)

	// Plaintext fallback (hack): try native port 9000 without TLS when not using HTTP
	if !config.AppConfig.Database.ClickHouse.UseHTTP {
		log.Println("Attempting plaintext fallback to ClickHouse on port 9000 (no TLS)...")
		fallback := &clickhouse.Options{
			Addr: []string{fmt.Sprintf("%s:%d",
				config.AppConfig.Database.ClickHouse.Host,
				9000)},
			Auth: clickhouse.Auth{
				Database: config.AppConfig.Database.ClickHouse.Database,
				Username: config.AppConfig.Database.ClickHouse.User,
				Password: config.AppConfig.Database.ClickHouse.Password,
			},
			Settings:    options.Settings,
			Compression: options.Compression,
			DialTimeout: options.DialTimeout,
			// TLS intentionally nil for plaintext
		}
		fbConn, fbErr := clickhouse.Open(fallback)
		if fbErr == nil {
			if pingErr := fbConn.Ping(context.Background()); pingErr == nil {
				ClickHouseDB = fbConn
				log.Println("Successfully connected to ClickHouse using plaintext fallback on port 9000")
				return nil
			} else {
				fbErr = fmt.Errorf("failed to ping ClickHouse (fallback): %w", pingErr)
			}
		}
		log.Printf("Plaintext fallback failed: %v", fbErr)
	}

	return fmt.Errorf("failed to connect to ClickHouse")
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
			-- Materialized pincode extracted from address for fast filtering (first 6-digit token)
			pincode String MATERIALIZED arrayFirst(x -> length(x) = 6, extractAll(address, '\\d+')),
			created_at DateTime DEFAULT now(),
			updated_at DateTime DEFAULT now(),
			-- Secondary indexes for accelerating LIKE/ILIKE searches
			INDEX idx_name_ngram name TYPE ngrambf_v1(3, 256, 2, 0) GRANULARITY 4,
			INDEX idx_fname_ngram fname TYPE ngrambf_v1(3, 256, 2, 0) GRANULARITY 4,
			INDEX idx_address_ngram address TYPE ngrambf_v1(3, 256, 2, 0) GRANULARITY 4,
			INDEX idx_email_token email TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 4,
			INDEX idx_circle_token circle TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 4,
			INDEX idx_mobile_token mobile TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 4,
			INDEX idx_alt_token alt TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 4,
			INDEX idx_master_id_token master_id TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 4,
			-- Bloom filter index for exact pincode matches
			INDEX idx_pincode_bf pincode TYPE bloom_filter GRANULARITY 4
		)
		ENGINE = MergeTree()
		ORDER BY (mobile, name, master_id)
		SETTINGS index_granularity = 8192,
		         max_compress_block_size = 1048576,
		         min_compress_block_size = 65536`,

		// Optional MV (legacy); keep if already present
		`CREATE MATERIALIZED VIEW IF NOT EXISTS finone_search.people_search_mv
		(
			id UUID,
			master_id String,
			mobile String,
			name String,
			fname String,
			address String,
			alt String,
			circle String,
			email String,
			search_text String,
			created_at DateTime
		)
		ENGINE = MergeTree()
		ORDER BY search_text
		AS SELECT
			id,
			master_id,
			mobile,
			name,
			fname,
			address,
			alt,
			circle,
			email,
			concat(mobile, ' ', name, ' ', fname, ' ', address, ' ', alt, ' ', circle, ' ', email) as search_text,
			created_at
		FROM finone_search.people`,

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

		// Ensure schema upgrades on existing deployments (idempotent)
		`ALTER TABLE finone_search.people ADD COLUMN IF NOT EXISTS pincode String MATERIALIZED arrayFirst(x -> length(x) = 6, extractAll(address, '\\d+'))`,
		`ALTER TABLE finone_search.people ADD INDEX IF NOT EXISTS idx_pincode_bf pincode TYPE bloom_filter GRANULARITY 4`,
		`ALTER TABLE finone_search.people MATERIALIZE COLUMN pincode`,
		`ALTER TABLE finone_search.people MATERIALIZE INDEX idx_pincode_bf`,

		// New: Dedicated indexed search table and loader MV
		`CREATE TABLE IF NOT EXISTS finone_search.people_search_idx
		(
			id UUID,
			master_id String,
			mobile String,
			name String,
			fname String,
			address String,
			alt String,
			circle String,
			email String,
			search_text String,
			created_at DateTime
		)
		ENGINE = MergeTree()
		ORDER BY search_text`,

		`CREATE MATERIALIZED VIEW IF NOT EXISTS finone_search.people_search_loader TO finone_search.people_search_idx AS
		SELECT
			id,
			master_id,
			mobile,
			name,
			fname,
			address,
			alt,
			circle,
			email,
			concat(mobile, ' ', name, ' ', fname, ' ', address, ' ', alt, ' ', circle, ' ', email) as search_text,
			created_at
		FROM finone_search.people`,
	}

	for i, query := range migrationQueries {
		log.Printf("Running ClickHouse migration %d", i+1)
		if err := ClickHouseDB.Exec(context.Background(), query); err != nil {
			return fmt.Errorf("failed to run ClickHouse migration %d: %w", i+1, err)
		}
	}

	// Ensure index exists on the dedicated search table with fallbacks for different CH versions
	indexAttempts := []string{
		`ALTER TABLE finone_search.people_search_idx ADD INDEX IF NOT EXISTS idx_search_text_ngram search_text TYPE ngrambf_v1(3, 256, 2, 0) GRANULARITY 4`,
		`ALTER TABLE finone_search.people_search_idx ADD INDEX IF NOT EXISTS idx_search_text_ngram search_text TYPE ngrambf(3, 256, 2, 0) GRANULARITY 4`,
		`ALTER TABLE finone_search.people_search_idx ADD INDEX IF NOT EXISTS idx_search_text_ngram search_text TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 4`,
	}
	for _, q := range indexAttempts {
		if err := ClickHouseDB.Exec(context.Background(), q); err != nil {
			log.Printf("Index attempt failed (%s): %v", q, err)
			continue
		}
		break
	}
	// Try to materialize regardless; ignore errors if index type didn't support materialization or not created
	_ = ClickHouseDB.Exec(context.Background(), `ALTER TABLE finone_search.people_search_idx MATERIALIZE INDEX idx_search_text_ngram`)

	// One-time backfill if empty
	var cnt uint64
	if err := ClickHouseDB.QueryRow(context.Background(), `SELECT count() FROM finone_search.people_search_idx`).Scan(&cnt); err == nil {
		if cnt == 0 {
			log.Printf("Backfilling people_search_idx from people...")
			_ = ClickHouseDB.Exec(context.Background(), `INSERT INTO finone_search.people_search_idx
				SELECT id, master_id, mobile, name, fname, address, alt, circle, email,
				       concat(mobile, ' ', name, ' ', fname, ' ', address, ' ', alt, ' ', circle, ' ', email) as search_text,
				       created_at
				FROM finone_search.people`)
		}
	} else {
		log.Printf("Failed to check people_search_idx count: %v", err)
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
