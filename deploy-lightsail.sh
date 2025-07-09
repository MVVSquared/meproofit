#!/bin/bash

# MeProofIt Deployment Script for AWS Lightsail
# This script sets up a Node.js environment and deploys the React app

echo "🚀 Starting MeProofIt deployment on AWS Lightsail..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install nginx
echo "📦 Installing nginx..."
sudo apt install nginx -y

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/meproofit
sudo chown $USER:$USER /var/www/meproofit

# Navigate to app directory
cd /var/www/meproofit

# Clone your repository (replace with your actual repo URL)
echo "📥 Cloning repository..."
git clone https://github.com/yourusername/meproofit.git .

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create environment file
echo "⚙️ Creating environment file..."
cat > .env << EOF
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
EOF

# Configure nginx
echo "⚙️ Configuring nginx..."
sudo tee /etc/nginx/sites-available/meproofit << EOF
server {
    listen 80;
    server_name meproofit.com www.meproofit.com;
    root /var/www/meproofit/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (if you add a backend later)
    # location /api/ {
    #     proxy_pass http://localhost:3001;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade \$http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host \$host;
    #     proxy_cache_bypass \$http_upgrade;
    # }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/meproofit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Set up SSL with Let's Encrypt (optional but recommended)
echo "🔒 Setting up SSL certificate..."
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d meproofit.com -d www.meproofit.com --non-interactive --agree-tos --email your-email@example.com

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'meproofit',
    script: 'serve',
    args: '-s build -l 3001',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Install serve for static file serving
npm install -g serve

# Start the application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://meproofit.com"
echo "📊 PM2 status: pm2 status"
echo "📝 Logs: pm2 logs meproofit"
echo "🔄 Restart: pm2 restart meproofit" 