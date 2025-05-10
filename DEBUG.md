# Debugging Deployment Issues

## WSL Build Permission Issues

If you encounter `EPERM: operation not permitted` errors when trying to build in WSL, you can try these solutions:

1. Build directly in Windows
   ```
   # In Command Prompt or PowerShell
   cd C:\Users\RamRi\Documents\webdev\pvs-v1
   npm run build
   ```

2. Change build permissions in WSL
   ```
   # In WSL
   chmod -R 755 /mnt/c/Users/RamRi/Documents/webdev/pvs-v1/public
   ```

3. Use HashRouter (currently implemented)
   - This approach uses URL hashes (#) for routes
   - All routes will look like `/#/login` instead of `/login`
   - No need for server-side routing configuration

## Serving the App

### In Development
```
npm start
```
Or use the `run-development.bat` file.

### In Production 
With HashRouter, you can serve the static files directly:
```
npx serve -s build
```

## Switching Back to BrowserRouter

If you want to switch back to BrowserRouter:

1. In App.js, change:
   ```javascript
   import { HashRouter as Router, ... } from 'react-router-dom';
   ```
   Back to:
   ```javascript
   import { BrowserRouter as Router, ... } from 'react-router-dom';
   ```

2. When serving the app, use:
   ```
   npx serve -s build --single
   ```
   Or use the `serve-app.bat` file.