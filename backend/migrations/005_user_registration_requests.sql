-- Create user_registration_requests table
CREATE TABLE IF NOT EXISTS user_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(15) NOT NULL,
    requested_searches INTEGER NOT NULL CHECK (requested_searches > 0),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_email ON user_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_status ON user_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_created_at ON user_registration_requests(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_registration_requests_updated_at ON user_registration_requests;
CREATE TRIGGER trigger_update_user_registration_requests_updated_at
    BEFORE UPDATE ON user_registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_user_registration_requests_updated_at();
