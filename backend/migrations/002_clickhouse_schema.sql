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
    created_at DateTime DEFAULT now(),             -- Record creation time
    updated_at DateTime DEFAULT now()              -- Last update time
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

-- Sample data insertion (remove after testing)
-- This will be replaced by your CSV import
-- INSERT INTO people (master_id, mobile, name, fname, address, alt, circle, email) VALUES
-- ('1', '9876543210', 'John Doe', 'Robert Doe', '123 Main St, Delhi', '9876543211', 'Delhi', 'john@example.com'),
-- ('2', '9876543212', 'Jane Smith', 'Michael Smith', '456 Park Ave, Mumbai', '9876543213', 'Mumbai', 'jane@example.com');
