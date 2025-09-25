// CSV Export Utility
import { formatDateForExportPST } from './timezone';

export const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get all unique keys from all objects
  const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

  // Convert data to CSV format
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = (row as any)[header as string];
        // Handle nested objects, arrays, and special characters
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Escape commas and quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Fallback for older browsers
    window.open(`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
  }
};

// Helper function to safely format dates in PST
const formatDateForExport = (dateValue) => {
  return formatDateForExportPST(dateValue);
};

// Export specific data formatters
export const formatUserDataForExport = (users) => {
  return users.map(user => ({
    id: user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    role: user.role || '',
    station: user.stationId || user.station || '',
    status: user.status || 'active',
    permissions: user.permissions ? user.permissions.join('; ') : '',
    createdAt: formatDateForExport(user.createdAt),
    lastLogin: formatDateForExport(user.lastLogin)
  }));
};

export const formatStationDataForExport = (stations) => {
  return stations.map(station => ({
    id: station.id,
    number: station.number || '',
    name: station.name || '',
    address: station.address || '',
    phone: station.phone || '',
    captainId: station.captainId || '',
    crewSize: station.crewIds ? station.crewIds.length : 0,
    apparatus: station.apparatus ? station.apparatus.map(a => `${a.name} (${a.status})`).join('; ') : '',
    createdAt: formatDateForExport(station.createdAt)
  }));
};

export const formatGARDataForExport = (assessments) => {
  return assessments.map(assessment => ({
    id: assessment.id,
    station: assessment.station || '',
    date: assessment.date || '',
    rawDate: assessment.rawDate || '',
    overallRisk: assessment.overallRisk || '',
    riskScore: assessment.riskScore || '',
    status: assessment.status || '',
    submittedBy: assessment.submittedBy || '',
    submittedByName: assessment.submittedByName || '',
    createdAt: formatDateForExport(assessment.createdAt),
    // Include risk factors if they exist
    supervision: assessment.supervision?.value || '',
    planning: assessment.planning?.value || '',
    teamSelection: assessment.teamSelection?.value || '',
    communications: assessment.communications?.value || '',
    teamFitness: assessment.teamFitness?.value || '',
    environment: assessment.environment?.value || '',
    eventComplexity: assessment.eventComplexity?.value || ''
  }));
};

export const formatLogDataForExport = (logs) => {
  return logs.map(log => ({
    id: log.id,
    station: log.station || '',
    date: log.date || '',
    rawDate: log.rawDate || '',
    status: log.status || '',
    submittedBy: log.submittedBy || '',
    submittedByName: log.submittedByName || '',
    personnel: log.personnel ? JSON.stringify(log.personnel) : '',
    activities: log.activities ? log.activities.join('; ') : '',
    notes: log.notes || '',
    createdAt: formatDateForExport(log.createdAt)
  }));
};

export const formatActivityDataForExport = (activities) => {
  return activities.map(activity => ({
    id: activity.id,
    type: activity.type,
    message: activity.message,
    timestamp: formatDateForExport(activity.timestamp),
    station: activity.station || '',
    userId: activity.userId || '',
    risk: activity.risk || ''
  }));
};