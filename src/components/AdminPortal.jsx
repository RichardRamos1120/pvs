// src/components/AdminPortal.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import UserModal from './modals/UserModal';
import StationModal from './modals/StationModal';
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
  ArrowLeft
} from 'lucide-react';

const AdminPortal = ({ darkMode, setDarkMode, selectedStation, setSelectedStation }) => {
  const [adminActiveSection, setAdminActiveSection] = useState('overview');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedStationData, setSelectedStationData] = useState(null);
  // We'll move searchTerm to individual components for better state isolation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '', visible: false });
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null 
  });

  // Move user filter states to parent level to prevent resets
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const navigate = useNavigate();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);

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
        
        // Check if user is admin
        if (profile && profile.role !== 'admin') {
          setError('You do not have permission to access this page.');
          navigate('/dashboard');
          return;
        }

        // Fetch all users from Firestore
        try {
          // Get all users from the 'users' collection
          const usersCollection = await firestoreOperations.getAllUsers();
          
          if (usersCollection && usersCollection.length > 0) {
            // Format data to match our component's expected structure
            const formattedUsers = usersCollection.map(user => ({
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
            
            setUsers(formattedUsers);
          } else {
            // No default user - empty array means no users
            setUsers([]);
          }
        } catch (error) {
          console.error("Error fetching users:", error);
          setError("Failed to load users.");
          
          // No fallback data, just empty array
          setUsers([]);
        }

        // Fetch all stations
        try {
          const stationsData = await firestoreOperations.getStations();
          
          if (stationsData && stationsData.length > 0) {
            // Format stations data
            const formattedStations = stationsData.map(station => ({
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
          } else {
            // No fallback - an empty array indicates no stations
            setStations([]);
          }
        } catch (error) {
          console.error("Error fetching stations:", error);
          setError("Failed to load stations.");
          
          // No fallback - just set empty array
          setStations([]);
        }
        
        // Fetch deleted users
        try {
          const deletedUsersData = await firestoreOperations.getDeletedUsers();
          
          if (deletedUsersData && deletedUsersData.length > 0) {
            setDeletedUsers(deletedUsersData);
          } else {
            setDeletedUsers([]);
          }
        } catch (error) {
          console.error("Error fetching deleted users:", error);
          setDeletedUsers([]);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth, firestoreOperations, navigate]);

  // Helper functions
  const getStationName = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    return station ? `Station ${station.number}` : 'Unassigned';
  };
  
  // Helper to show status messages
  const showStatusMessage = (text, type = 'success') => {
    setStatusMessage({ text, type, visible: true });
    
    // Hide message after 3 seconds
    setTimeout(() => {
      setStatusMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const getCaptainName = (captainId) => {
    if (!captainId) return 'No Captain Assigned';
    const captain = users.find(u => u.id === captainId);
    return captain ? `${captain.firstName} ${captain.lastName}` : 'Unknown';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };


  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': 
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      case 'captain': 
        return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800';
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
          onClick={() => setAdminActiveSection('overview')}
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
          onClick={() => setAdminActiveSection('users')}
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
          onClick={() => setAdminActiveSection('stations')}
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
          onClick={() => setAdminActiveSection('reports')}
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
          onClick={() => setAdminActiveSection('deleted-users')}
          className={`px-3 md:px-6 py-3 flex items-center whitespace-nowrap text-sm md:text-base ${
            adminActiveSection === 'deleted-users' 
              ? `${darkMode ? 'bg-gray-700 text-red-400 font-medium border-b-2 border-red-500' : 'bg-red-50 text-red-600 font-medium border-b-2 border-red-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Trash className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Deleted Users</span>
          <span className="sm:hidden">Deleted</span>
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
      const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
      
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
    // Filter users based on search term and filters (using parent state)
    const filteredUsers = users.filter(user => {
      // Text search filter
      const matchesSearch = userSearchTerm === '' || 
        user.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      // Role filter
      const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
      
      // Status filter
      const matchesStatus = userStatusFilter === 'all' || user.status === userStatusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
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
            <div className="flex flex-col space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className={`w-full pl-10 pr-4 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'} rounded-md`}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filters and Export */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filters:</span>
                </div>
                
                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className={`px-3 py-2 border rounded-md text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="captain">Captain</option>
                  <option value="firefighter">Firefighter</option>
                </select>
                
                {/* Status Filter */}
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className={`px-3 py-2 border rounded-md text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                
                {/* Clear Filters Button */}
                {(userRoleFilter !== 'all' || userStatusFilter !== 'all' || userSearchTerm !== '') && (
                  <button
                    onClick={() => {
                      setUserRoleFilter('all');
                      setUserStatusFilter('all');
                      setUserSearchTerm('');
                    }}
                    className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                      darkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Clear Filters
                  </button>
                )}
                
                {/* Results Count */}
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {filteredUsers.length} of {users.length} users
                </span>
                
                {/* Export Button */}
                <div className="ml-auto">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Create a separate function to avoid any closure issues
                      const performExport = () => {
                        try {
                          console.log('Starting export with filters:', { userRoleFilter, userStatusFilter, userSearchTerm });
                          console.log('Filtered users count:', filteredUsers.length);
                          
                          const formattedData = formatUserDataForExport(filteredUsers);
                          const filename = `users_filtered_export_${new Date().toISOString().split('T')[0]}.csv`;
                          downloadCSV(formattedData, filename);
                          
                          // Use setTimeout to avoid immediate state update that might cause re-render
                          setTimeout(() => {
                            showStatusMessage("User list exported successfully", "success");
                          }, 100);
                        } catch (error) {
                          console.error('Error exporting users:', error);
                          setTimeout(() => {
                            showStatusMessage("Export failed: " + error.message, "error");
                          }, 100);
                        }
                      };
                      
                      performExport();
                    }}
                    className={`flex items-center px-3 py-2 border rounded-md transition-colors ${
                      darkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export ({filteredUsers.length})
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
                // Update local state
                setStations(stations.filter(s => s.id !== stationId));
                
                // Also update the local users state if any users were affected
                if (result.affected && result.affected.users > 0) {
                  // Update affected users in the local state by clearing their station
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
                
                // Show detailed success message
                let successMsg = `${stationName} deleted successfully.`;
                if (result.affected) {
                  const { users, logs, assessments } = result.affected;
                  if (users > 0) successMsg += ` Updated ${users} user(s).`;
                  if (logs > 0) successMsg += ` Archived ${logs} log(s).`;
                  if (assessments > 0) successMsg += ` Archived ${assessments} assessment(s).`;
                }
                showStatusMessage(successMsg, "success");
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
                // Update local state
                setStations(stations.filter(s => s.id !== stationId));
                
                // Also update any affected users in the local state
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
      setAdminActiveSection('analytics');
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

  // Deleted Users Management Component
  const DeletedUsersManagement = () => {
    const [deletedSearchTerm, setDeletedSearchTerm] = useState('');
    
    const filteredDeletedUsers = deletedUsers.filter(user =>
      (user.firstName && user.firstName.toLowerCase().includes(deletedSearchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(deletedSearchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(deletedSearchTerm.toLowerCase()))
    );

    const handleRestoreUser = async (userId) => {
      // Get the user for the confirmation dialog
      const userToRestore = deletedUsers.find(u => u.id === userId);
      if (!userToRestore) {
        showStatusMessage("User not found in deleted users list", "error");
        return;
      }

      setConfirmDialog({
        isOpen: true,
        title: 'Confirm User Restoration',
        message: `Are you sure you want to restore ${userToRestore.firstName} ${userToRestore.lastName}? This will move them back to the active users list.`,
        onConfirm: async () => {
          try {
            showStatusMessage("Restoring user...", "info");
            const result = await firestoreOperations.restoreUser(userId);
            
            if (result.success) {
              // Update local state - remove from deleted users
              setDeletedUsers(deletedUsers.filter(u => u.id !== userId));
              
              // Add to active users
              setUsers([...users, result.userData]);
              
              showStatusMessage(`${userToRestore.firstName} ${userToRestore.lastName} has been restored successfully`, "success");
            } else {
              showStatusMessage(`Failed to restore user: ${result.message}`, "error");
            }
          } catch (error) {
            console.error("Error restoring user:", error);
            showStatusMessage(`Error restoring user: ${error.message}`, "error");
          }
        }
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Deleted Users</h2>
          <div className="flex items-center">
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/_/authentication/users', '_blank')}
              className={`px-4 py-2 ${darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md`}
            >
              Open Firebase Auth Console
            </button>
          </div>
        </div>
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search deleted users..."
                className={`w-full pl-10 pr-4 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'} rounded-md`}
                value={deletedSearchTerm}
                onChange={(e) => setDeletedSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    User
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Email
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Role
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Deleted At
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredDeletedUsers.length > 0 ? (
                  filteredDeletedUsers.map((user) => (
                    <tr key={user.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`${darkMode ? 'bg-red-900' : 'bg-red-100'} rounded-full p-2 mr-3`}>
                            <User className={`w-4 h-4 ${darkMode ? 'text-red-300' : 'text-red-600'}`} />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {user.firstName || 'Unknown'} {user.lastName || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {user.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                            : user.role === 'captain'
                            ? (darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800')
                            : (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                        }`}>
                          {user.role || 'Unknown'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.deletedAtFormatted || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-2">
                        <button
                          onClick={() => handleRestoreUser(user.id)}
                          className={darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}
                          title="Restore User"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open('https://console.firebase.google.com/project/_/authentication/users', '_blank')}
                          className={darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}
                          title="Open Firebase Auth Console"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No deleted users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              onClick={() => setAdminActiveSection('reports')}
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
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{count}</span>
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
                    const engagementRate = station.userCount > 0 ? (station.totalActivity / station.userCount).toFixed(1) : 0;
                    
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
                {Object.values(analytics.dailyActivity).map((day) => (
                  <div key={day.date} className="flex justify-between items-center">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(day.date).toLocaleDateString('en-US', { 
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
      case 'deleted-users':
        return <DeletedUsersManagement />;
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
        stations={stations}
        setShowModal={setShowUserModal}
        saveUser={async (userData) => {
          try {
            // Call Firestore to save the user
            const savedUser = await firestoreOperations.saveUser(userData);
            
            if (savedUser) {
              if (selectedUser) {
                // Update existing user in the local state
                setUsers(users.map(u => u.id === selectedUser.id ? savedUser : u));
                console.log(`User ${selectedUser.id} updated successfully`);
                showStatusMessage(`User ${savedUser.firstName} ${savedUser.lastName} updated successfully`, "success");
              } else {
                // Add new user to the local state
                setUsers([...users, savedUser]);
                console.log(`New user created with ID: ${savedUser.id}`);
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
        captains={users.filter(u => u.role === 'captain' || u.role === 'admin')}
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
                // Update existing station in the local state
                setStations(stations.map(s => s.id === selectedStationData.id ? savedStation : s));
                console.log(`Station ${selectedStationData.id} updated successfully`);
                showStatusMessage(`Station ${savedStation.name} updated successfully`, "success");
              } else {
                // Add new station to the local state
                setStations([...stations, savedStation]);
                console.log(`New station created with ID: ${savedStation.id}`);
                showStatusMessage(`Station ${savedStation.name} created successfully`, "success");
              }
              setShowStationModal(false);
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

export default AdminPortal;