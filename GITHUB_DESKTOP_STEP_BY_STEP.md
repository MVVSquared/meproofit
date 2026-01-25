# Step-by-Step: GitHub Desktop + Vercel Preview Deployments

## Quick Start: The Complete Workflow

### Step 1: Create a Branch in GitHub Desktop

1. **Open GitHub Desktop**
2. **Look at the top center** - you'll see "Current branch: main" (or a dropdown)
3. **Click the branch dropdown** (or "Current branch" button)
4. **Click "New branch"** at the bottom of the dropdown
5. **Enter a branch name**: 
   - Example: `feature/add-settings-page`
   - Example: `fix/daily-challenge-bug`
   - Example: `update/footer-styling`
6. **Click "Create branch"**

✅ **You're now on your new branch!** You'll see the branch name in the top center of GitHub Desktop.

---

### Step 2: Make Your Code Changes

1. **Open your code editor** (VS Code, etc.)
2. **Make your changes** to any files
3. **Save your files**
4. **Return to GitHub Desktop**

You'll see:
- **Left panel**: List of changed files (with checkboxes)
- **Right panel**: The actual code changes (green = added, red = removed)

---

### Step 3: Commit Your Changes

1. **Review your changes** in the right panel (make sure they look correct)
2. **At the bottom**, you'll see a text box for your commit message
3. **Write a descriptive message**:
   - ✅ Good: "Add settings page with user preferences"
   - ✅ Good: "Fix bug where daily challenge doesn't load"
   - ❌ Bad: "changes" or "fix"
4. **Click "Commit to [your-branch-name]"** (bottom left button)

✅ **Your changes are now committed to the branch!**

---

### Step 4: Publish Branch to GitHub

1. **Look at the top right** of GitHub Desktop
2. **Click "Publish branch"** button
3. **Wait a moment** - GitHub Desktop will push your branch to GitHub

✅ **Your branch is now on GitHub!**

**What happens next:**
- Vercel automatically detects the new branch
- Vercel starts building your app (takes 1-3 minutes)
- A preview deployment is created

---

### Step 5: Find Your Preview URL

You have **3 ways** to find your preview URL:

#### Option A: Vercel Dashboard (Easiest)

1. **Go to [vercel.com](https://vercel.com)** and log in
2. **Click on your project** (`meproofit`)
3. **Click "Deployments"** tab (top menu)
4. **Look for your branch name** in the list
   - You'll see something like: `feature/add-settings-page`
   - Status will show: ⏳ Building... or ✅ Ready
5. **Click on the deployment** to see details
6. **Click the "Visit" button** or copy the URL

**Preview URL format:**
```
https://meproofit-git-feature-add-settings-page-yourusername.vercel.app
```

#### Option B: GitHub Pull Request

1. **In GitHub Desktop**, after pushing, you might see a **"Create Pull Request"** button
2. **Click it** - opens GitHub in your browser
3. **On the Pull Request page**, look for a comment from **"vercel[bot]"**
4. **The comment will have your preview URL** - click it!

#### Option C: Check Email/Notifications

- Vercel may send you an email with the preview URL
- Check your email inbox

---

### Step 6: Test Your Preview

1. **Open the preview URL** in your web browser
2. **Test your changes** - it's a fully working version!
3. **Share with others** if you want feedback

**Important Notes:**
- Preview URLs update automatically when you push new commits
- Preview URLs stay active as long as the branch exists
- Each branch gets its own unique preview URL

---

### Step 7: Merge Back to Main (When Ready)

#### Method 1: Merge in GitHub Desktop

1. **Switch to main branch**:
   - Click "Current branch" dropdown (top center)
   - Select "main"
2. **Merge your branch**:
   - Click "Branch" menu (top menu bar)
   - Click "Merge into current branch..."
   - Select your feature branch (e.g., `feature/add-settings-page`)
   - Click "Merge feature/add-settings-page into main"
3. **Push to GitHub**:
   - Click "Push origin" button (top right)

✅ **Your changes are now in main!**

#### Method 2: Merge via Pull Request (Recommended)

1. **In GitHub Desktop**, click "Create Pull Request" (if you haven't already)
2. **On GitHub website**, review your changes
3. **Click "Merge pull request"**
4. **Confirm the merge**
5. **Delete the branch** (GitHub will offer this)

---

### Step 8: Clean Up (Delete Branch)

After merging, delete the branch to keep things clean:

1. **In GitHub Desktop**:
   - Right-click the branch name in the branch list
   - Click "Delete [branch-name]"
   - Confirm deletion

2. **On GitHub website** (if branch still exists):
   - Go to your repository
   - Click "Branches"
   - Find your branch and delete it

---

## Visual Guide: What You'll See

### GitHub Desktop Interface

```
┌─────────────────────────────────────────────────┐
│  [Repository: meproofit]  [Current branch: ▼]   │
│                          feature/add-settings   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Changed files:                                 │
│  ☑ src/App.tsx                                 │
│  ☑ src/components/Settings.tsx                  │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Changes (diff view):                      │ │
│  │ + Added new code                          │ │
│  │ - Removed old code                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Commit message: [Add settings page_______]    │
│  [Commit to feature/add-settings]               │
│                              [Publish branch]   │
└─────────────────────────────────────────────────┘
```

### Vercel Dashboard

```
Deployments:
┌─────────────────────────────────────────────┐
│ main                    ✅ Ready            │
│ https://meproofit.vercel.app               │
├─────────────────────────────────────────────┤
│ feature/add-settings   ✅ Ready            │
│ https://meproofit-git-feature-add-...      │ ← Preview URL!
└─────────────────────────────────────────────┘
```

---

## Real Example Walkthrough

Let's say you want to add a "Help" button to the header:

### 1. Create Branch
- GitHub Desktop → "Current branch" → "New branch"
- Name: `feature/add-help-button`
- Click "Create branch"

### 2. Make Changes
- Open `src/App.tsx` in VS Code
- Add a Help button in the header section
- Save the file

### 3. Commit
- GitHub Desktop shows the change
- Write commit message: "Add help button to header"
- Click "Commit to feature/add-help-button"

### 4. Publish
- Click "Publish branch"
- Wait for push to complete

### 5. Get Preview URL
- Go to vercel.com → Your project → Deployments
- Find `feature/add-help-button` deployment
- Click "Visit" or copy the URL

### 6. Test
- Open preview URL in browser
- See your Help button!
- Test that it works

### 7. Merge (if happy)
- GitHub Desktop → Switch to "main"
- Branch menu → "Merge into current branch"
- Select `feature/add-help-button`
- Click "Merge"
- Click "Push origin"

### 8. Clean Up
- Right-click branch → Delete

---

## Troubleshooting

### Preview URL Not Showing Up?

1. **Wait 2-3 minutes** - First build takes time
2. **Check Vercel dashboard** - Look in Deployments tab
3. **Check build status** - If it says "Error", click to see logs
4. **Verify branch was pushed** - In GitHub Desktop, make sure it says "Pushed to origin"

### Changes Not Appearing in Preview?

1. **Make sure you committed AND pushed**:
   - Commit saves locally
   - Push uploads to GitHub
   - Vercel only sees what's on GitHub

2. **Wait for build to complete**:
   - Look for ✅ Ready status in Vercel
   - Building takes 1-3 minutes

3. **Hard refresh browser**:
   - Press `Ctrl+Shift+R` (Windows) to clear cache

### Build Failed in Vercel?

1. **Click on the failed deployment** in Vercel
2. **Check the build logs** - they'll tell you what went wrong
3. **Common issues**:
   - Missing environment variables
   - Syntax errors in code
   - Missing dependencies

---

## Pro Tips

1. **Bookmark Vercel Dashboard**: Makes it easy to check deployments
2. **Use Descriptive Branch Names**: Easier to find in Vercel
3. **Test Before Merging**: Always test preview URL before merging to main
4. **One Feature Per Branch**: Keeps things organized
5. **Delete Old Branches**: Keeps Vercel dashboard clean

---

## Quick Reference Card

```
1. GitHub Desktop → "Current branch" → "New branch"
2. Make changes in code editor
3. GitHub Desktop → Write message → "Commit"
4. GitHub Desktop → "Publish branch"
5. Vercel Dashboard → Find deployment → Copy URL
6. Test in browser
7. GitHub Desktop → Switch to main → Merge branch → Push
8. Delete branch (cleanup)
```

---

**Remember**: Every branch push = automatic preview deployment. This is Vercel's superpower! 🚀
