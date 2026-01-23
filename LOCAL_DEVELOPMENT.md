# Local Development Setup

## Running the Application Locally

### Option 1: Using Vercel CLI (Recommended for API Routes)

To test API routes locally, you need to use Vercel's development server:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Run the development server**:
   ```bash
   vercel dev
   ```

   This will:
   - Start the React app on `http://localhost:3000`
   - Run API serverless functions locally
   - Handle all routes including `/api/*`

3. **Access the app**: Open `http://localhost:3000`

### Option 2: Using React Scripts (Frontend Only)

If you only need to work on the frontend:

```bash
npm start
```

**Note**: API routes (`/api/*`) will NOT work with this method. You'll need to:
- Deploy to Vercel to test API routes
- Or use `vercel dev` (Option 1)

## Troubleshooting

### Issue: 405 Method Not Allowed on API Routes

**Cause**: Running `npm start` instead of `vercel dev`

**Solution**: 
- Use `vercel dev` to run the full application with API routes
- Or deploy to Vercel to test API functionality

### Issue: API Routes Return 404

**Cause**: API routes only work with Vercel's serverless function runtime

**Solution**: 
- Use `vercel dev` for local development
- Or test after deploying to Vercel

### Issue: Multiple GoTrueClient Instances Warning

**Cause**: Multiple Supabase client instances being created

**Solution**: 
- This is a warning, not an error
- The app should still work correctly
- Consider using a singleton pattern for Supabase client (future improvement)

### Issue: 406 Error on Supabase Queries

**Cause**: Content-Type or Accept header mismatch

**Solution**: 
- Supabase client should handle this automatically
- Check that `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set correctly

## Environment Variables for Local Development

Create a `.env.local` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_SITE_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key
```

**Note**: 
- `OPENAI_API_KEY` is only needed for the API serverless function
- When using `vercel dev`, Vercel will use environment variables from your Vercel project
- You can also set them in `.env.local` for local development

## Quick Start

1. **Clone and install**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Set up environment variables** (create `.env.local`)

3. **Run with Vercel CLI**:
   ```bash
   vercel dev
   ```

4. **Or run frontend only**:
   ```bash
   npm start
   ```
   (API routes won't work)

## Production Deployment

For production, simply push to GitHub. Vercel will automatically:
- Build the React app
- Deploy serverless functions
- Set up environment variables

---

**Recommended**: Always use `vercel dev` for local development to test the full application including API routes.
