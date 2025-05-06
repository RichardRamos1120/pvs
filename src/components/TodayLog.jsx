// src/components/TodayLog.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import {
  Plus,
  Check,
  ArrowLeft,
  Calendar,
  Users,
  Truck,
  Clipboard,
  FileText,
  Building,
  FileSpreadsheet,
  MoreHorizontal,
  Edit3,
  Trash2,
  CheckCircle,
  Mic,
  Lock,
  ShieldAlert,
  Eye,
  Save
} from 'lucide-react';
import NewActivityModal from './NewActivityModal.jsx';

const TodayLog = () => {
  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });

  // Initialize selectedStation from localStorage
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'Station 1';
  });

  const [todayLog, setTodayLog] = useState(null);
  const [showNewActivityForm, setShowNewActivityForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  
  // New states for notes handling
  const [localNotes, setLocalNotes] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  // Add state for success notification
  const [saveSuccess, setSaveSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const db = getFirestore();
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

  // Check if user has permission to edit logs
  const hasEditPermission = userRole === 'admin' || userRole === 'captain';

  // First, check user authorization before anything else
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        if (!auth.currentUser) {
          console.log("No user logged in");
          setUserChecked(true);
          return;
        }

        const userEmail = auth.currentUser.email;
        console.log("Checking authorization for user email:", userEmail);

        // Get users from collection where email matches
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // User found by email
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          console.log("User found by email:", userData);

          if (userData.role) {
            setUserRole(userData.role);

            // Determine permissions based on role
            if (userData.role === 'captain' || userData.role === 'admin') {
              console.log("User has edit permission with role:", userData.role);
              setReadOnlyMode(false);
            } else if (userData.role === 'firefighter') {
              console.log("User has view-only permission with role:", userData.role);
              setReadOnlyMode(true);
            } else {
              console.log("User has unknown role:", userData.role);
              setReadOnlyMode(true);
            }

            // Set station if available
            // Only set station from profile if user hasn't manually selected one
            if (userData.station && !localStorage.getItem('selectedStation')) {
              handleStationChange(userData.station);
            }
          } else {
            console.log("No role found in user profile");
            setError("Access denied. Your account does not have a valid role assigned.");
            setUserChecked(true);
            return;
          }
        } else {
          console.log("No user found with email:", userEmail);
          setError("Access denied. Your account is not registered in the system.");
          setUserChecked(true);
          return;
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        setError("An error occurred while checking your permissions. Please try again later.");
        setUserChecked(true);
        return;
      }

      setUserChecked(true);
    };

    checkAuthorization();
  }, [auth.currentUser, db]);

  // Initialize localNotes when todayLog changes
  useEffect(() => {
    if (todayLog) {
      setLocalNotes(todayLog.notes || '');
      setUnsavedChanges(false);
    }
  }, [todayLog]);

  // Effect to auto-hide success message after 2 seconds
  useEffect(() => {
    let timer;
    if (saveSuccess) {
      timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  // Load logs after user check is complete
  useEffect(() => {
    if (!userChecked || userRole === null) {
      return;
    }

    const fetchTodayLogs = async () => {
      try {
        setLoading(true);

        // Get today's date range (start and end of day)
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        console.log("Searching for logs between:", startOfDay, "and", endOfDay);
        console.log("For station:", selectedStation);

        // Query for today's log for the selected station
        const logs = await firestoreOperations.getLogsByDateAndStation(
          selectedStation,
          startOfDay.toISOString(),
          endOfDay.toISOString()
        );

        console.log("Logs found:", logs);

        if (logs && logs.length > 0) {
          // Use the first log found (should usually be only one per day per station)
          setTodayLog(logs[0]);
          console.log("Found existing log:", logs[0]);
        } else {
          // Only create new log if user has permission
          if (hasEditPermission) {
            console.log("No log found for today, creating a new one");
            // Create new log for today
            const formattedToday = today.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            const newLog = {
              date: formattedToday,
              rawDate: today.toISOString(),
              captain: auth.currentUser?.displayName || "Captain",
              station: selectedStation,
              shift: "B",
              crew: [],
              activities: [],
              totalHours: "0.0",
              status: 'draft',
              notes: ""
            };

            console.log("Creating new log with data:", newLog);
            const createdLog = await firestoreOperations.createLog(newLog);

            if (createdLog) {
              console.log("Log created successfully:", createdLog);
              setTodayLog(createdLog);
            } else {
              throw new Error("Failed to create log");
            }
          } else {
            console.log("No log found for today and user doesn't have permission to create one");
            setError("No activity log exists for today. Please contact a captain or administrator to create a new log.");
          }
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
        setError(error.message || "Failed to load log data");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayLogs();
  }, [userChecked, userRole, selectedStation, firestoreOperations, auth.currentUser, hasEditPermission]);

  // Function to handle local notes changes
  const handleNotesChange = (e) => {
    setLocalNotes(e.target.value);
    if (e.target.value !== todayLog.notes) {
      setUnsavedChanges(true);
    } else {
      setUnsavedChanges(false);
    }
  };

  // Function to save notes to database
  const saveNotes = async () => {
    if (!unsavedChanges) return;
    
    try {
      await updateNotes(localNotes);
      setUnsavedChanges(false);
      // Show success message
      setSaveSuccess(true);
    } catch (error) {
      // Error handling is already in updateNotes
    }
  };

  // Get activity color based on category
  const getActivityColor = (category) => {
    switch (category) {
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
    switch (category) {
      case "ADMIN":
        return <FileSpreadsheet className="w-5 h-5" />;
      case "MAINTENANCE":
        return <Truck className="w-5 h-5" />;
      case "MEDICAL":
        return <Clipboard className="w-5 h-5" />;
      case "OPERATIONS":
        return <Truck className="w-5 h-5" />;
      case "PR":
        return <Users className="w-5 h-5" />;
      case "PREV":
        return <Clipboard className="w-5 h-5" />;
      case "TRAINING":
        return <Clipboard className="w-5 h-5" />;
      case "UNION":
        return <Users className="w-5 h-5" />;
      case "ISO":
        return <FileText className="w-5 h-5" />;
      default:
        return <MoreHorizontal className="w-5 h-5" />;
    }
  };

  // Format time for display
  const formatTimeRange = (start, end) => {
    if (!start && !end) return "—";
    if (start && !end) return `${start} - ongoing`;
    return `${start} - ${end}`;
  };

  // Add new activity to today's log
  const addNewActivity = async (activity) => {
    // Check permission before allowing edit
    if (readOnlyMode) {
      setError("You don't have permission to add activities");
      return;
    }

    if (!todayLog) return;

    try {
      console.log("Adding new activity:", activity);

      // Make a copy of existing activities or initialize if null/undefined
      const existingActivities = todayLog.activities || [];
      const updatedActivities = [...existingActivities, activity];

      // Sort by start time
      updatedActivities.sort((a, b) => {
        if (!a.details?.startTime) return 1;
        if (!b.details?.startTime) return -1;
        return a.details.startTime.localeCompare(b.details.startTime);
      });

      // Calculate total hours
      const totalHours = updatedActivities.reduce((sum, a) => sum + parseFloat(a.hours || 0), 0).toFixed(1);

      // Update log
      const updatedLog = {
        ...todayLog,
        activities: updatedActivities,
        totalHours
      };

      console.log("Updating log with new activities:", updatedLog);

      // Update in Firestore
      await firestoreOperations.updateLog(todayLog.id, updatedLog);

      // Update local state
      setTodayLog(updatedLog);
      console.log("Activity added successfully");
    } catch (error) {
      console.error("Error adding activity:", error);
      setError("Failed to add activity: " + error.message);
    }
  };

  // Delete activity from today's log
  const deleteActivity = async (activityId) => {
    // Check permission before allowing edit
    if (readOnlyMode) {
      setError("You don't have permission to delete activities");
      return;
    }

    if (!todayLog) return;

    try {
      console.log("Deleting activity with ID:", activityId);
      const updatedActivities = todayLog.activities.filter(a => a.id !== activityId);
      const totalHours = updatedActivities.reduce((sum, a) => sum + parseFloat(a.hours || 0), 0).toFixed(1);

      const updatedLog = {
        ...todayLog,
        activities: updatedActivities,
        totalHours
      };

      console.log("Updating log after activity deletion:", updatedLog);

      // Update in Firestore
      await firestoreOperations.updateLog(todayLog.id, updatedLog);

      // Update local state
      setTodayLog(updatedLog);
      console.log("Activity deleted successfully");
    } catch (error) {
      console.error("Error deleting activity:", error);
      setError("Failed to delete activity: " + error.message);
    }
  };

  // Update log notes
  const updateNotes = async (notes) => {
    // Check permission before allowing edit
    if (readOnlyMode) {
      setError("You don't have permission to update notes");
      return;
    }

    if (!todayLog) return;

    try {
      console.log("Updating log notes");
      const updatedLog = {
        ...todayLog,
        notes
      };

      // Update in Firestore
      await firestoreOperations.updateLog(todayLog.id, updatedLog);

      // Update local state
      setTodayLog(updatedLog);
      console.log("Notes updated successfully");
    } catch (error) {
      console.error("Error updating notes:", error);
      setError("Failed to update notes: " + error.message);
    }
  };

  // Mark log as complete
  const completeLog = async () => {
    // Check permission before allowing edit
    if (readOnlyMode) {
      setError("You don't have permission to complete logs");
      return;
    }

    if (!todayLog) return;

    try {
      // Save any unsaved notes before completing
      if (unsavedChanges) {
        await updateNotes(localNotes);
      }
      
      console.log("Marking log as complete");
      const updatedLog = {
        ...todayLog,
        status: 'complete',
        completedAt: new Date().toISOString(),
        completedBy: auth.currentUser?.displayName || "Captain"
      };

      // Update in Firestore
      await firestoreOperations.updateLog(todayLog.id, updatedLog);

      // Update local state
      setTodayLog(updatedLog);
      setConfirmComplete(false);
      setUnsavedChanges(false);
      console.log("Log marked as complete");

      // Navigate to report detail
      navigate(`/report/${todayLog.id}`);
    } catch (error) {
      console.error("Error completing log:", error);
      setError("Failed to mark log as complete: " + error.message);
      setConfirmComplete(false);
    }
  };

  // If still checking user status, show loading
  if (!userChecked) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-2">Checking user access...</p>
        </div>
      </Layout>
    );
  }

  // If there was an error getting user data
  if (userChecked && userRole === null && error) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <div className="flex items-center mb-2">
            <ShieldAlert className="h-6 w-6 mr-2" />
            <span className="font-bold">Access Denied</span>
          </div>
          <span className="block sm:inline">{error}</span>
          <button
            className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

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

  // Error state (for errors after user check)
  if (error && userRole !== null) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // No log state
  if (!todayLog) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <Clipboard className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg">No log found for today</p>
            {!readOnlyMode ? (
              <p className="text-sm mt-1">Return to the dashboard to create a new log</p>
            ) : (
              <p className="text-sm mt-1">No log has been created for today yet. Please check back later.</p>
            )}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // Main content - shown to all users with a valid role
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{todayLog.date} - Daily Activity Log</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {todayLog.station} • {todayLog.shift} Shift
                  {readOnlyMode && (
                    <span className="ml-2 inline-flex items-center text-xs text-amber-500">
                      <Eye className="h-3 w-3 mr-1" /> View Only
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {todayLog.status !== 'complete' && !readOnlyMode && (
                <>
                  <button
                    onClick={() => setShowNewActivityForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Activity
                  </button>

                  {todayLog.activities && todayLog.activities.length > 0 && (
                    <button
                      onClick={() => setConfirmComplete(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Complete
                    </button>
                  )}
                </>
              )}

              {todayLog.status === 'complete' && (
                <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Display confirmation modal */}
        {confirmComplete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Confirm Complete</h3>
              <p className="mb-4">Are you sure you want to mark this log as complete? Once completed, it cannot be edited further.</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmComplete(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={completeLog}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daily Timeline */}
        {todayLog.activities && todayLog.activities.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Today's Timeline</h3>

              <div className="relative pl-8">
                {/* Time line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700"></div>

                {todayLog.activities.map((activity, index) => (
                  <div key={activity.id} className="mb-6 relative">
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
                          <div className="flex space-x-1">
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-2">
                              {activity.type}
                            </span>
                            {todayLog.status !== 'complete' && !readOnlyMode && (
                              <button
                                onClick={() => deleteActivity(activity.id)}
                                className="text-gray-400 hover:text-red-500 focus:outline-none p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
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
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 border-t pt-4 flex flex-col md:flex-row justify-between">
                <div className="md:w-1/2 mb-4 md:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Total Hours: {todayLog.totalHours}</h4>
                    {/* Show either "Unsaved changes" or success message */}
                    {unsavedChanges && !readOnlyMode && todayLog.status !== 'complete' && (
                      <span className="text-xs text-amber-500">Unsaved changes</span>
                    )}
                    {saveSuccess && (
                      <span className="text-xs text-green-500 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Notes saved successfully
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <textarea
                      placeholder="Captain's notes..."
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      value={localNotes}
                      onChange={handleNotesChange}
                      disabled={todayLog.status === 'complete' || readOnlyMode}
                      readOnly={readOnlyMode}
                    ></textarea>
                    <div className="flex justify-end mt-2 gap-2">
                      {unsavedChanges && !readOnlyMode && todayLog.status !== 'complete' && (
                        <button
                          onClick={saveNotes}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save Notes
                        </button>
                      )}
                      {/* {todayLog.status !== 'complete' && !readOnlyMode && (
                        <button
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                          title="Voice input"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      )} */}
                    </div>
                  </div>
                </div>

                <div className="md:w-1/2 md:pl-4">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Crew on Duty</h4>
                  <div className="flex flex-wrap gap-2">
                    {todayLog.crew && todayLog.crew.length > 0 ? (
                      todayLog.crew.map((member, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 dark:bg-gray-750 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                        >
                          {member}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                        No crew members assigned
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <Clipboard className="h-12 w-12 mx-auto mb-2" />
              <p className="text-lg">No activities logged for today</p>
              {!readOnlyMode ? (
                <p className="text-sm mt-1">Click the button below to add your first activity</p>
              ) : (
                <p className="text-sm mt-1">No activities have been added to the log yet. Please check back later.</p>
              )}
            </div>
            {todayLog.status !== 'complete' && !readOnlyMode && (
              <button
                onClick={() => setShowNewActivityForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Activity
              </button>
            )}
          </div>
        )}

        {/* New Activity Modal */}
        <NewActivityModal
          show={showNewActivityForm}
          onClose={() => setShowNewActivityForm(false)}
          onAddActivity={addNewActivity}
          darkMode={darkMode}
        />
      </div>
    </Layout>
  );
};

export default TodayLog;