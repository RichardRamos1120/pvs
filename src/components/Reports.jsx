// src/components/Reports.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import Pagination from './Pagination';
import { downloadCSV, formatLogDataForExport } from '../utils/csvExport';
import { formatDatePST, getCurrentPSTDate } from '../utils/timezone';
import {
  Calendar,
  Search,
  Filter,
  Building,
  Eye,
  ArrowLeft,
  Plus,
  CheckCircle,
  FileText,
  Edit3,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Download
} from 'lucide-react';

const Reports = () => {
  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    const isDarkMode = savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
    
    // Apply dark mode class to HTML element for Tailwind
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    
    return isDarkMode;
  });
  
  // Initialize selectedStation from localStorage with default to Station 1
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'Station 1';
  });
  
  const [pastLogs, setPastLogs] = useState([]);
  
  // Helper function to check if user can manage logs (create/delete)
  const canManageLogs = (userProfile) => {
      return userProfile?.role === 'admin' || 
             ['Captain', 'Deputy Chief', 'Battalion Chief', 'Chief'].includes(userProfile?.rank);
  };
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'draft', 'complete'
  // Initialize stationFilter - default to 'all' for admin users or to selectedStation for others
  const [stationFilter, setStationFilter] = useState('all'); // Start with 'all', we'll update after checking user role
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [logToDelete, setLogToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [stationsList, setStationsList] = useState(['Station 1']);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsPerPage] = useState(5); // Show 5 logs per page

  const navigate = useNavigate();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // Wrapper functions to update localStorage when state changes
  const handleDarkModeChange = (mode) => {
    setDarkMode(mode);
    localStorage.setItem('darkMode', mode.toString());
    
    // Apply dark mode class to HTML element for Tailwind
    if (mode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
  };
  
  const handleStationChange = (station) => {
    // Only update if we're actually changing stations
    if (station !== selectedStation) {
      // Set loading to true when changing stations
      setLoading(true);
      // Set the new station
      setSelectedStation(station);
      localStorage.setItem('selectedStation', station);
    }
  };
  
  // Fetch user profile and logs on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;

        if (!user) {
          throw new Error('Not authenticated');
        }

        // Get user profile
        const profile = await firestoreOperations.getUserProfile(user.uid);
        setUserProfile(profile);

        // Fetch stations from database
        try {
          const stationsData = await firestoreOperations.getStations();
          if (stationsData && stationsData.length > 0) {
            const formattedStations = stationsData.map(station => 
              `Station ${station.number || station.id.replace('station_', '').replace('s', '')}`
            ).sort((a, b) => {
              const numA = parseInt(a.replace('Station ', ''));
              const numB = parseInt(b.replace('Station ', ''));
              return numA - numB;
            });
            
            // Set stations list with 'all' as first option for admins
            if (profile && profile.role === 'admin') {
              setStationsList(['all', ...formattedStations]);
            } else {
              setStationsList(formattedStations);
            }
          }
        } catch (error) {
          console.error('Error fetching stations:', error);
          // Keep default stations list if fetch fails
        }

        // Track reports page view
        await firestoreOperations.trackUserActivity(user.uid, 'reports_view', {
          station: selectedStation,
          timestamp: new Date().toISOString()
        });

        // Check if we already have a station selection from localStorage
        const savedStation = localStorage.getItem('selectedStation');

        // Set proper station filter based on user role
        if (profile && profile.role === 'admin') {
          // Admin users start with 'all' filter by default
          // But respect the station filter that was set in this session
          if (stationFilter !== 'all') {
            // Keep the current stationFilter if it's not 'all'
          } else {
            // Default to 'all' for admins on first load
            setStationFilter('all');
          }
        } else {
          // Non-admin users are limited to their saved station
          const stationToUse = savedStation || profile.station || selectedStation;
          setStationFilter(stationToUse);
        }

        // Fetch paginated logs
        const stationToFilter = profile && profile.role === 'admin' && stationFilter === 'all' ? null : stationFilter;
        const statusToFilter = activeTab === 'all' ? null : activeTab;
        
        
        const paginatedResult = await firestoreOperations.getPaginatedLogs(
          currentPage, 
          logsPerPage, 
          stationToFilter, 
          statusToFilter
        );
        
        setPastLogs(paginatedResult.logs || []);
        setTotalLogs(paginatedResult.totalLogs || 0);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth, firestoreOperations, stationFilter, selectedStation, currentPage, activeTab]);
  
  // Handle station filter change
  const handleStationFilterChange = (stationName) => {
    setStationFilter(stationName);
    setCurrentPage(1); // Reset to first page when filter changes

    // Also update the global selectedStation if not "all"
    if (stationName !== 'all') {
      handleStationChange(stationName);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when tab changes
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Create new log or navigate to existing today's log
  const createNewLog = async () => {
    try {
      // Check if station is valid first
      if (selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') {
        // Show an error about no stations
        setError('Cannot create log: No stations are available. Please contact an administrator to set up stations.');
        return;
      }
      
      // First check if there's already a log for today for this station
      const today = new Date();
      const todayLog = pastLogs.find(log => {
        const logDate = new Date(log.rawDate);
        return (
          logDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0) &&
          log.station === selectedStation
        );
      });

      // If a log for today already exists, navigate to it
      if (todayLog) {
        navigate('/today', { state: { logId: todayLog.id } });
        return;
      }

      // Otherwise, create a new log
      const formattedToday = formatDatePST(today, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Determine current shift based on time of day
      const currentHour = getCurrentPSTDate().getHours();
      let currentShift;
      if (currentHour >= 6 && currentHour < 18) {
        currentShift = "Day Shift";
      } else {
        currentShift = "Night Shift";
      }

      const newLog = {
        date: formattedToday,
        rawDate: today.toISOString(),
        captain: userProfile?.displayName || auth.currentUser?.displayName || 'Captain',
        station: selectedStation,
        shift: currentShift,
        crew: [],
        activities: [],
        totalHours: "0.0",
        status: 'draft',
        notes: ""
      };

      const createdLog = await firestoreOperations.createLog(newLog);

      if (createdLog) {
        navigate('/today', { state: { logId: createdLog.id } });
      } else {
        throw new Error('Failed to create log');
      }
    } catch (error) {
      console.error('Error creating new log:', error);
      setError('Failed to create new log. Please try again.');
    }
  };

  // Delete log
  const confirmDeleteLog = (log) => {
    setLogToDelete(log);
    setDeleteConfirmOpen(true);
  };

  const cancelDeleteLog = () => {
    setLogToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const deleteLog = async () => {
    if (!logToDelete) return;

    // Security check - only allow admins and users with Captain rank or higher to delete logs
    if (!canManageLogs(userProfile)) {
      setError('Permission denied. Only Captains and above can delete logs.');
      setDeleteConfirmOpen(false);
      setLogToDelete(null);
      return;
    }

    try {
      // Pass user info to the delete function for audit logging
      const deleteSuccess = await firestoreOperations.deleteLog(logToDelete.id, {
        userEmail: auth.currentUser?.email,
        userDisplayName: userProfile?.firstName && userProfile?.lastName 
          ? `${userProfile.firstName} ${userProfile.lastName}`
          : userProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown User',
        userId: auth.currentUser?.uid
      });

      if (deleteSuccess) {
        // Update the logs list by filtering out the deleted log
        setPastLogs(pastLogs.filter(log => log.id !== logToDelete.id));
        
        // Update total count
        setTotalLogs(prev => Math.max(0, prev - 1));
      }

      // Close the confirmation modal
      setDeleteConfirmOpen(false);
      setLogToDelete(null);
    } catch (error) {
      console.error('Error deleting log:', error);
      setError('Failed to delete log. Please try again.');
    }
  };
  
  // Filter logs based on station, status, and search term
  const getFilteredLogs = () => {
    return pastLogs.filter(log => {
      // Filter by station if not 'all'
      if (stationFilter !== 'all' && log.station !== stationFilter) {
        return false;
      }
      
      // Filter by status tab
      if (activeTab !== 'all' && log.status !== activeTab) {
        return false;
      }
      
      // Filter by date range
      if (dateRange !== 'all') {
        const logDate = new Date(log.rawDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateRange === 'today') {
          const startOfDay = new Date(today);
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          
          if (logDate < startOfDay || logDate > endOfDay) {
            return false;
          }
        } else if (dateRange === 'week') {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
          
          if (logDate < startOfWeek) {
            return false;
          }
        } else if (dateRange === 'month') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          if (logDate < startOfMonth) {
            return false;
          }
        }
      }
      
      // Filter by search term
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        // Check if search term is in date, captain, station, or activities
        const dateMatch = log.date?.toLowerCase().includes(lowerSearchTerm);
        const captainMatch = log.captain?.toLowerCase().includes(lowerSearchTerm);
        const stationMatch = log.station?.toLowerCase().includes(lowerSearchTerm);
        const activitiesMatch = log.activities?.some(a => 
          a?.description?.toLowerCase().includes(lowerSearchTerm) ||
          a?.type?.toLowerCase().includes(lowerSearchTerm)
        );
        
        return dateMatch || captainMatch || stationMatch || activitiesMatch;
      }
      
      return true;
    }).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
  };
  
  // Group reports by station
  const getReportsByStation = () => {
    const reportsByStation = {};
    
    getFilteredLogs().forEach(log => {
      if (!reportsByStation[log.station]) {
        reportsByStation[log.station] = [];
      }
      reportsByStation[log.station].push(log);
    });
    
    return reportsByStation;
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
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
      <div>
        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && logToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4 text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6 mr-2" />
                <h3 className="text-lg font-medium">Delete Draft Log</h3>
              </div>

              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Are you sure you want to delete the draft log from <span className="font-semibold">{logToDelete.date}</span>?
                This action cannot be undone and all activities in this log will be permanently lost.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteLog}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteLog}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Delete Draft Log
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="mb-4 md:mb-0 flex items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reports</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View and manage all activity logs and risk assessments
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* Only show buttons for captains/admins if stations exist */}
              {canManageLogs(userProfile) && 
               !(selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') && (
                <>
                  <button 
                    onClick={createNewLog}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {pastLogs.some(log => {
                      const logDate = new Date(log.rawDate);
                      const today = new Date();
                      return (
                        logDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0) &&
                        log.station === selectedStation
                      );
                    }) ? "View Today's Log" : "Create New Log"}
                  </button>
                  
                  <button 
                    onClick={() => navigate('/gar-assessment')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Risk Assessments
                  </button>
                </>
              )}
              
              {/* Show a warning when no stations exist */}
              {canManageLogs(userProfile) && 
               (selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') && (
                <div className="inline-flex items-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 text-sm font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500 dark:text-yellow-400" />
                  No Stations Available
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 p-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
            <div className="flex flex-1 max-w-md">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                value={stationFilter}
                onChange={(e) => handleStationFilterChange(e.target.value)}
              >
                {/* Show "All Stations" option only for admin users */}
                {userProfile?.role === 'admin' && (
                  <option value="all">All Stations</option>
                )}

                {/* Show individual stations */}
                {stationsList
                  .filter(station => station !== 'all') // Filter out 'all' since we handle it separately above
                  .map((station) => (
                    <option key={station} value={station}>
                      {station}
                    </option>
                  ))
                }
              </select>

              <select
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {/* Export Buttons */}
              <div className="flex space-x-2">
                {/* Export Current Page */}
                <button
                  onClick={() => {
                    try {
                      const formattedData = formatLogDataForExport(pastLogs);
                      const filename = `logs_page_${currentPage}_export_${new Date().toISOString().split('T')[0]}.csv`;
                      downloadCSV(formattedData, filename);
                    } catch (error) {
                      console.error('Error exporting current page:', error);
                      alert('Export failed: ' + error.message);
                    }
                  }}
                  className={`flex items-center px-3 py-2 border rounded-md transition-colors text-sm ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Page ({pastLogs.length})
                </button>

                {/* Export All */}
                <button
                  onClick={async () => {
                    try {
                      
                      // Fetch all logs for export
                      let allLogs;
                      if (userProfile && userProfile.role === 'admin') {
                        allLogs = await firestoreOperations.getAllLogs();
                      } else {
                        const userStation = localStorage.getItem('selectedStation') || userProfile?.station || selectedStation;
                        allLogs = await firestoreOperations.getLogs(userStation);
                      }
                      
                      if (allLogs && allLogs.length > 0) {
                        const formattedData = formatLogDataForExport(allLogs);
                        const filename = `logs_all_export_${new Date().toISOString().split('T')[0]}.csv`;
                        downloadCSV(formattedData, filename);
                      } else {
                        alert('No logs found to export');
                      }
                    } catch (error) {
                      console.error('Error exporting all logs:', error);
                      alert('Export all failed: ' + error.message);
                    }
                  }}
                  className={`flex items-center px-3 py-2 border rounded-md transition-colors text-sm ${
                    darkMode 
                      ? 'border-blue-600 text-blue-300 hover:bg-blue-700 border-2' 
                      : 'border-blue-500 text-blue-600 hover:bg-blue-50 border-2'
                  }`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All ({totalLogs})
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleTabChange('all')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'all' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleTabChange('complete')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'complete' 
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Complete
            </button>
            <button
              onClick={() => handleTabChange('draft')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'draft' 
                  ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Draft
            </button>
          </div>
        </div>
        
        {/* Past Logs - Always Grouped by Station */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="space-y-4 p-4">
            {Object.entries(getReportsByStation()).length > 0 ? (
              Object.entries(getReportsByStation()).map(([stationName, logs]) => (
                <div key={stationName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-750 p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-medium">{stationName}</h3>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                        {logs.length} {logs.length === 1 ? 'Report' : 'Reports'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Proper table structure */}
                  <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-750">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Shift/Captain
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Activities
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Hours
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status/Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{log.date}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {log.shift === "B" ? "Day Shift" : log.shift} {log.createdByName ? `• ${log.createdByName}` : log.captain ? `• ${log.captain}` : ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {log.activities?.length || 0} activities
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {log.totalHours} hrs
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-4">
                                {log.status === 'complete' ? (
                                  <span className="text-green-600 dark:text-green-400 inline-flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Complete
                                  </span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400 inline-flex items-center">
                                    <div className="w-4 h-4 rounded-full border-2 border-yellow-500 mr-1"></div>
                                    Draft
                                  </span>
                                )}
                                <div className="flex items-center space-x-3 ml-4">
                                  {log.status === 'draft' ? (
                                    <>
                                      {canManageLogs(userProfile) && (
                                        <button
                                          onClick={() => {
                                            // First update localStorage directly to ensure station is set before navigation
                                            if (log.station) {
                                              localStorage.setItem('selectedStation', log.station);
                                            }
                                            // Navigate to today's log with the log ID and station info
                                            navigate('/today', {
                                              state: {
                                                logId: log.id,
                                                fromStation: log.station
                                              }
                                            });
                                          }}
                                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 inline-flex items-center"
                                        >
                                          <Edit3 className="w-4 h-4 mr-1" />
                                          Edit
                                        </button>
                                      )}
                                      {canManageLogs(userProfile) && (
                                        <button
                                          onClick={() => confirmDeleteLog(log)}
                                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 inline-flex items-center"
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Delete
                                        </button>
                                      )}
                                      <button
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                                        onClick={() => navigate(`/report/${log.id}`)}
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                                      onClick={() => navigate(`/report/${log.id}`)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view */}
                  <div className="md:hidden">
                    {logs.map((log) => (
                      <div key={log.id} className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{log.date}</h4>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {log.createdByName || log.captain || 'Unknown'} • {log.shift === "B" ? "Day Shift" : log.shift}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center py-1">
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{log.activities?.length || 0} activities</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{log.totalHours} hrs</span>
                          </div>
                          
                          <div>
                            {log.status === 'complete' ? (
                              <span className="text-sm text-green-600 dark:text-green-400 inline-flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                              </span>
                            ) : (
                              <span className="text-sm text-yellow-600 dark:text-yellow-400 inline-flex items-center">
                                <div className="w-4 h-4 rounded-full border-2 border-yellow-500 mr-1"></div>
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex justify-end space-x-3">
                          {log.status === 'draft' ? (
                            <>
                              {canManageLogs(userProfile) && (
                                <button
                                  onClick={() => {
                                    // First update localStorage directly to ensure station is set before navigation
                                    if (log.station) {
                                      localStorage.setItem('selectedStation', log.station);
                                    }
                                    // Navigate to today's log with the log ID and station info
                                    navigate('/today', {
                                      state: {
                                        logId: log.id,
                                        fromStation: log.station
                                      }
                                    });
                                  }}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 text-sm flex items-center"
                                >
                                  <Edit3 className="w-4 h-4 mr-1" />
                                  Edit
                                </button>
                              )}
                              {canManageLogs(userProfile) && (
                                <button
                                  onClick={() => confirmDeleteLog(log)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 text-sm flex items-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </button>
                              )}
                              <button
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                                onClick={() => navigate(`/report/${log.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                              onClick={() => navigate(`/report/${log.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No logs found matching your filters.
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalLogs > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalLogs / logsPerPage)}
              totalItems={totalLogs}
              itemsPerPage={logsPerPage}
              onPageChange={handlePageChange}
              darkMode={darkMode}
              showItemCount={true}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Reports;