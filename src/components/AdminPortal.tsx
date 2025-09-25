// src/components/AdminPortal.jsx
import React, { useState, useEffect, useLayoutEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import UserModal from './modals/UserModal';
import StationModal from './modals/StationModal';
import Pagination from './Pagination';
import { 
  downloadCSV, 
  formatUserDataForExport, 
  formatStationDataForExport, 
  formatGARDataForExport, 
  formatLogDataForExport,
  formatActivityDataForExport
} from '../utils/csvExport';
import {
  Users,
  Building2,
  Search,
  Filter,
  Download,
  UserPlus,
  Building,
  Trash,
  Edit,
  User,
  Activity,
  FileBarChart,
  FileText,
  AlertTriangle,
  MapPin,
  Phone,
  CheckCircle,
  Eye,
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Send,
  Bot,
  Clock
} from 'lucide-react';
import { formatDatePST, formatDateTimePST } from '../utils/timezone';

// REMOVED - Old HelpChats component - Using the one inside AdminPortal instead

const AdminPortal = ({ darkMode, setDarkMode, selectedStation, setSelectedStation }) => {
  // Initialize adminActiveSection from localStorage with default to 'overview'
  const [adminActiveSection, setAdminActiveSection] = useState(() => {
    return localStorage.getItem('adminActiveSection') || 'overview';
  });
  
  // Helper function to update admin section and persist to localStorage
  const updateAdminSection = (section) => {
    setAdminActiveSection(section);
    localStorage.setItem('adminActiveSection', section);
  };
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedStationData, setSelectedStationData] = useState(null);
  // We'll move searchTerm to individual components for better state isolation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]); // Paginated stations for display
  const [allStations, setAllStations] = useState([]); // All stations for dropdowns
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '', visible: false });
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null 
  });

  // Move user filter states to parent level to prevent resets  
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userRankFilter, setUserRankFilter] = useState('all');
  
  // Pagination state for users
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(5); // Show 5 users per page

  // Pagination state for stations
  const [currentStationPage, setCurrentStationPage] = useState(1);

  // Help Reports state
  const [totalStations, setTotalStations] = useState(0);
  const [stationsPerPage] = useState(5); // Show 5 stations per page
  const [totalUnreadHelpMessages, setTotalUnreadHelpMessages] = useState(0);

  const navigate = useNavigate();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);

  // Initial authentication and setup effect
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;

        if (!user) {
          throw new Error('Not authenticated');
        }

        // Get user profile
        const profile = await firestoreOperations.getUserProfile(user.uid);
        
        // Check if user is admin
        if (profile && profile.role !== 'admin') {
          setError('You do not have permission to access this page.');
          navigate('/dashboard');
          return;
        }

        // Fix any users missing required fields for filtering
        try {
          const fixResult = await firestoreOperations.fixUserFieldsForFiltering();
          if (fixResult.success && fixResult.fixedCount > 0) {
          }
        } catch (error) {
          console.error('Error fixing user fields:', error);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing component:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    initializeComponent();
  }, [auth, firestoreOperations, navigate]);

  // Memoized user formatter to prevent unnecessary re-processing
  const formatUserData = useCallback((users) => {
    return users.map(user => ({
      id: user.id || user.userId,
      firstName: user.firstName || user.displayName?.split(' ')[0] || '',
      lastName: user.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
      email: user.email || '',
      role: user.role || 'firefighter',
      rank: user.rank || 'Firefighter',
      stationId: user.stationId || user.station || '',
      status: user.status || 'active',
      lastLogin: user.lastLogin || user.lastSignInTime || new Date().toISOString(),
      createdAt: user.createdAt || user.creationTime || new Date().toISOString(),
      permissions: user.permissions || []
    }));
  }, []);

  // Helper to show status messages (moved here to fix declaration order)
  const showStatusMessage = useCallback((text, type = 'success') => {
    setStatusMessage({ text, type, visible: true });
    
    // Hide message after 3 seconds
    setTimeout(() => {
      setStatusMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  // Memoized fetch function to prevent recreation on every render
  const fetchUsers = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      const paginatedResult = await firestoreOperations.getPaginatedUsers(
        currentUserPage,
        usersPerPage,
        userRoleFilter === 'all' ? null : userRoleFilter,
        null, // No station filter for now
        userStatusFilter === 'all' ? null : userStatusFilter,
        userRankFilter === 'all' ? null : userRankFilter
      );
      
      // Show notification if using client-side filtering
      if (paginatedResult.clientSideFiltered) {
        showStatusMessage("Using client-side filtering (Firestore indexes pending)", "info");
      }
      
      if (paginatedResult.users) {
        const formattedUsers = formatUserData(paginatedResult.users);
        setUsers(formattedUsers);
        setTotalUsers(paginatedResult.totalUsers || 0);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users.");
      setUsers([]);
      setTotalUsers(0);
    }
  }, [auth.currentUser, firestoreOperations, currentUserPage, usersPerPage, userRoleFilter, userStatusFilter, userRankFilter, formatUserData, showStatusMessage]);

  // Optimized effect for fetching users - uses memoized function
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Function to fetch ALL stations for dropdowns (reusable)
  const fetchAllStations = async () => {
    try {
      const stationsData = await firestoreOperations.getStations();
      const formattedAllStations = stationsData.map(station => ({
        id: station.id,
        number: station.number || station.id.replace('s', ''),
        name: station.name || `Station ${station.number || ''}`,
        address: station.address || '',
        phone: station.phone || ''
      }));
      setAllStations(formattedAllStations);
    } catch (error) {
      console.error("Error fetching all stations:", error);
      setAllStations([]);
    }
  };

  // Fetch ALL stations for dropdowns (not paginated)
  useEffect(() => {
    fetchAllStations();
  }, [firestoreOperations]);

  // Separate useEffect for station pagination
  useEffect(() => {
    const fetchStations = async () => {
      try {
        
        const paginatedResult = await firestoreOperations.getPaginatedStations(
          currentStationPage,
          stationsPerPage
        );
        
        if (paginatedResult.stations && paginatedResult.stations.length > 0) {
          // Format stations data
          const formattedStations = paginatedResult.stations.map(station => ({
            id: station.id,
            number: station.number || station.id.replace('s', ''),
            name: station.name || `Station ${station.number || ''}`,
            address: station.address || '',
            phone: station.phone || '',
            captainId: station.captainId || null,
            crewIds: station.crewIds || [],
            apparatus: station.apparatus || [],
            createdAt: station.createdAt || new Date().toISOString()
          }));
          
          setStations(formattedStations);
          setTotalStations(paginatedResult.totalStations || 0);
        } else {
          // No stations found
          setStations([]);
          setTotalStations(0);
        }
      } catch (error) {
        console.error("Error fetching stations:", error);
        setStations([]);
        setTotalStations(0);
      }
    };

    if (!loading) {
      fetchStations();
    }
  }, [firestoreOperations, currentStationPage, stationsPerPage, loading]);

  // Handle user page change
  const handleUserPageChange = (page) => {
    setCurrentUserPage(page);
  };

  // Handle station page change
  const handleStationPageChange = (page) => {
    setCurrentStationPage(page);
  };

  // Handle user role filter change
  const handleUserRoleFilterChange = (role) => {
    setUserRoleFilter(role);
    setCurrentUserPage(1); // Reset to first page when filter changes
  };

  const handleUserStatusFilterChange = (status) => {
    setUserStatusFilter(status);
    setCurrentUserPage(1); // Reset to first page when filter changes
  };

  const handleUserRankFilterChange = (rank) => {
    setUserRankFilter(rank);
    setCurrentUserPage(1); // Reset to first page when filter changes
  };

  // Helper functions
  const getStationName = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    return station ? `Station ${station.number}` : 'Unassigned';
  };
  

  const getCaptainName = (captainId) => {
    if (!captainId) return 'No Captain Assigned';
    const captain = users.find(u => u.id === captainId);
    return captain ? `${captain.firstName} ${captain.lastName}` : 'Unknown';
  };

  const formatDate = (dateString) => {
    return formatDatePST(dateString);
  };

  const formatDateTime = (dateString) => {
    return formatDateTimePST(dateString);
  };


  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': 
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      case 'firefighter': 
        return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800';
      default: 
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') 
      : (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800');
  };

  // We'll move the filtering logic to each component with its own search term

  // Admin Navigation
  const AdminNavigation = () => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-4 md:mb-6`}>
      <div className="flex overflow-x-auto scrollbar-hide">
        <button
          onClick={() => updateAdminSection('overview')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'overview' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Activity className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Overview</span>
          <span className="sm:hidden">Overview</span>
        </button>
        <button
          onClick={() => updateAdminSection('users')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'users' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Users className="w-4 h-4 mr-1 md:mr-2" />
          <span>Users</span>
        </button>
        <button
          onClick={() => updateAdminSection('stations')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'stations' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Building2 className="w-4 h-4 mr-1 md:mr-2" />
          <span>Stations</span>
        </button>
        <button
          onClick={() => updateAdminSection('reports')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'reports' || adminActiveSection === 'analytics'
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <FileBarChart className="w-4 h-4 mr-1 md:mr-2" />
          <span>Reports</span>
        </button>
        <button
          onClick={() => updateAdminSection('audit')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'audit' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Eye className="w-4 h-4 mr-1 md:mr-2" />
          <span>Audit Logs</span>
        </button>
        <button
          onClick={() => updateAdminSection('help-chats')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'help-chats' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-1 md:mr-2" />
          <span>Help Chats</span>
          {totalUnreadHelpMessages > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {totalUnreadHelpMessages > 99 ? '99+' : totalUnreadHelpMessages}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  // Admin Overview Component
  const AdminOverview = () => {
    const [recentActivity, setRecentActivity] = useState([]);
    const [loadingActivity, setLoadingActivity] = useState(true);
    
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const totalStations = stations.length;

    useEffect(() => {
      const fetchRecentActivity = async () => {
        try {
          setLoadingActivity(true);
          const activities = await firestoreOperations.getRecentActivity(5);
          setRecentActivity(activities);
        } catch (error) {
          console.error('Error fetching recent activity:', error);
          setRecentActivity([]);
        } finally {
          setLoadingActivity(false);
        }
      };

      fetchRecentActivity();
    }, [firestoreOperations]);

    const getActivityIcon = (type) => {
      switch (type) {
        case 'user_login':
          return <Activity className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mr-3`} />;
        case 'assessment':
          return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'} mr-3`} />;
        case 'log':
          return <FileText className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'} mr-3`} />;
        default:
          return <Activity className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />;
      }
    };

    const getTimeAgo = (timestamp) => {
      if (!timestamp) return 'Unknown time';
      
      const now = new Date();
      const activityTime = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
      const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    };

    return (
      <div className="space-y-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Admin Portal Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <div className="flex items-center">
              <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-100'} p-3 rounded-full`}>
                <Users className={`w-6 h-6 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <div className="ml-4">
                <h3 className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Total Users</h3>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalUsers}</p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <div className="flex items-center">
              <div className={`${darkMode ? 'bg-green-900' : 'bg-green-100'} p-3 rounded-full`}>
                <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-green-300' : 'text-green-600'}`} />
              </div>
              <div className="ml-4">
                <h3 className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Active Users</h3>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{activeUsers}</p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <div className="flex items-center">
              <div className={`${darkMode ? 'bg-purple-900' : 'bg-purple-100'} p-3 rounded-full`}>
                <Building2 className={`w-6 h-6 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
              </div>
              <div className="ml-4">
                <h3 className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Fire Stations</h3>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalStations}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
            <button
              onClick={async () => {
                try {
                  showStatusMessage("Exporting recent activity...", "info");
                  const result = await firestoreOperations.exportRecentActivity(50);
                  
                  if (result.success) {
                    const formattedData = formatActivityDataForExport(result.data);
                    downloadCSV(formattedData, result.filename);
                    showStatusMessage("Recent activity exported successfully", "success");
                  } else {
                    showStatusMessage(`Export failed: ${result.message}`, "error");
                  }
                } catch (error) {
                  console.error('Error exporting recent activity:', error);
                  showStatusMessage("Export failed: " + error.message, "error");
                }
              }}
              className={`flex items-center px-3 py-1 text-sm border rounded-md transition-colors ${
                darkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
          <div className="space-y-3">
            {loadingActivity ? (
              <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading recent activity...
              </div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div 
                  key={activity.id || index} 
                  className={`flex items-center justify-between py-2 ${
                    index < recentActivity.length - 1 ? `border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}` : ''
                  }`}
                >
                  <div className="flex items-center">
                    {getActivityIcon(activity.type)}
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{activity.message}</span>
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No recent activity found
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // User Management Component
  const UserManagement = () => {
    const [userSearchTerm, setUserSearchTerm] = useState('');
    
    // With server-side pagination, we use the users directly from the paginated results
    // Server-side filtering is handled by the API, only apply client-side search
    const filteredUsers = users.filter(user => {
      // Only apply text search filter client-side
      const matchesSearch = userSearchTerm === '' || 
        user.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      return matchesSearch;
    });
    
    const handleCreateUser = () => {
      setSelectedUser(null);
      setShowUserModal(true);
    };

    const handleEditUser = (user) => {
      setSelectedUser(user);
      setShowUserModal(true);
    };

    const handleDeleteUser = (userId) => {
      // Get the user for the confirmation dialog
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) {
        showStatusMessage(`User with ID ${userId} not found`, "error");
        return;
      }
      
      // Show confirmation dialog
      setConfirmDialog({
        isOpen: true,
        title: 'Confirm Deletion',
        message: `Are you sure you want to delete user ${userToDelete.firstName} ${userToDelete.lastName}? This action cannot be undone.`,
        onConfirm: async () => {
          try {            
            // Use soft delete (move to deletedUsers collection)
            const result = await firestoreOperations.softDeleteUser(userId);
            
            if (result.success) {
              // Update local state
              setUsers(users.filter(u => u.id !== userId));
              
              // Show temporary success message
              showStatusMessage("User has been successfully deleted", "success");
            } else {
              showStatusMessage(`Failed to delete user: ${result.message}`, "error");
            }
          } catch (error) {
            showStatusMessage(`An error occurred: ${error.message}`, "error");
          }
        }
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Management</h2>
          <button
            onClick={handleCreateUser}
            className={`flex items-center px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md`}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className={`w-5 h-5 absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  className={`w-full pl-11 pr-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-500'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filters Section */}
              <div className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'} rounded-lg p-4`}>
                <div className="flex items-center mb-3">
                  <Filter className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'} mr-2`} />
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Role Filter */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Role
                    </label>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => handleUserRoleFilterChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="firefighter">Firefighter</option>
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </label>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => handleUserStatusFilterChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Rank Filter */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Rank
                    </label>
                    <select
                      value={userRankFilter}
                      onChange={(e) => handleUserRankFilterChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                    >
                      <option value="all">All Ranks</option>
                      <option value="Firefighter">Firefighter</option>
                      <option value="Captain">Captain</option>
                      <option value="Deputy Chief">Deputy Chief</option>
                      <option value="Battalion Chief">Battalion Chief</option>
                      <option value="Chief">Chief</option>
                    </select>
                  </div>
                  
                  {/* Clear Filters Button */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-transparent">Actions</label>
                    {(userRoleFilter !== 'all' || userStatusFilter !== 'all' || userRankFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setUserRoleFilter('all');
                          setUserStatusFilter('all');
                          setUserRankFilter('all');
                        }}
                        className={`w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                          darkMode 
                            ? 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white' 
                            : 'border-red-500 text-red-600 hover:bg-red-500 hover:text-white'
                        } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Active Filters Display */}
                {(userRoleFilter !== 'all' || userStatusFilter !== 'all' || userRankFilter !== 'all') && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active filters:</span>
                    {userRoleFilter !== 'all' && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                      }`}>
                        Role: {userRoleFilter}
                      </span>
                    )}
                    {userStatusFilter !== 'all' && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                      }`}>
                        Status: {userStatusFilter}
                      </span>
                    )}
                    {userRankFilter !== 'all' && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                      }`}>
                        Rank: {userRankFilter}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Results and Export Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Results Count */}
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Showing {filteredUsers.length} of {totalUsers} users
                  </span>
                  {(userRoleFilter !== 'all' || userStatusFilter !== 'all' || userRankFilter !== 'all' || userSearchTerm !== '') && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Filtered
                    </span>
                  )}
                </div>
                
                {/* Export Buttons */}
                <div className="flex space-x-3">
                  {/* Export Current Page */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const performExport = () => {
                        try {
                          
                          const formattedData = formatUserDataForExport(filteredUsers);
                          const filename = `users_page_${currentUserPage}_export_${new Date().toISOString().split('T')[0]}.csv`;
                          downloadCSV(formattedData, filename);
                          
                          setTimeout(() => {
                            showStatusMessage("Current page exported successfully", "success");
                          }, 100);
                        } catch (error) {
                          console.error('Error exporting current page:', error);
                          setTimeout(() => {
                            showStatusMessage("Export failed: " + error.message, "error");
                          }, 100);
                        }
                      };
                      
                      performExport();
                    }}
                    className={`flex items-center px-4 py-2 border rounded-lg transition-all duration-200 ${
                      darkMode 
                        ? 'border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-500' 
                        : 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Page ({filteredUsers.length})
                  </button>

                  {/* Export All */}
                  <button 
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const performExportAll = async () => {
                        try {
                          setStatusMessage({ text: "Fetching all users for export...", type: "info", visible: true });
                          
                          // Fetch all users for export
                          const allUsersData = await firestoreOperations.getAllUsers();
                          
                          if (allUsersData && allUsersData.length > 0) {
                            const formattedUsers = allUsersData.map(user => ({
                              id: user.id || user.userId,
                              firstName: user.firstName || user.displayName?.split(' ')[0] || '',
                              lastName: user.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
                              email: user.email || '',
                              role: user.role || 'firefighter',
                              stationId: user.stationId || user.station || '',
                              status: user.status || 'active',
                              lastLogin: user.lastLogin || user.lastSignInTime || new Date().toISOString(),
                              createdAt: user.createdAt || user.creationTime || new Date().toISOString(),
                              permissions: user.permissions || []
                            }));
                            
                            const formattedData = formatUserDataForExport(formattedUsers);
                            const filename = `users_all_export_${new Date().toISOString().split('T')[0]}.csv`;
                            downloadCSV(formattedData, filename);
                            
                            setTimeout(() => {
                              showStatusMessage(`All ${formattedUsers.length} users exported successfully`, "success");
                            }, 100);
                          } else {
                            setTimeout(() => {
                              showStatusMessage("No users found to export", "error");
                            }, 100);
                          }
                        } catch (error) {
                          console.error('Error exporting all users:', error);
                          setTimeout(() => {
                            showStatusMessage("Export all failed: " + error.message, "error");
                          }, 100);
                        }
                      };
                      
                      await performExportAll();
                    }}
                    className={`flex items-center px-4 py-2 border rounded-lg transition-all duration-200 ${
                      darkMode 
                        ? 'border-green-600 text-green-300 hover:bg-green-600 hover:text-white hover:border-green-500' 
                        : 'border-green-500 text-green-600 hover:bg-green-500 hover:text-white'
                    } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export All ({totalUsers})
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredUsers.length > 0 ? (
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      User
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Role
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Rank
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Station
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Last Login
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-full p-2 mr-3`}>
                            <User className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {user.rank || 'Firefighter'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {getStationName(user.stationId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDateTime(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className={darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-8 text-center`}>
                <div className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  No users found
                </div>
                <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Click the "Add User" button above to create your first user.
                </p>
                <button
                  onClick={handleCreateUser}
                  className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md inline-flex items-center`}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Your First User
                </button>
              </div>
            )}
          </div>
          
          {/* Pagination for Users */}
          {totalUsers > 0 && (
            <Pagination
              currentPage={currentUserPage}
              totalPages={Math.ceil(totalUsers / usersPerPage)}
              totalItems={totalUsers}
              itemsPerPage={usersPerPage}
              onPageChange={handleUserPageChange}
              darkMode={darkMode}
              showItemCount={true}
            />
          )}
        </div>
      </div>
    );
  };

  // Station Management Component
  const StationManagement = () => {
    const [stationSearchTerm, setStationSearchTerm] = useState('');
    
    // Filter stations based on local stationSearchTerm state
    const filteredStations = stations.filter(station =>
      station.name.toLowerCase().includes(stationSearchTerm.toLowerCase()) ||
      station.number.includes(stationSearchTerm) ||
      station.address.toLowerCase().includes(stationSearchTerm.toLowerCase())
    );
    
    const handleCreateStation = () => {
      setSelectedStationData(null);
      setShowStationModal(true);
    };

    const handleEditStation = (station) => {
      setSelectedStationData(station);
      setShowStationModal(true);
    };

    const handleDeleteStation = async (stationId) => {
      // Get the station for the confirmation dialog
      const stationToDelete = stations.find(s => s.id === stationId);
      if (!stationToDelete) {
        showStatusMessage(`Station with ID ${stationId} not found`, "error");
        return;
      }
      
      try {
        // First get the potential impact of this deletion
        // Note: We can query the users, logs, and assessments directly to 
        // get an accurate count of affected items
        
        const stationName = stationToDelete.name || `Station ${stationToDelete.number}`;
        const stationNumber = stationToDelete.number || stationId.replace('s', '');
        
        // Set loading state while we fetch impact data
        setStatusMessage({ text: "Analyzing station data impact...", type: "info", visible: true });
        
        // Count affected users - we're making simpler queries here just for the count
        let affectedUsersCount = 0;
        
        const usersWithStationId = await firestoreOperations.getUsersByStationId(stationId);
        const usersWithStationName = await firestoreOperations.getUsersByStation(stationName);
        
        // Combine and deduplicate
        const affectedUserIds = new Set();
        usersWithStationId.forEach(user => affectedUserIds.add(user.id));
        usersWithStationName.forEach(user => affectedUserIds.add(user.id));
        
        affectedUsersCount = affectedUserIds.size;
        
        // Count logs and assessments (simplified estimates)
        const logs = await firestoreOperations.getLogs(`Station ${stationNumber}`);
        const assessments = await firestoreOperations.getAssessmentsByStation(`Station ${stationNumber}`);
        
        // Hide the loading message
        setStatusMessage(prev => ({ ...prev, visible: false }));
        
        // Build detailed warning message
        let warningMessage = `Are you sure you want to delete ${stationName}? This action cannot be undone.\n\n`;
        warningMessage += "This will affect the following data:\n";
        
        if (affectedUsersCount > 0) {
          warningMessage += `- ${affectedUsersCount} user(s) will be unassigned from this station\n`;
        }
        
        if (logs.length > 0) {
          warningMessage += `- ${logs.length} log(s) will be marked as archived\n`;
        }
        
        if (assessments.length > 0) {
          warningMessage += `- ${assessments.length} assessment(s) will be marked as archived\n`;
        }
        
        // Add more comprehensive explanation of what happens
        warningMessage += "\nWhat will happen:\n";
        warningMessage += "- Station will be permanently removed from the database\n";
        warningMessage += "- Associated users will have their station field cleared\n";
        warningMessage += "- Logs and assessments will be marked as archived but remain accessible\n";
        
        // Show enhanced confirmation dialog
        setConfirmDialog({
          isOpen: true,
          title: 'WARNING: Confirm Station Deletion',
          message: warningMessage,
          onConfirm: async () => {
            try {
              // Show processing message
              setStatusMessage({ text: "Processing station deletion...", type: "info", visible: true });
              
              // Use the enhanced deleteStation function
              const result = await firestoreOperations.deleteStation(stationId);
              
              if (result.success) {
                // Update affected users in the local state if any users were affected
                if (result.affected && result.affected.users > 0) {
                  setUsers(users.map(user => {
                    if (user.stationId === stationId || user.station === stationName) {
                      return {
                        ...user,
                        stationId: "",
                        station: ""
                      };
                    }
                    return user;
                  }));
                }
                
                // Hide processing message
                setStatusMessage(prev => ({ ...prev, visible: false }));
                
                // Refresh station data for current page
                const refreshStations = async () => {
                  try {
                    const newTotalStations = totalStations - 1;
                    let pageToFetch = currentStationPage;
                    
                    // If we deleted the last item on the current page and it's not page 1, go to previous page
                    if (stations.length === 1 && currentStationPage > 1) {
                      pageToFetch = currentStationPage - 1;
                      setCurrentStationPage(pageToFetch);
                    }
                    
                    const paginatedResult = await firestoreOperations.getPaginatedStations(
                      pageToFetch,
                      stationsPerPage
                    );
                    
                    if (paginatedResult.stations) {
                      const formattedStations = paginatedResult.stations.map(station => ({
                        id: station.id,
                        number: station.number || station.id.replace('s', ''),
                        name: station.name || `Station ${station.number || ''}`,
                        address: station.address || '',
                        phone: station.phone || '',
                        captainId: station.captainId || null,
                        crewIds: station.crewIds || [],
                        apparatus: station.apparatus || [],
                        createdAt: station.createdAt || new Date().toISOString()
                      }));
                      
                      setStations(formattedStations);
                      setTotalStations(paginatedResult.totalStations || 0);
                    }
                  } catch (error) {
                    console.error("Error refreshing stations:", error);
                  }
                };
                
                // Show success message then reload page to refresh all data
                let successMsg = `${stationName} deleted successfully.`;
                if (result.affected) {
                  const { users, logs, assessments } = result.affected;
                  if (users > 0) successMsg += ` Updated ${users} user(s).`;
                  if (logs > 0) successMsg += ` Archived ${logs} log(s).`;
                  if (assessments > 0) successMsg += ` Archived ${assessments} assessment(s).`;
                }
                showStatusMessage(successMsg, "success");
                
                // Reload page after short delay to show success message
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              } else {
                // Hide processing message
                setStatusMessage(prev => ({ ...prev, visible: false }));
                
                showStatusMessage(`Failed to delete station: ${result.message}`, "error");
              }
            } catch (error) {
              // Hide processing message
              setStatusMessage(prev => ({ ...prev, visible: false }));
              
              showStatusMessage(`Error: ${error.message}`, "error");
            }
          }
        });
      } catch (error) {
        // Hide any loading message
        setStatusMessage(prev => ({ ...prev, visible: false }));
        
        showStatusMessage(`Error: ${error.message}`, "error");
        
        // Fall back to a simpler confirmation if we can't get the full impact
        setConfirmDialog({
          isOpen: true,
          title: 'Confirm Station Deletion',
          message: `Are you sure you want to delete ${stationToDelete.name}? This will affect users, logs, and assessments associated with this station.`,
          onConfirm: async () => {
            try {
              // Show processing message
              setStatusMessage({ text: "Processing station deletion...", type: "info", visible: true });
              
              const result = await firestoreOperations.deleteStation(stationId);
              
              // Hide processing message
              setStatusMessage(prev => ({ ...prev, visible: false }));
              
              if (result.success) {
                // Update any affected users in the local state
                setUsers(users.map(user => {
                  if (user.stationId === stationId || user.station === stationToDelete.name) {
                    return {
                      ...user,
                      stationId: "",
                      station: ""
                    };
                  }
                  return user;
                }));
                
                // Refresh station data for current page
                const refreshStations = async () => {
                  try {
                    let pageToFetch = currentStationPage;
                    
                    // If we deleted the last item on the current page and it's not page 1, go to previous page
                    if (stations.length === 1 && currentStationPage > 1) {
                      pageToFetch = currentStationPage - 1;
                      setCurrentStationPage(pageToFetch);
                    }
                    
                    const paginatedResult = await firestoreOperations.getPaginatedStations(
                      pageToFetch,
                      stationsPerPage
                    );
                    
                    if (paginatedResult.stations) {
                      const formattedStations = paginatedResult.stations.map(station => ({
                        id: station.id,
                        number: station.number || station.id.replace('s', ''),
                        name: station.name || `Station ${station.number || ''}`,
                        address: station.address || '',
                        phone: station.phone || '',
                        captainId: station.captainId || null,
                        crewIds: station.crewIds || [],
                        apparatus: station.apparatus || [],
                        createdAt: station.createdAt || new Date().toISOString()
                      }));
                      
                      setStations(formattedStations);
                      setTotalStations(paginatedResult.totalStations || 0);
                    }
                  } catch (error) {
                    console.error("Error refreshing stations:", error);
                  }
                };
                
                await refreshStations();
                showStatusMessage(`${stationToDelete.name} deleted successfully`, "success");
              } else {
                showStatusMessage(`Failed to delete station: ${result.message}`, "error");
              }
            } catch (error) {
              // Hide processing message
              setStatusMessage(prev => ({ ...prev, visible: false }));
              showStatusMessage(`Error: ${error.message}`, "error");
            }
          }
        });
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Station Management</h2>
          <button
            onClick={handleCreateStation}
            className={`flex items-center px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md`}
          >
            <Building className="w-4 h-4 mr-2" />
            Add Station
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search stations..."
                className={`w-full pl-10 pr-4 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'} rounded-md`}
                value={stationSearchTerm}
                onChange={(e) => setStationSearchTerm(e.target.value)}
              />
            </div>
            <button className={`flex items-center px-3 py-2 border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md`}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>

          {filteredStations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStations.map((station) => (
                <div key={station.id} className={`border ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:shadow-md'} rounded-lg p-4 transition-all`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Station {station.number}</h3>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{station.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditStation(station)}
                        className={darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStation(station.id)}
                        className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <MapPin className="w-4 h-4 mr-2" />
                      {station.address}
                    </div>
                    <div className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      {station.phone}
                    </div>
                    <div className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <User className="w-4 h-4 mr-2" />
                      Captain: {getCaptainName(station.captainId)}
                    </div>
                    <div className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Users className="w-4 h-4 mr-2" />
                      Crew Size: {station.crewIds.length}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-8 text-center`}>
              <div className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                No stations found
              </div>
              <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Click the "Add Station" button above to create your first station.
              </p>
              <button
                onClick={handleCreateStation}
                className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md inline-flex items-center`}
              >
                <Building className="w-4 h-4 mr-2" />
                Add Your First Station
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalStations > stationsPerPage && (
            <div className="py-6">
              <Pagination
                currentPage={currentStationPage}
                totalPages={Math.ceil(totalStations / stationsPerPage)}
                totalItems={totalStations}
                itemsPerPage={stationsPerPage}
                onPageChange={handleStationPageChange}
                darkMode={darkMode}
                showItemCount={true}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Admin Reports Component
  const AdminReports = () => {
    const [reportCounts, setReportCounts] = useState({
      assessments: 0,
      logs: 0,
      loading: true
    });

    useEffect(() => {
      const fetchReportCounts = async () => {
        try {
          setReportCounts(prev => ({ ...prev, loading: true }));
          
          // Get counts for reports
          const [allAssessments, allLogs] = await Promise.all([
            firestoreOperations.getAllAssessments(),
            firestoreOperations.getAllLogs()
          ]);

          setReportCounts({
            assessments: allAssessments.length,
            logs: allLogs.length,
            loading: false
          });
        } catch (error) {
          console.error('Error fetching report counts:', error);
          setReportCounts({
            assessments: 0,
            logs: 0,
            loading: false
          });
        }
      };

      fetchReportCounts();
    }, [firestoreOperations]);

    const handleExportUsers = async () => {
      try {
        showStatusMessage("Exporting users...", "info");
        const result = await firestoreOperations.exportUsers();
        
        if (result.success) {
          const formattedData = formatUserDataForExport(result.data);
          downloadCSV(formattedData, result.filename);
          showStatusMessage("Users exported successfully", "success");
        } else {
          showStatusMessage(`Export failed: ${result.message}`, "error");
        }
      } catch (error) {
        console.error('Error exporting users:', error);
        showStatusMessage("Export failed: " + error.message, "error");
      }
    };

    const handleExportStations = async () => {
      try {
        showStatusMessage("Exporting stations...", "info");
        const result = await firestoreOperations.exportStations();
        
        if (result.success) {
          const formattedData = formatStationDataForExport(result.data);
          downloadCSV(formattedData, result.filename);
          showStatusMessage("Stations exported successfully", "success");
        } else {
          showStatusMessage(`Export failed: ${result.message}`, "error");
        }
      } catch (error) {
        console.error('Error exporting stations:', error);
        showStatusMessage("Export failed: " + error.message, "error");
      }
    };

    const handleExportGARHistory = async () => {
      try {
        showStatusMessage("Exporting GAR assessments...", "info");
        const result = await firestoreOperations.exportGARHistory();
        
        if (result.success) {
          const formattedData = formatGARDataForExport(result.data);
          downloadCSV(formattedData, result.filename);
          showStatusMessage("GAR history exported successfully", "success");
        } else {
          showStatusMessage(`Export failed: ${result.message}`, "error");
        }
      } catch (error) {
        console.error('Error exporting GAR history:', error);
        showStatusMessage("Export failed: " + error.message, "error");
      }
    };

    const handleExportDailyLogs = async () => {
      try {
        showStatusMessage("Exporting daily logs...", "info");
        const result = await firestoreOperations.exportDailyLogs();
        
        if (result.success) {
          const formattedData = formatLogDataForExport(result.data);
          downloadCSV(formattedData, result.filename);
          showStatusMessage("Daily logs exported successfully", "success");
        } else {
          showStatusMessage(`Export failed: ${result.message}`, "error");
        }
      } catch (error) {
        console.error('Error exporting daily logs:', error);
        showStatusMessage("Export failed: " + error.message, "error");
      }
    };

    const handleViewGARReports = () => {
      // Navigate to reports page with GAR filter
      navigate('/reports?type=assessments');
    };

    const handleViewDailyLogs = () => {
      // Navigate to reports page with logs filter
      navigate('/reports?type=logs');
    };

    const handleViewUserActivity = () => {
      // Navigate to analytics section
      updateAdminSection('analytics');
    };

    return (
      <div className="space-y-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Reports & Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>GAR Assessments</h3>
              <FileBarChart className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              {reportCounts.loading ? 'Loading...' : `${reportCounts.assessments} assessments in database`}
            </p>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mb-4`}>View historical GAR assessment data and trends</p>
            <button 
              onClick={handleViewGARReports}
              className={`w-full px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md`}
            >
              View Reports
            </button>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Daily Logs</h3>
              <FileText className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              {reportCounts.loading ? 'Loading...' : `${reportCounts.logs} logs in database`}
            </p>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mb-4`}>Browse and analyze daily logs from all stations</p>
            <button 
              onClick={handleViewDailyLogs}
              className={`w-full px-4 py-2 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md`}
            >
              View Logs
            </button>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Activity</h3>
              <Activity className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              {users.length} active users
            </p>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mb-4`}>Track user engagement and system usage</p>
            <button 
              onClick={handleViewUserActivity}
              className={`w-full px-4 py-2 ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-md`}
            >
              View Analytics
            </button>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Exports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleExportUsers}
              className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export User List
            </button>
            <button 
              onClick={handleExportStations}
              className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Station Data
            </button>
            <button 
              onClick={handleExportGARHistory}
              className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export GAR History
            </button>
            <button 
              onClick={handleExportDailyLogs}
              className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Daily Logs
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Analytics Component
  const AnalyticsComponent = () => {
    const [analytics, setAnalytics] = useState(null);
    const [systemStats, setSystemStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(30);

    useEffect(() => {
      const fetchAnalytics = async () => {
        try {
          setLoading(true);
          const [analyticsData, statsData] = await Promise.all([
            firestoreOperations.getUserEngagementAnalytics(timeframe),
            firestoreOperations.getSystemUsageStats()
          ]);
          
          setAnalytics(analyticsData);
          setSystemStats(statsData);
        } catch (error) {
          console.error('Error fetching analytics:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAnalytics();
    }, [timeframe, firestoreOperations]);

    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center">
            <button 
              onClick={() => updateAdminSection('reports')}
              className={`mr-3 md:mr-4 p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <ArrowLeft className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            <h2 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Analytics & Engagement</h2>
          </div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className={`px-3 py-2 border rounded-md text-sm ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-200' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* System Overview Stats */}
        {systemStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-3 md:p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <Users className={`w-6 h-6 md:w-8 md:h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-2 sm:mb-0`} />
                <div className="sm:ml-4">
                  <p className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Users</p>
                  <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{systemStats.totalUsers}</p>
                </div>
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-3 md:p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <Activity className={`w-6 h-6 md:w-8 md:h-8 ${darkMode ? 'text-green-400' : 'text-green-600'} mb-2 sm:mb-0`} />
                <div className="sm:ml-4">
                  <p className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Today</p>
                  <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{systemStats.activeUsersToday}</p>
                </div>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-3 md:p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <FileText className={`w-6 h-6 md:w-8 md:h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'} mb-2 sm:mb-0`} />
                <div className="sm:ml-4">
                  <p className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Logs</p>
                  <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{systemStats.totalLogs}</p>
                </div>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-3 md:p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <AlertTriangle className={`w-6 h-6 md:w-8 md:h-8 ${darkMode ? 'text-amber-400' : 'text-amber-600'} mb-2 sm:mb-0`} />
                <div className="sm:ml-4">
                  <p className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Assessments</p>
                  <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{systemStats.totalAssessments}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Activity Breakdown */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Activity Breakdown</h3>
              <div className="space-y-3">
                {Object.keys(analytics.actionBreakdown || {}).length > 0 ? (
                  Object.entries(analytics.actionBreakdown).map(([action, count]) => (
                    <div key={action} className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{count as number}</span>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No activity data available yet. Activity will appear as users interact with the system.
                  </p>
                )}
              </div>
            </div>

            {/* Top Active Users */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Most Active Users</h3>
              <div className="space-y-3">
                {analytics.topUsers && analytics.topUsers.length > 0 ? (
                  analytics.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`}>
                        #{index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {user.userName}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.station} • {user.role}
                        </p>
                      </div>
                    </div>
                    <span className={`font-medium ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {user.activityCount} actions
                    </span>
                  </div>
                  ))
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No user activity data available yet. Data will appear as users interact with the system.
                  </p>
                )}
              </div>
            </div>

            {/* Station Activity */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Activity by Station</h3>
              <div className="space-y-4">
                {analytics.topStations && analytics.topStations.length > 0 ? (
                  analytics.topStations.map((station, index) => {
                    const maxActivity = Math.max(...analytics.topStations.map(s => s.totalActivity));
                    const activityPercentage = maxActivity > 0 ? (station.totalActivity / maxActivity) * 100 : 0;
                    const engagementRate = station.userCount > 0 ? +(station.totalActivity / station.userCount).toFixed(1) : 0;
                    
                    return (
                      <div key={station.stationName} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <span className={`text-lg font-semibold mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              #{index + 1}
                            </span>
                            <div>
                              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {station.stationName}
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {station.userCount} active users
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {station.totalActivity} activities
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {engagementRate} per user
                            </p>
                          </div>
                        </div>
                        
                        {/* Activity Progress Bar */}
                        <div className={`w-full bg-gray-200 rounded-full h-2 mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${activityPercentage}%` }}
                          ></div>
                        </div>
                        
                        {/* Activity Breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex justify-between ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>Logins:</span>
                            <span className="font-medium">{station.actions?.login || 0}</span>
                          </div>
                          <div className={`flex justify-between ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>Page Views:</span>
                            <span className="font-medium">{(station.actions?.dashboard_view || 0) + (station.actions?.reports_view || 0)}</span>
                          </div>
                          <div className={`flex justify-between ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>Logs Created:</span>
                            <span className="font-medium">{station.actions?.log_created || 0}</span>
                          </div>
                          <div className={`flex justify-between ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>GAR Assessments:</span>
                            <span className="font-medium">{station.actions?.gar_created || 0}</span>
                          </div>
                        </div>
                        
                        {/* Engagement Level Indicator */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              engagementRate >= 10 ? 'bg-green-500' : 
                              engagementRate >= 5 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}></div>
                            <span className={`text-xs font-medium ${
                              engagementRate >= 10 ? (darkMode ? 'text-green-400' : 'text-green-600') : 
                              engagementRate >= 5 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : 
                              (darkMode ? 'text-red-400' : 'text-red-600')
                            }`}>
                              {engagementRate >= 10 ? 'High Engagement' : 
                               engagementRate >= 5 ? 'Medium Engagement' : 
                               'Low Engagement'}
                            </span>
                          </div>
                          
                          {/* Station Details Button */}
                          <button 
                            onClick={() => {
                              // Show detailed breakdown for this station
                              const message = `${station.stationName} Details:\n\n` +
                                `👥 Users: ${station.userCount}\n` +
                                `📊 Total Activity: ${station.totalActivity}\n` +
                                `📈 Engagement Rate: ${engagementRate} activities per user\n\n` +
                                `Activity Breakdown:\n` +
                                `• Logins: ${station.actions?.login || 0}\n` +
                                `• Dashboard Views: ${station.actions?.dashboard_view || 0}\n` +
                                `• Reports Views: ${station.actions?.reports_view || 0}\n` +
                                `• Logs Created: ${station.actions?.log_created || 0}\n` +
                                `• GAR Assessments: ${station.actions?.gar_created || 0}`;
                              
                              showStatusMessage(message, "info");
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              darkMode 
                                ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                            }`}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No station activity data available yet. Data will appear as users from different stations interact with the system.
                  </p>
                )}
              </div>
            </div>

            {/* Daily Activity Trend */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Daily Activity (Last 7 Days)</h3>
              <div className="space-y-2">
                {Object.values(analytics.dailyActivity).map((day: any) => (
                  <div key={day.date} className="flex justify-between items-center">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDatePST(day.date, { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex space-x-4 text-xs">
                      <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                        {day.totalActivity} total
                      </span>
                      <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                        {day.uniqueUsers} users
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Engagement Summary */}
        {analytics && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 md:p-6`}>
            <h3 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Engagement Summary ({timeframe} days)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="text-center">
                <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {analytics.activeUsers}
                </p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</p>
              </div>
              <div className="text-center">
                <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {analytics.loginCount}
                </p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Logins</p>
              </div>
              <div className="text-center">
                <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {analytics.logCreations}
                </p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Logs Created</p>
              </div>
              <div className="text-center">
                <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  {analytics.garAssessments}
                </p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>GAR Assessments</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Audit Logs Component
  const AuditLogs = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [logsPerPage] = useState(5);
    const [filterType, setFilterType] = useState('all');
    const [filterStation, setFilterStation] = useState('all');
    const [showDeletedItemModal, setShowDeletedItemModal] = useState(false);
    const [selectedDeletedItem, setSelectedDeletedItem] = useState(null);

    useEffect(() => {
      const fetchAuditLogs = async () => {
        try {
          setLoading(true);
          
          const filters: any = {};
          if (filterType !== 'all') filters.itemType = filterType;
          if (filterStation !== 'all') filters.station = filterStation;
          
          
          const result = await firestoreOperations.getPaginatedAuditLogs(
            currentPage,
            logsPerPage,
            filters
          );
          
          if (result.logs && result.logs.length > 0) {
            // Debug GAR assessment logs specifically
            const garLogs = result.logs.filter(log => log.itemType === 'gar_assessment');
            if (garLogs.length > 0) {
            }
          }
          
          setAuditLogs(result.logs || []);
          setTotalLogs(result.totalLogs || 0);
        } catch (error) {
          console.error('Error fetching audit logs:', error);
          showStatusMessage('Failed to load audit logs', 'error');
        } finally {
          setLoading(false);
        }
      };

      fetchAuditLogs();
    }, [currentPage, filterType, filterStation, firestoreOperations]);

    const handlePageChange = (page) => {
      setCurrentPage(page);
    };

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return 'Unknown';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDateTimePST(date);
    };

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

    // Format time for display
    const formatTimeRange = (start, end) => {
      if (!start && !end) return "—";
      if (start && !end) return `${start} - ongoing`;
      return `${start} - ${end}`;
    };

    // Helper function to format item types in camel case
    const formatItemType = (itemType) => {
      switch (itemType) {
        case 'daily_log':
          return 'Daily Log';
        case 'gar_assessment':
          return 'GAR Assessment';
        default:
          return itemType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Audit Logs</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Track all deletion activities in the system
          </p>
        </div>

        {/* Filters */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="w-full">
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All Types</option>
                <option value="daily_log">Daily Log</option>
                <option value="gar_assessment">GAR Assessment</option>
              </select>
            </div>

            <div className="w-full">
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Station
              </label>
              <select
                value={filterStation}
                onChange={(e) => {
                  setFilterStation(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All Stations</option>
                {allStations.map(station => (
                  <option key={station.id} value={`Station ${station.number}`}>
                    Station {station.number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
            </div>
          ) : auditLogs.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-750' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Deleted At
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Deleted By
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Item Type
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Station
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Details
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatTimestamp(log.deletedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <div className="font-medium">{log.deletedByName || 'Unknown User'}</div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{log.deletedBy}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.itemType === 'daily_log' 
                              ? (darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                              : log.itemType === 'gar_assessment'
                              ? (darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800')
                              : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')
                          }`}>
                            {formatItemType(log.itemType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {log.station === 'All Stations' ? 
                              'All Stations' :
                              log.station === 'Unknown' || !log.station ? 
                                'Unknown Station' : 
                                (log.station.includes('Station') ? log.station : `Station ${log.station}`)
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {log.itemType === 'daily_log' && log.deletedItem && (
                              <div>
                                <p>Date: {log.deletedItem.date}</p>
                                <p>Captain: {log.deletedItem.captain}</p>
                                <p>Status: {log.deletedItem.status}</p>
                              </div>
                            )}
                            {log.itemType === 'gar_assessment' && log.deletedItem && (
                              <div>
                                <p>Date: {log.deletedItem.date}</p>
                                <p>Type: {log.deletedItem.type}</p>
                                {log.deletedItem.riskFactors && (
                                  <p>Risk Score: {
                                    Object.values(log.deletedItem.riskFactors).reduce((a: any, b: any) => a + b, 0) as number
                                  }</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedDeletedItem({
                                ...log,
                                deletedAtFormatted: formatTimestamp(log.deletedAt)
                              });
                              setShowDeletedItemModal(true);
                            }}
                            className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                          >
                            View Full Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                <div className="space-y-4 p-4">
                  {auditLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`rounded-lg p-4 ${darkMode ? 'bg-gray-750 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}
                    >
                      {/* Header with Type Badge */}
                      <div className="flex justify-between items-start mb-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.itemType === 'daily_log' 
                            ? (darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                            : log.itemType === 'gar_assessment'
                            ? (darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800')
                            : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')
                        }`}>
                          {formatItemType(log.itemType)}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {log.station === 'All Stations' ? 
                            'All Stations' :
                            log.station === 'Unknown' || !log.station ? 
                              'Unknown Station' : 
                              (log.station.includes('Station') ? log.station : `Station ${log.station}`)
                          }
                        </span>
                      </div>

                      {/* Deleted Info */}
                      <div className="space-y-2 mb-3">
                        <div>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Deleted At</span>
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatTimestamp(log.deletedAt)}
                          </p>
                        </div>
                        <div>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Deleted By</span>
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {log.deletedByName || 'Unknown User'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {log.deletedBy}
                          </p>
                        </div>
                      </div>

                      {/* Details Preview */}
                      {log.itemType === 'daily_log' && log.deletedItem && (
                        <div className={`text-sm mb-3 p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                          <p><span className="font-medium">Date:</span> {log.deletedItem.date}</p>
                          <p><span className="font-medium">Captain:</span> {log.deletedItem.captain}</p>
                          <p><span className="font-medium">Status:</span> {log.deletedItem.status}</p>
                        </div>
                      )}
                      
                      {log.itemType === 'gar_assessment' && log.deletedItem && (
                        <div className={`text-sm mb-3 p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                          <p><span className="font-medium">Date:</span> {log.deletedItem.date}</p>
                          <p><span className="font-medium">Type:</span> {log.deletedItem.type}</p>
                          <p><span className="font-medium">Status:</span> {log.deletedItem.status}</p>
                          {log.deletedItem.riskFactors && (
                            <p><span className="font-medium">Risk Score:</span> {
                              Object.values(log.deletedItem.riskFactors).reduce((a: any, b: any) => a + b, 0) as number
                            }</p>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          setSelectedDeletedItem({
                            ...log,
                            deletedAtFormatted: formatTimestamp(log.deletedAt)
                          });
                          setShowDeletedItemModal(true);
                        }}
                        className={`w-full text-center py-2 px-4 rounded-md text-sm font-medium ${
                          darkMode 
                            ? 'bg-gray-700 text-blue-400 hover:bg-gray-600' 
                            : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        View Full Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalLogs > logsPerPage && (
                <div className="py-4 px-4 lg:px-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalLogs / logsPerPage)}
                    totalItems={totalLogs}
                    itemsPerPage={logsPerPage}
                    onPageChange={handlePageChange}
                    darkMode={darkMode}
                    showItemCount={true}
                  />
                </div>
              )}
            </>
          ) : (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm mt-2">Deletion activities will appear here</p>
            </div>
          )}
        </div>

        {/* Deleted Item Details Modal */}
        {showDeletedItemModal && selectedDeletedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col lg:max-w-4xl`}>
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                <h3 className="text-lg font-semibold">
                  {selectedDeletedItem.itemType === 'daily_log' ? 'Deleted Log Details' : 
                   selectedDeletedItem.itemType === 'gar_assessment' ? 'Deleted GAR Assessment Details' :
                   'Deleted Item Details'}
                </h3>
                <button
                  onClick={() => {
                    setShowDeletedItemModal(false);
                    setSelectedDeletedItem(null);
                  }}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Deletion Info */}
                <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h4 className="font-semibold mb-2 text-sm uppercase text-gray-500 dark:text-gray-400">Deletion Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Deleted By:</span>
                      <p className="font-medium">{selectedDeletedItem.deletedBy}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Deleted At:</span>
                      <p className="font-medium">{selectedDeletedItem.deletedAtFormatted}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Item Type:</span>
                      <p className="font-medium">{formatItemType(selectedDeletedItem.itemType)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Item ID:</span>
                      <p className="font-medium text-xs">{selectedDeletedItem.itemId}</p>
                    </div>
                  </div>
                </div>

                {/* Log Details */}
                {selectedDeletedItem.deletedItem && selectedDeletedItem.itemType === 'daily_log' && (
                  <div className="space-y-6">
                    {/* Log Header Info */}
                    <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className="font-semibold mb-3">Log Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Station:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.station ? `Station ${selectedDeletedItem.deletedItem.station}` : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Date:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.date || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Shift:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.shift || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Captain:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.captain || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <p className="font-medium capitalize">{selectedDeletedItem.deletedItem.status || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Created By:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.createdByName || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Crew Members */}
                    {selectedDeletedItem.deletedItem.crew && selectedDeletedItem.deletedItem.crew.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Crew Members</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedDeletedItem.deletedItem.crew.map((member, index) => (
                            <div 
                              key={index} 
                              className={`flex items-center p-2 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <User className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-sm">{member}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activities */}
                    {selectedDeletedItem.deletedItem.activities && selectedDeletedItem.deletedItem.activities.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Activities ({selectedDeletedItem.deletedItem.activities.length})</h4>
                        <div className="space-y-3">
                          {selectedDeletedItem.deletedItem.activities.map((activity, index) => (
                            <div 
                              key={activity.id || index} 
                              className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-start space-x-3">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 ${getActivityColor(activity.type)}`}></div>
                                  <div className="flex-1">
                                    <p className="font-medium">{activity.description}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {formatTimeRange(activity.details?.startTime, activity.details?.endTime)} • {activity.hours} hrs
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                  {activity.type}
                                </span>
                              </div>

                              {/* Activity Details */}
                              <div className="ml-5 space-y-2">
                                {activity.type === 'MAINTENANCE' && activity.details && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {activity.details.apparatus && <p>Apparatus: {activity.details.apparatus}</p>}
                                    {activity.details.maintenanceType && <p>Type: {activity.details.maintenanceType}</p>}
                                    {activity.details.passFailStatus && <p>Status: {activity.details.passFailStatus}</p>}
                                  </div>
                                )}
                                
                                {activity.type === 'TRAINING' && activity.details?.trainingMethod && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <p>Method: {activity.details.trainingMethod}</p>
                                  </div>
                                )}
                                
                                {activity.type === 'OPERATIONS' && activity.details && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {activity.details.stationCoverage && <p>Station: {activity.details.stationCoverage}</p>}
                                    {activity.details.apparatus && <p>Apparatus: {activity.details.apparatus}</p>}
                                  </div>
                                )}
                                
                                {activity.type === 'ADMIN' && activity.details?.documentType && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <p>Document Type: {activity.details.documentType}</p>
                                  </div>
                                )}

                                {/* Assigned Crew */}
                                {activity.assignedCrewNames && activity.assignedCrewNames.length > 0 && (
                                  <div className="text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Assigned Crew: </span>
                                    <span>{activity.assignedCrewNames.join(', ')}</span>
                                  </div>
                                )}

                                {/* Notes */}
                                {activity.notes && (
                                  <div className={`text-sm p-2 rounded ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
                                    <span className="text-gray-500 dark:text-gray-400">Notes: </span>
                                    {activity.notes}
                                  </div>
                                )}

                                {/* Added By */}
                                {activity.addedByName && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    Added by {activity.addedByName}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Captain's Notes */}
                    {selectedDeletedItem.deletedItem.notes && (
                      <div>
                        <h4 className="font-semibold mb-3">Captain's Notes</h4>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
                          <p className="whitespace-pre-wrap">{selectedDeletedItem.deletedItem.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Raw JSON (Collapsible) */}
                    <details className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <summary className={`cursor-pointer p-4 font-medium ${darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                        Show Raw Data (JSON)
                      </summary>
                      <div className="p-4">
                        <pre className={`text-xs overflow-x-auto p-4 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                          {JSON.stringify(selectedDeletedItem.deletedItem, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
                
                {/* GAR Assessment Details */}
                {selectedDeletedItem.deletedItem && selectedDeletedItem.itemType === 'gar_assessment' && (
                  <div className="space-y-6">
                    {/* Assessment Header Info */}
                    <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className="font-semibold mb-3">Assessment Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Station:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.station || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Date:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.date || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Time:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.time || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Type:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.type || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <p className="font-medium capitalize">{selectedDeletedItem.deletedItem.status || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Captain:</span>
                          <p className="font-medium">{selectedDeletedItem.deletedItem.captain || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Risk Factors */}
                    {selectedDeletedItem.deletedItem.riskFactors && (
                      <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                        <h4 className="font-semibold mb-3">Risk Factors</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Supervision:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.riskFactors.supervision}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Planning:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.riskFactors.planning}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Team Selection:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.riskFactors.teamSelection}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Team Fitness:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.riskFactors.teamFitness}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.riskFactors.environment}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Complexity:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.riskFactors.complexity}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500 dark:text-gray-400">Total Risk Score:</span>
                            <p className="font-bold text-lg">{
                              Object.values(selectedDeletedItem.deletedItem.riskFactors).reduce((a: any, b: any) => a + b, 0) as number
                            }</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Weather Conditions */}
                    {selectedDeletedItem.deletedItem.weather && (
                      <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                        <h4 className="font-semibold mb-3">Weather Conditions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Temperature:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.weather.temperature}{selectedDeletedItem.deletedItem.weather.temperatureUnit}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Wind:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.weather.wind} mph {selectedDeletedItem.deletedItem.weather.windDirection}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Humidity:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.weather.humidity}%</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Precipitation:</span>
                            <p className="font-medium">{selectedDeletedItem.deletedItem.weather.precipitation}</p>
                          </div>
                          {selectedDeletedItem.deletedItem.weather.alerts && (
                            <div className="col-span-2">
                              <span className="text-gray-500 dark:text-gray-400">Alerts:</span>
                              <p className="font-medium text-amber-600 dark:text-amber-400">{selectedDeletedItem.deletedItem.weather.alerts}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Mitigation Strategies */}
                    {selectedDeletedItem.deletedItem.mitigations && Object.values(selectedDeletedItem.deletedItem.mitigations).some((m: any) => m && m.trim()) && (
                      <div>
                        <h4 className="font-semibold mb-3">Mitigation Strategies</h4>
                        <div className="space-y-2">
                          {Object.entries(selectedDeletedItem.deletedItem.mitigations).map(([factor, mitigation]: [string, any]) => {
                            if (!mitigation || !mitigation.trim()) return null;
                            return (
                              <div key={factor} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-100'}`}>
                                <p className="font-medium text-sm capitalize mb-1">{factor.replace(/([A-Z])/g, ' $1').trim()}:</p>
                                <p className="text-sm">{mitigation}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Raw JSON (Collapsible) */}
                    <details className={`border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <summary className={`cursor-pointer p-4 font-medium ${darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                        Show Raw Data (JSON)
                      </summary>
                      <div className="p-4">
                        <pre className={`text-xs overflow-x-auto p-4 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                          {JSON.stringify(selectedDeletedItem.deletedItem, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Help Chats Component - Memoized to prevent recreation
  const HelpChats = React.memo(({ darkMode, firestoreOperations, auth, showStatusMessage, formatDateTimePST, formatDatePST }: any) => {
    // Debug: Log when component re-renders (reduced frequency)
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(() => 
      localStorage.getItem('adminSelectedConversationId') || null
    );
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversationsLoading, setConversationsLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    
    // Refs for auto-scroll functionality
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    
    // User scroll state for UI feedback
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const wasNearBottomRef = useRef(true); // Track scroll position before new messages
    
    // Auto-mark as read state
    const [isViewingConversation, setIsViewingConversation] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Filter conversations based on search and filters
    const filteredConversations = conversations.filter(conv => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          conv.subject?.toLowerCase().includes(searchLower) ||
          conv.userName?.toLowerCase().includes(searchLower) ||
          conv.userEmail?.toLowerCase().includes(searchLower) ||
          conv.lastMessage?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filterType !== 'all' && conv.type !== filterType) return false;

      // Priority filter
      if (filterPriority !== 'all' && conv.priority !== filterPriority) return false;

      // Status filter
      if (filterStatus !== 'all' && conv.status !== filterStatus) return false;

      return true;
    });

    // Clear filters function
    const clearFilters = () => {
      setSearchTerm('');
      setFilterType('all');
      setFilterPriority('all');
      setFilterStatus('all');
    };

    // Instant scroll to bottom (no animation) - Messenger style
    const scrollToBottomInstant = useCallback(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }, []);

    // Smooth scroll to bottom (with animation) - for user-triggered actions
    const scrollToBottomSmooth = useCallback(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowScrollToBottom(false);
      }
    }, []);

    // Check if admin is near bottom of messages (memoized to prevent useLayoutEffect recreation)
    const isNearBottom = useCallback(() => {
      if (!messagesContainerRef.current) return true;
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom < 50; // Within 50px of bottom for more responsive auto-scroll
    }, []);

    // Function to manually mark current conversation as read for admin - copy user-side approach
    const markCurrentConversationAsRead = useCallback(async () => {
      if (!selectedConversationId || !auth.currentUser?.uid) return;
      
      try {
        await firestoreOperations.markHelpMessagesAsRead(selectedConversationId, auth.currentUser.uid, true);
        
        // Update conversations list like user side does
        setConversations(prev => {
          const updatedConversations = prev.map(conv => 
            conv.id === selectedConversationId ? { ...conv, adminUnreadCount: 0 } : conv
          );
          
          return updatedConversations;
        });
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    }, [selectedConversationId, auth.currentUser?.uid]);

    // Debounced auto-mark function to prevent multiple calls
    const checkAutoMarkRef = useRef(null);
    const checkAutoMark = useCallback(() => {
      if (!selectedConversation || !isViewingConversation) return;
      
      // Check if there are unread messages
      const hasUnreadMessages = (selectedConversation.adminUnreadCount || 0) > 0;
      if (!hasUnreadMessages) return;
      
      // Clear any pending auto-mark
      if (checkAutoMarkRef.current) {
        clearTimeout(checkAutoMarkRef.current);
      }
      
      // Debounce the auto-mark to prevent multiple calls
      checkAutoMarkRef.current = setTimeout(() => {
        if (isViewingConversation && selectedConversation && (selectedConversation.adminUnreadCount || 0) > 0) {
          markCurrentConversationAsRead();
        }
      }, 300); // 300ms delay to debounce
    }, [selectedConversation, isViewingConversation, markCurrentConversationAsRead]);

    // Handle scroll events to detect admin scrolling (throttled for performance)
    const scrollTimeoutRef = useRef(null);
    const handleScroll = useCallback(() => {
      if (!messagesContainerRef.current) return;
      
      // Throttle scroll handling
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        if (!messagesContainerRef.current) return;
        
        const isAtBottom = isNearBottom();
        setIsUserScrolling(!isAtBottom);
        setShowScrollToBottom(!isAtBottom && messages.length > 0);
        
        // Update the ref for next auto-scroll decision
        wasNearBottomRef.current = isAtBottom;
        
        // Check if we should auto-mark when admin scrolls to bottom
        if (isAtBottom && isViewingConversation) {
          checkAutoMark();
        }
      }, 100); // 100ms throttle
    }, [isNearBottom, messages.length, isViewingConversation, checkAutoMark]);

    // Smart message merging to prevent reload behavior
    const mergeMessages = useCallback((newMessages) => {
      // Debug: Log mergeMessages calls (reduced frequency)
      setMessages(prevMessages => {
        // If it's the first load (no previous messages), just set them
        if (prevMessages.length === 0) {
          return newMessages;
        }

        // Create maps for efficient lookup
        const prevMessagesMap = new Map();
        const optimisticMessagesMap = new Map();
        
        prevMessages.forEach(msg => {
          if (msg.isOptimistic) {
            // Use message content + senderId as key for optimistic messages
            const key = `${msg.message}::${msg.senderId}`;
            optimisticMessagesMap.set(key, msg);
          }
          prevMessagesMap.set(msg.id, msg);
        });

        // Process new messages and handle optimistic message replacement
        const processedMessages = [];
        const processedOptimisticKeys = new Set();
        
        newMessages.forEach(newMsg => {
          if (!newMsg.isOptimistic) {
            // Check if this real message replaces an optimistic one
            const optimisticKey = `${newMsg.message}::${newMsg.senderId}`;
            if (optimisticMessagesMap.has(optimisticKey)) {
              // Mark optimistic message as processed
              processedOptimisticKeys.add(optimisticKey);
              const optimisticMsg = optimisticMessagesMap.get(optimisticKey);
              // Preserve the same React key by keeping the optimistic message ID
              processedMessages.push({
                ...newMsg,
                id: optimisticMsg.id, // Keep the same ID to prevent re-render
                _realId: newMsg.id, // Store real ID for reference
                isOptimistic: false
              });
            } else {
              processedMessages.push(newMsg);
            }
          }
        });

        // Add remaining optimistic messages that weren't replaced
        optimisticMessagesMap.forEach((msg, key) => {
          if (!processedOptimisticKeys.has(key)) {
            processedMessages.push(msg);
          }
        });

        // Sort by timestamp to maintain order
        processedMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeA - timeB;
        });

        return processedMessages;
      });
    }, []);

    // Track if this is the initial load or a new message
    const isInitialLoad = useRef(true);
    const previousMessageCount = useRef(0);

    // Effect to handle scroll positioning - Messenger style (before paint)
    useLayoutEffect(() => {
      if (messages.length === 0) return;

      const isNewMessage = messages.length > previousMessageCount.current;
      const isFirstLoad = isInitialLoad.current && messages.length > 0;
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.senderId === auth.currentUser?.uid;

      if (isFirstLoad) {
        // On initial load, position instantly at bottom BEFORE paint
        scrollToBottomInstant();
        isInitialLoad.current = false;
        wasNearBottomRef.current = true;
      } else if (isNewMessage) {
        // Use the PREVIOUS scroll state, don't recalculate after new message is added
        const shouldAutoScroll = wasNearBottomRef.current;
        
        if (isOwnMessage) {
          // Always auto-scroll for admin's own messages
          scrollToBottomInstant();
          wasNearBottomRef.current = true;
        } else if (shouldAutoScroll) {
          // Auto-scroll for user messages only if admin was near bottom
          scrollToBottomInstant();
          wasNearBottomRef.current = true;
          // Only auto-mark if this is a user message and admin is viewing
          if (!isOwnMessage && isViewingConversation) {
            checkAutoMark();
          }
        } else {
          // Show scroll to bottom button if admin was scrolled up
          setShowScrollToBottom(true);
        }
      }

      previousMessageCount.current = messages.length;
    }, [messages.length, scrollToBottomInstant, auth.currentUser?.uid]);

    // Reset initial load flag when conversation changes
    useEffect(() => {
      isInitialLoad.current = true;
      previousMessageCount.current = 0;
    }, [selectedConversationId]);

    // Manage viewing state based on conversation visibility
    useEffect(() => {
      if (selectedConversationId && selectedConversation) {
        setIsViewingConversation(true);
        // Delayed auto-mark check to ensure proper state
        const timer = setTimeout(() => {
          if (selectedConversationId && selectedConversation && (selectedConversation.adminUnreadCount || 0) > 0) {
            checkAutoMark();
          }
        }, 1000); // Increased delay to prevent rapid calls
        
        return () => clearTimeout(timer);
      } else {
        setIsViewingConversation(false);
      }
    }, [selectedConversationId, selectedConversation?.id, selectedConversation?.adminUnreadCount]);

    // Memoized message component with custom comparison to prevent unnecessary re-renders
    const MessageItem = React.memo(({ message, darkMode }: any) => (
      <div
        className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[70%] rounded-lg p-3 ${
            message.sender === 'admin'
              ? 'bg-blue-600 text-white'
              : darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {message.sender === 'admin' ? (
              <Bot className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">{message.senderName}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          <p className={`text-xs mt-1 ${
            message.sender === 'admin' ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {(() => {
              try {
                if (message.isOptimistic) return 'Sending...';
                if (!message.timestamp) return 'Just now';
                
                let date;
                if (message.timestamp?.seconds) {
                  date = new Date(message.timestamp.seconds * 1000);
                } else if (message.timestamp?.toDate) {
                  date = message.timestamp.toDate();
                } else if (typeof message.timestamp === 'string') {
                  date = new Date(message.timestamp);
                } else if (message.timestamp instanceof Date) {
                  date = message.timestamp;
                } else if (typeof message.timestamp === 'number') {
                  date = new Date(message.timestamp);
                } else {
                  date = new Date(message.timestamp);
                }
                
                if (isNaN(date.getTime())) return 'Just now';
                return formatDateTimePST(date);
              } catch (e) {
                console.warn('Error formatting message timestamp:', e, 'Timestamp:', message.timestamp);
                return 'Just now';
              }
            })()}
          </p>
        </div>
      </div>
    ), (prevProps, nextProps) => {
      // Custom comparison to prevent unnecessary re-renders
      // Only re-render if actual content changes, not just object references
      return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.message === nextProps.message.message &&
        prevProps.message.senderName === nextProps.message.senderName &&
        prevProps.message.sender === nextProps.message.sender &&
        prevProps.message.isOptimistic === nextProps.message.isOptimistic &&
        prevProps.message.timestamp === nextProps.message.timestamp &&
        prevProps.darkMode === nextProps.darkMode
      );
    });

    // Memoized messages list component to prevent unnecessary re-renders
    const MessagesList = React.memo(({ messages, darkMode }: any) => {
      // Debug: Log when MessagesList re-renders (reduced frequency)
      return (
        <div className="space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            darkMode={darkMode}
          />
        ))}
        </div>
      );
    }, (prevProps, nextProps) => {
      // Only re-render if messages array length changes or darkMode changes
      if (prevProps.messages.length !== nextProps.messages.length || 
          prevProps.darkMode !== nextProps.darkMode) {
        return false;
      }
      
      // Deep compare messages only if lengths are same
      return prevProps.messages.every((msg, index) => {
        const nextMsg = nextProps.messages[index];
        return msg.id === nextMsg.id && 
               msg.message === nextMsg.message &&
               msg.isOptimistic === nextMsg.isOptimistic;
      });
    });

    // Update selected conversation when conversations list changes (FIXED - no circular dependency)
    useEffect(() => {
      if (selectedConversationId && conversations.length > 0) {
        const conv = conversations.find(c => c.id === selectedConversationId);
        if (conv) {
          setSelectedConversation(conv);
        }
        // Don't clear selectedConversationId here to avoid circular dependency
      }
    }, [conversations, selectedConversationId]);

    // Separate effect for localStorage restoration (FIXED - no circular dependency)  
    useEffect(() => {
      if (!selectedConversationId && conversations.length > 0) {
        const storedId = localStorage.getItem('adminSelectedConversationId');
        if (storedId) {
          const conv = conversations.find(c => c.id === storedId);
          if (conv) {
            setSelectedConversationId(storedId);
            setSelectedConversation(conv);
          } else {
            localStorage.removeItem('adminSelectedConversationId');
          }
        }
      }
    }, [conversations]); // REMOVED selectedConversationId from dependencies!

    // Real-time conversations subscription - copy user-side approach
    useEffect(() => {
      const unsubscribe = firestoreOperations.subscribeToHelpConversations(
        null, // null for admin to get all conversations
        (updatedConversations) => {
          setConversations(updatedConversations);
          setConversationsLoading(false);
          
          // Don't update parent state here - it causes full re-render
          // const totalUnread = updatedConversations.reduce((sum, conv) => sum + (conv.adminUnreadCount || 0), 0);
          // setTotalUnreadHelpMessages(totalUnread);
        }
      );

      return unsubscribe;
    }, []); // Empty dependency array - subscription only created once

    // Real-time messages subscription - copy user-side approach
    useEffect(() => {
      if (!selectedConversationId) return;

      // Clear messages when switching conversations to prevent stale data
      setMessages([]);
      setMessagesLoading(true);
      
      // Immediately scroll to bottom to prevent any visual jumping
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }

      const unsubscribe = firestoreOperations.subscribeToHelpMessages(
        selectedConversationId,
        (updatedMessages) => {
          mergeMessages(updatedMessages);
          setMessagesLoading(false);
          // Smart merging prevents reload behavior
        }
      );

      return unsubscribe;
    }, [selectedConversationId, mergeMessages]); // Keep mergeMessages but it's now stable

    // NO SCROLL LOGIC - CLEAN STATE

    // NO AUTO SCROLL - NUKED

    // Removed auto-marking timer that was causing conversation to close



    // Select a conversation - copy user-side approach
    const selectConversation = async (conversation) => {
      const conversationId = conversation?.id || null;
      setSelectedConversationId(conversationId);
      setSelectedConversation(conversation);
      
      // Persist to localStorage to prevent closing on updates
      if (conversationId) {
        localStorage.setItem('adminSelectedConversationId', conversationId);
      } else {
        localStorage.removeItem('adminSelectedConversationId');
      }
      
      // No automatic marking - only mark as read manually when admin explicitly views
    };


    const loadMessages = async (conversationId) => {
      try {
        setMessagesLoading(true);
        const conversationMessages = await firestoreOperations.getHelpMessages(conversationId);
        setMessages(conversationMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        showStatusMessage('Failed to load messages', 'error');
      } finally {
        setMessagesLoading(false);
      }
    };

    const sendMessage = async () => {
      if (!newMessage.trim() || !selectedConversation) return;

      try {
        const messageData = {
          conversationId: selectedConversationId,
          message: newMessage.trim(),
          sender: 'admin',
          senderName: auth.currentUser?.displayName || 'Admin',
          senderEmail: auth.currentUser?.email,
          senderId: auth.currentUser?.uid,
          timestamp: new Date().toISOString(),
          read: false
        };

        // Add optimistic update for instant UI feedback
        // Use a stable ID that won't change when the real message arrives
        const timestamp = Date.now();
        const optimisticId = `temp-${timestamp}-${messageData.senderId}`;
        const optimisticMessage = {
          id: optimisticId,
          ...messageData,
          isOptimistic: true,
          _tempTimestamp: timestamp // For sorting if needed
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');

        await firestoreOperations.addHelpMessage(messageData);
        // Real-time subscription will update the UI automatically
      } catch (error) {
        console.error('Error sending message:', error);
        showStatusMessage('Failed to send message', 'error');
      }
    };

    const updateConversationStatus = async (conversationId, status) => {
      try {
        await firestoreOperations.updateHelpConversation(conversationId, { status });
        
        // Don't update local state immediately - let real-time subscription handle it
        // This prevents disrupting the currently open conversation
        
        showStatusMessage(`Conversation marked as ${status}`, 'success');
      } catch (error) {
        console.error('Error updating conversation status:', error);
        showStatusMessage('Failed to update status', 'error');
      }
    };

    const getStatusBadge = (status) => {
      switch (status) {
        case 'open':
          return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Open</span>;
        case 'in-progress':
          return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">In Progress</span>;
        case 'resolved':
          return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Resolved</span>;
        default:
          return null;
      }
    };

    const getTypeBadge = (type) => {
      switch (type) {
        case 'bug':
          return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Bug</span>;
        case 'feature':
          return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">Feature</span>;
        case 'help':
          return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Help</span>;
        default:
          return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">General</span>;
      }
    };

    // Cleanup effect for timeouts on unmount
    useEffect(() => {
      return () => {
        // Clear auto-mark timeout
        if (checkAutoMarkRef.current) {
          clearTimeout(checkAutoMarkRef.current);
        }
        // Clear scroll timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="space-y-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Help Chat Management</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className={`lg:col-span-1 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Conversations</h3>
                {conversations.length > 0 && (
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {filteredConversations.length} of {conversations.length} conversations
                  </p>
                )}
              </div>
              {(searchTerm || filterType !== 'all' || filterPriority !== 'all' || filterStatus !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-3 gap-2">
                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`px-2 py-1.5 text-xs border rounded ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="all">All Types</option>
                  <option value="general">General</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="help">Help</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className={`px-2 py-1.5 text-xs border rounded ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`px-2 py-1.5 text-xs border rounded ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : conversations.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No conversations yet
              </p>
            ) : filteredConversations.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No conversations match your filters
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-4">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${
                      selectedConversationId === conv.id
                        ? darkMode ? 'bg-blue-900 bg-opacity-50 border-blue-500' : 'bg-blue-50 border-blue-300'
                        : (conv.adminUnreadCount || 0) > 0
                        ? darkMode ? 'hover:bg-gray-700 border-red-600 bg-red-900 bg-opacity-10' : 'hover:bg-gray-50 border-red-300 bg-red-50'
                        : darkMode ? 'hover:bg-gray-700 border-transparent' : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 flex-1">
                        <h4 className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {conv.subject}
                        </h4>
                        {(conv.adminUnreadCount || 0) > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                            {conv.adminUnreadCount > 99 ? '99+' : conv.adminUnreadCount}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(conv.status)}
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      {conv.userName} • {(() => {
                        try {
                          if (!conv.createdAt) return 'Recently';
                          
                          let date;
                          if (conv.createdAt?.seconds) {
                            // Firestore Timestamp with seconds
                            date = new Date(conv.createdAt.seconds * 1000);
                          } else if (conv.createdAt?.toDate) {
                            // Firestore Timestamp with toDate method
                            date = conv.createdAt.toDate();
                          } else if (typeof conv.createdAt === 'string') {
                            // ISO string
                            date = new Date(conv.createdAt);
                          } else if (conv.createdAt instanceof Date) {
                            // Already a Date object
                            date = conv.createdAt;
                          } else if (typeof conv.createdAt === 'number') {
                            // Unix timestamp
                            date = new Date(conv.createdAt);
                          } else {
                            // Unknown format, try direct conversion
                            date = new Date(conv.createdAt);
                          }
                          
                          if (isNaN(date.getTime())) return 'Recently';
                          return formatDatePST(date, { month: 'short', day: 'numeric' });
                        } catch (e) {
                          console.warn('Error formatting conversation date:', e, 'CreatedAt:', conv.createdAt);
                          return 'Recently';
                        }
                      })()}
                    </p>
                    <div className="flex gap-2">
                      {getTypeBadge(conv.type)}
                      {conv.priority === 'urgent' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                          Urgent
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat View */}
          <div className={`lg:col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow h-[600px] overflow-hidden`}>
            {selectedConversationId ? (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} style={{ flexShrink: 0 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedConversation?.subject || 'Loading...'}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedConversation ? `${selectedConversation.userName} (${selectedConversation.userEmail})` : 'Loading...'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedConversation?.status !== 'resolved' && (
                        <>
                          <button
                            onClick={() => updateConversationStatus(selectedConversation.id, 'in-progress')}
                            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          >
                            Mark In Progress
                          </button>
                          <button
                            onClick={() => updateConversationStatus(selectedConversation.id, 'resolved')}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Mark Resolved
                          </button>
                        </>
                      )}
                      {/* Manual Close Button */}
                      <button
                        onClick={() => {
                          setSelectedConversationId(null);
                          setSelectedConversation(null);
                          setMessages([]);
                          localStorage.removeItem('adminSelectedConversationId');
                        }}
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        aria-label="Close conversation"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  ref={messagesContainerRef} 
                  className="flex-1 overflow-y-auto p-4 relative flex flex-col"
                  onScroll={handleScroll}
                >
                  {messagesLoading ? (
                    <div className="flex justify-center items-center flex-1">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {/* Spacer to push messages to bottom when there are few messages */}
                      <div className="flex-1 min-h-0"></div>
                      <MessagesList messages={messages} darkMode={darkMode} />
                      {/* Scroll anchor for auto-scroll to bottom */}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                  
                  {/* Scroll to bottom button - positioned relative to messages container */}
                  {showScrollToBottom && (
                    <button
                      onClick={() => scrollToBottomSmooth()}
                      className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                      aria-label="Scroll to bottom"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Message Input */}
                {selectedConversation?.status !== 'resolved' && (
                  <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} style={{ flexShrink: 0 }}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your message..."
                        className={`flex-1 px-3 py-2 rounded-lg border ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a conversation to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.darkMode === nextProps.darkMode &&
      prevProps.firestoreOperations === nextProps.firestoreOperations &&
      prevProps.auth?.currentUser?.uid === nextProps.auth?.currentUser?.uid &&
      prevProps.showStatusMessage === nextProps.showStatusMessage &&
      prevProps.formatDateTimePST === nextProps.formatDateTimePST &&
      prevProps.formatDatePST === nextProps.formatDatePST
    );
  });
  
  // Render admin content based on active section
  const renderAdminContent = () => {
    switch (adminActiveSection) {
      case 'overview':
        return <AdminOverview />;
      case 'users':
        return <UserManagement />;
      case 'stations':
        return <StationManagement />;
      case 'reports':
        return <AdminReports />;
      case 'analytics':
        return <AnalyticsComponent />;
      case 'audit':
        return <AuditLogs />;
      case 'help-chats':
        return <HelpChats 
          darkMode={darkMode} 
          firestoreOperations={firestoreOperations} 
          auth={auth} 
          showStatusMessage={showStatusMessage}
          formatDateTimePST={formatDateTimePST}
          formatDatePST={formatDatePST}
        />;
      default:
        return <AdminOverview />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout darkMode={darkMode} setDarkMode={setDarkMode} selectedStation={selectedStation} setSelectedStation={setSelectedStation}>
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout darkMode={darkMode} setDarkMode={setDarkMode} selectedStation={selectedStation} setSelectedStation={setSelectedStation}>
        <div className={`${darkMode ? 'bg-red-900 border-red-800 text-red-200' : 'bg-red-100 border-red-400 text-red-700'} px-4 py-3 rounded relative mb-6`} role="alert">
          <span className="block sm:inline">{error}</span>
          <button 
            className={`mt-2 ${darkMode ? 'bg-red-700 hover:bg-red-800' : 'bg-red-500 hover:bg-red-700'} text-white font-bold py-2 px-4 rounded`}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // Status Message Component
  const StatusMessage = () => {
    if (!statusMessage.visible) return null;
    
    let bgColorClass, textColorClass;
    
    switch (statusMessage.type) {
      case 'success':
        bgColorClass = darkMode ? 'bg-green-900 border-green-700' : 'bg-green-100 border-green-500';
        textColorClass = darkMode ? 'text-green-200' : 'text-green-800';
        break;
      case 'error':
        bgColorClass = darkMode ? 'bg-red-900 border-red-700' : 'bg-red-100 border-red-500';
        textColorClass = darkMode ? 'text-red-200' : 'text-red-800';
        break;
      case 'info':
        bgColorClass = darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-100 border-blue-500';
        textColorClass = darkMode ? 'text-blue-200' : 'text-blue-800';
        break;
      default:
        bgColorClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300';
        textColorClass = darkMode ? 'text-gray-200' : 'text-gray-800';
    }
    
    return (
      <div 
        className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md border ${bgColorClass} ${textColorClass} 
                   transition-opacity duration-300 ease-in-out ${statusMessage.visible ? 'opacity-100' : 'opacity-0'}`}
      >
        {statusMessage.text}
      </div>
    );
  };
  
  // Confirmation Dialog Component
  const ConfirmationModal = () => {
    if (!confirmDialog.isOpen) return null;
    
    // Handle potential line breaks in the message
    const messageLines = confirmDialog.message.split('\n');
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md shadow-lg border ${
          confirmDialog.title.toLowerCase().includes('warning') 
            ? (darkMode ? 'border-red-700' : 'border-red-400') 
            : (darkMode ? 'border-gray-700' : 'border-gray-300')
        }`}>
          <h3 className={`text-xl font-bold mb-4 ${
            confirmDialog.title.toLowerCase().includes('warning')
              ? (darkMode ? 'text-red-400' : 'text-red-600')
              : (darkMode ? 'text-white' : 'text-gray-900')
          }`}>
            {confirmDialog.title}
          </h3>
          
          <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {messageLines.map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < messageLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
              className={`px-4 py-2 border rounded-md ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const { onConfirm } = confirmDialog;
                setConfirmDialog({ ...confirmDialog, isOpen: false });
                if (onConfirm) onConfirm();
              }}
              className={`px-4 py-2 text-white rounded-md ${
                confirmDialog.title.toLowerCase().includes('warning')
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} selectedStation={selectedStation} setSelectedStation={setSelectedStation}>
      <StatusMessage />
      <ConfirmationModal />
      <AdminNavigation />
      {renderAdminContent()}
      
      {/* Modals */}
      {showUserModal && <UserModal 
        user={selectedUser} 
        stations={allStations}
        setShowModal={setShowUserModal}
        saveUser={async (userData) => {
          try {
            // Call Firestore to save the user
            const savedUser = await firestoreOperations.saveUser(userData);
            
            if (savedUser) {
              if (selectedUser) {
                // Update existing user in the local state
                setUsers(users.map(u => u.id === selectedUser.id ? savedUser : u));
                showStatusMessage(`User ${savedUser.firstName} ${savedUser.lastName} updated successfully`, "success");
              } else {
                // Add new user to the local state
                setUsers([...users, savedUser]);
                showStatusMessage(`User ${savedUser.firstName} ${savedUser.lastName} created successfully`, "success");
              }
              setShowUserModal(false);
            } else {
              console.error("Failed to save user");
            }
          } catch (error) {
            console.error("Error while saving user:", error);
          }
        }}
        darkMode={darkMode} 
      />}
      
      {showStationModal && <StationModal 
        station={selectedStationData}
        captains={users.filter(u => u.role === 'admin' || ['Captain', 'Deputy Chief', 'Battalion Chief', 'Chief'].includes(u.rank))}
        setShowModal={setShowStationModal}
        saveStation={async (stationData) => {
          try {
            // Ensure crewIds is included if not present
            if (!stationData.crewIds) {
              stationData.crewIds = selectedStationData?.crewIds || [];
            }
            
            // Call Firestore to save the station
            const savedStation = await firestoreOperations.saveStation(stationData);
            
            if (savedStation) {
              if (selectedStationData) {
                showStatusMessage(`Station ${savedStation.name} updated successfully`, "success");
              } else {
                showStatusMessage(`Station ${savedStation.name} created successfully`, "success");
                // For new stations, go to the last page to see the new station
                const newTotalStations = totalStations + 1;
                const lastPage = Math.ceil(newTotalStations / stationsPerPage);
                setCurrentStationPage(lastPage);
              }
              
              // Refresh station data for current page
              const refreshStations = async () => {
                try {
                  const paginatedResult = await firestoreOperations.getPaginatedStations(
                    currentStationPage,
                    stationsPerPage
                  );
                  
                  if (paginatedResult.stations) {
                    const formattedStations = paginatedResult.stations.map(station => ({
                      id: station.id,
                      number: station.number || station.id.replace('s', ''),
                      name: station.name || `Station ${station.number || ''}`,
                      address: station.address || '',
                      phone: station.phone || '',
                      captainId: station.captainId || null,
                      crewIds: station.crewIds || [],
                      apparatus: station.apparatus || [],
                      createdAt: station.createdAt || new Date().toISOString()
                    }));
                    
                    setStations(formattedStations);
                    setTotalStations(paginatedResult.totalStations || 0);
                  }
                } catch (error) {
                  console.error("Error refreshing stations:", error);
                }
              };
              
              // Reload page after short delay to show success message
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              console.error("Failed to save station");
            }
          } catch (error) {
            console.error("Error while saving station:", error);
          }
        }}
        darkMode={darkMode}
      />}
    </Layout>
  );
};

export default React.memo(AdminPortal);