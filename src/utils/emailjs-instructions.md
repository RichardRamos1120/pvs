# EmailJS Account Setup Instructions

To fix the "Account not found" error, follow these steps to properly configure your EmailJS account and update the code.

## Step 1: Verify/Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign in to your account or create a new one if needed
3. Confirm your account is active (not suspended due to quota limits or other issues)

## Step 2: Create an Email Service

1. In the EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Select your email provider (Gmail, Outlook, etc.)
4. Follow the authentication steps to connect your email account
5. Give your service a name (e.g., "FireDepartmentNotifications")
6. **Note the Service ID** - it will look like "service_xxxxxxx"

## Step 3: Create an Email Template

1. In the EmailJS dashboard, go to "Email Templates"
2. Click "Create New Template"
3. Give your template a name (e.g., "GARAssessmentNotification")
4. Design your template with these variables:
   - {{from_name}} - The sender name
   - {{to_name}} - The recipient's name
   - {{message}} - The HTML message content
   - {{to_email}} - The recipient's email address
   - {{reply_to}} - Reply-to email address
5. **Note the Template ID** - it will look like "template_xxxxxxx"

## Step 4: Get Your Public Key

1. In the EmailJS dashboard, go to "Integration"
2. Under "Browser" section, find your Public Key
3. **Copy the Public Key** - it will look like "XXXXXXXXXXXXXXXXX"

## Step 5: Update Your Code

Open the following files and update the EmailJS configuration with your new credentials:

1. `/mnt/c/Users/RamRi/Documents/webdev/pvs-v1/src/utils/emailService.ts`
2. `/mnt/c/Users/RamRi/Documents/webdev/pvs-v1/src/utils/testEmailSender.ts`

Update these lines in both files:

```javascript
// EmailJS service configuration with your provided details
const SERVICE_ID = 'your_service_id_here'; // Replace with your new service ID
const TEMPLATE_ID = 'your_template_id_here'; // Replace with your new template ID
const USER_ID = 'your_public_key_here'; // Replace with your new public key
```

## Step 6: Testing

1. After updating the code, run the test function in your browser console:
   ```javascript
   testEmailJS.checkConfiguration()
   testEmailJS.testFromConsole()
   ```

2. Create a test GAR Assessment and add yourself as a notification recipient
3. Submit the assessment and check if you receive the email notification

## Troubleshooting

If you still encounter issues:

1. Check the browser console for detailed error messages
2. Verify that your EmailJS account hasn't exceeded the monthly email quota (Free tier: 200 emails/month)
3. Try using a different email service provider in EmailJS
4. Ensure your template variables match exactly what the code is sending