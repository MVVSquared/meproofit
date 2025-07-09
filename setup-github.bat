@echo off
echo 🚀 Setting up GitHub repository for MeProofIt...

echo.
echo 📋 Steps to complete:
echo.
echo 1. Go to https://github.com/new
echo 2. Repository name: meproofit
echo 3. Make it Public (or Private if you prefer)
echo 4. Don't initialize with README (we already have one)
echo 5. Click "Create repository"
echo.
echo 6. Copy the repository URL (it will look like: https://github.com/YOUR_USERNAME/meproofit.git)
echo.
echo 7. Come back here and press any key to continue...
pause

echo.
echo 📦 Initializing Git repository...
git init

echo.
echo 📝 Adding all files...
git add .

echo.
echo 💾 Making initial commit...
git commit -m "Initial commit: MeProofIt spelling and punctuation game"

echo.
echo 🔗 Adding remote repository...
echo Please enter your GitHub repository URL (e.g., https://github.com/YOUR_USERNAME/meproofit.git):
set /p repo_url=

git remote add origin %repo_url%

echo.
echo 🚀 Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ Done! Your code is now on GitHub.
echo.
echo 🌐 Next steps:
echo 1. Go back to Vercel
echo 2. Click "New Project"
echo 3. You should now see the "meproofit" repository
echo 4. Import it and deploy!
echo.
pause 