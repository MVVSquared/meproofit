# Complete Deployment Guide: Vercel + GitHub + Supabase

This guide covers the complete setup and deployment of MeProofIt using Vercel (hosting), GitHub (version control & CI/CD), and Supabase (database & authentication).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Setup](#github-setup)
3. [Supabase Setup](#supabase-setup)
4. [Vercel Setup](#vercel-setup)
5. [Environment Variables](#environment-variables)
6. [Deployment Workflow](#deployment-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Prerequisites

Before starting, ensure you have:

- ✅ A GitHub account
- ✅ A Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ A Supabase account (sign up at [supabase.com](https://supabase.com))
- ✅ Node.js 16+ installed locally
- ✅ Git installed locally

---

## GitHub Setup

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Fill in the details:
   - **Repository name**: `meproofit` (or your preferred name)
   - **Description**: "Spelling and punctuation correction game for 3rd-5th graders"
   - **Visibility**: Choose Public or Private
   - **Initialize**: Don't initialize with README (if you already have files)
4. Click **Create repository**

### Step 2: Push Your Code to GitHub

If you haven't already connected your local project to GitHub:

```bash
# Navigate to your project directory
cd c:\Users\mvvsq\Dropbox\Webstuff\meproofit

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: MeProofIt app with Supabase integration"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/meproofit.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Create .gitignore (if not exists)

Ensure your `.gitignore` includes:

```gitignore
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
```

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in project details:
   - **Organization**: Select or create one
   - **Name**: `meproofit-db`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start
4. Click **Create new project**
5. Wait 1-2 minutes for project setup

### Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **Anon Public Key**: `eyJ...` (starts with `eyJ`)
   - **Service Role Key**: Keep this secret! (only for server-side operations)

### Step 3: Set Up Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Run the SQL from `DATABASE_SETUP.md` (sections 3.2 and 3.3):
   - Create tables (daily_sentences, user_profiles, etc.)
   - Set up Row Level Security (RLS) policies

### Step 4: Configure Google OAuth (Optional but Recommended)

Follow the complete guide in `GOOGLE_OAUTH_SETUP.md`:

1. **Create Google OAuth credentials** in Google Cloud Console
2. **Configure Supabase OAuth**:
   - Go to **Authentication** → **Providers** → **Google**
   - Enable Google provider
   - Add your Google Client ID and Client Secret
3. **Set Site URL**:
   - Go to **Authentication** → **URL Configuration**
   - Set **Site URL** to your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Add redirect URLs:
     - `https://your-app.vercel.app`
     - `http://localhost:3000` (for local development)

---

## Vercel Setup

### Step 1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New...** → **Project**
3. Import your GitHub repository:
   - Select your GitHub account
   - Find and select `meproofit` repository
   - Click **Import**

### Step 2: Configure Project Settings

Vercel should auto-detect your React app. Verify:

- **Framework Preset**: Create React App (or Vite if you're using it)
- **Root Directory**: `./` (root)
- **Build Command**: `npm run build` (or `npm run build --legacy-peer-deps`)
- **Output Directory**: `build`
- **Install Command**: `npm install --legacy-peer-deps` (if needed)

### Step 3: Add Environment Variables

**CRITICAL**: Add these in Vercel before your first deployment:

1. In Vercel project settings, go to **Settings** → **Environment Variables**
2. Add each variable for **Production**, **Preview**, and **Development**:

```env
# Supabase Configuration (REQUIRED)
REACT_APP_SUPABASE_URL=https://[your-project-ref].supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here

# Site URL (for OAuth redirects - set to your Vercel URL)
REACT_APP_SITE_URL=https://your-app-name.vercel.app

# OpenAI API Key (if using AI features)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

**Important Notes**:
- Replace `[your-project-ref]` with your actual Supabase project reference
- Replace `your-app-name` with your actual Vercel app name
- Use the exact values from your Supabase dashboard
- Make sure to add these for all environments (Production, Preview, Development)

### Step 4: Deploy

1. Click **Deploy** (or push to GitHub to trigger auto-deployment)
2. Wait for build to complete (usually 2-3 minutes)
3. Your app will be live at `https://your-app-name.vercel.app`

### Step 5: Update Supabase Site URL

After getting your Vercel URL:

1. Go back to Supabase → **Authentication** → **URL Configuration**
2. Update **Site URL** to your Vercel URL: `https://your-app-name.vercel.app`
3. Add redirect URL: `https://your-app-name.vercel.app`
4. Save changes

---

## Environment Variables

### Local Development (.env file)

Create a `.env` file in your project root:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://[your-project-ref].supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here

# Site URL (optional - defaults to current origin)
REACT_APP_SITE_URL=http://localhost:3000

# OpenAI API Key
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

### Vercel Environment Variables

Add the same variables in Vercel dashboard:
- **Settings** → **Environment Variables**
- Add for Production, Preview, and Development environments
- Use your production Vercel URL for `REACT_APP_SITE_URL` in Production

### Environment Variable Checklist

- [ ] `REACT_APP_SUPABASE_URL` - Your Supabase project URL
- [ ] `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `REACT_APP_SITE_URL` - Your Vercel deployment URL (for production)
- [ ] `REACT_APP_OPENAI_API_KEY` - Your OpenAI API key (if using AI)

---

## Deployment Workflow

### Automatic Deployment (Recommended)

With GitHub + Vercel integration:

1. **Make changes** to your code locally
2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Your commit message"
   ```
3. **Push to GitHub**:
   ```bash
   git push origin main
   ```
4. **Vercel automatically deploys**:
   - Vercel detects the push
   - Builds your app
   - Deploys to production (if on main branch)
   - Creates preview deployments for other branches

### Manual Deployment

If you need to deploy manually:

1. Go to Vercel dashboard
2. Click **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or use Vercel CLI:
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

### Branch Strategy

- **main/master branch**: Auto-deploys to production
- **Other branches**: Auto-deploy as preview URLs
- **Pull requests**: Get preview deployments automatically

---

## Troubleshooting

### Common Issues

#### 1. Build Fails on Vercel

**Error**: `Module not found` or build errors

**Solutions**:
- Check `package.json` dependencies are correct
- Ensure `vercel.json` build configuration is correct
- Check build logs in Vercel dashboard
- Try adding `--legacy-peer-deps` to install command

#### 2. Environment Variables Not Working

**Error**: `Supabase is not configured` or undefined values

**Solutions**:
- Verify environment variables are set in Vercel (Settings → Environment Variables)
- Make sure variables start with `REACT_APP_` for Create React App
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

#### 3. OAuth Redirect Issues

**Error**: `redirect_uri_mismatch` or redirecting to wrong URL

**Solutions**:
- **Most Important**: Set Site URL in Supabase to your Vercel URL
- Add Supabase callback URL to Google Console: `https://[project-ref].supabase.co/auth/v1/callback`
- Add your Vercel URL to Google Console authorized redirect URIs
- Set `REACT_APP_SITE_URL` in Vercel to your production URL
- Wait 1-2 minutes after changes for propagation

#### 4. Database Connection Errors

**Error**: Cannot connect to Supabase or RLS policy errors

**Solutions**:
- Verify `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are correct
- Check Row Level Security policies in Supabase
- Ensure user is authenticated before database operations
- Check Supabase dashboard for error logs

#### 5. CORS Issues

**Error**: CORS errors in browser console

**Solutions**:
- Supabase handles CORS automatically - no configuration needed
- If issues persist, check Supabase project settings
- Verify you're using the correct Supabase URL

### Getting Help

1. **Check Vercel Logs**: Dashboard → Deployments → Click deployment → View Function Logs
2. **Check Supabase Logs**: Dashboard → Logs → API Logs
3. **Browser Console**: Open DevTools → Console for client-side errors
4. **Network Tab**: Check API requests and responses

---

## Best Practices

### Security

1. ✅ **Never commit `.env` files** to GitHub
2. ✅ **Use environment variables** for all secrets
3. ✅ **Use Supabase RLS** for database security
4. ✅ **Keep Service Role Key secret** (never expose in client)
5. ✅ **Use Anon Key** in React app (it's safe for client-side)

### Performance

1. ✅ **Enable Vercel Edge Caching** (automatic for static assets)
2. ✅ **Use Supabase connection pooling** for high traffic
3. ✅ **Cache sentences** in Supabase to reduce API calls
4. ✅ **Optimize images** and assets before deployment

### Development Workflow

1. ✅ **Test locally** before pushing to GitHub
2. ✅ **Use preview deployments** for testing
3. ✅ **Keep main branch stable** (use feature branches)
4. ✅ **Monitor deployments** in Vercel dashboard
5. ✅ **Set up error tracking** (consider Sentry or similar)

### Database Management

1. ✅ **Backup database** regularly (Supabase does this automatically)
2. ✅ **Monitor usage** in Supabase dashboard
3. ✅ **Use migrations** for schema changes (Supabase SQL Editor)
4. ✅ **Test RLS policies** thoroughly

### CI/CD

1. ✅ **Automatic deployments** from GitHub to Vercel
2. ✅ **Preview deployments** for pull requests
3. ✅ **Environment-specific variables** (dev, preview, production)
4. ✅ **Build status checks** in GitHub

---

## Quick Reference

### Important URLs

- **GitHub Repository**: `https://github.com/YOUR_USERNAME/meproofit`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Supabase Dashboard**: `https://app.supabase.com/project/[project-ref]`
- **Your Live App**: `https://your-app-name.vercel.app`

### Key Commands

```bash
# Local development
npm install --legacy-peer-deps
npm start

# Build locally
npm run build

# Git workflow
git add .
git commit -m "Your message"
git push origin main

# Vercel CLI (optional)
vercel login
vercel --prod
```

### Environment Variables Reference

| Variable | Where to Get | Required |
|----------|-------------|----------|
| `REACT_APP_SUPABASE_URL` | Supabase → Settings → API | ✅ Yes |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ Yes |
| `REACT_APP_SITE_URL` | Your Vercel URL | ⚠️ Recommended |
| `REACT_APP_OPENAI_API_KEY` | OpenAI Dashboard | ❌ Optional |

---

## Next Steps

After completing this setup:

1. ✅ **Test the deployment**: Visit your Vercel URL
2. ✅ **Test authentication**: Try Google OAuth sign-in
3. ✅ **Test database**: Create a user profile and verify it saves
4. ✅ **Set up monitoring**: Consider adding error tracking
5. ✅ **Configure custom domain** (optional): Add your own domain in Vercel
6. ✅ **Set up backups**: Verify Supabase automatic backups are enabled

---

## Support Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **GitHub Docs**: [docs.github.com](https://docs.github.com)
- **React Docs**: [react.dev](https://react.dev)

---

**Congratulations!** 🎉 Your MeProofIt app is now fully deployed and integrated with Vercel, GitHub, and Supabase!
