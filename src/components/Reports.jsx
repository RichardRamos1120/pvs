// src/components/Reports.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
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
  Edit3
} from 'lucide-react';

const Reports = () => {
  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });
  
  // Initialize selectedStation from localStorage with default to Station 1
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'Station 1';
  });
  
  const [pastLogs, setPastLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'draft', 'complete'
  const [stationFilter, setStationFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  
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
        
        // Set selected station based on user profile
        if (profile && profile.station) {
          handleStationChange(profile.station);
          setStationFilter(profile.station);
        }
        
        // Fetch logs
        let logs;
        if (profile && profile.role === 'admin') {
          // Admin can see all logs
          logs = await firestoreOperations.getAllLogs();
        } else {
          // Regular users see only their station logs
          logs = await firestoreOperations.getLogs(profile.station || selectedStation);
        }
        
        setPastLogs(logs || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [auth, firestoreOperations]);
  
  // Handle station filter change
  const handleStationFilterChange = async (stationName) => {
    setStationFilter(stationName);
    
    if (stationName !== 'all') {
      try {
        const logs = await firestoreOperations.getLogs(stationName);
        setPastLogs(logs || []);
      } catch (error) {
        console.error('Error fetching logs for station:', error);
        setError('Failed to load logs for selected station.');
      }
    } else if (userProfile && userProfile.role === 'admin') {
      // Admin viewing all logs
      try {
        const logs = await firestoreOperations.getAllLogs();
        setPastLogs(logs || []);
      } catch (error) {
        console.error('Error fetching all logs:', error);
        setError('Failed to load all logs.');
      }
    }
  };
  
  // Create new log
  const createNewLog = async () => {
    try {
      const today = new Date();
      const formattedToday = today.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      
      const newLog = {
        date: formattedToday,
        rawDate: today.toISOString(),
        captain: userProfile?.displayName || auth.currentUser?.displayName || 'Captain',
        station: selectedStation,
        shift: "B",
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
  
  // List of available stations
  const stationsList = [
    'all',
    'Station 1', 
    'Station 4', 
    'Station 7', 
    'Station 10', 
    'Station 11', 
    'Station 14', 
    'Station 23'
  ];
  
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Activity Logs</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View and manage all activity reports
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {(userProfile?.role === 'captain' || userProfile?.role === 'admin') && (
                <button 
                  onClick={createNewLog}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Log
                </button>
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white text-sm"
                value={stationFilter}
                onChange={(e) => handleStationFilterChange(e.target.value)}
              >
                {userProfile?.role === 'admin' && <option value="all">All Stations</option>}
                {stationsList
                  .filter(station => station !== 'all' || userProfile?.role === 'admin')
                  .map((station) => (
                    <option key={station} value={station}>
                      {station === 'all' ? 'All Stations' : station}
                    </option>
                  ))
                }
              </select>
              
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'all' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('complete')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'complete' 
                  ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Complete
            </button>
            <button
              onClick={() => setActiveTab('draft')}
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
        
        {/* Reports List - Always Grouped by Station */}
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
                  
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Table Header */}
                    <div className="hidden md:grid md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-750 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <div>Date</div>
                      <div>Shift/Captain</div>
                      <div>Activities</div>
                      <div>Hours</div>
                      <div className="text-right">Actions</div>
                    </div>
                    
                    {logs.map((log) => (
                      <div key={log.id} className="p-4">
                        <div className="flex flex-col md:grid md:grid-cols-5 md:gap-4 md:items-center">
                          <div className="flex items-center mb-2 md:mb-0">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3 md:mr-0">
                              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="md:hidden ml-3">
                              <h4 className="font-medium">{log.date}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {log.captain} • {log.shift} Shift
                              </p>
                            </div>
                          </div>
                          
                          <div className="hidden md:block">
                            <h4 className="font-medium">{log.date}</h4>
                          </div>
                          
                          <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                            {log.shift} Shift • {log.captain}
                          </div>
                          
                          <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                            {log.activities?.length || 0} activities
                          </div>
                          
                          <div className="hidden md:block text-sm font-medium">
                            {log.totalHours} hrs
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end mt-2 md:mt-0">
                            <div className="flex items-center md:mr-3">
                              {log.status === 'complete' ? (
                                <span className="flex items-center text-green-600 dark:text-green-400">
                                  <CheckCircle className="w-5 h-5 mr-1" />
                                  <span className="text-sm">Complete</span>
                                </span>
                              ) : (
                                <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                                  <div className="w-5 h-5 rounded-full border-2 border-yellow-500 mr-1"></div>
                                  <span className="text-sm">Draft</span>
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              {log.status === 'draft' && (
                                <button 
                                  onClick={() => navigate('/today', { state: { logId: log.id } })}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 text-sm"
                                >
                                  Edit
                                </button>
                              )}
                              <button 
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                onClick={() => navigate(`/report/${log.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </button>
                            </div>
                          </div>
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
        </div>
      </div>
    </Layout>
  );
};

export default Reports;