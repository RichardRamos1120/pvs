// src/components/ReportDetail.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  Download, 
  Edit3, 
  CheckCircle,
  User,
  FileText
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

const ReportDetail = () => {
  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });
  
  // Initialize selectedStation from localStorage with default to Station 1
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'Station 1';
  });
  
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // Wrapper functions to update localStorage when state changes
  const handleDarkModeChange = (mode) => {
    setDarkMode(mode);
    localStorage.setItem('darkMode', mode.toString());
  };
  
  const handleStationChange = (station) => {
    setSelectedStation(station);
    localStorage.setItem('selectedStation', station);
  };
  
  // Fetch log and user profile on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get log
        const logData = await firestoreOperations.getLog(id);
        
        if (!logData) {
          throw new Error('Log not found');
        }
        
        setLog(logData);
        // Don't change the default station based on the log's station
        // handleStationChange(logData.station);
        
        // Get user profile
        const user = auth.currentUser;
        if (user) {
          const profile = await firestoreOperations.getUserProfile(user.uid);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching log:', error);
        setError('Failed to load log data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, firestoreOperations, auth]);
  
  // Get activity color based on category
  const getActivityColor = (category) => {
    switch(category) {
      case "ADMIN":
        return "bg-blue-500";
      case "MAINTENANCE":
        return "bg-green-500";
      case "MEDICAL":
        return "bg-red-500";
      case "OPERATIONS":
        return "bg-purple-500";
      case "PR":
        return "bg-yellow-500";
      case "PREV":
        return "bg-orange-500";
      case "TRAINING":
        return "bg-indigo-500";
      case "UNION":
        return "bg-pink-500";
      case "ISO":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };
  
  // Get activity icon based on category
  const getActivityIcon = (category) => {
    switch(category) {
      case "ADMIN":
        return <FileText className="w-5 h-5" />;
      case "MAINTENANCE":
        return <Calendar className="w-5 h-5" />;
      case "MEDICAL":
        return <User className="w-5 h-5" />;
      case "OPERATIONS":
        return <Calendar className="w-5 h-5" />;
      case "PR":
        return <User className="w-5 h-5" />;
      case "PREV":
        return <Calendar className="w-5 h-5" />;
      case "TRAINING":
        return <Calendar className="w-5 h-5" />;
      case "UNION":
        return <User className="w-5 h-5" />;
      case "ISO":
        return <FileText className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };
  
  // Format time for display
  const formatTimeRange = (start, end) => {
    if (!start && !end) return "—";
    if (start && !end) return `${start} - ongoing`;
    return `${start} - ${end}`;
  };
  
  // Export to PDF
  const exportToPDF = () => {
    // Create a clone of the report to style for PDF
    const reportElement = document.getElementById('report-container');
    
    if (!reportElement) return;
    
    const clone = reportElement.cloneNode(true);
    clone.style.width = '100%';
    clone.style.padding = '20px';
    clone.style.backgroundColor = 'white';
    clone.style.color = 'black';
    
    // Set PDF options
    const options = {
      margin: 10,
      filename: `${log.station.replace(/\s+/g, '-')}_${log.date.replace(/,\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate PDF
    html2pdf().from(clone).set(options).save();
  };
  
  // Loading state
  if (loading) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
          <button 
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate('/reports')}
          >
            Back to Reports
          </button>
        </div>
      </Layout>
    );
  }
  
  // No log state
  if (!log) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg">Log not found</p>
            <p className="text-sm mt-1">The requested log could not be found</p>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Reports
          </button>
        </div>
      </Layout>
    );
  }
  
  // Calculate hours by category
  const hoursByCategory = {};
  (log.activities || []).forEach(activity => {
    if (!activity) return;
    const category = activity.type;
    if (!hoursByCategory[category]) {
      hoursByCategory[category] = 0;
    }
    hoursByCategory[category] += parseFloat(activity.hours || 0);
  });

  return (
    <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
      <div id="report-container" className="space-y-6">
        {/* Header with navigation */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="mb-4 md:mb-0 flex items-center">
              <button 
                onClick={() => navigate('/reports')}
                className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold">{log.station} Daily Log</h2>
                <p className="text-gray-500 dark:text-gray-400">{log.date} • {log.shift} Shift</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                log.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
              }`}>
                {log.status === 'complete' ? 'Complete' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Log Metadata Card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{log.captain}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {log.crew && log.crew.length > 0 ? log.crew.join(', ') : 'No crew members assigned'}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {log.status === 'draft' && (userProfile?.role === 'captain' || userProfile?.role === 'admin') && (
                <button 
                  onClick={() => navigate('/today', { state: { logId: log.id } })}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Continue Editing
                </button>
              )}
              <button 
                onClick={exportToPDF}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
            
        {/* Daily Timeline */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">Daily Timeline</h3>
          
          <div className="relative pl-8">
            {/* Time line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700"></div>
            
            {log.activities && log.activities.length > 0 ? (
              log.activities.map((activity, index) => (
                <div key={activity.id || index} className="mb-6 relative">
                  {/* Time dot */}
                  <div className="absolute left-[-8px] w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 top-1">
                    <div className={`w-full h-full rounded-full ${getActivityColor(activity.type)}`}></div>
                  </div>
                  
                  {/* Activity card */}
                  <div className="ml-4">
                    {/* Time */}
                    <div className="absolute left-[-40px] top-0 text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                      {activity.details?.startTime || "--:--"}
                    </div>
                    
                    {/* Activity content */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-lg ${getActivityColor(activity.type)} text-white flex items-center justify-center mr-2`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{activity.description}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatTimeRange(activity.details?.startTime, activity.details?.endTime)} • {activity.hours} hrs
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {activity.type}
                        </span>
                      </div>
                      
                      {/* Activity details based on type */}
                      <div className="ml-10 mt-2">
                        {activity.type === 'MAINTENANCE' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            {activity.details?.apparatus && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Apparatus:</span> {activity.details.apparatus}
                              </div>
                            )}
                            {activity.details?.maintenanceType && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Type:</span> {activity.details.maintenanceType}
                              </div>
                            )}
                            {activity.details?.passFailStatus && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Status:</span> {activity.details.passFailStatus}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {activity.type === 'TRAINING' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {activity.details?.trainingMethod && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Method:</span> {activity.details.trainingMethod}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {activity.type === 'OPERATIONS' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {activity.details?.stationCoverage && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Station:</span> {activity.details.stationCoverage}
                              </div>
                            )}
                            {activity.details?.apparatus && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Apparatus:</span> {activity.details.apparatus}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {activity.type === 'ADMIN' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {activity.details?.documentType && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Document Type:</span> {activity.details.documentType}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {activity.notes && (
                          <div className="mt-2 text-sm bg-gray-50 dark:bg-gray-750 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Notes:</span> {activity.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No activities recorded for this log.
              </div>
            )}
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Activity Summary</h3>
            
            <div className="space-y-3">
              {Object.entries(hoursByCategory).map(([category, hours]) => (
                <div key={category} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg ${getActivityColor(category)} text-white flex items-center justify-center mr-2`}>
                      {getActivityIcon(category)}
                    </div>
                    <span className="font-medium">{category}</span>
                  </div>
                  <span className="font-medium">{hours.toFixed(1)} hrs</span>
                </div>
              ))}
              
              <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-t-2 border-blue-500 dark:border-blue-700 mt-2">
                <span className="font-semibold">TOTAL</span>
                <span className="font-semibold">{log.totalHours || "0.0"} hrs</span>
              </div>
            </div>
          </div>
          
          {/* Captain's Notes */}
          {log.notes && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Captain's Notes</h3>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                <p>{log.notes}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Signature Section (if complete) */}
        {log.status === 'complete' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Verification</h3>
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              <div>
                <p className="font-medium">Completed by {log.captain || log.completedBy || 'Unknown'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {log.completedAt ? new Date(log.completedAt).toLocaleString() : 'Date not recorded'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportDetail;