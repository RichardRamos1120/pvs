// src/components/TodayLog.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getTodayFormattedPST, formatTimeRangePST } from '../utils/timezone';
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
  Save,
  AlertTriangle
} from 'lucide-react';
import NewActivityModal from './NewActivityModal.jsx';

const TodayLog = () => {
  // First get the React Router hooks to have access to location
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const db = getFirestore();

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

  // Get navigation data once to avoid re-renders
  const initialFromStation = location.state?.fromStation;
  const initialLogId = location.state?.logId;

  // Initialize selectedStation from localStorage or from navigation state
  const [selectedStation, setSelectedStation] = useState(() => {
    // If we're navigating from another component with a specific station, use that
    if (initialFromStation) {
      // Update localStorage to match the station we're navigating from
      localStorage.setItem('selectedStation', initialFromStation);
      return initialFromStation;
    }

    // Otherwise use the localStorage value or default
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
  // States for crew management
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [availableFirefighters, setAvailableFirefighters] = useState([]); // Now includes all users (firefighters, admins, etc.)
  const [filteredFirefighters, setFilteredFirefighters] = useState([]); // Now includes all users
  const [selectedCrew, setSelectedCrew] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
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
    // Only reset if we're actually changing stations
    if (station !== selectedStation) {
      // Clear the current log when changing stations
      setTodayLog(null);
      // Reset noLogExists flag
      setNoLogExists(false);
      // Reset the logChecked state for the new station
      const today = new Date();
      const dateKey = today.toISOString().split('T')[0];
      const stationDateKey = `${station}-${dateKey}`;
      setLogChecked(prev => {
        const newState = {...prev};
        // Remove the new station from checked logs so it will be fetched again
        delete newState[stationDateKey];
        return newState;
      });
      // Set loading to true to show loading indicator
      setLoading(true);
      // Set the new station
      setSelectedStation(station);
      localStorage.setItem('selectedStation', station);
    }
  };

  // Check if user has permission to edit logs
  const hasEditPermission = userRole === 'admin' || userRole === 'firefighter';

  // Function to create a new log for today
  const createNewLog = async () => {
    try {
      // Check if we have a valid station
      if (selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') {
        setError('Cannot create log: No stations are available. Please contact an administrator to set up stations.');
        return;
      }
      
      setLoading(true);

      // Get today's date in PST
      const formattedToday = getTodayFormattedPST();
      const today = new Date();

      const newLog = {
        date: formattedToday,
        rawDate: today.toISOString(),
        station: selectedStation,
        shift: "B",
        crew: [],
        crewIds: [],
        activities: [],
        totalHours: "0.0",
        status: 'draft',
        notes: "",
        createdBy: auth.currentUser?.uid || null,
        createdByName: auth.currentUser?.displayName || "Unknown"
      };

      console.log("Creating new log with data:", newLog);
      const createdLog = await firestoreOperations.createLog(newLog);

      if (createdLog) {
        console.log("Log created successfully:", createdLog);
        setTodayLog(createdLog);
        setNoLogExists(false);
      } else {
        throw new Error("Failed to create log");
      }
    } catch (error) {
      console.error("Error creating log:", error);
      setError(error.message || "Failed to create log");
    } finally {
      setLoading(false);
    }
  };

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
            if (userData.role === 'admin' || userData.role === 'firefighter') {
              console.log("User has edit permission with role:", userData.role);
              setReadOnlyMode(false);
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
      // Initialize selected crew from todayLog - convert names to IDs if needed
      setSelectedCrew(todayLog.crewIds || []);
    }
  }, [todayLog]);

  // Load firefighters when crew modal is opened
  useEffect(() => {
    if (showCrewModal) {
      const fetchFirefighters = async () => {
        try {
          // Get ALL users regardless of role (firefighters, admins, etc.)
          const allUsers = await firestoreOperations.getAllUsers();
          setAvailableFirefighters(allUsers);
          setFilteredFirefighters(allUsers);
          
          // If we have existing crew but no crewIds (backwards compatibility),
          // try to convert crew names to IDs
          if (todayLog && todayLog.crew && todayLog.crew.length > 0 && (!todayLog.crewIds || todayLog.crewIds.length === 0)) {
            const matchedIds = [];
            todayLog.crew.forEach(crewName => {
              const user = allUsers.find(f => 
                (f.displayName && f.displayName === crewName) ||
                (f.firstName && f.lastName && `${f.firstName} ${f.lastName}` === crewName) ||
                (f.firstName && f.firstName === crewName)
              );
              if (user) {
                matchedIds.push(user.id);
              }
            });
            setSelectedCrew(matchedIds);
          }
        } catch (error) {
          console.error("Error fetching users for crew selection:", error);
        }
      };

      fetchFirefighters();
    }
  }, [showCrewModal, firestoreOperations, todayLog]);

  // Filter firefighters based on search term and station filter
  useEffect(() => {
    if (!availableFirefighters.length) return;

    let filtered = [...availableFirefighters];

    // Apply station filter if not 'all'
    if (stationFilter !== 'all') {
      filtered = filtered.filter(f => f.station === stationFilter);
    }

    // Apply search term filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(f => {
        const displayName = f.displayName || f.firstName || 'Unknown User';
        const fullName = f.firstName && f.lastName ? `${f.firstName} ${f.lastName}` : displayName;
        return displayName.toLowerCase().includes(search) ||
               fullName.toLowerCase().includes(search) ||
               f.email?.toLowerCase().includes(search) ||
               f.firstName?.toLowerCase().includes(search) ||
               f.lastName?.toLowerCase().includes(search);
      });
    }

    setFilteredFirefighters(filtered);
  }, [availableFirefighters, searchTerm, stationFilter]);

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

  // Add state to track if we've already checked for logs for this station-day combination
  const [logChecked, setLogChecked] = useState({});
  // Add state to track if no log exists for today
  const [noLogExists, setNoLogExists] = useState(false);

  // Track if we've already handled a specific log ID
  const [handledLogId, setHandledLogId] = useState(null);

  // Load logs after user check is complete
  useEffect(() => {
    if (!userChecked || userRole === null) {
      return;
    }

    // Create a unique key for this station and day
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    const stationDateKey = `${selectedStation}-${dateKey}`;

    // Use the initialLogId that was captured once during component initialization
    const logId = initialLogId;

    // If we have already handled this specific log ID, don't fetch it again
    if (logId && handledLogId === logId && todayLog) {
      console.log("Already handled this specific log ID:", logId);
      return;
    }

    // If we're just checking for today's logs (no specific logId)
    // and we've already checked this station/date combination, don't check again
    if (!logId && logChecked[stationDateKey] && (todayLog || noLogExists)) {
      console.log("Already checked for logs for this station and date:", stationDateKey);
      return;
    }

    const fetchTodayLogs = async () => {
      try {
        // Only set loading to true if we're not already loading
        if (!loading) {
          setLoading(true);
        }

        setNoLogExists(false); // Reset the no log exists state
        setError(''); // Clear any previous errors

        // Use the logId we defined earlier
        if (logId) {
          // If we have a specific log ID, load that log directly
          console.log("Fetching specific log with ID:", logId);

          const specificLog = await firestoreOperations.getLog(logId);

          if (specificLog) {
            console.log("Found specific log:", specificLog);

            // Set the log
            setTodayLog(specificLog);

            // Record that we've handled this log ID
            setHandledLogId(logId);

            // Mark this station-date as checked
            const stationDateKey = `${specificLog.station}-${dateKey}`;
            setLogChecked(prev => ({...prev, [stationDateKey]: true}));

            // Clear navigation state to prevent further processing
            if (window.history.replaceState) {
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );
            }

            // Ensure loading is set to false
            setLoading(false);
            return; // Exit early since we found the specific log
          } else {
            console.log("Specific log not found, will try to find today's log");
            // If the specific log is not found, continue with normal flow
          }
        }

        // If no specific log ID or it wasn't found, look for today's log
        // Get today's date range (start and end of day)
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

        // Mark that we've checked for logs for this station-date combination
        setLogChecked(prev => ({...prev, [stationDateKey]: true}));

        if (logs && logs.length > 0) {
          // Use the first log found (should usually be only one per day per station)
          setTodayLog(logs[0]);
          console.log("Found existing log:", logs[0]);
        } else {
          // Instead of automatically creating a log, we'll set the state to show a create button
          console.log("No log found for today");
          setTodayLog(null);
          setNoLogExists(true);

          if (!hasEditPermission) {
            console.log("User doesn't have permission to create a log");
            setError("No activity log exists for today. Please contact a Captain or administrator to create a new log.");
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
  }, [userChecked, userRole, selectedStation, firestoreOperations, auth.currentUser, hasEditPermission, logChecked, todayLog, noLogExists, handledLogId, loading, initialLogId]);

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

  // Format time for display (using PST)
  const formatTimeRange = (start, end) => {
    return formatTimeRangePST(start, end);
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

      // Add user information to the activity
      const activityWithUser = {
        ...activity,
        addedBy: auth.currentUser?.uid || null,
        addedByName: auth.currentUser?.displayName || "Unknown",
        addedAt: new Date().toISOString()
      };

      // Make a copy of existing activities or initialize if null/undefined
      const existingActivities = todayLog.activities || [];
      const updatedActivities = [...existingActivities, activityWithUser];

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

  // Update crew members
  const updateCrew = async (crewIds) => {
    // Check permission before allowing edit
    if (readOnlyMode) {
      setError("You don't have permission to update crew");
      return;
    }

    if (!todayLog) return;

    try {
      console.log("Updating crew members");
      
      // Convert crew IDs to names for display
      const crewNames = crewIds.map(id => {
        const user = availableFirefighters.find(f => f.id === id);
        return user ? 
          (user.displayName || user.firstName || 'Unknown User') + 
          (user.lastName ? ` ${user.lastName}` : '') 
          : 'Unknown User';
      });

      const updatedLog = {
        ...todayLog,
        crew: crewNames, // For display purposes
        crewIds: crewIds // For selection tracking
      };

      // Update in Firestore
      await firestoreOperations.updateLog(todayLog.id, updatedLog);

      // Update local state
      setTodayLog(updatedLog);
      console.log("Crew updated successfully");

      // Close the modal
      setShowCrewModal(false);

      // Show success notification
      setSaveSuccess(true);
    } catch (error) {
      console.error("Error updating crew:", error);
      setError("Failed to update crew: " + error.message);
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
    // Check if we have a no stations case
    const noStations = selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations';
    
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <Clipboard className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg">No log found for today</p>
            {noStations ? (
              <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md inline-block mx-auto text-left">
                <div className="flex items-start">
                  <AlertTriangle className="text-yellow-500 dark:text-yellow-400 w-5 h-5 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No Stations Available</h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                      Cannot create logs because no fire stations have been set up in the system.
                      Please contact an administrator to set up stations before creating logs.
                    </p>
                  </div>
                </div>
              </div>
            ) : !readOnlyMode ? (
              <p className="text-sm mt-1">Would you like to create a new log for today?</p>
            ) : (
              <p className="text-sm mt-1">No log has been created for today yet. Please check back later.</p>
            )}
          </div>
          <div className="flex justify-center space-x-4">
            {!readOnlyMode && hasEditPermission && noLogExists && !noStations && (
              <button
                onClick={createNewLog}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Today's Log
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </button>
          </div>
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
                          
                          {/* Display who added this activity */}
                          {activity.addedByName && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                              Added by {activity.addedByName}
                              {activity.station && activity.station !== todayLog.station && (
                                <span className="ml-2">• For {activity.station}</span>
                              )}
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
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Crew on Duty</h4>
                    {todayLog.status !== 'complete' && !readOnlyMode && (
                      <button
                        onClick={() => setShowCrewModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Edit Crew
                      </button>
                    )}
                  </div>
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
          currentStation={selectedStation}
        />

        {/* Crew Selection Modal */}
        {showCrewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select Crew on Duty</h2>
                <button
                  onClick={() => setShowCrewModal(false)}
                  className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select the firefighters that are on duty today.
                </p>

                {/* Search and filter area */}
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  {/* Search input */}
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Station filter dropdown */}
                  <div className="w-full sm:w-auto">
                    <select
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 sm:text-sm"
                      value={stationFilter}
                      onChange={(e) => setStationFilter(e.target.value)}
                    >
                      <option value="all">All Stations</option>
                      <option value={selectedStation}>Current Station ({selectedStation})</option>
                      <option value="Station 1">Station 1</option>
                      <option value="Station 4">Station 4</option>
                      <option value="Station 7">Station 7</option>
                      <option value="Station 10">Station 10</option>
                      <option value="Station 11">Station 11</option>
                      <option value="Station 14">Station 14</option>
                      <option value="Station 23">Station 23</option>
                    </select>
                  </div>
                </div>

                {availableFirefighters.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No firefighters found</h3>
                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                          <p>
                            No users with the firefighter role found in the system.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : filteredFirefighters.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No matches found</h3>
                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                          <p>
                            No firefighters match your search criteria. Try adjusting your filters.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                      {filteredFirefighters.map((firefighter) => (
                        <div
                          key={firefighter.id}
                          className={`flex items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 ${
                            selectedCrew.includes(firefighter.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`firefighter-${firefighter.id}`}
                            checked={selectedCrew.includes(firefighter.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCrew([...selectedCrew, firefighter.id]);
                              } else {
                                setSelectedCrew(selectedCrew.filter(id => id !== firefighter.id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`firefighter-${firefighter.id}`}
                            className="ml-3 block text-gray-900 dark:text-white cursor-pointer w-full"
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                              <div>
                                <div className="font-medium">
                                  {firefighter.displayName || firefighter.firstName || 'Unknown User'}
                                  {firefighter.lastName && ` ${firefighter.lastName}`}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {firefighter.email || 'No email'}
                                </p>
                                {firefighter.rank && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {firefighter.rank}
                                  </p>
                                )}
                              </div>
                              {firefighter.station && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 sm:mt-0">
                                  {firefighter.station}
                                </span>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCrewModal(false)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${
                      darkMode
                        ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateCrew(selectedCrew)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save Crew
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TodayLog;