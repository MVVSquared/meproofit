# Rate Limiting Setup Guide

## Overview
Rate limiting has been implemented to prevent API abuse and control costs. The system allows **10 requests per minute per user**.

## Database Setup

### Step 1: Create Rate Limits Table in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_timestamp 
  ON rate_limits(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp 
  ON rate_limits(timestamp);

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rate limit records (optional, for privacy)
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert/delete (for API operations)
-- Note: This uses the service role key, which bypasses RLS
-- The API will use the anon key, so we need to allow inserts
CREATE POLICY "Allow rate limit inserts" ON rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow rate limit deletes" ON rate_limits
  FOR DELETE USING (true);
```

### Step 2: Verify Table Creation

Check that the table was created:
```sql
SELECT * FROM rate_limits LIMIT 1;
```

## How It Works

1. **Request Tracking**: Each API request is recorded in the `rate_limits` table with:
   - `user_id`: The authenticated user's ID
   - `endpoint`: The API endpoint name ('generate-sentence')
   - `timestamp`: Unix timestamp in seconds

2. **Rate Limit Check**: Before processing a request:
   - Counts requests in the last 60 seconds for the user
   - If count < 10: Allow request and record it
   - If count >= 10: Reject with 429 status

3. **Automatic Cleanup**: Old records (older than 2 minutes) are automatically deleted to keep the table size manageable.

## Rate Limit Headers

The API returns these headers with every response:

- `X-RateLimit-Limit`: Maximum requests allowed (10)
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets
- `Retry-After`: Seconds to wait before retrying (only on 429 responses)

## Error Response

When rate limit is exceeded:
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

Status Code: `429 Too Many Requests`

## Configuration

You can adjust the rate limits by modifying these constants in `api/generate-sentence.ts`:

```typescript
const RATE_LIMIT_REQUESTS = 10; // Number of requests allowed
const RATE_LIMIT_WINDOW = 60; // Time window in seconds (1 minute)
```

## Monitoring

Rate limit violations are logged server-side with:
- User ID (partial, for privacy)
- IP address
- Timestamp

Check Vercel function logs to monitor rate limit violations.

## Testing

1. **Test Normal Usage**: Make 10 requests within a minute - all should succeed
2. **Test Rate Limit**: Make an 11th request - should get 429 error
3. **Test Reset**: Wait 60 seconds, then make another request - should succeed

## Troubleshooting

### Issue: Rate limit not working
**Solution**: 
- Verify the `rate_limits` table exists in Supabase
- Check that RLS policies allow inserts
- Check Vercel function logs for errors

### Issue: Getting rate limited too quickly
**Solution**: 
- Increase `RATE_LIMIT_REQUESTS` value
- Increase `RATE_LIMIT_WINDOW` value
- Check if multiple users are sharing the same account

### Issue: Rate limit table growing too large
**Solution**: 
- The cleanup process should handle this automatically
- You can manually clean up old records:
  ```sql
  DELETE FROM rate_limits 
  WHERE timestamp < EXTRACT(EPOCH FROM NOW()) - 120;
  ```

## Alternative: Upstash Redis (Future Enhancement)

For higher traffic or more advanced rate limiting, consider upgrading to Upstash Redis:

1. Sign up for Upstash (free tier available)
2. Create a Redis database
3. Install `@upstash/ratelimit` and `@upstash/redis`
4. Replace the Supabase-based rate limiting with Upstash

This provides:
- Better performance
- Distributed rate limiting across multiple serverless instances
- More advanced rate limiting algorithms

---

**Status**: ✅ Implemented  
**Priority**: 🔴 CRITICAL  
**Next**: Test rate limiting functionality
