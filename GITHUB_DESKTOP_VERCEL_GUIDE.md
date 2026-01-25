# GitHub Desktop + Vercel Preview Deployments Guide

## Overview

When you push a branch to GitHub, **Vercel automatically creates a preview deployment** for that branch. This lets you test your changes in a real web browser before merging to main!

## How Vercel Preview Deployments Work

```
Your Branch → Push to GitHub → Vercel Detects Branch → Creates Preview URL
```

- **Main branch** → Deploys to your production URL (e.g., `meproofit.vercel.app`)
- **Feature branches** → Deploys to preview URLs (e.g., `meproofit-git-feature-name-username.vercel.app`)

## Using GitHub Desktop

### Step 1: Create a New Branch

1. **Open GitHub Desktop**
2. **Click the "Current branch" dropdown** (top center, shows "main")
3. **Click "New branch"**
4. **Enter branch name**: `feature/your-feature-name`
5. **Click "Create branch"**

You're now on your new branch! Notice the branch name in the top center.

### Step 2: Make Your Changes

1. **Edit your files** in your code editor (VS Code, etc.)
2. **Save your changes**
3. **Return to GitHub Desktop** - you'll see your changed files listed

### Step 3: Commit Your Changes

1. **Review your changes** in the left panel (files) and right panel (diff view)
2. **Write a commit message** at the bottom (e.g., "Add dark mode toggle")
3. **Click "Commit to feature/your-feature-name"** (bottom left)

### Step 4: Publish Branch to GitHub

1. **Click "Publish branch"** button (top right)
   - This pushes your branch to GitHub
   - Vercel will automatically detect it and start building!

2. **Wait for Vercel** (usually 1-3 minutes)
   - You'll see a notification in GitHub Desktop when the push completes
   - Check your Vercel dashboard for the preview deployment

### Step 5: Access Your Preview URL

**Option A: Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com) and log in
2. Click on your project (`meproofit`)
3. You'll see all deployments listed
4. Find your branch deployment (it will show the branch name)
5. Click the deployment to see details
6. Click the **"Visit"** button or copy the preview URL

**Option B: GitHub Pull Request**
1. After pushing, GitHub Desktop may show a "Create Pull Request" button
2. Click it to open GitHub in your browser
3. The Pull Request page shows the Vercel preview deployment status
4. Look for a comment from "vercel[bot]" with the preview URL

**Option C: Vercel Email/Notification**
- Vercel may send you an email with the preview URL
- Check your email notifications

### Step 6: Test Your Preview

1. **Open the preview URL** in your browser
2. **Test your changes** - it's a fully functional version of your app!
3. **Share the URL** with others for feedback (if needed)

## Merging Back to Main

### Option 1: Merge in GitHub Desktop

1. **Switch to main branch**: Click "Current branch" → Select "main"
2. **Click "Merge into current branch"** (or use the branch menu)
3. **Select your feature branch** to merge
4. **Click "Merge feature/your-feature-name into main"**
5. **Push to origin**: Click "Push origin" button

### Option 2: Merge via GitHub Website

1. **Create a Pull Request** (if you haven't already)
2. **Review the changes** on GitHub
3. **Click "Merge pull request"**
4. **Confirm the merge**
5. **Delete the branch** (GitHub will offer this option)

## Understanding Vercel Deployments

### Deployment Types

- **Production**: Your main branch → `your-app.vercel.app`
- **Preview**: Any other branch → `your-app-git-branch-name-username.vercel.app`

### Deployment Status

In Vercel dashboard, you'll see:
- ✅ **Ready** - Deployment successful, URL is live
- ⏳ **Building** - Still compiling your app
- ❌ **Error** - Something went wrong (check logs)

### Preview URL Format

```
https://meproofit-git-feature-add-dark-mode-yourusername.vercel.app
```

The URL includes:
- Your project name
- `-git-` prefix
- Your branch name (with slashes converted to dashes)
- Your username/team

## Best Practices

### 1. Test Before Merging
- Always test your preview deployment before merging to main
- Share preview URLs with team members for review

### 2. Keep Branches Small
- One feature per branch = easier to test and review
- Smaller branches deploy faster

### 3. Clean Up Old Branches
- Delete branches after merging (keeps Vercel dashboard clean)
- In GitHub Desktop: Right-click branch → "Delete"

### 4. Monitor Build Status
- Check Vercel dashboard if preview doesn't appear
- Look for build errors in the deployment logs

## Troubleshooting

### Preview URL Not Appearing

1. **Check Vercel Dashboard**
   - Go to vercel.com → Your project → Deployments
   - Look for your branch name

2. **Check Build Status**
   - If it says "Error", click on it to see build logs
   - Common issues: missing environment variables, build errors

3. **Wait a Bit**
   - First deployment can take 2-5 minutes
   - Subsequent deployments are usually faster

### Changes Not Showing in Preview

1. **Make sure you pushed your commits**
   - In GitHub Desktop, check that your commits show "Pushed to origin"

2. **Check Vercel is building**
   - Look at the Vercel dashboard for a new deployment

3. **Hard refresh your browser**
   - Sometimes browsers cache old versions
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Environment Variables

- **Production**: Set in Vercel dashboard → Settings → Environment Variables
- **Preview**: Uses same variables by default, or you can set branch-specific ones

## Quick Reference: GitHub Desktop Workflow

```
1. Click "Current branch" → "New branch"
2. Name it: feature/my-feature
3. Make changes in your editor
4. In GitHub Desktop: Write commit message → "Commit"
5. Click "Publish branch"
6. Wait 1-3 minutes
7. Check Vercel dashboard for preview URL
8. Test in browser
9. When ready: Switch to main → Merge branch → Push
10. Delete branch (cleanup)
```

## Visual Workflow

```
GitHub Desktop          GitHub              Vercel
     │                    │                   │
     ├─ Create Branch     │                   │
     ├─ Make Changes      │                   │
     ├─ Commit            │                   │
     ├─ Publish Branch ───► Push to GitHub ───► Auto-detect
     │                    │                   │
     │                    │                   ├─ Build
     │                    │                   ├─ Deploy
     │                    │                   └─ Preview URL
     │                    │                   │
     │                    │                   │
     └─ Test Preview ◄────┴───────────────────┘
     │
     ├─ Merge to Main
     └─ Push
```

## Tips

1. **Bookmark Vercel Dashboard**: Makes it easy to check deployments
2. **Use Descriptive Branch Names**: Easier to find in Vercel dashboard
3. **Check Build Logs**: If something fails, the logs tell you why
4. **Preview URLs are Temporary**: They stay active as long as the branch exists
5. **Production URL Updates**: Only when you merge to main and push

## Example Workflow

Let's say you want to add a "Settings" button:

1. **GitHub Desktop**: Create branch `feature/add-settings-button`
2. **VS Code**: Add the button to your code
3. **GitHub Desktop**: Commit "Add settings button to header"
4. **GitHub Desktop**: Publish branch
5. **Wait 2 minutes**
6. **Vercel Dashboard**: Find preview URL
7. **Browser**: Open preview URL, test the button
8. **If good**: Merge to main in GitHub Desktop
9. **If needs changes**: Make more commits, push again (Vercel updates preview automatically)

---

**Remember**: Every branch push = automatic preview deployment. This is one of Vercel's best features for testing!
