package database

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"time"

	"finone-search-system/config"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

var ClickHouseDB driver.Conn

func InitClickHouse() error {
	// Try multiple connection strategies in order of preference
	strategies := []func() (driver.Conn, error){
		tryNativeTLSConnection,
		tryHTTPSConnection,
		tryPlaintextConnection,
	}

	var lastErr error
	for i, strategy := range strategies {
		log.Printf("Trying ClickHouse connection strategy %d...", i+1)
		conn, err := strategy()
		if err == nil {
			if pingErr := conn.Ping(context.Background()); pingErr == nil {
				ClickHouseDB = conn
				log.Printf("Successfully connected to ClickHouse using strategy %d", i+1)
				return nil
			} else {
				conn.Close()
				lastErr = fmt.Errorf("strategy %d ping failed: %w", i+1, pingErr)
				log.Printf("Strategy %d ping failed: %v", i+1, pingErr)
			}
		} else {
			lastErr = fmt.Errorf("strategy %d connection failed: %w", i+1, err)
			log.Printf("Strategy %d connection failed: %v", i+1, err)
		}
	}

	return fmt.Errorf("all ClickHouse connection strategies failed, last error: %w", lastErr)
}

// Strategy 1: Native TLS connection (original approach)
func tryNativeTLSConnection() (driver.Conn, error) {
	log.Printf("Attempting native TLS connection to %s:%d",
		config.AppConfig.Database.ClickHouse.Host,
		config.AppConfig.Database.ClickHouse.Port)

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
			"max_execution_time":                 30, // Reduced from 60 for faster timeout
			"allow_experimental_analyzer":        1,
			"optimize_move_to_prewhere":          1,
			"use_uncompressed_cache":             1,            // Enable cache for better performance
			"max_threads":                        4,            // Allow parallel processing
			"max_memory_usage":                   "4000000000", // 4GB memory limit
			"join_algorithm":                     "hash",
			"max_bytes_before_external_group_by": "1000000000", // 1GB
		},
		Compression:     &clickhouse.Compression{Method: clickhouse.CompressionLZ4},
		DialTimeout:     time.Duration(10) * time.Second, // Reduced timeout
		ConnMaxLifetime: time.Duration(60) * time.Minute, // Increased lifetime
		MaxIdleConns:    10,                              // Increased from 5
		MaxOpenConns:    20,                              // Increased from 10
	}

	if config.AppConfig.Database.ClickHouse.Secure {
		tlsCfg := &tls.Config{
			ServerName:         config.AppConfig.Database.ClickHouse.Host,
			InsecureSkipVerify: config.AppConfig.Database.ClickHouse.SkipVerify,
		}
		options.TLS = tlsCfg
	}

	return clickhouse.Open(options)
}

// Strategy 2: HTTPS connection (often more reliable through firewalls)
func tryHTTPSConnection() (driver.Conn, error) {
	log.Printf("Attempting HTTPS connection to %s:%d", config.AppConfig.Database.ClickHouse.Host, config.AppConfig.Database.ClickHouse.Port)

	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", config.AppConfig.Database.ClickHouse.Host, config.AppConfig.Database.ClickHouse.Port)},
		Auth: clickhouse.Auth{
			Database: config.AppConfig.Database.ClickHouse.Database,
			Username: config.AppConfig.Database.ClickHouse.User,
			Password: config.AppConfig.Database.ClickHouse.Password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time":                 30, // Reduced from 60 for faster timeout
			"allow_experimental_analyzer":        1,
			"optimize_move_to_prewhere":          1,
			"use_uncompressed_cache":             1,            // Enable cache for better performance
			"max_threads":                        4,            // Allow parallel processing
			"max_memory_usage":                   "4000000000", // 4GB memory limit
			"join_algorithm":                     "hash",
			"max_bytes_before_external_group_by": "1000000000", // 1GB
		},
		Compression:     &clickhouse.Compression{Method: clickhouse.CompressionLZ4},
		DialTimeout:     time.Duration(10) * time.Second, // Reduced timeout
		ConnMaxLifetime: time.Duration(60) * time.Minute, // Increased lifetime
		MaxIdleConns:    10,                              // Increased from 5
		MaxOpenConns:    20,                              // Increased from 10
		Protocol:        clickhouse.HTTP,
	}

	tlsCfg := &tls.Config{
		ServerName:         config.AppConfig.Database.ClickHouse.Host,
		InsecureSkipVerify: config.AppConfig.Database.ClickHouse.SkipVerify,
	}
	options.TLS = tlsCfg

	return clickhouse.Open(options)
}

// Strategy 3: Plaintext fallback (for debugging)
func tryPlaintextConnection() (driver.Conn, error) {
	if config.AppConfig.Database.ClickHouse.UseHTTP {
		return nil, fmt.Errorf("plaintext fallback skipped due to UseHTTP flag")
	}

	log.Printf("Attempting plaintext fallback to %s:9000", config.AppConfig.Database.ClickHouse.Host)

	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:9000", config.AppConfig.Database.ClickHouse.Host)},
		Auth: clickhouse.Auth{
			Database: config.AppConfig.Database.ClickHouse.Database,
			Username: config.AppConfig.Database.ClickHouse.User,
			Password: config.AppConfig.Database.ClickHouse.Password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time":                 30, // Reduced from 60 for faster timeout
			"allow_experimental_analyzer":        1,
			"optimize_move_to_prewhere":          1,
			"use_uncompressed_cache":             1,            // Enable cache for better performance
			"max_threads":                        4,            // Allow parallel processing
			"max_memory_usage":                   "4000000000", // 4GB memory limit
			"join_algorithm":                     "hash",
			"max_bytes_before_external_group_by": "1000000000", // 1GB
		},
		Compression:     &clickhouse.Compression{Method: clickhouse.CompressionLZ4},
		DialTimeout:     time.Duration(10) * time.Second, // Reduced timeout
		ConnMaxLifetime: time.Duration(60) * time.Minute, // Increased lifetime
		MaxIdleConns:    10,                              // Increased from 5
		MaxOpenConns:    20,                              // Increased from 10
	}

	return clickhouse.Open(options)
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
			-- Optimized secondary indexes with better hash parameters
			INDEX idx_mobile_bf mobile TYPE bloom_filter GRANULARITY 1,
			INDEX idx_alt_bf alt TYPE bloom_filter GRANULARITY 1,
			INDEX idx_name_ngram name TYPE ngrambf_v1(3, 1024, 3, 0) GRANULARITY 1,
			INDEX idx_fname_ngram fname TYPE ngrambf_v1(3, 1024, 3, 0) GRANULARITY 1,
			INDEX idx_address_ngram address TYPE ngrambf_v1(4, 2048, 3, 0) GRANULARITY 1,
			INDEX idx_email_token email TYPE tokenbf_v1(2048, 3, 0) GRANULARITY 1,
			INDEX idx_circle_token circle TYPE tokenbf_v1(1024, 3, 0) GRANULARITY 1,
			INDEX idx_master_id_token master_id TYPE tokenbf_v1(2048, 3, 0) GRANULARITY 1,
			-- Bloom filter index for exact pincode matches
			INDEX idx_pincode_bf pincode TYPE bloom_filter GRANULARITY 1
		)
		ENGINE = MergeTree()
		PRIMARY KEY (mobile, name)
		ORDER BY (mobile, name, master_id, id)
		SETTINGS index_granularity = 4096,
		         max_compress_block_size = 2097152,
		         min_compress_block_size = 131072,
		         use_minimalistic_part_header_in_zookeeper = 1`,

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
