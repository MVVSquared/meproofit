# Google OAuth Setup for MeProofIt (with Supabase Integration)

This guide will help you set up Google OAuth authentication for your MeProofIt app using Supabase.

## Prerequisites

- A Google Cloud Platform account
- A Supabase account and project (see DATABASE_SETUP.md)
- Your app deployed on Vercel (or running locally)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Identity Services API

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "MeProofIt"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (your email and any other test emails)

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - For local development: `http://localhost:3000`
   - For production: `https://your-app-name.vercel.app`
5. Add authorized redirect URIs:
   - **Important**: You need to add Supabase's redirect URL:
     - `https://[your-project-ref].supabase.co/auth/v1/callback`
     - For local development: `http://localhost:3000`
     - For production: `https://your-app-name.vercel.app`
6. Click "Create"

## Step 4: Get Your Credentials

After creating the OAuth client, you'll get:
- Client ID
- Client Secret

**Save these - you'll need them for Supabase configuration!**

## Step 5: Configure Google OAuth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **URL Configuration** (or **Settings**)
3. **CRITICAL**: Set the **Site URL**
   - This is the main URL where users will be redirected after OAuth
   - For production: Set to `https://your-app-name.vercel.app`
   - This is the most important setting for redirects!
4. **Optional**: Configure Redirect URLs (under **Redirect URLs** section)
   - Add your production URL: `https://your-app-name.vercel.app`
   - Add your local development URL: `http://localhost:3000`
   - These are additional allowed redirect URLs
5. Navigate to **Authentication** > **Providers**
6. Find **Google** in the list and click to enable it
7. Enter your Google OAuth credentials:
   - **Client ID (for OAuth)**: Your Google Client ID
   - **Client Secret (for OAuth)**: Your Google Client Secret
8. Click **Save**

## Step 6: Configure Environment Variables

Create a `.env` file in your project root:

```env
# Supabase Configuration (REQUIRED for Google OAuth)
REACT_APP_SUPABASE_URL=https://[your-project-ref].supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Site URL (for production redirects - optional but recommended)
# Set this to your Vercel deployment URL
REACT_APP_SITE_URL=https://your-app-name.vercel.app

# OpenAI API Key (server-side only; DO NOT prefix with REACT_APP_)
OPENAI_API_KEY=your_openai_api_key_here
```

**Note**: 
- You no longer need `REACT_APP_GOOGLE_CLIENT_ID` or `REACT_APP_GOOGLE_CLIENT_SECRET` in your React app - these are configured in Supabase.
- `REACT_APP_SITE_URL` is optional - if not set, the app will use the current domain automatically. But setting it explicitly ensures correct redirects in production.

## Step 7: Deploy to Vercel

1. Add the environment variables in your Vercel project settings:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_SITE_URL` (set to your Vercel URL, e.g., `https://your-app-name.vercel.app`)
   - `OPENAI_API_KEY`
2. Deploy your app

## Step 8: Test the Integration

1. Visit your app
2. Click "Continue with Google"
3. You'll be redirected to Google to sign in
4. After signing in, you'll be redirected back to your app
5. Complete the grade selection
6. Verify that your profile picture and email are displayed
7. Your profile is now saved in Supabase and will sync across devices!

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error** ⚠️ **FIX THIS FIRST**
   
   This is the most common error. Here's how to fix it:
   
   **Step 1: Find your Supabase project reference**
   - Go to your Supabase project dashboard
   - Look at your project URL: `https://[PROJECT-REF].supabase.co`
   - Copy the `[PROJECT-REF]` part (it's usually a mix of letters and numbers)
   
   **Step 2: Add the exact Supabase callback URL to Google Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** > **Credentials**
   - Click on your OAuth 2.0 Client ID
   - Under **Authorized redirect URIs**, click **+ ADD URI**
   - Add this EXACT URL (replace `[PROJECT-REF]` with your actual project reference):
     ```
     https://[PROJECT-REF].supabase.co/auth/v1/callback
     ```
   - **Important**: 
     - No trailing slashes
     - Use `https://` (not `http://`)
     - Must be exactly: `/auth/v1/callback` at the end
     - Replace `[PROJECT-REF]` with your actual Supabase project reference
   
   **Step 3: Save and wait**
   - Click **SAVE** in Google Console
   - Wait 1-2 minutes for changes to propagate
   - Try signing in again
   
   **Example**: If your Supabase URL is `https://abcdefghijklmnop.supabase.co`, then add:
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```
   
   **Still not working?**
   - Double-check for typos in the URL
   - Make sure you're using the correct OAuth Client ID in Supabase
   - Verify your Supabase project URL is correct
   - Try clearing your browser cache and cookies

2. **"access_denied" error**
   - Verify that your email is added as a test user in Google Console
   - Check that the required scopes are enabled

3. **"Supabase is not configured" error**
   - Make sure `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set
   - Check that these environment variables are added to Vercel

4. **User profile not syncing**
   - Check that the Supabase database tables are set up (see DATABASE_SETUP.md)
   - Verify that Row Level Security (RLS) policies allow users to create/update their own profiles

5. **OAuth redirect not working / Redirecting to localhost instead of Vercel** ⚠️ **MOST COMMON FIX**
   
   **This is usually caused by Supabase's Site URL setting!**
   
   **Fix 1: Set Site URL in Supabase (MOST IMPORTANT)**
   - Go to Supabase Dashboard > **Authentication** > **URL Configuration** (or **Settings**)
   - Find the **Site URL** field
   - Change it from `http://localhost:3000` to your Vercel URL: `https://your-app-name.vercel.app`
   - Click **Save**
   - This is the PRIMARY setting that controls where OAuth redirects go!
   
   **Fix 2: Set `REACT_APP_SITE_URL` environment variable in Vercel**
   - Go to Vercel project settings > Environment Variables
   - Add: `REACT_APP_SITE_URL` = `https://your-app-name.vercel.app`
   - Redeploy your app
   
   **Fix 3: Configure Redirect URLs in Supabase (optional but recommended)**
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Under "Redirect URLs" section, add:
     - `https://your-app-name.vercel.app`
     - `http://localhost:3000` (for local development)
   
   **Fix 4: Verify you're testing on Vercel**
   - Make sure you're testing on your actual Vercel deployment URL, not localhost
   - Clear browser cache and cookies
   
   **The Site URL in Supabase is the most important setting - it overrides everything else!**

### Security Notes

- Never commit your `.env` file to version control
- Google Client Secret is stored securely in Supabase (not in your React app)
- All authentication is handled by Supabase with proper security
- User data is stored in Supabase database with Row Level Security
- Sessions are managed securely by Supabase

## How It Works

1. User clicks "Continue with Google"
2. App redirects to Supabase OAuth endpoint
3. Supabase redirects to Google for authentication
4. User signs in and grants permissions
5. Google redirects back to Supabase with authorization code
6. Supabase exchanges code for tokens and creates a session
7. Supabase redirects back to your app with session
8. App extracts user info from Supabase session
9. User selects their grade level
10. Profile is saved to Supabase database (synced across devices!)

## Benefits

- **No passwords to manage**: Users sign in with their Google account
- **Cross-device sync**: User data is stored in Supabase, accessible from any device
- **Secure authentication**: Supabase handles all OAuth security
- **Database persistence**: User profiles, scores, and progress are saved in Supabase
- **Trusted authentication**: Google handles security and account verification
- **Easy onboarding**: One-click sign-in process
- **Profile pictures**: Users get their Google profile picture automatically

## Fallback Option

Users can still choose "Continue without account" for local-only play. Their data will be stored in localStorage and won't sync across devices, maintaining the existing functionality while adding the new Google option.

## Next Steps

After setting up Google OAuth:
1. Test the authentication flow
2. Verify user profiles are created in Supabase
3. Test cross-device sync by signing in on multiple devices
4. Check that user progress is being saved to the database 