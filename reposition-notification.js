const fs = require('fs');
const path = require('path');

// Read the original file
const filePath = path.join(__dirname, 'src', 'components', 'SimpleGARAssessment.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find the Step4 component
const step4Start = content.indexOf('const Step4 = () => {');
if (step4Start === -1) {
  console.error('Could not find Step4 component');
  process.exit(1);
}

// Find the beginning of the return statement in Step4
const returnStart = content.indexOf('return (', step4Start);
if (returnStart === -1) {
  console.error('Could not find return statement in Step4');
  process.exit(1);
}

// Find the notification recipients section
const notificationSectionStart = content.indexOf('<div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">');
if (notificationSectionStart === -1) {
  console.error('Could not find notification section');
  process.exit(1);
}

// Find the closing div for the notification section
let openDivs = 1;
let notificationSectionEnd = notificationSectionStart;
let searchIndex = notificationSectionStart + '<div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">'.length;

while (openDivs > 0 && searchIndex < content.length) {
  const nextOpenDiv = content.indexOf('<div', searchIndex);
  const nextCloseDiv = content.indexOf('</div>', searchIndex);
  
  if (nextOpenDiv === -1 && nextCloseDiv === -1) {
    console.error('Could not find matching divs');
    process.exit(1);
  }
  
  if (nextOpenDiv !== -1 && (nextCloseDiv === -1 || nextOpenDiv < nextCloseDiv)) {
    openDivs++;
    searchIndex = nextOpenDiv + 4;
  } else {
    openDivs--;
    if (openDivs === 0) {
      notificationSectionEnd = nextCloseDiv + 6;
    }
    searchIndex = nextCloseDiv + 6;
  }
}

if (openDivs !== 0) {
  console.error('Failed to find end of notification section');
  process.exit(1);
}

// Extract the notification section
const notificationSection = content.substring(notificationSectionStart, notificationSectionEnd);
console.log(`Found notification section (${notificationSection.length} chars)`);

// Remove the notification section from its current position
const contentWithoutNotification = content.substring(0, notificationSectionStart) + content.substring(notificationSectionEnd);

// Find where to insert the notification section - after the h2 tag in Step4
const h2End = contentWithoutNotification.indexOf('</h2>', returnStart) + 5;
const afterH2 = contentWithoutNotification.indexOf('\n', h2End) + 1;

// Create the updated content with notification section moved
const updatedContent = 
  contentWithoutNotification.substring(0, afterH2) + 
  '        {/* Notification Recipients Section - Moved to top for better UX */}\n        ' + 
  notificationSection + 
  '\n' + 
  contentWithoutNotification.substring(afterH2);

// Write the updated file
fs.writeFileSync(filePath, updatedContent);
console.log(`Updated file saved to ${filePath}`);