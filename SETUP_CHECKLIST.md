# MeProofIt Setup Checklist

Use this checklist to ensure your MeProofIt app is properly configured with Vercel, GitHub, and Supabase.

## Pre-Setup

- [ ] Node.js 16+ installed
- [ ] Git installed and configured
- [ ] GitHub account created
- [ ] Vercel account created
- [ ] Supabase account created

## GitHub Setup

- [ ] Repository created on GitHub
- [ ] Local project initialized with git
- [ ] `.gitignore` file created (excludes `.env` and `node_modules`)
- [ ] Code pushed to GitHub repository
- [ ] Repository is accessible and up to date

## Supabase Setup

- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] Project URL copied: `https://[project-ref].supabase.co`
- [ ] Anon key copied from Settings → API
- [ ] Database schema created (tables from DATABASE_SETUP.md)
- [ ] Row Level Security (RLS) policies configured
- [ ] Google OAuth configured (if using):
  - [ ] Google OAuth credentials created
  - [ ] Google Client ID and Secret added to Supabase
  - [ ] Site URL set in Supabase (will update after Vercel deployment)
  - [ ] Redirect URLs configured

## Local Development

- [ ] `.env` file created in project root
- [ ] `REACT_APP_SUPABASE_URL` added to `.env`
- [ ] `REACT_APP_SUPABASE_ANON_KEY` added to `.env`
- [ ] `OPENAI_API_KEY` added to `.env` (server-side only; if using AI)
- [ ] Dependencies installed: `npm install --legacy-peer-deps`
- [ ] App runs locally: `npm start`
- [ ] No console errors in browser
- [ ] Can connect to Supabase (check browser console)

## Vercel Setup

- [ ] Vercel account connected to GitHub
- [ ] Repository imported to Vercel
- [ ] Project settings verified:
  - [ ] Framework: Create React App
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `build`
- [ ] Environment variables added in Vercel:
  - [ ] `REACT_APP_SUPABASE_URL` (Production, Preview, Development)
  - [ ] `REACT_APP_SUPABASE_ANON_KEY` (Production, Preview, Development)
  - [ ] `REACT_APP_SITE_URL` (Production - set to Vercel URL after first deploy)
  - [ ] `OPENAI_API_KEY` (Production, Preview, Development)
- [ ] First deployment successful
- [ ] Vercel URL obtained: `https://[app-name].vercel.app`

## Post-Deployment Configuration

- [ ] Supabase Site URL updated to Vercel URL
- [ ] Google OAuth redirect URLs updated:
  - [ ] Supabase callback URL added to Google Console
  - [ ] Vercel URL added to Google Console authorized redirects
- [ ] `REACT_APP_SITE_URL` updated in Vercel to production URL
- [ ] App redeployed after environment variable changes

## Testing

- [ ] App loads on Vercel URL
- [ ] No console errors in production
- [ ] Google OAuth sign-in works (if configured)
- [ ] User profile creation works
- [ ] Database operations work (save/load data)
- [ ] Daily challenge feature works
- [ ] Game functionality works end-to-end
- [ ] Mobile responsive design works

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] No secrets committed to GitHub
- [ ] Only Anon key used in client (not Service Role key)
- [ ] RLS policies tested and working
- [ ] HTTPS enabled (automatic with Vercel)

## Monitoring & Maintenance

- [ ] Vercel deployment notifications set up
- [ ] Supabase usage monitoring enabled
- [ ] Error tracking considered (optional: Sentry, etc.)
- [ ] Database backups verified (automatic with Supabase)

## Documentation

- [ ] README.md updated with deployment info
- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] DATABASE_SETUP.md reviewed
- [ ] GOOGLE_OAUTH_SETUP.md reviewed (if using OAuth)

---

## Quick Test Commands

```bash
# Test local build
npm run build

# Test local development
npm start

# Check git status
git status

# Verify environment variables (don't run in production)
echo $REACT_APP_SUPABASE_URL
```

---

## Troubleshooting Quick Reference

| Issue | Check |
|-------|-------|
| Build fails | Check Vercel build logs, verify package.json |
| Environment variables undefined | Verify in Vercel Settings → Environment Variables |
| OAuth redirect errors | Check Supabase Site URL and Google Console redirects |
| Database connection fails | Verify Supabase URL and Anon key |
| CORS errors | Usually auto-handled by Supabase, check project settings |

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Last Updated**: [Date]
