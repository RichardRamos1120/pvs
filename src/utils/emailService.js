// EmailJS integration for sending notification emails
import emailjs from '@emailjs/browser';

// EmailJS service configuration with your provided details
const SERVICE_ID = 'service_2umfd2m'; // FullboxForm service
const TEMPLATE_ID = 'template_7z8kmc3'; // Your sample template
const USER_ID = 'b-bBwqddJJ_dlSNxH'; // EmailJS public key

// App URL - update this to your actual application URL when deployed
const APP_URL = window.location.origin;

console.log(`[DEBUG] EmailJS config: SERVICE_ID=${SERVICE_ID}, TEMPLATE_ID=${TEMPLATE_ID}`);

/**
 * Initialize EmailJS with user ID
 */
export const initEmailJS = () => {
  console.log("[DEBUG] Initializing EmailJS with user ID");
  try {
    emailjs.init(USER_ID);
    console.log("[DEBUG] EmailJS initialization complete");
  } catch (error) {
    console.error("[DEBUG] EmailJS initialization error:", error);
  }
};

/**
 * Get CSS color class based on risk level
 */
const getRiskColorClass = (riskLevel, score) => {
  if (typeof riskLevel === 'string') {
    const lowerRisk = riskLevel.toLowerCase();
    if (lowerRisk.includes('green') || lowerRisk.includes('low')) return 'green';
    if (lowerRisk.includes('amber') || lowerRisk.includes('yellow') || lowerRisk.includes('medium')) return 'amber';
    if (lowerRisk.includes('red') || lowerRisk.includes('high')) return 'red';
  }
  
  // Fallback to numeric assessment
  const numScore = parseInt(score);
  if (!isNaN(numScore)) {
    if (numScore <= 40) return 'green';
    if (numScore <= 60) return 'amber';
    return 'red';
  }
  
  return 'amber'; // Default
};

/**
 * Send notification emails about a GAR assessment
 */
export const sendAssessmentNotifications = async (assessmentData, recipients) => {
  try {
    console.log("[DEBUG] Starting email notifications process");
    
    if (!recipients || recipients.length === 0) {
      console.warn('[DEBUG] No recipients provided for email notification');
      return false;
    }

    // Filter out invalid email addresses
    const validRecipients = recipients.filter(
      r => r.email && 
      r.email.includes('@') && 
      !r.email.includes('@example.com')
    );
    
    if (validRecipients.length === 0) {
      console.warn('[DEBUG] No valid recipients found after filtering');
      return false;
    }

    console.log(`[DEBUG] Found ${validRecipients.length} valid recipients`);
    
    // Format risk level for display
    let riskLevel = "Unknown";
    let riskScore = assessmentData.totalScore || 0;
    
    // Try to determine risk level from the assessment data
    if (assessmentData.riskLevel) {
      if (typeof assessmentData.riskLevel === 'string') {
        riskLevel = assessmentData.riskLevel;
      } else if (typeof assessmentData.riskLevel === 'object' && assessmentData.riskLevel.level) {
        riskLevel = assessmentData.riskLevel.level;
      } else if (typeof assessmentData.riskLevel === 'number') {
        riskScore = assessmentData.riskLevel;
        if (riskScore <= 40) riskLevel = "GREEN (Low risk)";
        else if (riskScore <= 60) riskLevel = "AMBER (Medium risk)";
        else riskLevel = "RED (High risk)";
      }
    }
    
    // Get risk color class for the template
    const riskColor = getRiskColorClass(riskLevel, riskScore);
    
    // Send to each recipient
    for (const recipient of validRecipients) {
      try {
        console.log(`[DEBUG] Preparing email for ${recipient.email}`);
        
        // Format date and time nicely if possible
        let formattedDate = assessmentData.date || 'Not specified';
        let formattedTime = assessmentData.time || 'Not specified';
        
        try {
          if (assessmentData.rawDate) {
            const date = new Date(assessmentData.rawDate);
            formattedDate = date.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          }
        } catch (e) {
          console.log('[DEBUG] Error formatting date, using original:', e);
        }
        
        // Parameters for EmailJS template
        const templateParams = {
          // Recipient info
          to_name: recipient.displayName || recipient.name || 'Team Member',
          to_email: recipient.email,
          
          // Sender info
          from_name: "Fire Department GAR System",
          reply_to: "noreply@firedepartment.com",
          
          // Assessment details
          date: formattedDate,
          time: formattedTime,
          station: assessmentData.station || 'Not specified',
          type: assessmentData.type || 'Standard Assessment',
          captain: assessmentData.captain || assessmentData.author || 'Not specified',
          score: riskScore,
          risk_level: riskLevel,
          risk_color: riskColor,
          
          // For custom text message fallback
          message: `A new GAR assessment has been completed for ${assessmentData.station || 'your station'} with a risk level of ${riskLevel} (score: ${riskScore}). Assessment created by ${assessmentData.captain || assessmentData.author || 'Not specified'} on ${formattedDate} at ${formattedTime}.`,
          
          // App link
          app_url: APP_URL
        };
        
        console.log(`[DEBUG] Sending email to ${recipient.email}`);
        console.log(`[DEBUG] Template params:`, JSON.stringify(templateParams));
        
        // Send email via EmailJS
        const result = await emailjs.send(
          SERVICE_ID,
          TEMPLATE_ID,
          templateParams
        );
        
        console.log(`[DEBUG] Email sent to ${recipient.email}, status: ${result.text}`);
      } catch (error) {
        console.error(`[DEBUG] Failed to send to ${recipient.email}:`, error.message || error);
        console.error(`[DEBUG] Error details:`, error);
      }
    }
    
    console.log(`[DEBUG] Completed sending email notifications to ${validRecipients.length} recipients`);
    return true;
  } catch (error) {
    console.error('[DEBUG] Error in sendAssessmentNotifications:', error.message || error);
    console.error('[DEBUG] Full error details:', error);
    return false;
  }
};

/**
 * Send a test email
 */
export const sendTestEmail = async (email) => {
  try {
    console.log(`[DEBUG] Sending test email to ${email}`);
    
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
      to_name: "Test User",
      to_email: email,
      
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
      risk_level: "AMBER (Medium Risk)",
      risk_color: "amber",
      
      // For custom text message fallback
      message: `This is a test email from the Fire Department notification system sent at ${formattedDate} ${formattedTime}. If you received this email, the notification system is working correctly!`,
      
      // App link
      app_url: APP_URL
    };
    
    console.log(`[DEBUG] Test email params:`, JSON.stringify(templateParams));
    
    // Send email
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams
    );
    
    console.log(`[DEBUG] Test email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('[DEBUG] Error sending test email:', error.message || error);
    console.error('[DEBUG] Full error details:', error);
    return false;
  }
};

export default {
  initEmailJS,
  sendAssessmentNotifications,
  sendTestEmail
};