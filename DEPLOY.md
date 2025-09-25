# Deployment Instructions

## Local Development
```
npm start
```

## Building for Production
```
npm run build
```

## Serving the Production Build

### Option 1: Use serve (recommended)
```
npx serve -s build -l 3000 --single
```
Or simply double-click the `serve-app.bat` file on Windows.

### Option 2: Use the Express server
```
npm run serve
```

## Troubleshooting 404 Errors

If you're getting 404 errors when navigating to routes in the built app, it's because the server doesn't know to serve `index.html` for all client-side routes.

### Solution 1: Use the `--single` flag with serve
```
npx serve -s build --single
```

### Solution 2: Use the included Express server (server.ts/server.js)
```
node server.ts (or compiled server.js)
```

### Solution 3: For Apache servers
The included `.htaccess` file in the public directory should handle this automatically.

### Solution 4: For Nginx
Add this to your server configuration:
```
location / {
  try_files $uri $uri/ /index.html;
}
```