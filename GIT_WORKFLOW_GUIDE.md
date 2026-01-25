# Git & GitHub Workflow Guide for Beginners

## Understanding the Basics

**Git** = Version control system (tracks changes to your code)
**GitHub** = Cloud hosting for your Git repositories (stores your code online)

## The Basic Workflow

```
1. Make changes to your code
2. Stage your changes (tell Git what to include)
3. Commit your changes (save a snapshot)
4. Push to GitHub (upload to the cloud)
```

## Common Git Commands

### Check Status
```bash
git status
```
Shows what files have changed and what's staged for commit.

### See What Changed
```bash
git diff
```
Shows the actual changes you made (before staging).

### Stage Changes (Add to "staging area")
```bash
# Stage a specific file
git add filename.tsx

# Stage all changed files
git add .

# Stage multiple specific files
git add file1.tsx file2.tsx
```

### Commit Changes (Save a snapshot)
```bash
git commit -m "Description of what you changed"
```
The `-m` flag lets you write a commit message directly.

**Good commit messages:**
- ✅ "Add dark mode toggle to settings"
- ✅ "Fix bug where daily challenge wasn't loading"
- ✅ "Update README with new setup instructions"
- ❌ "changes" (too vague)
- ❌ "fix stuff" (not descriptive)

### Push to GitHub (Upload to cloud)
```bash
git push origin main
```
- `origin` = your GitHub repository
- `main` = the branch you're pushing to

### Pull from GitHub (Download latest changes)
```bash
git pull origin main
```
Use this if someone else (or you on another computer) made changes.

## Step-by-Step Example

Let's say you want to update the footer text:

1. **Make your changes** - Edit the file
2. **Check what changed:**
   ```bash
   git status
   git diff
   ```
3. **Stage your changes:**
   ```bash
   git add src/App.tsx
   ```
4. **Commit with a message:**
   ```bash
   git commit -m "Update footer copyright year to 2025"
   ```
5. **Push to GitHub:**
   ```bash
   git push origin main
   ```

## Best Practices

### 1. Commit Often
- Make small, logical commits
- Each commit should represent one change or feature
- Don't wait until you've made 20 changes to commit

### 2. Write Good Commit Messages
- Start with a verb (Add, Fix, Update, Remove)
- Be specific about what changed
- Keep it under 50 characters for the first line

### 3. Check Status Before Committing
Always run `git status` to see what you're about to commit.

### 4. Review Your Changes
Use `git diff` to see exactly what changed before committing.

## Working with Branches (Advanced - Optional)

Branches let you work on features without affecting the main code:

```bash
# Create a new branch
git checkout -b feature/new-feature

# Make changes, commit them
git add .
git commit -m "Add new feature"

# Switch back to main
git checkout main

# Merge your feature branch into main
git merge feature/new-feature

# Push to GitHub
git push origin main
```

For now, you can work directly on `main` until you're comfortable with the basics.

## Troubleshooting

### "Your branch is ahead of origin/main"
- You've committed locally but haven't pushed yet
- Run: `git push origin main`

### "Your branch is behind origin/main"
- Someone (or you elsewhere) pushed changes to GitHub
- Run: `git pull origin main` to download and merge

### "Please tell me who you are"
Git needs to know who you are:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Undo Last Commit (Before Pushing)
```bash
git reset --soft HEAD~1
```
This keeps your changes but removes the commit.

### See Your Commit History
```bash
git log
```
Press `q` to exit.

## Quick Reference Card

```bash
# Daily workflow
git status                    # Check what changed
git diff                      # See the changes
git add .                     # Stage all changes
git commit -m "Your message"  # Save changes
git push origin main          # Upload to GitHub

# If working with others
git pull origin main          # Get latest changes first
```

## Next Steps

1. Start with small changes
2. Practice the workflow: status → add → commit → push
3. Check your GitHub repository online to see your commits
4. Once comfortable, explore branches for bigger features

---

**Remember:** Git is your safety net. Every commit is a save point you can return to if something goes wrong!
