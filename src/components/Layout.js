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
  Shield
} from 'lucide-react';
import HelpChat from './HelpChat';

const Layout = ({ children, darkMode, setDarkMode, selectedStation, setSelectedStation }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  
  // Sync document classes with dark mode state
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
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
                    className={`${darkMode ? 'bg-gray-700 text-white' : 'bg-blue-700 text-white'} rounded-md px-3 py-1 text-sm border-none focus:ring-2 focus:ring-blue-400 min-w-[120px]`}
                    style={{
                      color: 'white',
                      backgroundColor: darkMode ? '#374151' : '#1d4ed8'
                    }}
                    value={selectedStation}
                    onChange={(e) => {
                      localStorage.setItem('selectedStation', e.target.value);
                      window.location.reload();
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <option style={{ color: darkMode ? 'white' : 'black', backgroundColor: darkMode ? '#374151' : 'white' }}>Loading...</option>
                    ) : stations.length > 0 ? (
                      stations.map(station => (
                        <option 
                          key={station} 
                          value={station}
                          style={{ color: darkMode ? 'white' : 'black', backgroundColor: darkMode ? '#374151' : 'white' }}
                        >
                          {station}
                        </option>
                      ))
                    ) : (
                      <option 
                        value={selectedStation}
                        style={{ color: darkMode ? 'white' : 'black', backgroundColor: darkMode ? '#374151' : 'white' }}
                      >
                        {selectedStation}
                      </option>
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
            <div className={`px-4 pt-4 pb-6 space-y-4 shadow-lg ${darkMode ? 'bg-gray-900' : 'bg-blue-900'}`}>
              {/* User Info Section */}
              <div className="border-b border-opacity-20 pb-4 space-y-3" style={{ borderColor: darkMode ? '#6B7280' : '#93C5FD' }}>
                <div className="flex items-center text-sm text-white">
                  <Calendar className="w-5 h-5 mr-3 opacity-80" />
                  <span className="font-medium">
                    {formatDatePST(new Date(), {
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center text-white">
                  <User className="w-5 h-5 mr-3 opacity-80" />
                  <span className="font-semibold text-base">{auth.currentUser?.displayName || 'Captain'}</span>
                </div>
              </div>
              
              {/* Mobile station selector - hidden on GAR Assessment pages, disabled on Reports/Admin pages */}
              {(location.pathname === '/gar-assessment' || 
                location.pathname.startsWith('/gar-assessment/')) ? null : (
                location.pathname === '/reports' ||
                location.pathname.startsWith('/report/') ||
                location.pathname === '/admin' ||
                location.pathname.startsWith('/admin/') || 
                stations.length === 0 ? (
                  <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-blue-800'} text-white rounded-lg px-4 py-3 text-sm ${stations.length === 0 ? 'bg-opacity-60 dark:bg-opacity-60' : 'opacity-75'} flex items-center mb-4`}>
                    <span className="text-white text-opacity-80">Station: </span>
                    <span className="ml-2 font-semibold">
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
                    className={`w-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-blue-800 text-white'} rounded-lg px-4 py-3 text-base border-none focus:ring-2 focus:ring-blue-400 mb-4 font-medium`}
                    style={{
                      color: 'white',
                      backgroundColor: darkMode ? '#1F2937' : '#1e40af'
                    }}
                    value={selectedStation}
                    onChange={(e) => {
                      localStorage.setItem('selectedStation', e.target.value);
                      window.location.reload();
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <option style={{ color: darkMode ? 'white' : 'black', backgroundColor: darkMode ? '#374151' : 'white' }}>Loading...</option>
                    ) : stations.length > 0 ? (
                      stations.map(station => (
                        <option 
                          key={station} 
                          value={station}
                          style={{ color: darkMode ? 'white' : 'black', backgroundColor: darkMode ? '#374151' : 'white' }}
                        >
                          {station}
                        </option>
                      ))
                    ) : (
                      <option 
                        value={selectedStation}
                        style={{ color: darkMode ? 'white' : 'black', backgroundColor: darkMode ? '#374151' : 'white' }}
                      >
                        {selectedStation}
                      </option>
                    )}
                  </select>
                )
              )}
              
              {/* Navigation Links Section */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-white text-opacity-60 uppercase tracking-wider mb-3 px-1">
                  Navigation
                </div>
                
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActivePath('/dashboard') 
                      ? `${darkMode ? 'bg-blue-800' : 'bg-blue-700'} text-white hover:text-white shadow-lg`
                      : `text-white hover:text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`
                  }`}
                >
                  <Home className="h-6 w-6 mr-4" />
                  <span>Dashboard</span>
                </Link>
                
                <Link
                  to="/today"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActivePath('/today') 
                      ? `${darkMode ? 'bg-blue-800' : 'bg-blue-700'} text-white hover:text-white shadow-lg`
                      : `text-white hover:text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`
                  }`}
                >
                  <Clipboard className="h-6 w-6 mr-4" />
                  <span>Today's Log</span>
                </Link>
                
                <Link
                  to="/reports"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActivePath('/reports')
                      ? `${darkMode ? 'bg-blue-800' : 'bg-blue-700'} text-white hover:text-white shadow-lg`
                      : `text-white hover:text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`
                  }`}
                >
                  <Calendar className="h-6 w-6 mr-4" />
                  <span>Past Logs</span>
                </Link>
                
                <a
                  href="/gar-assessment"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActivePath('/gar-assessment')
                      ? `${darkMode ? 'bg-blue-800' : 'bg-blue-700'} text-white hover:text-white shadow-lg`
                      : `text-white hover:text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`
                  }`}
                >
                  <AlertTriangle className="h-6 w-6 mr-4" />
                  <span>GAR Assessment</span>
                </a>
                
                {isAdmin && (
                  <a
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActivePath('/admin')
                        ? `${darkMode ? 'bg-blue-800' : 'bg-blue-700'} text-white hover:text-white shadow-lg`
                        : `text-white hover:text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`
                    }`}
                  >
                    <Shield className="h-6 w-6 mr-4" />
                    <span>Admin Portal</span>
                  </a>
                )}
              </div>
              
              {/* Settings Section */}
              <div className="border-t border-opacity-20 pt-4 space-y-1" style={{ borderColor: darkMode ? '#6B7280' : '#93C5FD' }}>
                <div className="text-xs font-semibold text-white text-opacity-60 uppercase tracking-wider mb-3 px-1">
                  Settings
                </div>
                
                <button
                  onClick={toggleDarkMode}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`}
                >
                  {darkMode ? <Sun className="h-6 w-6 mr-4" /> : <Moon className="h-6 w-6 mr-4" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 text-white ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-700'}`}
                >
                  <LogOut className="h-6 w-6 mr-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Navigation - Hidden on mobile */}
      <nav className={`hidden md:block ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
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
              <a
                href="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActivePath('/admin')
                    ? `${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`
                    : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                }`}
              >
                <Shield className="h-4 w-4 inline mr-1" />
                Admin Portal
              </a>
            )}
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className={`flex-1 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Floating Help Chat - Only render when not on admin portal */}
      {location.pathname !== '/admin' && !location.pathname.startsWith('/admin/') && (
        <HelpChat darkMode={darkMode} />
      )}
    </div>
  );
};

export default Layout;