// Utility function to handle station switching and log editing
// This avoids issues with React state updates and navigation timing

// Set station directly to avoid React state update timing issues
export const setStationAndSaveLog = (station, logId) => {
  // Store both pieces of information in localStorage
  localStorage.setItem('selectedStation', station);
  localStorage.setItem('editLogId', logId || '');
  
  console.log('Station set to:', station);
  console.log('Log ID set to:', logId);
  
  // Return true to indicate success
  return true;
};

// Get the log ID for editing and clear it after use
export const getAndClearEditLogId = () => {
  const logId = localStorage.getItem('editLogId') || '';
  
  // Clear it immediately to prevent issues with reload
  localStorage.setItem('editLogId', '');
  
  return logId;
};