# MeProofIt Deployment Guide

This guide covers deployment options for the MeProofIt spelling and punctuation game.

## 🚀 Quick Start Options

### Option 1: Vercel (Recommended - Easiest)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" and import your GitHub repo
4. Add environment variable: `REACT_APP_OPENAI_API_KEY`
5. Deploy! Your app will be live in minutes

### Option 2: AWS Amplify (Great for AWS ecosystem)
1. Push your code to GitHub
2. Go to AWS Amplify Console
3. Click "New App" → "Host web app"
4. Connect your GitHub repository
5. Add environment variable: `REACT_APP_OPENAI_API_KEY`
6. Deploy! Automatic deployments on every push

### Option 3: AWS Lightsail (Full control)
Follow the detailed instructions below.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Domain Name**: Point `meproofit.com` to your server (for Lightsail)
3. **GitHub Repository**: Push your code to GitHub

## 🏗️ AWS Lightsail Deployment

### Step 1: Create Lightsail Instance

1. Go to AWS Lightsail Console
2. Click "Create instance"
3. Choose:
   - **Platform**: Linux/Unix
   - **Blueprint**: Node.js
   - **Instance plan**: $7/month (1GB RAM, 1 vCPU, 40GB SSD)
   - **Name**: meproofit

### Step 2: Connect to Your Instance

```bash
# Download the SSH key from Lightsail console
# Then connect:
ssh -i ~/.ssh/meproofit.pem ubuntu@your-instance-ip
```

### Step 3: Run Deployment Script

```bash
# Make script executable
chmod +x deploy-lightsail.sh

# Run deployment (update the script first with your details)
./deploy-lightsail.sh
```

### Step 4: Update Script Variables

Before running the script, edit `deploy-lightsail.sh` and update:

```bash
# Line 25: Your GitHub repo URL
git clone https://github.com/YOUR_USERNAME/meproofit.git .

# Line 35: Your OpenAI API key
REACT_APP_OPENAI_API_KEY=your_actual_api_key_here

# Line 75: Your email for SSL certificate
sudo certbot --nginx -d meproofit.com -d www.meproofit.com --non-interactive --agree-tos --email your-email@example.com
```

### Step 5: Configure Domain

1. Go to your domain registrar
2. Add A record pointing to your Lightsail instance IP
3. Add CNAME record for www pointing to your domain

## 🐳 Docker Deployment

### Local Testing

```bash
# Build and run locally
docker-compose up --build

# Visit http://localhost
```

### Production Deployment

```bash
# Build image
docker build -t meproofit .

# Run container
docker run -d -p 80:80 --name meproofit-app meproofit
```

## ☁️ Cloud Deployment Options

### AWS S3 + CloudFront

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Create S3 bucket**:
   - Name: `meproofit-website`
   - Enable static website hosting

3. **Upload files**:
   ```bash
   aws s3 sync build/ s3://meproofit-website
   ```

4. **Create CloudFront distribution**:
   - Origin: S3 bucket
   - Default root object: `index.html`
   - Error pages: Redirect 404 to `/index.html`

### Google Cloud Run

1. **Build and push**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT/meproofit
   ```

2. **Deploy**:
   ```bash
   gcloud run deploy meproofit --image gcr.io/YOUR_PROJECT/meproofit --platform managed
   ```

## 🔧 Environment Variables

Set these in your deployment platform:

```env
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

## 📊 Monitoring & Maintenance

### Lightsail Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs meproofit

# Restart app
pm2 restart meproofit

# Update app
cd /var/www/meproofit
git pull
npm install
npm run build
pm2 restart meproofit
```

### SSL Certificate Renewal

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## 🔒 Security Considerations

1. **API Key Security**: Never commit API keys to Git
2. **HTTPS**: Always use SSL in production
3. **Security Headers**: Already configured in nginx
4. **Rate Limiting**: Consider adding rate limiting for API calls
5. **Monitoring**: Set up alerts for errors and downtime

## 📈 Scaling Considerations

### For Higher Traffic

1. **Upgrade Lightsail Plan**: Move to larger instance
2. **Load Balancer**: Add AWS ALB for multiple instances
3. **CDN**: Use CloudFront for global distribution
4. **Database**: Add backend for user progress tracking

### Cost Optimization

- **Vercel**: Free tier for low traffic
- **Amplify**: Pay per build/request
- **Lightsail**: Fixed monthly cost
- **S3+CloudFront**: Pay per request/transfer

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**: Check Node.js version and dependencies
2. **API Errors**: Verify OpenAI API key and quota
3. **SSL Issues**: Check domain DNS and certificate renewal
4. **Performance**: Enable gzip compression and caching

### Support

- Check logs: `pm2 logs meproofit`
- Monitor resources: `htop`
- Check nginx: `sudo nginx -t`
- Verify SSL: `sudo certbot certificates`

## 🎯 Next Steps

After deployment:

1. **Test thoroughly** on different devices
2. **Set up monitoring** (UptimeRobot, Pingdom)
3. **Configure analytics** (Google Analytics)
4. **Plan mobile app** development
5. **Consider backend** for user progress tracking

---

**Need help?** Check the main README.md or create an issue in the repository. 