// src/components/Layout.js
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { 
  Clipboard, 
  Calendar, 
  User, 
  Home,
  LogOut,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';

const Layout = ({ children, darkMode, setDarkMode, selectedStation, setSelectedStation }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  
  // List of stations (this could be fetched from Firestore)
  const stations = ['Station 1', 'Station 4', 'Station 7', 'Station 10', 'Station 11', 'Station 14', 'Station 23'];
  
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
              {/* Station selector - disabled on Reports pages */}
              {location.pathname === '/reports' || location.pathname.startsWith('/report/') ? (
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-1 text-sm min-w-[120px] opacity-50`}>
                  {selectedStation}
                </div>
              ) : (
                <select
                  className={`${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-1 text-sm border-none focus:ring-2 focus:ring-blue-400 min-w-[120px]`}
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                >
                  {stations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              )}
              
              <div className="text-sm flex items-center whitespace-nowrap">
                <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>
                  {new Date().toLocaleDateString('en-US', {
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
            <div className={`px-2 pt-2 pb-3 space-y-1 shadow-inner ${darkMode ? 'bg-gray-800' : 'bg-blue-800'}`}>
              <div className="flex items-center mb-2 text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date().toLocaleDateString('en-US', {
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
              
              {/* Mobile station selector - disabled on Reports pages */}
              {location.pathname === '/reports' || location.pathname.startsWith('/report/') ? (
                <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-2 text-sm mb-2 opacity-50 flex items-center`}>
                  <span>Station: </span>
                  <span className="ml-2 font-medium">{selectedStation}</span>
                </div>
              ) : (
                <select
                  className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-blue-700'} text-white rounded-md px-3 py-2 text-sm border-none focus:ring-2 focus:ring-blue-400 mb-2`}
                  value={selectedStation}
                  onChange={(e) => {
                    setSelectedStation(e.target.value);
                    setMenuOpen(false);
                  }}
                >
                  {stations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              )}
              
              <div className="flex flex-col space-y-2">
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
              Past Reports
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;