-- ClickHouse Schema for High-Performance Search

-- Create database
CREATE DATABASE IF NOT EXISTS finone_search;

-- Use the database
USE finone_search;

-- Main people table optimized for search
CREATE TABLE IF NOT EXISTS people
(
    id UUID DEFAULT generateUUIDv4(),              -- Internal UUID
    master_id String,                              -- Original ID from CSV
    mobile String,                                 -- Phone number
    name String,                                   -- Full name
    fname String,                                  -- Father's name
    address String,                                -- Address
    alt String,                                    -- Alternative contact
    circle String,                                 -- Circle/Region
    email String,                                  -- Email address
    -- Materialized pincode extracted from address (first 6-digit token)
    pincode String MATERIALIZED arrayFirst(x -> length(x) = 6, extractAll(address, '\\d+')),
    created_at DateTime DEFAULT now(),             -- Record creation time
    updated_at DateTime DEFAULT now(),             -- Last update time
    -- Secondary indexes for accelerating LIKE/ILIKE searches
    INDEX idx_name_ngram name TYPE ngrambf_v1(3, 256, 2) GRANULARITY 4,
    INDEX idx_fname_ngram fname TYPE ngrambf_v1(3, 256, 2) GRANULARITY 4,
    INDEX idx_address_ngram address TYPE ngrambf_v1(3, 256, 2) GRANULARITY 4,
    INDEX idx_email_token email TYPE tokenbf_v1(1024) GRANULARITY 4,
    INDEX idx_circle_token circle TYPE tokenbf_v1(1024) GRANULARITY 4,
    INDEX idx_mobile_token mobile TYPE tokenbf_v1(1024) GRANULARITY 4,
    INDEX idx_alt_token alt TYPE tokenbf_v1(1024) GRANULARITY 4,
    INDEX idx_master_id_token master_id TYPE tokenbf_v1(1024) GRANULARITY 4,
    -- Bloom filter index for exact pincode matches
    INDEX idx_pincode_bf pincode TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (mobile, name, master_id)
SETTINGS index_granularity = 8192;

-- Create materialized view for faster full-text search (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS people_search_mv
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
FROM people;

-- Create table for search performance tracking
CREATE TABLE IF NOT EXISTS search_performance
(
    query_id String,
    user_id String,
    query_text String,
    execution_time_ms UInt32,
    result_count UInt32,
    timestamp DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY timestamp;

-- Idempotent schema upgrades for existing deployments
ALTER TABLE people ADD COLUMN IF NOT EXISTS pincode String MATERIALIZED arrayFirst(x -> length(x) = 6, extractAll(address, '\\d+'));
ALTER TABLE people ADD INDEX IF NOT EXISTS idx_pincode_bf pincode TYPE bloom_filter GRANULARITY 4;
ALTER TABLE people MATERIALIZE COLUMN pincode;
ALTER TABLE people MATERIALIZE INDEX idx_pincode_bf;

-- Sample data insertion (remove after testing)
-- This will be replaced by your CSV import
-- INSERT INTO people (master_id, mobile, name, fname, address, alt, circle, email) VALUES
-- ('1', '9876543210', 'John Doe', 'Robert Doe', '123 Main St, Delhi', '9876543211', 'Delhi', 'john@example.com'),
-- ('2', '9876543212', 'Jane Smith', 'Michael Smith', '456 Park Ave, Mumbai', '9876543213', 'Mumbai', 'jane@example.com');
