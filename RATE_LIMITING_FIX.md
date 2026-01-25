# Anonymous Rate Limiting Fix - January 2026

## ✅ Changes Made

### 1. Replaced In-Memory Rate Limiting with Persistent Supabase Storage
**Before**: 
```javascript
const anonRateMap = new Map(); // key -> { windowStartSec, count }

function checkAnonRateLimit(key) {
  // In-memory only - lost when function instance restarts
  // Each serverless instance has its own map
  const entry = anonRateMap.get(key);
  // ...
}
```

**After**: 
```javascript
async function checkAnonRateLimit(ip) {
  // Uses Supabase for persistent storage
  // Works across all serverless function instances
  const anonUserId = `anon:${ip}`;
  // Queries Supabase rate_limits table
  // ...
}
```

### 2. Persistent Across Serverless Instances
- **Before**: Each Vercel serverless function instance had its own in-memory map
- **After**: All instances share the same Supabase database
- **Result**: Rate limits work correctly even with multiple concurrent instances

### 3. IP-Based Tracking
- Uses IP address to identify anonymous users
- Stores in `rate_limits` table with special format: `anon:IP_ADDRESS`
- Same table structure as authenticated users (just different user_id format)

## 🔒 Security Improvements

### Before ❌
- In-memory rate limiting per instance
- Multiple instances = multiple rate limit buckets
- Attacker could bypass limits by hitting different instances
- Rate limits reset when function instance restarts

### After ✅
- Persistent rate limiting in Supabase
- Works across all serverless instances
- Consistent rate limiting regardless of instance count
- Rate limits persist across function restarts

## 🔧 How It Works

### Anonymous Rate Limiting Flow

1. **Request arrives** from anonymous user (no auth token)
2. **Extract IP address** from request headers
3. **Create identifier**: `anon:IP_ADDRESS` (e.g., `anon:192.168.1.1`)
4. **Query Supabase**: Count requests in last 60 seconds for this IP
5. **Check limit**: If < 10 requests → allow, else → block
6. **Record request**: Store timestamp in Supabase (non-blocking)
7. **Cleanup**: Remove old records (non-blocking)

### Database Structure

Uses existing `rate_limits` table:
```sql
rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR/UUID NOT NULL,  -- "anon:IP_ADDRESS" for anonymous users
  endpoint VARCHAR(100) NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Example records**:
- Authenticated user: `user_id = "550e8400-e29b-41d4-a716-446655440000"`
- Anonymous user: `user_id = "anon:192.168.1.1"`

## 📊 Impact

### Rate Limiting Accuracy

| Scenario | Before | After |
|----------|--------|-------|
| Single instance | ✅ Works | ✅ Works |
| Multiple instances | ❌ Each has own limit | ✅ Shared limit |
| After restart | ❌ Limits reset | ✅ Limits persist |
| Distributed attack | ❌ Can bypass | ✅ Properly limited |

### Performance

- **Database queries**: Minimal (1 read + 1 write per request)
- **Non-blocking writes**: Rate limit check doesn't wait for write to complete
- **Automatic cleanup**: Old records removed automatically
- **Fail-open behavior**: If Supabase unavailable, allows request (availability over strictness)

## 🧪 Testing

### Test Rate Limiting

1. **Make 10 requests** from same IP (without authentication):
   ```bash
   for i in {1..11}; do
     curl -X POST http://localhost:3000/api/generate-sentence \
       -H "Content-Type: application/json" \
       -d '{"topic": "basketball", "difficulty": "easy", "grade": "3rd"}'
   done
   ```

2. **Expected**:
   - First 10 requests: ✅ 200 OK
   - 11th request: ❌ 429 Too Many Requests

3. **Check Supabase**:
   ```sql
   SELECT * FROM rate_limits 
   WHERE user_id LIKE 'anon:%' 
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```

### Test Across Instances

1. Deploy to Vercel (multiple instances will be created automatically)
2. Make requests from same IP
3. Rate limit should be consistent regardless of which instance handles the request

## ⚠️ Important Notes

### 1. IP Address Extraction
The code uses `getClientIp()` which checks:
- `X-Forwarded-For` header (first IP)
- `X-Real-IP` header
- `req.socket.remoteAddress` (fallback)

**Note**: Behind proxies/load balancers, IP might be the proxy's IP, not the client's. This is normal for Vercel deployments.

### 2. Anonymous User Identifier Format
- Format: `anon:IP_ADDRESS`
- Example: `anon:192.168.1.1`, `anon:2001:0db8::1`
- Stored in `user_id` column (same as authenticated users)

### 3. Row Level Security (RLS)
The `rate_limits` table should allow inserts for anonymous identifiers:
```sql
-- Allow inserts for anonymous rate limits
CREATE POLICY "Allow anonymous rate limit inserts" ON rate_limits
  FOR INSERT WITH CHECK (user_id LIKE 'anon:%' OR auth.uid()::text = user_id);
```

### 4. Authentication Still Recommended
While anonymous rate limiting now works correctly, **authentication is still recommended** because:
- Better user tracking
- More accurate rate limiting (per user, not per IP)
- IP-based limiting can be bypassed with VPNs/proxies
- Authentication is now required by default in production

## 🔄 Migration

### No Action Required
- Existing `rate_limits` table works as-is
- No schema changes needed
- Anonymous records use same table structure

### Optional: RLS Policy Update
If you have strict RLS policies, you may need to allow anonymous inserts:

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'rate_limits';

-- If needed, add policy for anonymous inserts
CREATE POLICY "Allow anonymous rate limit inserts" ON rate_limits
  FOR INSERT WITH CHECK (user_id LIKE 'anon:%');
```

## 🐛 Troubleshooting

### Issue: Rate limits not working for anonymous users
**Solution**: 
- Check Supabase connection (verify `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`)
- Check RLS policies allow inserts for `anon:*` user_ids
- Check Vercel logs for errors

### Issue: Rate limits reset unexpectedly
**Solution**:
- Verify Supabase is accessible
- Check that writes are completing (check `rate_limits` table)
- Verify cleanup isn't deleting records too early

### Issue: Same IP getting different limits
**Solution**:
- Check IP extraction logic (might be getting different IPs due to proxies)
- Verify Supabase queries are working correctly
- Check for multiple instances with different behavior (shouldn't happen now)

## ✅ Verification Checklist

After deploying:
- [ ] Anonymous rate limiting works across multiple requests
- [ ] Rate limits persist after function restart
- [ ] Multiple instances share the same rate limit
- [ ] Supabase `rate_limits` table contains `anon:*` records
- [ ] 11th request from same IP gets 429 error
- [ ] Rate limit headers are correct in responses

## 📝 Code Changes

**File**: `api/generate-sentence.js`

1. **Removed**: `const anonRateMap = new Map()`
2. **Updated**: `checkAnonRateLimit()` function:
   - Changed from synchronous to `async`
   - Uses Supabase instead of in-memory Map
   - Stores anonymous users as `anon:IP_ADDRESS`
3. **Updated**: Function call:
   - Changed from `checkAnonRateLimit(key)` to `await checkAnonRateLimit(ip)`

---

**Last Updated**: January 25, 2026  
**Status**: ✅ Anonymous rate limiting fix implemented
