# Email Notifications for GAR Assessments

This document describes how to set up and use the email notification system for GAR assessments.

## Overview

The application now supports email notifications for GAR assessments. When you create or update an assessment with notification recipients, they will receive an email notification.

## How It Works

1. When you create or update a GAR assessment, you can select notification recipients in the "Notification Recipients" section.
2. The assessment data is saved to Firestore, including the list of notification recipients.
3. A Firebase Cloud Function named `sendAssessmentNotifications` is triggered by the database write.
4. The function sends an email to all recipients specified in the `notificationRecipients.users` array.
5. Each email contains information about the assessment, including:
   - Title
   - Date
   - Risk Level (with appropriate color coding)
   - Station
   - Created By
6. The function updates the assessment document with a record of the notification sending status.

## Setup Instructions

### Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. A Firebase project with Firestore enabled
3. An email service account (Gmail recommended for testing)

### Configuration Steps

1. Login to Firebase:
   ```
   firebase login
   ```

2. Set email configuration secrets (pre-configured for MailerSend):
   ```
   firebase functions:config:set email.host="smtp.mailersend.net" email.port="2525" email.secure="true" email.user="MS_aZ8xjf@trial-xkjn41m2xv54z781.mlsender.net" email.pass="mssp.Ez4wEc1.o65qngkk9jdgwr12.bJebh3u" email.from="Fire Department <MS_aZ8xjf@trial-xkjn41m2xv54z781.mlsender.net>"
   ```

   Note: The function is pre-configured with these MailerSend credentials, so this step is optional unless you want to change them.

3. Deploy the functions:
   ```
   cd /mnt/c/Users/RamRi/Documents/webdev/pvs-v1
   firebase deploy --only functions
   ```

## Customization

### Email Template

The email template is defined in the `index.js` file in the functions directory. You can customize the HTML template to match your department's branding or to include additional information.

### Risk Level Colors

The email includes color-coded risk levels:
- Green: Low risk (≤ 40)
- Amber/Yellow: Medium risk (41-60)
- Red: High risk (61-100)

You can customize these thresholds and colors in the `getRiskLevelColor` function.

## Troubleshooting

If emails are not being sent:

1. Check the Firebase Functions logs in the Firebase Console
2. Make sure you've set up the email configuration correctly
3. Verify that notification recipients have valid email addresses (not example.com)
4. Make sure your email service isn't blocking automated emails
5. Check if the deployment was successful

## Production Considerations

For production use:
- Consider using a dedicated email service like SendGrid or Mailgun
- Store email credentials securely in environment variables
- Implement rate limiting to prevent abuse
- Add error handling and retry logic for failed emails
- Consider implementing email templates in a separate file for easier maintenance