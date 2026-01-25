# Git Branching Guide - Working with Development Branches

## Why Use Branches?

Branches let you:
- ✅ Work on features without breaking the main code
- ✅ Test changes safely before merging to main
- ✅ Keep main branch stable and deployable
- ✅ Work on multiple features simultaneously

## The Branching Workflow

```
main branch (stable)
    ↓
Create feature branch
    ↓
Make changes on feature branch
    ↓
Test your changes
    ↓
Merge back to main
    ↓
Delete feature branch (cleanup)
```

## Basic Branch Commands

### Create and Switch to a New Branch
```bash
git checkout -b feature/my-feature-name
```
This creates a new branch AND switches to it in one command.

### See All Branches
```bash
git branch
```
The `*` shows which branch you're currently on.

### Switch Between Branches
```bash
git checkout main          # Switch to main
git checkout feature-name  # Switch to feature branch
```

### See Which Branch You're On
```bash
git branch
# or
git status
```

## Complete Workflow Example

### Step 1: Create a Development Branch
```bash
# Make sure you're on main and it's up to date
git checkout main
git pull origin main

# Create and switch to your new branch
git checkout -b feature/update-footer
```

### Step 2: Make Your Changes
Edit your files, make changes, test them.

### Step 3: Commit Your Changes (on the branch)
```bash
git status
git add .
git commit -m "Update footer styling"
```

### Step 4: Push Your Branch to GitHub
```bash
git push origin feature/update-footer
```
This creates the branch on GitHub so you can see it there.

### Step 5: Switch Back to Main
```bash
git checkout main
```

### Step 6: Merge Your Branch into Main
```bash
# Make sure main is up to date
git pull origin main

# Merge your feature branch
git merge feature/update-footer

# Push the merged changes
git push origin main
```

### Step 7: Clean Up (Delete the Branch)
```bash
# Delete local branch
git branch -d feature/update-footer

# Delete remote branch (on GitHub)
git push origin --delete feature/update-footer
```

## Branch Naming Conventions

Good branch names:
- ✅ `feature/add-dark-mode`
- ✅ `fix/daily-challenge-bug`
- ✅ `update/readme-instructions`
- ✅ `dev/experimental-feature`

Bad branch names:
- ❌ `branch1` (not descriptive)
- ❌ `test` (too vague)
- ❌ `my changes` (has spaces)

## Common Branch Types

- `feature/` - New features
- `fix/` - Bug fixes
- `update/` - Updates to existing features
- `dev/` - Development/experimental work
- `hotfix/` - Urgent fixes to production

## Checking Out Existing Branches

If a branch already exists (on GitHub or locally):

```bash
# Fetch all branches from GitHub
git fetch origin

# See all branches (including remote)
git branch -a

# Checkout an existing branch
git checkout feature/existing-branch
```

## Merging Strategies

### Fast-Forward Merge (Simple)
If main hasn't changed since you created your branch:
```bash
git checkout main
git merge feature/my-feature
```
This is the simplest case - Git just moves the pointer forward.

### Merge with Conflicts
If main has changed, you might get conflicts:
```bash
git checkout main
git merge feature/my-feature
# If conflicts occur, Git will tell you which files
# Edit the files to resolve conflicts
git add .
git commit -m "Merge feature/my-feature"
```

## Viewing Branch Differences

### See What's Different Between Branches
```bash
# See commits in feature branch not in main
git log main..feature/my-feature

# See file differences
git diff main..feature/my-feature
```

## Best Practices

1. **Keep branches small and focused**
   - One feature per branch
   - Easier to review and merge

2. **Update main before merging**
   ```bash
   git checkout main
   git pull origin main
   git merge feature/my-feature
   ```

3. **Test before merging**
   - Make sure your changes work
   - Test on the branch before merging to main

4. **Delete merged branches**
   - Keeps your repository clean
   - Prevents confusion

5. **Use descriptive branch names**
   - Makes it clear what the branch is for
   - Helps when looking at branch list

## Troubleshooting

### "Cannot switch branches, you have uncommitted changes"
You have unsaved changes. Either:
```bash
# Option 1: Commit them
git add .
git commit -m "WIP: work in progress"

# Option 2: Stash them (save for later)
git stash
git checkout other-branch
# Later, get them back:
git checkout original-branch
git stash pop
```

### "Branch already exists"
The branch name is taken. Use a different name:
```bash
git checkout -b feature/my-feature-v2
```

### "Your branch is behind origin/main"
Update your branch before merging:
```bash
git checkout feature/my-feature
git merge main  # Bring main's changes into your branch
# Resolve any conflicts, then continue
```

## Quick Reference

```bash
# Create and switch to new branch
git checkout -b feature/my-feature

# Switch branches
git checkout main
git checkout feature/my-feature

# See all branches
git branch

# Push branch to GitHub
git push origin feature/my-feature

# Merge branch into main
git checkout main
git merge feature/my-feature
git push origin main

# Delete branch
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

## Visual Example

```
main:     A---B---C---F---G
                \         /
feature:         D---E---/
```

- A, B, C are commits on main
- You create feature branch at C
- D, E are your commits on feature branch
- F is the merge commit (combining main and feature)
- G is the result after merge

---

**Remember:** Branches are your safety net. Experiment freely on branches, and only merge to main when you're confident!
