// src/components/Layout.js
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { FirestoreContext } from '../App';
import { formatDatePST } from '../utils/timezone';
import {
  Clipboard,
  Calendar,
  User,
  Home,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  AlertTriangle,
  Shield,
  HelpCircle
} from 'lucide-react';

const Layout = ({ children, darkMode, setDarkMode, selectedStation, setSelectedStation }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpReport, setHelpReport] = useState({
    type: 'bug',
    subject: '',
    description: '',
    page: '',
    priority: 'medium'
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // Fetch stations from Firestore and check admin status
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;
        
        // Get user profile for admin check
        const userProfile = await firestoreOperations.getUserProfile(user.uid);
        setIsAdmin(userProfile?.role === 'admin');
        
        // Fetch stations from Firestore
        const stationsData = await firestoreOperations.getStations();
        if (stationsData && stationsData.length > 0) {
          // Format station names for the dropdown
          const stationNames = stationsData.map(station => 
            `Station ${station.number || station.id.replace('s', '')}`
          );
          
          setStations(stationNames);
          console.log("Fetched stations:", stationNames);
          
          // Check if the current selected station exists in our new list
          const currentStation = localStorage.getItem('selectedStation');
          const noStationsMarker = ['No Stations Available', 'Error Loading Stations'];
          
          // Only update selection if we have stations and current selection is invalid or a marker
          if (stationNames.length > 0 && 
              (!currentStation || 
               !stationNames.includes(currentStation) || 
               noStationsMarker.includes(currentStation))) {
            setSelectedStation(stationNames[0]);
            localStorage.setItem('selectedStation', stationNames[0]);
          }
        } else {
          // Clear stations if none found in Firestore
          console.log("No stations found in Firestore");
          setStations([]);
          const noStationMessage = 'No Stations Available';
          
          // Only update if the current value is not already the message
          if (selectedStation !== noStationMessage) {
            setSelectedStation(noStationMessage);
            localStorage.setItem('selectedStation', noStationMessage);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // No fallback, just show a message
        setStations([]);
        const errorMessage = 'Error Loading Stations';
        
        // Only update if the current value is not already the error message
        if (selectedStation !== errorMessage) {
          setSelectedStation(errorMessage);
          localStorage.setItem('selectedStation', errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [auth.currentUser, firestoreOperations]);  // Removed selectedStation dependency to prevent re-fetching loop
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark'); // For Tailwind dark mode
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark'); // For Tailwind dark mode
    }
    // Save to localStorage
    localStorage.setItem('darkMode', (!darkMode).toString());
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // Get current active path
  const isActivePath = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path === '/today' && location.pathname === '/today') return true;
    if (path === '/reports' && (location.pathname === '/reports' || location.pathname.startsWith('/report/'))) return true;
    if (path === '/gar-assessment' && location.pathname === '/gar-assessment') return true;
    if (path === '/admin' && location.pathname === '/admin') return true;
    return false;
  };

  // Handle help report submission
  const submitHelpReport = async () => {
    try {
      const reportData = {
        ...helpReport,
        page: location.pathname,
        submittedBy: auth.currentUser?.displayName || 'Unknown User',
        submittedByEmail: auth.currentUser?.email || 'Unknown Email',
        submittedByUid: auth.currentUser?.uid || 'Unknown UID',
        submittedAt: new Date().toISOString(),
        status: 'open',
        userAgent: navigator.userAgent,
        station: selectedStation
      };

      await firestoreOperations.createHelpReport(reportData);
      
      // Reset form and close modal
      setHelpReport({
        type: 'bug',
        subject: '',
        description: '',
        page: '',
        priority: 'medium'
      });
      setShowHelpModal(false);
      
      alert('Help report submitted successfully! Thank you for your feedback.');
    } catch (error) {
      console.error('Error submitting help report:', error);
      alert('Error submitting report. Please try again.');
    }
  };

  // Open help modal and set current page
  const openHelpModal = () => {
    setHelpReport(prev => ({
      ...prev,
      page: location.pathname
    }));
    setShowHelpModal(true);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark-mode bg-gray-900' : 'bg-gray-100'} flex flex-col`}>
      {/* Header - Increased height */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-blue-800'} text-white shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center">
              <Clipboard className="h-8 w-8 mr-2" />
              <h1 className="text-xl font-bold">Fire Department Daily Log</h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              {/* Station selector - hidden on GAR Assessment pages, disabled on Reports/Admin pages */}
              {(location.pathname === '/gar-assessment' || 
                location.pathname.startsWith('/gar-assessment/')) ? null : (
                location.pathname === '/reports' ||
                location.pathname.startsWith('/report/') ||
                location.pathname === '/admin' ||
                location.pathname.startsWith('/admin/') ||
                stations.length === 0 ? (
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-1 text-sm min-w-[120px] ${stations.length === 0 ? 'bg-opacity-60 dark:bg-opacity-60' : 'opacity-50'}`}>
                    {location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? 
                      'All Stations' : 
                      stations.length === 0 ?
                      (selectedStation === 'Error Loading Stations' ? 
                        <span className="text-red-300">Error Loading</span> : 'No Stations') :
                      selectedStation}
                  </div>
                ) : (
                  <select
                    className={`${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-1 text-sm border-none focus:ring-2 focus:ring-blue-400 min-w-[120px]`}
                    value={selectedStation}
                    onChange={(e) => {
                      setSelectedStation(e.target.value);
                      localStorage.setItem('selectedStation', e.target.value);
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <option>Loading...</option>
                    ) : stations.length > 0 ? (
                      stations.map(station => (
                        <option key={station} value={station}>{station}</option>
                      ))
                    ) : (
                      <option value={selectedStation}>{selectedStation}</option>
                    )}
                  </select>
                )
              )}
              
              <div className="text-sm flex items-center whitespace-nowrap">
                <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>
                  {formatDatePST(new Date(), {
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-700'} rounded-full p-2 flex items-center whitespace-nowrap`}>
                <User className="w-5 h-5 flex-shrink-0" />
                <span className="ml-2 mr-1 hidden lg:inline text-ellipsis overflow-hidden max-w-[120px]">
                  {auth.currentUser?.displayName || 'Captain'}
                </span>
              </div>
              
              <button
                onClick={openHelpModal}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'} flex-shrink-0`}
                aria-label="Help & Bug Report"
                title="Help & Bug Report"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'} flex-shrink-0`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button
                onClick={handleLogout}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'} flex items-center flex-shrink-0`}
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-1 hidden xl:inline">Logout</span>
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'}`}
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden">
            <div className={`px-2 pt-2 pb-3 space-y-1 shadow-inner ${darkMode ? 'bg-gray-800' : 'bg-blue-800'}`}>
              <div className="flex items-center mb-2 text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDatePST(new Date(), {
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              
              <div className="flex items-center mb-3">
                <User className="w-4 h-4 mr-1" />
                <span>{auth.currentUser?.displayName || 'Captain'}</span>
              </div>
              
              {/* Mobile station selector - hidden on GAR Assessment pages, disabled on Reports/Admin pages */}
              {(location.pathname === '/gar-assessment' || 
                location.pathname.startsWith('/gar-assessment/')) ? null : (
                location.pathname === '/reports' ||
                location.pathname.startsWith('/report/') ||
                location.pathname === '/admin' ||
                location.pathname.startsWith('/admin/') || 
                stations.length === 0 ? (
                  <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-2 text-sm mb-2 ${stations.length === 0 ? 'bg-opacity-60 dark:bg-opacity-60' : 'opacity-50'} flex items-center`}>
                    <span>Station: </span>
                    <span className="ml-2 font-medium">
                      {location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? 
                        'All Stations' : 
                        stations.length === 0 ?
                        (selectedStation === 'Error Loading Stations' ? 
                          <span className="text-red-300">Error Loading</span> : 'No Stations') :
                        selectedStation}
                    </span>
                  </div>
                ) : (
                  <select
                    className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-2 text-sm border-none focus:ring-2 focus:ring-blue-400 mb-2`}
                    value={selectedStation}
                    onChange={(e) => {
                      setSelectedStation(e.target.value);
                      localStorage.setItem('selectedStation', e.target.value);
                      setMenuOpen(false);
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <option>Loading...</option>
                    ) : stations.length > 0 ? (
                      stations.map(station => (
                        <option key={station} value={station}>{station}</option>
                      ))
                    ) : (
                      <option value={selectedStation}>{selectedStation}</option>
                    )}
                  </select>
                )
              )}
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    openHelpModal();
                    setMenuOpen(false);
                  }}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'}`}
                >
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Help & Bug Report
                </button>
                
                <button
                  onClick={toggleDarkMode}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'}`}
                >
                  {darkMode ? <Sun className="h-5 w-5 mr-2" /> : <Moon className="h-5 w-5 mr-2" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-700'}`}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Navigation */}
      <nav className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 items-center h-14">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/dashboard') 
                  ? `${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
              }`}
            >
              <Home className="h-4 w-4 inline mr-1" />
              Dashboard
            </Link>
            <Link
              to="/today"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/today') 
                  ? `${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
              }`}
            >
              Today's Log
            </Link>
            <Link
              to="/reports"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/reports')
                  ? `${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
              }`}
            >
              Past Logs
            </Link>
            <a
              href="/gar-assessment"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/gar-assessment')
                  ? `${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              GAR Assessment
            </a>
            
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActivePath('/admin')
                    ? `${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`
                    : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                }`}
              >
                <Shield className="h-4 w-4 inline mr-1" />
                Admin Portal
              </Link>
            )}
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Help & Bug Report Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Help & Bug Report</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Report Type
                </label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={helpReport.type}
                  onChange={(e) => setHelpReport(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="help">Need Help</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={helpReport.priority}
                  onChange={(e) => setHelpReport(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of the issue or request"
                  value={helpReport.subject}
                  onChange={(e) => setHelpReport(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="4"
                  placeholder="Please provide detailed information about the issue, what you expected to happen, and steps to reproduce (if applicable)"
                  value={helpReport.description}
                  onChange={(e) => setHelpReport(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Current Page:</strong> {location.pathname}</p>
                  <p><strong>Station:</strong> {selectedStation}</p>
                  <p><strong>User:</strong> {auth.currentUser?.displayName || 'Unknown'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={submitHelpReport}
                disabled={!helpReport.subject.trim() || !helpReport.description.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;