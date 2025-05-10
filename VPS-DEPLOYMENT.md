# VPS Deployment Guide

This guide will help you correctly deploy your application to a VPS without styling issues.

## Building for Production

Before deploying, make sure to build the application properly:

```bash
# Local build
npm run build
```

The build process will:
1. Process your CSS with Tailwind
2. Compile and minify your JavaScript
3. Create a production-ready bundle in the `build` folder

## Deployment Steps

### 1. Prepare your VPS

Make sure you have Node.js, npm, and optionally Nginx or Apache installed.

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nginx
```

### 2. Transfer Files

Use SCP, SFTP, or Git to transfer the built files to your VPS:

```bash
# Example using SCP (run from your local machine)
scp -r build/* user@your-vps-ip:/var/www/your-app
```

### 3. Server Configuration

#### Using Nginx

Create a site configuration in `/etc/nginx/sites-available/your-app`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/your-app;
    index index.html;

    # Important for client-side routing!
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/your-app /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

#### Using Apache

If using Apache, make sure the `.htaccess` file is included and `mod_rewrite` is enabled:

```apache
<Directory /var/www/your-app>
    Options -MultiViews
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.html [QSA,L]
</Directory>
```

### 4. SSL Setup (Recommended)

Use Certbot to set up free SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Troubleshooting

### Styling Issues

If styling is missing or incorrect:

1. **Check the production build**
   - Make sure Tailwind CSS is properly processed during build
   - Verify the build steps completed without errors

2. **Inspect Network Requests**
   - Open browser dev tools
   - Check if all CSS files are loading correctly
   - Look for 404 errors or missing resources

3. **Content Security Policy**
   - If your server has CSP headers, make sure they allow your styles

4. **File Permissions**
   - Ensure your web server has read access to your files:
   ```bash
   sudo chown -R www-data:www-data /var/www/your-app
   sudo chmod -R 755 /var/www/your-app
   ```

### Routing Issues

If you're getting 404 errors when navigating:

1. **Check Server Configuration**
   - Ensure Nginx/Apache is configured to redirect all routes to index.html

2. **Test Your Configuration**
   - For Nginx: `sudo nginx -t`
   - For Apache: `sudo apachectl -t`

## Serving with Express

For a simpler setup, you can use the included Express server:

1. Transfer the entire project (not just the build folder) to your VPS
2. Install dependencies: `npm install`
3. Start the server: `node server.js`

This approach handles routing automatically.