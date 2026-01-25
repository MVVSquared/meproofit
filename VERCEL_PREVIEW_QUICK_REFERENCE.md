# Vercel Preview Deployments - Quick Reference

## The Magic: Automatic Preview URLs

When you push a branch to GitHub, Vercel automatically:
1. Detects the new branch
2. Builds your app
3. Creates a preview URL
4. Deploys it live

**No configuration needed!** It just works. ✨

## How to Access Preview URLs

### Method 1: Vercel Dashboard (Recommended)

```
1. Go to vercel.com
2. Log in
3. Click your project (meproofit)
4. Click "Deployments" tab
5. Find your branch name
6. Click "Visit" or copy URL
```

### Method 2: GitHub Pull Request

```
1. Create Pull Request on GitHub
2. Look for "vercel[bot]" comment
3. Click the preview URL in the comment
```

### Method 3: Vercel CLI (Advanced)

```bash
vercel --prod  # Deploy to production
vercel         # Deploy preview
```

## URL Formats

**Production (main branch):**
```
https://meproofit.vercel.app
```

**Preview (feature branches):**
```
https://meproofit-git-feature-name-yourusername.vercel.app
```

Notice:
- `-git-` prefix indicates it's a branch
- Branch name is in the URL (slashes become dashes)
- Your username/team is appended

## Environment Variables

Preview deployments use the same environment variables as production by default.

To set branch-specific variables:
1. Vercel Dashboard → Settings → Environment Variables
2. Add variable
3. Select "Preview" environment
4. Optionally set specific branch name

## Deployment Status

In Vercel dashboard, you'll see:

- ⏳ **Building** - Still compiling
- ✅ **Ready** - Live and accessible
- ❌ **Error** - Build failed (check logs)
- 🔄 **Redeploying** - Updating

## Workflow Diagram

```
┌─────────────┐
│ GitHub      │
│ Desktop     │
└──────┬──────┘
       │
       │ Create branch
       │ Make changes
       │ Commit
       │ Push
       │
       ▼
┌─────────────┐
│ GitHub      │
│ (Cloud)     │
└──────┬──────┘
       │
       │ Vercel detects
       │ new branch
       │
       ▼
┌─────────────┐
│ Vercel      │
│ Builds app  │
└──────┬──────┘
       │
       │ Deploys
       │
       ▼
┌─────────────┐
│ Preview URL │
│ Live!       │
└─────────────┘
```

## Common Questions

**Q: How long does it take?**
A: Usually 1-3 minutes for the first build. Subsequent builds are faster.

**Q: Do preview URLs expire?**
A: No, they stay active as long as the branch exists.

**Q: Can I share preview URLs?**
A: Yes! They're public (unless your repo is private and you've configured access).

**Q: What if I push more commits?**
A: Vercel automatically rebuilds and updates the preview URL.

**Q: How many preview deployments can I have?**
A: Unlimited! Each branch gets its own preview.

**Q: Do previews use production data?**
A: They use the same environment variables, but you can configure branch-specific ones.

## Tips

1. **Test before merging** - Always check preview URL before merging to main
2. **Share for feedback** - Preview URLs are great for getting team feedback
3. **Monitor builds** - Check Vercel dashboard if preview doesn't appear
4. **Clean up** - Delete old branches to keep dashboard organized
5. **Bookmark dashboard** - Makes it easy to check deployments

## Troubleshooting

**Preview not appearing?**
- Wait 2-3 minutes
- Check Vercel dashboard → Deployments
- Look for build errors

**Build failed?**
- Click on deployment in Vercel
- Check build logs
- Common: missing env vars, syntax errors

**Changes not showing?**
- Make sure you pushed (not just committed)
- Hard refresh browser (Ctrl+Shift+R)
- Wait for build to complete

---

**The Bottom Line**: Push a branch → Get a preview URL → Test → Merge when ready! 🎉
