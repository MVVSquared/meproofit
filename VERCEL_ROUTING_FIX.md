# Vercel Routing Fix for API Routes

## Problem
API routes (`/api/generate-sentence`) were returning 405 (Method Not Allowed) in production because the catch-all route was intercepting API requests before they could reach the serverless function.

## Solution
Updated `vercel.json` to exclude `/api/*` routes from the catch-all React app route.

## Changes Made

### Before ❌
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"  // This was catching /api/* routes
    }
  ]
}
```

### After ✅
```json
{
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"  // Excludes /api/* from catch-all
    }
  ]
}
```

## How It Works

1. **API Routes**: Vercel automatically handles routes in the `api/` folder as serverless functions - no rewrite needed
2. **Catch-All Route**: The regex `/((?!api/).*)` matches all routes EXCEPT those starting with `api/`
3. **Result**: API routes go to serverless functions, everything else goes to React app

## Testing

After deploying this fix:

1. **Test API endpoint**:
   ```bash
   curl -X POST https://meproofit.com/api/generate-sentence \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"topic":"basketball","difficulty":"medium","grade":"3rd"}'
   ```

2. **Expected**: Should return 200 with sentence data (or 401 if no auth token)

3. **Test in app**: Try generating a sentence in the game - should work now

## Deployment

1. Commit the changes:
   ```bash
   git add vercel.json
   git commit -m "Fix: Exclude API routes from catch-all rewrite"
   git push origin main
   ```

2. Vercel will automatically redeploy

3. Verify the fix works in production

## Notes

- API routes in `api/` folder are automatically handled by Vercel
- No explicit rewrite needed for `/api/*` routes
- The catch-all route now properly excludes API routes
- This fix applies to both production and preview deployments

---

**Status**: ✅ Fixed  
**Priority**: 🔴 CRITICAL (Blocks API functionality in production)
