# How to Merge Branch to Main in GitHub Desktop

## Method 1: Merge Directly in GitHub Desktop (Easiest)

### Step-by-Step:

1. **Make sure your branch is committed and pushed**
   - In GitHub Desktop, check that your branch shows "Pushed to origin"
   - If not, click "Push origin" first

2. **Switch to main branch**
   - Click the **"Current branch"** dropdown (top center)
   - Select **"main"** from the list
   - GitHub Desktop will switch you to the main branch

3. **Merge your feature branch**
   - Click **"Branch"** menu (top menu bar)
   - Click **"Merge into current branch..."**
   - A dialog will appear showing available branches
   - Select your feature branch (e.g., `feature/your-branch-name`)
   - Click **"Merge [branch-name] into main"**

4. **Push to GitHub**
   - After merging, you'll see a **"Push origin"** button appear
   - Click **"Push origin"** to upload the merged changes to GitHub

✅ **Done!** Your changes are now in main and will deploy to production.

---

## Method 2: Create Pull Request (Recommended for Teams)

This method is better if you want to review changes before merging:

1. **Push your branch** (if not already pushed)
   - Click "Push origin" button

2. **Create Pull Request**
   - In GitHub Desktop, click **"Create Pull Request"** button (top right)
   - Or go to GitHub website → Your repo → "Pull requests" → "New pull request"
   - Select your branch to merge into main
   - Add a description of your changes
   - Click **"Create pull request"**

3. **Review on GitHub**
   - Review the changes in the Pull Request
   - Check that everything looks good

4. **Merge the Pull Request**
   - On the Pull Request page, click **"Merge pull request"** button
   - Choose merge type (usually "Create a merge commit")
   - Click **"Confirm merge"**

5. **Update local main**
   - In GitHub Desktop, switch to main branch
   - Click **"Fetch origin"** (top right)
   - Then click **"Pull origin"** to get the merged changes

---

## Visual Guide: GitHub Desktop Interface

### Before Merging:
```
┌─────────────────────────────────────────┐
│ Current branch: feature/my-feature ▼   │
│                                         │
│ [Your commits and changes]              │
│                                         │
│ [Push origin] button                    │
└─────────────────────────────────────────┘
```

### Step 1: Switch to Main
```
┌─────────────────────────────────────────┐
│ Current branch: main ▼                 │
│                                         │
│ [Click "Branch" menu]                  │
│ [Select "Merge into current branch"]   │
└─────────────────────────────────────────┘
```

### Step 2: Select Branch to Merge
```
┌─────────────────────────────────────────┐
│ Merge into main                        │
│                                         │
│ Select a branch to merge into main:    │
│                                         │
│ ○ feature/my-feature                   │
│ ○ other-branch                         │
│                                         │
│ [Merge feature/my-feature into main]    │
└─────────────────────────────────────────┘
```

### After Merging:
```
┌─────────────────────────────────────────┐
│ Current branch: main                    │
│                                         │
│ [Merged changes from feature branch]   │
│                                         │
│ [Push origin] button ← Click this!     │
└─────────────────────────────────────────┘
```

---

## What Happens When You Merge?

1. **Git combines the changes** from your branch into main
2. **All your commits** are added to main's history
3. **Your changes** are now part of the main branch
4. **Vercel automatically deploys** main to production
5. **Your feature branch** can be deleted (cleanup)

---

## After Merging: Clean Up

Once merged, delete your feature branch:

### In GitHub Desktop:
1. **Right-click** your feature branch in the branch list
2. Click **"Delete [branch-name]"**
3. Confirm deletion

### On GitHub Website (if needed):
1. Go to your repository
2. Click **"Branches"** tab
3. Find your branch
4. Click the trash icon to delete

---

## Troubleshooting

### "Cannot merge: You have uncommitted changes"

**Solution:**
- Commit or discard your current changes first
- Then try merging again

### "Merge conflict" error

**Solution:**
- This means main has changes that conflict with your branch
- GitHub Desktop will show you the conflicts
- You'll need to resolve them manually
- See conflict resolution guide below

### "Your branch is behind origin/main"

**Solution:**
1. Switch to main first
2. Click "Pull origin" to get latest changes
3. Switch back to your feature branch
4. Merge main into your branch first:
   - Branch menu → "Merge into current branch" → Select "main"
5. Resolve any conflicts
6. Then merge your branch into main

---

## Resolving Merge Conflicts

If you get conflicts:

1. **GitHub Desktop will show** which files have conflicts
2. **Click on each file** to see the conflicts
3. **Choose your resolution:**
   - "Use ours" (keep main's version)
   - "Use theirs" (keep your branch's version)
   - "Use both" (manually edit to combine)
4. **Edit the file** if needed to resolve conflicts
5. **Save the file**
6. **Click "Commit merge"** to complete

---

## Quick Reference

```
1. Push your branch (if not already)
2. Switch to main branch
3. Branch menu → "Merge into current branch"
4. Select your feature branch
5. Click "Merge"
6. Click "Push origin"
7. Delete feature branch (cleanup)
```

---

## Best Practices

1. **Test before merging** - Use Vercel preview URL to test
2. **Pull latest main first** - Make sure main is up to date
3. **One feature per branch** - Keeps merges simple
4. **Delete after merging** - Keeps repository clean
5. **Write good commit messages** - Makes history clear

---

**Remember**: Merging brings your branch changes into main. After pushing, Vercel will automatically deploy to production! 🚀
