-- PostgreSQL Schema for User Management and Audit Logs

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type TEXT CHECK (user_type IN ('DEMO', 'PERMANENT')) DEFAULT 'DEMO',
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    max_searches_per_day INTEGER DEFAULT 500,
    max_exports_per_day INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Login activity tracking
CREATE TABLE IF NOT EXISTS logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- Search logs for audit and analytics
CREATE TABLE IF NOT EXISTS searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL, -- Store full search parameters
    search_time TIMESTAMP DEFAULT now(),
    result_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0
);

-- Export logs
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
    exported_at TIMESTAMP DEFAULT now(),
    row_count INTEGER DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0
);

-- Daily usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    search_count INTEGER DEFAULT 0,
    export_count INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Admin users (can be a simple flag in users table or separate table)
-- For now, we'll use a role field in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('USER', 'ADMIN')) DEFAULT 'USER';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_logins_user_time ON logins(user_id, login_time);
CREATE INDEX IF NOT EXISTS idx_searches_user_time ON searches(user_id, search_time);
CREATE INDEX IF NOT EXISTS idx_exports_user_time ON exports(user_id, exported_at);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date);

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, user_type, role, is_active)
VALUES (
    'System Admin',
    'admin@finone.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'PERMANENT',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;
