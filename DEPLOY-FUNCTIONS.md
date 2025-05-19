# Deploying Firebase Functions

This guide walks you through deploying the Firebase Cloud Functions for email notifications.

## Prerequisites

1. Node.js and npm installed
2. Firebase CLI installed
3. Firebase project already set up

## Step 1: Install Firebase CLI

If you haven't installed the Firebase CLI yet:

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

Authenticate with your Firebase account:

```bash
firebase login
```

## Step 3: Install Dependencies

Navigate to the functions directory and install dependencies:

```bash
cd /mnt/c/Users/RamRi/Documents/webdev/pvs-v1/functions
npm install
```

## Step 4: Deploy Functions

From the project root directory:

```bash
cd /mnt/c/Users/RamRi/Documents/webdev/pvs-v1
firebase deploy --only functions
```

## Step 5: Verify Deployment

After deployment, you should see something like:

```
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function sendAssessmentNotifications(us-central1)...
✔  functions[sendAssessmentNotifications(us-central1)]: Successful create operation.
Function URL (sendAssessmentNotifications(us-central1)): https://us-central1-pvs-app-61e6b.cloudfunctions.net/sendAssessmentNotifications

✔  Deploy complete!
```

## Step 6: Test the Function

Create or update a GAR assessment with notification recipients to trigger the function.

## Troubleshooting

If you encounter issues:

1. Check the Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

2. Make sure your Firebase project is correctly set up in `.firebaserc`

3. Verify the function is deployed in the Firebase Console:
   - Go to https://console.firebase.google.com/
   - Select your project
   - Go to Functions
   - Check that `sendAssessmentNotifications` is listed and enabled

4. Check permissions:
   - Make sure your Firebase project has the appropriate billing plan for outbound network requests
   - Ensure your user account has sufficient permissions

## Updating Configuration

If you need to update email settings:

```bash
firebase functions:config:set email.host="smtp.example.com" email.port="587" email.secure="false" email.user="username" email.pass="password" email.from="from@example.com"
```

Then redeploy:

```bash
firebase deploy --only functions
```