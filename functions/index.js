// Using Firebase Functions v1 syntax
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const ALLOWED_DOMAINS = [
  'smfd.org',
  'eirene.ai',
  'fullboxhq.com'
];

/**
 * This function runs after a new user is created
 * Deletes the user if the email domain isn't whitelisted
 */
exports.validateNewUser = functions.auth.user().onCreate(async (user) => {
  try {
    const email = user.email || '';
    const domain = email.split('@').pop()?.toLowerCase();
    
    // If domain is not allowed, delete the user
    if (!ALLOWED_DOMAINS.includes(domain)) {
      console.log(`Unauthorized domain ${domain} for ${email}. Deleting user.`);
      await admin.auth().deleteUser(user.uid);
      return null;
    }
    
    console.log(`New user with valid domain ${domain} created: ${email}`);
    return null;
  } catch (error) {
    console.error("Error in validateNewUser:", error);
    return null;
  }
});

// HTTP function (useful for testing if functions work at all)
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});