# Firebase Cloud Functions for PVS App

This directory contains Firebase Cloud Functions for the PVS application.

## Functions

### sendAssessmentNotifications

This function sends email notifications when a GAR assessment is created or updated. It triggers automatically based on Firestore document changes.

#### Functionality

- Triggers on creation or update of documents in the `assessments` collection
- Sends email notifications to all users listed in the `notificationRecipients.users` array
- Formats emails with HTML and includes key assessment information
- Updates the assessment document with notification sending status
- Uses nodemailer to send emails

## Configuration

The function is pre-configured with MailerSend SMTP settings. If you need to change them, you can set new email configuration:

```bash
firebase functions:config:set email.host="smtp.mailersend.net" email.port="2525" email.secure="true" email.user="MS_aZ8xjf@trial-xkjn41m2xv54z781.mlsender.net" email.pass="mssp.Ez4wEc1.o65qngkk9jdgwr12.bJebh3u" email.from="Fire Department <MS_aZ8xjf@trial-xkjn41m2xv54z781.mlsender.net>"
```

## Deployment

Deploy the functions using the Firebase CLI:

```bash
firebase deploy --only functions
```

## Local Testing

You can test the functions locally using the Firebase Emulator:

```bash
firebase emulators:start --only functions
```

## Logs

View function logs in the Firebase Console or using the CLI:

```bash
firebase functions:log
```

## Notes

- The function uses the `onWrite` trigger, which fires on both new documents and updates
- Emails are only sent if valid recipients exist in the notification recipients list
- The function filters out any email addresses containing '@example.com'
- Error handling logs problems both to the console and to the assessment document