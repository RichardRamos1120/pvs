/**
 * Test utility for EmailJS
 * Run this script to test if EmailJS is working properly
 * 
 * Usage: 
 * 1. Import this file
 * 2. Call testEmailJS.sendTestEmail('your-email@example.com')
 */

import emailjs from '@emailjs/browser';

// EmailJS service configuration with your provided details
const SERVICE_ID = 'service_2umfd2m'; // FullboxForm service
const TEMPLATE_ID = 'contact_form'; // Default contact form template
const USER_ID = 'V-Mwr4x_iu6FVMCpB'; // EmailJS public key

/**
 * Initialize EmailJS - must be called before sending any emails
 */
export const init = () => {
  console.log("[TEST] Initializing EmailJS with user ID:", USER_ID);
  emailjs.init(USER_ID);
  return true;
};

/**
 * Send a test email to verify EmailJS is working
 * @param {string} recipientEmail - The email address to send the test to
 * @returns {Promise<boolean>} - True if sending was successful
 */
export const sendTestEmail = async (recipientEmail) => {
  try {
    console.log("[TEST] Sending test email to:", recipientEmail);
    
    // Initialize EmailJS
    init();
    
    // Create simple test message
    const message = `
      <h1>Test Email from EmailJS</h1>
      <p>This is a test email sent at ${new Date().toLocaleString()}</p>
      <p>If you're receiving this, EmailJS is working correctly!</p>
    `;
    
    // Parameters for EmailJS template - using default contact_form template
    const templateParams = {
      from_name: "Fire Department Test",
      to_name: "Test Recipient",
      message: message,
      reply_to: "noreply@test.com",
      to_email: recipientEmail,
      subject: "EmailJS Test Message"
    };
    
    // Send the email
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams
    );
    
    console.log("[TEST] Email sent successfully:", result.text);
    return true;
  } catch (error) {
    console.error("[TEST] Error sending test email:", error);
    return false;
  }
};

/**
 * Print EmailJS configuration for debugging
 */
export const printConfig = () => {
  console.log("[TEST] EmailJS Configuration:");
  console.log(" - Service ID:", SERVICE_ID);
  console.log(" - Template ID:", TEMPLATE_ID);
  console.log(" - User ID:", USER_ID);
};

export default {
  init,
  sendTestEmail,
  printConfig
};