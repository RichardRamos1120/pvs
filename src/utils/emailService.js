// EmailJS integration for sending notification emails
import emailjs from '@emailjs/browser';
import { formatDatePST, formatTimePST, formatDateTimePST } from './timezone';

// EmailJS service configuration with your provided details
const SERVICE_ID = 'service_fh2krcd'; // Updated EmailJS service connected to MailerSend
const TEMPLATE_ID = 'template_f6bhegf'; // Updated GAR notification template
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
 * Get hex color based on risk level for email templates
 */
const getRiskColor = (riskLevel, score) => {
  if (typeof riskLevel === 'string') {
    const lowerRisk = riskLevel.toLowerCase();
    if (lowerRisk.includes('green') || lowerRisk.includes('low')) return '#10b981'; // Green
    if (lowerRisk.includes('amber') || lowerRisk.includes('yellow') || lowerRisk.includes('medium') || lowerRisk.includes('moderate')) return '#f59e0b'; // Amber
    if (lowerRisk.includes('red') || lowerRisk.includes('high')) return '#ef4444'; // Red
  }
  
  // Fallback to numeric assessment
  const numScore = parseInt(score);
  if (!isNaN(numScore)) {
    if (numScore <= 23) return '#10b981'; // Green
    if (numScore <= 44) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }
  
  return '#f59e0b'; // Default amber
};

/**
 * Expand notification recipients from groups and individual users into a complete list
 */
const expandNotificationRecipients = async (notificationRecipients, firestoreOperations) => {
  try {
    console.log("[DEBUG] Expanding notification recipients:", notificationRecipients);
    
    const allRecipients = [];
    const seenEmails = new Set(); // To avoid duplicates
    
    // Get all users for group expansion
    const allUsers = await firestoreOperations.getAllUsers();
    const activeUsers = allUsers.filter(user => 
      user.email && 
      !user.email.includes('dummy') && 
      user.status !== 'inactive'
    );
    
    // Expand groups
    if (notificationRecipients.groups && notificationRecipients.groups.length > 0) {
      for (const groupId of notificationRecipients.groups) {
        let groupUsers = [];
        
        switch (groupId) {
          case 'all_firefighters':
            groupUsers = activeUsers.filter(u => u.role === 'firefighter');
            break;
          case 'all_officers':
            groupUsers = activeUsers.filter(u => ['captain', 'lieutenant'].includes(u.role));
            break;
          case 'all_chiefs':
            groupUsers = activeUsers.filter(u => ['chief', 'admin'].includes(u.role));
            break;
          case 'all_active':
            groupUsers = activeUsers;
            break;
        }
        
        groupUsers.forEach(user => {
          if (user.email && !seenEmails.has(user.email)) {
            seenEmails.add(user.email);
            allRecipients.push({
              id: user.id,
              email: user.email,
              displayName: user.displayName || user.firstName || 'Team Member',
              name: user.displayName || user.firstName || 'Team Member',
              station: user.station || 'Unknown Station',
              role: user.role || 'firefighter'
            });
          }
        });
      }
    }
    
    // Add individual users
    if (notificationRecipients.users && notificationRecipients.users.length > 0) {
      for (const userId of notificationRecipients.users) {
        const user = activeUsers.find(u => u.id === userId);
        if (user && user.email && !seenEmails.has(user.email)) {
          seenEmails.add(user.email);
          allRecipients.push({
            id: user.id,
            email: user.email,
            displayName: user.displayName || user.firstName || 'Team Member',
            name: user.displayName || user.firstName || 'Team Member',
            station: user.station || 'Unknown Station',
            role: user.role || 'firefighter'
          });
        }
      }
    }
    
    console.log(`[DEBUG] Expanded to ${allRecipients.length} unique recipients`);
    return allRecipients;
    
  } catch (error) {
    console.error("[DEBUG] Error expanding notification recipients:", error);
    return [];
  }
};

/**
 * Send notification emails about a GAR assessment using the new notification recipients structure
 */
export const sendGARAssessmentNotifications = async (assessmentData, notificationRecipients, firestoreOperations, assessmentId = null) => {
  try {
    console.log("[DEBUG] Starting GAR assessment email notifications process");
    
    if (!notificationRecipients || (!notificationRecipients.groups?.length && !notificationRecipients.users?.length)) {
      console.warn('[DEBUG] No notification recipients configured');
      return false;
    }
    
    // Expand groups and users into a complete recipient list
    const recipients = await expandNotificationRecipients(notificationRecipients, firestoreOperations);
    
    if (recipients.length === 0) {
      console.warn('[DEBUG] No valid recipients found after expansion');
      return false;
    }
    
    console.log(`[DEBUG] Found ${recipients.length} valid recipients`);
    
    // Use the existing sendAssessmentNotifications function with the expanded recipients
    return await sendAssessmentNotifications(assessmentData, recipients, assessmentId);
    
  } catch (error) {
    console.error('[DEBUG] Error in sendGARAssessmentNotifications:', error);
    return false;
  }
};

/**
 * Send notification emails about a GAR assessment (legacy function)
 */
export const sendAssessmentNotifications = async (assessmentData, recipients, assessmentId = null) => {
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
        if (riskScore <= 40) riskLevel = "LOW RISK";
        else if (riskScore <= 60) riskLevel = "MODERATE RISK";
        else riskLevel = "HIGH RISK";
      }
    }
    
    // Get risk color for the template
    const riskColor = getRiskColor(riskLevel, riskScore);
    
    // Send to each recipient
    for (const recipient of validRecipients) {
      try {
        console.log(`[DEBUG] Preparing email for ${recipient.email}`);
        
        // Format date and time nicely in PST timezone
        let formattedDate = assessmentData.date || 'Not specified';
        let formattedTime = assessmentData.time || 'Not specified';
        
        try {
          if (assessmentData.rawDate) {
            // Use PST timezone formatting
            formattedDate = formatDatePST(assessmentData.rawDate, { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          }
          
          // Also format time in PST if available
          if (assessmentData.rawDate || assessmentData.timestamp) {
            const timeSource = assessmentData.rawDate || assessmentData.timestamp;
            formattedTime = formatTimePST(timeSource);
          }
        } catch (e) {
          console.log('[DEBUG] Error formatting date/time in PST, using original:', e);
        }
        
        // Generate subject based on risk level
        const getSubjectByRisk = (riskLevel) => {
          const level = riskLevel.toUpperCase();
          if (level.includes('RED') || level.includes('HIGH')) {
            return `🔴 HIGH RISK - GAR Assessment Complete`;
          } else if (level.includes('AMBER') || level.includes('MEDIUM') || level.includes('MODERATE')) {
            return `🟡 MODERATE RISK - GAR Assessment Complete`;
          } else if (level.includes('GREEN') || level.includes('LOW')) {
            return `🟢 LOW RISK - GAR Assessment Complete`;
          }
          return `⚠️ GAR Assessment Complete`;
        };

        // Parameters for EmailJS template (matching new template structure)
        const templateParams = {
          // Core EmailJS template fields
          subject: getSubjectByRisk(riskLevel),
          email: recipient.email,
          from: "FullboxHQ",
          
          // Recipient info
          to_name: recipient.displayName || recipient.name || 'Team Member',
          
          // Assessment details
          date: formattedDate,
          time: formattedTime,
          station: assessmentData.station || 'N/A',
          type: assessmentData.type || 'Standard Assessment',
          captain: assessmentData.captain || assessmentData.author || 'N/A',
          score: riskScore,
          risk_level: riskLevel,
          risk_color: riskColor,
          
          // App link - direct link to this specific assessment
          app_url: assessmentId ? `${APP_URL}/gar-assessment/${assessmentId}` : APP_URL,
          
          // Additional details for the template (formatted for display)
          weather_temp: assessmentData.weather?.temperature || 'N/A',
          weather_temp_unit: assessmentData.weather?.temperature ? (assessmentData.weather?.temperatureUnit || '°F') : '',
          weather_wind: assessmentData.weather?.wind || 'N/A',
          weather_wind_direction: assessmentData.weather?.wind ? (assessmentData.weather?.windDirection || '') : '',
          weather_humidity: assessmentData.weather?.humidity || 'N/A',
          weather_precipitation: assessmentData.weather?.precipitation || 'N/A',
          weather_precipitation_rate: assessmentData.weather?.precipitationRate || 'N/A',
          weather_wave_height: assessmentData.weather?.waveHeight || 'N/A',
          weather_wave_period: assessmentData.weather?.wavePeriod || 'N/A',
          weather_wave_direction: assessmentData.weather?.waveDirection || 'N/A',
          weather_alerts: assessmentData.weather?.alerts || 'None',
          
          // Mitigation info
          has_mitigations: Object.values(assessmentData.mitigations || {}).some(m => m && m.trim()),
          mitigation_count: Object.values(assessmentData.mitigations || {}).filter(m => m && m.trim()).length
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
    
    // Current date/time for test in PST
    const now = new Date();
    const formattedDate = formatDatePST(now, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = formatTimePST(now, {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Parameters for the template (matching new template structure)
    const templateParams = {
      // Core EmailJS template fields
      subject: "🟡 MEDIUM RISK - Test GAR Assessment Complete",
      email: email,
      from: "FullboxHQ",
      
      // Recipient info
      to_name: "Test User",
      
      // Test assessment details
      date: formattedDate,
      time: formattedTime,
      station: "Test Station 42",
      type: "Test Assessment",
      captain: "Test Captain",
      score: 45,
      risk_level: "MODERATE RISK",
      risk_color: "#f59e0b",
      
      // App link
      app_url: APP_URL,
      
      // Additional details for the template
      weather_temp: "72",
      weather_temp_unit: "°F",
      weather_wind: "15",
      weather_wind_direction: "NW",
      weather_humidity: "65",
      weather_precipitation: "Light Rain",
      weather_precipitation_rate: "0.5",
      weather_wave_height: "3",
      weather_wave_period: "8",
      weather_wave_direction: "SW",
      weather_alerts: "Thunderstorm Watch",
      
      // Mitigation info
      has_mitigations: true,
      mitigation_count: 2
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
  sendGARAssessmentNotifications,
  sendTestEmail
};