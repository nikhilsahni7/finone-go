-- Fix password change request status constraint
-- Update COMPLETED status to APPROVED if any exist
UPDATE user_password_change_requests SET status = 'APPROVED' WHERE status = 'COMPLETED';

-- Drop the existing constraint
ALTER TABLE user_password_change_requests DROP CONSTRAINT IF EXISTS user_password_change_requests_status_check;

-- Add the new constraint with correct values
ALTER TABLE user_password_change_requests ADD CONSTRAINT user_password_change_requests_status_check
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));
