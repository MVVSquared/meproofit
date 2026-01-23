-- Rate Limits Table Migration
-- Run this in Supabase SQL Editor to set up rate limiting

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_timestamp 
  ON rate_limits(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp 
  ON rate_limits(timestamp);

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own rate limit records (optional, for privacy)
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow rate limit inserts (needed for API to record requests)
-- Using anon key, so we need to allow inserts
CREATE POLICY "Allow rate limit inserts" ON rate_limits
  FOR INSERT WITH CHECK (true);

-- Policy: Allow rate limit deletes (for cleanup operations)
CREATE POLICY "Allow rate limit deletes" ON rate_limits
  FOR DELETE USING (true);

-- Add comment to table
COMMENT ON TABLE rate_limits IS 'Stores API rate limit records to prevent abuse';
