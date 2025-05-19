# EmailJS Integration for GAR Assessment Notifications

## Current Configuration

Your EmailJS service has been set up with the following configuration:

- **Service**: FullboxForm (`service_2umfd2m`)
- **Template**: Your sample template (`template_7z8kmc3`)
- **Public Key**: `b-bBwqddJJ_dlSNxH`

## Setup Instructions for Custom Email Template

1. **Log in to your EmailJS account** at [https://dashboard.emailjs.com/admin](https://dashboard.emailjs.com/admin)

2. **Go to Email Templates**:
   - Click on "Email Templates" in the left navigation
   - Click "Create New Template"
   - Name your template (e.g., "GAR Assessment Notification")

3. **Design your template**:
   - You can use the HTML provided in the `gar-email-template.html` file in this project
   - Copy and paste this HTML into the "Code" tab in the EmailJS template editor
   - Add your logo in the template editor or use the placeholder one

4. **Configure template variables**:
   The template uses the following variables:
   - `{{to_name}}` - Recipient's name
   - `{{to_email}}` - Recipient's email
   - `{{from_name}}` - Sender name
   - `{{reply_to}}` - Reply-to email
   - `{{date}}` - Assessment date
   - `{{time}}` - Assessment time
   - `{{station}}` - Station name
   - `{{type}}` - Assessment type
   - `{{captain}}` - Captain/author name
   - `{{score}}` - Risk score
   - `{{risk_level}}` - Risk level (GREEN, AMBER, RED)
   - `{{risk_color}}` - CSS class for risk color (green, amber, red)
   - `{{message}}` - Fallback plain text message
   - `{{app_url}}` - URL to your application

5. **Save the template** and note the template ID (e.g., `template_abc123`)

6. **Update your code** with the new template ID if necessary

## Sending Customized Emails

The email service has been updated to support a rich, formatted email template. The code now:

1. Formats dates and times nicely for display
2. Uses color-coding for risk levels (green, amber, red)
3. Includes direct links back to your application
4. Has a fallback plain text message for email clients that don't support HTML

## Testing the Integration

To test the new email template:

1. Make sure your EmailJS template is set up with the variables listed above
2. Open your application in the browser
3. From the browser console, run:
   ```javascript
   testEmailJS.testFromConsole()
   ```
4. Enter your email address and name when prompted
5. Check your email inbox (including spam folder)

## Actual GAR Assessment Notifications

When you create and publish a GAR assessment with notification recipients:

1. The system automatically formats the assessment data
2. It sends personalized emails to each recipient
3. The email includes risk level indicators with appropriate colors
4. Recipients can click a link to view the full assessment details

## Troubleshooting

If emails are not displaying correctly:

1. Verify your template in EmailJS has all the required variables
2. Check the actual email in different email clients
3. Look for errors in the browser console
4. Try using the test function to isolate issues

## Email Quotas

Remember that the free EmailJS account has a limit of 200 emails per month. If you need to send more, consider upgrading to a paid plan.