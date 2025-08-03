-- Create user_password_change_requests table
CREATE TABLE IF NOT EXISTS user_password_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_id UUID REFERENCES users(id),
    admin_notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_password_change_requests_user_id ON user_password_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_password_change_requests_status ON user_password_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_password_change_requests_created_at ON user_password_change_requests(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_password_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_password_change_requests_updated_at ON user_password_change_requests;
CREATE TRIGGER trigger_update_user_password_change_requests_updated_at
    BEFORE UPDATE ON user_password_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_user_password_change_requests_updated_at();
