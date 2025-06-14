// src/components/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { FirestoreContext } from '../App';
import {
    Calendar,
    Users,
    Truck,
    Clipboard,
    FileText,
    Building,
    FileSpreadsheet,
    User,
    ArrowLeft,
    PlusCircle,
    Edit3,
    Clock,
    AlertTriangle,
    Trash2,
    Eye,
    AlertCircle
} from 'lucide-react';
import Layout from './Layout';
import { getTodayFormattedPST, getCurrentDateWithWeekdayPST, getCurrentPSTDate } from '../utils/timezone';

const Dashboard = () => {
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

    // Initialize selectedStation from localStorage
    const [selectedStation, setSelectedStation] = useState(() => {
        return localStorage.getItem('selectedStation') || 'Station 1';
    });

    const [pastLogs, setPastLogs] = useState([]);
    
    // Helper function to check if user can manage logs (create/delete)
    const canManageLogs = (userProfile) => {
        return userProfile?.role === 'admin' || 
               ['Captain', 'Deputy Chief', 'Battalion Chief', 'Chief'].includes(userProfile?.rank);
    };

    const canCreateLogs = (userProfile) => {
        return userProfile?.role === 'admin' || userProfile?.role === 'firefighter' ||
               ['Captain', 'Deputy Chief', 'Battalion Chief', 'Chief'].includes(userProfile?.rank);
    };
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [logToDelete, setLogToDelete] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

                // Track dashboard view
                await firestoreOperations.trackUserActivity(user.uid, 'dashboard_view', {
                    station: selectedStation,
                    timestamp: new Date().toISOString()
                });

                // FIXED: Only set station from profile if user hasn't manually selected one
                // Check for localStorage first, and only use profile station as a fallback
                const savedStation = localStorage.getItem('selectedStation');
                if (!savedStation && profile && profile.station) {
                    handleStationChange(profile.station);
                } else if (savedStation) {
                    // Make sure state matches localStorage
                    setSelectedStation(savedStation);
                }

                // Fetch logs for the selected station using the most up-to-date station
                const stationToUse = savedStation || (profile && profile.station) || selectedStation;
                const logs = await firestoreOperations.getLogs(stationToUse);
                setPastLogs(logs);

            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [auth, firestoreOperations]); // Removed selectedStation from dependencies to prevent update loops

    // Create new log
    const createNewLog = () => {
        
        // Check if station is valid first
        if (selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') {
            // Show an error about no stations
            setError('Cannot create log: No stations are available. Please contact an administrator to set up stations.');
            return;
        }
        
        // Create today log immediately and then navigate to it
        const tryCreateLog = async () => {
            try {
                // Create new log for today using PST
                const formattedToday = getTodayFormattedPST();
                const today = new Date();

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
                    captain: auth.currentUser?.displayName || "Captain",
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
                    // Navigate to today's log after creation
                    navigate('/today');
                } else {
                    console.error("Dashboard: Failed to create log");
                    navigate('/today');
                }
            } catch (error) {
                console.error("Dashboard: Error creating log:", error);
                navigate('/today');
            }
        };

        tryCreateLog();
    };

    // Check if there's an active (draft) log for today
    const hasActiveLog = pastLogs.some(log => {
        const logDate = new Date(log.rawDate);
        const today = new Date();
        return (
            logDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0) &&
            log.station === selectedStation &&
            log.status === 'draft'
        );
    });

    // Get today's draft log if it exists
    const getTodayLog = () => {
        const today = new Date();
        return pastLogs.find(log => {
            const logDate = new Date(log.rawDate);
            return (
                logDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0) &&
                log.station === selectedStation &&
                log.status === 'draft'
            );
        });
    };

    // Continue editing today's log
    const continueToday = () => {
        // Navigate to today route without create parameter since log already exists
        navigate('/today');
    };
    
    // Delete log functions
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
            await firestoreOperations.deleteLog(logToDelete.id, {
                userEmail: auth.currentUser?.email,
                userDisplayName: userProfile?.firstName && userProfile?.lastName 
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : userProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown User',
                userId: auth.currentUser?.uid
            });

            // Update the logs list by filtering out the deleted log
            setPastLogs(pastLogs.filter(log => log.id !== logToDelete.id));

            // Close the confirmation modal
            setDeleteConfirmOpen(false);
            setLogToDelete(null);
        } catch (error) {
            console.error('Error deleting log:', error);
            setError('Failed to delete log. Please try again.');
        }
    };

    // Get statistics for dashboard
    const getStatistics = () => {
        // Total reports submitted this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const reportsThisWeek = pastLogs.filter(log =>
            new Date(log.rawDate) >= weekAgo &&
            log.status === 'complete'
        ).length;

        // Total hours logged this week
        const hoursThisWeek = pastLogs
            .filter(log => new Date(log.rawDate) >= weekAgo)
            .reduce((sum, log) => sum + parseFloat(log.totalHours), 0)
            .toFixed(1);

        // Training hours this week
        const trainingHoursThisWeek = pastLogs
            .filter(log => new Date(log.rawDate) >= weekAgo)
            .flatMap(log => log.activities)
            .filter(activity => activity && activity.type === 'TRAINING')
            .reduce((sum, activity) => sum + parseFloat(activity.hours || 0), 0)
            .toFixed(1);

        // Pending reports
        const pendingReports = pastLogs.filter(log => log.status === 'draft').length;

        return {
            reportsThisWeek,
            hoursThisWeek,
            trainingHoursThisWeek,
            pendingReports
        };
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

    // Get dashboard statistics
    const stats = getStatistics();

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
                {/* Welcome Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Welcome, {userProfile?.displayName || auth.currentUser?.displayName || 'Captain'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                {getCurrentDateWithWeekdayPST()} • {selectedStation}
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                            {/* Only show "Start New Log" button for users who can create logs if no active log exists and stations exist */}
                            {!hasActiveLog && canCreateLogs(userProfile) && 
                             !(selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') && (
                                <button
                                    onClick={createNewLog}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                    <PlusCircle className="h-4 w-4 mr-1" />
                                    Start New Log
                                </button>
                            )}
                            
                            {/* Show a warning if no stations are available */}
                            {(selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') && (
                                <div className="inline-flex items-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 text-sm font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                                    <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500 dark:text-yellow-400" />
                                    No Stations Available
                                </div>
                            )}
                            <button
                                onClick={() => navigate('/reports')}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                <FileText className="h-4 w-4 mr-1" />
                                View Past Logs
                            </button>
                            {/* Show a button to navigate to today's log when one exists */}
                            {hasActiveLog && (
                                <button
                                    onClick={() => navigate('/today')}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <FileText className="h-4 w-4 mr-1" />
                                    View Today's Log
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 mr-4">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reports This Week</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.reportsThisWeek}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 mr-4">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hours Logged</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.hoursThisWeek}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mr-4">
                                <Clipboard className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Training Hours</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.trainingHoursThisWeek}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 mr-4">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Reports</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.pendingReports}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Your Logs */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Your Logs</h3>
                            <button
                                onClick={() => navigate('/reports')}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                                View All
                            </button>
                        </div>

                        {/* Desktop view */}
                        <div className="hidden sm:block">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {pastLogs
                                    .filter(log => log.station === selectedStation)
                                    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
                                    .slice(0, 5)
                                    .map((log) => (
                                        <div key={log.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750">
                                            <div className="flex items-center">
                                                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3 flex-shrink-0">
                                                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{log.date}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {log.totalHours} hours • {log.activities ? log.activities.length : 0} activities
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium mr-3 ${log.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                                                    }`}>
                                                    {log.status === 'complete' ? 'Complete' : 'Draft'}
                                                </span>
                                                {log.status === 'draft' ? (
                                                    <div className="flex space-x-3">
                                                        {canManageLogs(userProfile) && (
                                                            <button
                                                                onClick={() => confirmDeleteLog(log)}
                                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm flex items-center px-2 py-1"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1" />
                                                                Delete
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => navigate(`/report/${log.id}`)}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center px-2 py-1"
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/report/${log.id}`)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center px-2 py-1"
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Mobile view */}
                        <div className="sm:hidden">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {pastLogs
                                    .filter(log => log.station === selectedStation)
                                    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
                                    .slice(0, 5)
                                    .map((log) => (
                                        <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                                            <div className="flex items-center mb-2">
                                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white">{log.date}</h4>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {log.totalHours} hours • {log.activities ? log.activities.length : 0} activities
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center py-1">
                                                <div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                                                        }`}>
                                                        {log.status === 'complete' ? 'Complete' : 'Draft'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex justify-end space-x-3">
                                                {log.status === 'draft' ? (
                                                    <>
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

                        {pastLogs.filter(log => log.station === selectedStation).length === 0 && (
                            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                                No logs found for this station.
                            </div>
                        )}
                    </div>

                    {/* Activity by Category */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold">Activity by Category</h3>
                        </div>
                        <div className="p-6">
                            {/* Activity Category Breakdown */}
                            {(() => {
                                // Calculate total hours by category for this station
                                const categories = {};
                                pastLogs
                                    .filter(log => log.station === selectedStation)
                                    .flatMap(log => (log.activities || []))
                                    .forEach(activity => {
                                        if (!activity) return;
                                        if (!categories[activity.type]) categories[activity.type] = 0;
                                        categories[activity.type] += parseFloat(activity.hours || 0);
                                    });

                                // Calculate total hours
                                const totalHours = Object.values(categories).reduce((sum, hours) => sum + hours, 0);

                                // Format categories for display
                                const formattedCategories = Object.entries(categories)
                                    .sort((a, b) => b[1] - a[1]) // Sort by hours (descending)
                                    .map(([category, hours]) => ({
                                        category,
                                        hours: hours.toFixed(1),
                                        percentage: totalHours > 0 ? ((hours / totalHours) * 100).toFixed(0) : 0
                                    }));

                                if (formattedCategories.length === 0) {
                                    return (
                                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                            No activity data available.
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {formattedCategories.map(item => (
                                            <div key={item.category}>
                                                <div className="flex justify-between mb-1">
                                                    <div className="flex items-center">
                                                        <div className={`w-4 h-4 rounded-sm bg-${item.category === 'ADMIN' ? 'blue' :
                                                            item.category === 'MAINTENANCE' ? 'green' :
                                                                item.category === 'MEDICAL' ? 'red' :
                                                                    item.category === 'OPERATIONS' ? 'purple' :
                                                                        item.category === 'PR' ? 'yellow' :
                                                                            item.category === 'PREV' ? 'orange' :
                                                                                item.category === 'TRAINING' ? 'indigo' :
                                                                                    item.category === 'UNION' ? 'pink' :
                                                                                        'gray'}-500 mr-2`}></div>
                                                        <span className="text-sm font-medium">{item.category}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{item.hours} hrs</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className={`bg-${item.category === 'ADMIN' ? 'blue' :
                                                            item.category === 'MAINTENANCE' ? 'green' :
                                                                item.category === 'MEDICAL' ? 'red' :
                                                                    item.category === 'OPERATIONS' ? 'purple' :
                                                                        item.category === 'PR' ? 'yellow' :
                                                                            item.category === 'PREV' ? 'orange' :
                                                                                item.category === 'TRAINING' ? 'indigo' :
                                                                                    item.category === 'UNION' ? 'pink' :
                                                                                        'gray'}-500 h-2 rounded-full`}
                                                        style={{ width: `${item.percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Only show "New Log" button for users who can create logs when no active log exists and stations exist */}
                        {!hasActiveLog && canCreateLogs(userProfile) && 
                         !(selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') && (
                            <button
                                onClick={createNewLog}
                                className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <PlusCircle className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                                <span className="text-sm font-medium">New Log</span>
                            </button>
                        )}
                        
                        {/* Show a disabled button when no stations exist */}
                        {!hasActiveLog && canCreateLogs(userProfile) && 
                         (selectedStation === 'No Stations Available' || selectedStation === 'Error Loading Stations') && (
                            <div className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed">
                                <PlusCircle className="h-8 w-8 mb-2" />
                                <span className="text-sm font-medium">New Log</span>
                                <span className="text-xs mt-1">No Stations</span>
                            </div>
                        )}

                        {/* Show a button to navigate to today's log when one exists */}
                        {hasActiveLog && (
                            <button
                                onClick={() => navigate('/today')}
                                className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                                <span className="text-sm font-medium">Today's Log</span>
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/reports')}
                            className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                            <FileText className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                            <span className="text-sm font-medium">All Reports</span>
                        </button>

                        <button
                            onClick={() => navigate('/gar-assessment')}
                            className="flex flex-col items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        >
                            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400 mb-2" />
                            <span className="text-sm font-medium">GAR Assessment</span>
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;