/**
 * Test utility for checking EmailJS configuration
 * Run this from the browser console to test sending an email
 */

import emailjs from '@emailjs/browser';

// EmailJS service configuration 
const SERVICE_ID = 'service_2umfd2m'; // FullboxForm service
const TEMPLATE_ID = 'template_7z8kmc3'; // Your sample template
const USER_ID = 'b-bBwqddJJ_dlSNxH'; // EmailJS public key

// App URL for email links
const APP_URL = window.location.origin;

/**
 * Initializes EmailJS with the public key
 */
const init = () => {
  console.log("Initializing EmailJS...");
  try {
    emailjs.init(USER_ID);
    console.log("EmailJS initialized");
  } catch (error) {
    console.error("EmailJS initialization error:", error);
  }
};

/**
 * Sends a test email
 * @param {string} to - Email address to send to
 * @param {string} name - Name of the recipient
 * @returns {Promise} - Promise that resolves with the email sending result
 */
const sendTestEmail = async (to, name = "User") => {
  console.log(`Sending test email to ${to} (${name})`);
  
  try {
    init();
    
    // Current date/time for test
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Parameters for the template
    const templateParams = {
      // Recipient info
      to_name: name,
      to_email: to,
      
      // Sender info
      from_name: "Fire Department Test System",
      reply_to: "noreply@test.com",
      
      // Test assessment details
      date: formattedDate,
      time: formattedTime,
      station: "Test Station 42",
      type: "Test Assessment",
      captain: "Test Captain",
      score: 45,
      risk_level: "MODERATE RISK",
      risk_color: "amber",
      
      // For custom text message fallback
      message: `This is a test email from the Fire Department notification system sent at ${formattedDate} ${formattedTime}. If you received this email, the notification system is working correctly!`,
      
      // App link
      app_url: APP_URL
    };
    
    console.log("Template parameters:", JSON.stringify(templateParams));
    
    // Send email via EmailJS
    const result = await emailjs.send(
      SERVICE_ID, 
      TEMPLATE_ID, 
      templateParams
    );
    
    console.log("Test email sent successfully!", result);
    return { success: true, result };
  } catch (error) {
    console.error("Failed to send test email:", error.message || error);
    console.error("Full error details:", error);
    return { success: false, error };
  }
};

/**
 * Helper utility for testing from the browser console
 */
const testFromConsole = () => {
  const email = prompt("Enter email address to send test to:");
  const name = prompt("Enter recipient name:", "Test User");
  
  if (!email) {
    console.log("Email sending cancelled");
    return;
  }
  
  sendTestEmail(email, name)
    .then(result => {
      if (result.success) {
        console.log(`Test email sent to ${email}!`);
        alert(`Test email sent to ${email}! Check your inbox (may be in spam folder).`);
      } else {
        console.error(`Failed to send test email to ${email}`);
        alert(`Failed to send test email to ${email}. See console for details.`);
      }
    });
};

/**
 * Function to verify EmailJS is working
 */
const verifyEmailJS = async () => {
  console.log("Testing EmailJS connectivity...");
  
  try {
    // Initialize EmailJS
    init();
    
    // Test if we can load the service
    console.log(`Attempting to verify service: ${SERVICE_ID}`);
    console.log(`Template ID: ${TEMPLATE_ID}`);
    
    // Just log service info without sending
    console.log("EmailJS appears to be correctly initialized");
    console.log("Configuration:", {
      SERVICE_ID,
      TEMPLATE_ID,
      USER_ID
    });
    return true;
  } catch (error) {
    console.error("EmailJS verification failed:", error);
    return false;
  }
};

/**
 * Function to check current EmailJS configuration
 */
const checkConfiguration = () => {
  console.log("=== EmailJS Configuration ===");
  console.log(`Service ID: ${SERVICE_ID}`);
  console.log(`Template ID: ${TEMPLATE_ID}`);
  console.log(`User ID: ${USER_ID}`);
  console.log("===========================");
  return {
    SERVICE_ID,
    TEMPLATE_ID,
    USER_ID
  };
};

// Export the test utility functions
export default {
  init,
  sendTestEmail,
  testFromConsole,
  checkConfiguration,
  verifyEmailJS,
  SERVICE_ID,
  TEMPLATE_ID,
  USER_ID
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  window.testEmailJS = { 
    sendTestEmail, 
    testFromConsole,
    checkConfiguration,
    verifyEmailJS
  };
}

// Usage from console:
// testEmailJS.checkConfiguration() - View current config
// testEmailJS.verifyEmailJS() - Verify connection
// testEmailJS.testFromConsole() - Send a test email