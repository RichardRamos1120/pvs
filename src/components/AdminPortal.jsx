// src/components/AdminPortal.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FirestoreContext } from '../App';
import Layout from './Layout';
import UserModal from './modals/UserModal';
import StationModal from './modals/StationModal';
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
  Eye
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
            console.log("Fetched users from Firestore:", usersCollection);
            
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
            console.log("No users found in Firestore");
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
            console.log("Fetched stations from Firestore:", stationsData);
            
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
            console.log("No stations found in Firestore");
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
            console.log("Fetched deleted users from Firestore:", deletedUsersData);
            setDeletedUsers(deletedUsersData);
          } else {
            console.log("No deleted users found in Firestore");
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

  const getApparatusStatusColor = (status) => {
    switch (status) {
      case 'operational': return `${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`;
      case 'maintenance': return `${darkMode ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-800'}`;
      case 'out-of-service': return `${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'}`;
      default: return `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`;
    }
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
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
      <div className="flex overflow-x-auto">
        <button
          onClick={() => setAdminActiveSection('overview')}
          className={`px-6 py-3 flex items-center whitespace-nowrap ${
            adminActiveSection === 'overview' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Activity className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button
          onClick={() => setAdminActiveSection('users')}
          className={`px-6 py-3 flex items-center whitespace-nowrap ${
            adminActiveSection === 'users' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Users
        </button>
        <button
          onClick={() => setAdminActiveSection('stations')}
          className={`px-6 py-3 flex items-center whitespace-nowrap ${
            adminActiveSection === 'stations' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Stations
        </button>
        <button
          onClick={() => setAdminActiveSection('reports')}
          className={`px-6 py-3 flex items-center whitespace-nowrap ${
            adminActiveSection === 'reports' 
              ? `${darkMode ? 'bg-gray-700 text-blue-400 font-medium border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 font-medium border-b-2 border-blue-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <FileBarChart className="w-4 h-4 mr-2" />
          Reports
        </button>
        <button
          onClick={() => setAdminActiveSection('deleted-users')}
          className={`px-6 py-3 flex items-center whitespace-nowrap ${
            adminActiveSection === 'deleted-users' 
              ? `${darkMode ? 'bg-gray-700 text-red-400 font-medium border-b-2 border-red-500' : 'bg-red-50 text-red-600 font-medium border-b-2 border-red-600'}` 
              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
          }`}
        >
          <Trash className="w-4 h-4 mr-2" />
          Deleted Users
        </button>
      </div>
    </div>
  );

  // Admin Overview Component
  const AdminOverview = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const totalStations = stations.length;

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
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
          <div className="space-y-3">
            <div className={`flex items-center justify-between py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <Activity className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mr-3`} />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>User Sarah Chen logged in</span>
              </div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>2 hours ago</span>
            </div>
            <div className={`flex items-center justify-between py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'} mr-3`} />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>GAR Assessment (AMBER) published for Station 23</span>
              </div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>3 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <FileText className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'} mr-3`} />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Daily log completed for Station 12</span>
              </div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // User Management Component
  const UserManagement = () => {
    const [userSearchTerm, setUserSearchTerm] = useState('');
    
    // Filter users based on local userSearchTerm state
    const filteredUsers = users.filter(user =>
      user.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
    
    const handleCreateUser = () => {
      setSelectedUser(null);
      setShowUserModal(true);
    };

    const handleEditUser = (user) => {
      setSelectedUser(user);
      setShowUserModal(true);
    };

    const handleDeleteUser = (userId) => {
      // Let's log what's happening for debugging
      console.log(`Delete requested for user with ID: ${userId}`);
      
      // Get the user for the confirmation dialog
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) {
        console.error(`User with ID ${userId} not found in local state`);
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
            console.log(`Calling softDeleteUser for ${userId}`);
            const result = await firestoreOperations.softDeleteUser(userId);
            console.log("Soft delete result:", result);
            
            if (result.success) {
              // Update local state
              setUsers(users.filter(u => u.id !== userId));
              console.log(`User ${userId} has been marked for deletion`);
              
              // Show temporary success message
              showStatusMessage("User has been successfully deleted", "success");
              
              // Log information for debugging but don't show to user
              if (result.requiresAuthDeletion && result.email) {
                console.log(`To complete deletion process, delete user with email '${result.email}' from Firebase Authentication`);
              }
            } else {
              console.error(`Failed to delete user ${userId}: ${result.message}`);
              showStatusMessage(`Failed to delete user: ${result.message}`, "error");
            }
          } catch (error) {
            console.error("Error processing user deletion:", error);
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
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className={`w-4 h-4 absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className={`w-full pl-10 pr-4 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'} rounded-md`}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              <button className={`flex items-center px-3 py-2 border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md`}>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
              <button className={`flex items-center px-3 py-2 border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md`}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
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
        console.error(`Station with ID ${stationId} not found in local state`);
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
                console.log(`Station ${stationId} deleted successfully with affected items:`, result.affected);
                
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
                
                console.error(`Failed to delete station ${stationId}: ${result.message}`);
                showStatusMessage(`Failed to delete station: ${result.message}`, "error");
              }
            } catch (error) {
              // Hide processing message
              setStatusMessage(prev => ({ ...prev, visible: false }));
              
              console.error("Error deleting station:", error);
              showStatusMessage(`Error: ${error.message}`, "error");
            }
          }
        });
      } catch (error) {
        // Hide any loading message
        setStatusMessage(prev => ({ ...prev, visible: false }));
        
        console.error("Error preparing station deletion:", error);
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

                  <div>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Apparatus Status</p>
                    <div className="space-y-1">
                      {station.apparatus.map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getApparatusStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
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
  const AdminReports = () => (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Reports & Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>GAR Assessments</h3>
            <FileBarChart className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>View historical GAR assessment data and trends</p>
          <button className={`w-full px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md`}>
            View Reports
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Daily Logs</h3>
            <FileText className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>Browse and analyze daily logs from all stations</p>
          <button className={`w-full px-4 py-2 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md`}>
            View Logs
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Activity</h3>
            <Activity className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>Track user engagement and system usage</p>
          <button className={`w-full px-4 py-2 ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-md`}>
            View Analytics
          </button>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Exports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md`}>
            <Download className="w-4 h-4 mr-2" />
            Export User List
          </button>
          <button className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md`}>
            <Download className="w-4 h-4 mr-2" />
            Export Station Data
          </button>
          <button className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md`}>
            <Download className="w-4 h-4 mr-2" />
            Export GAR History
          </button>
          <button className={`flex items-center justify-center px-4 py-3 border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md`}>
            <Download className="w-4 h-4 mr-2" />
            Export Daily Logs
          </button>
        </div>
      </div>
    </div>
  );

  // Deleted Users Management Component
  const DeletedUsersManagement = () => {
    const [deletedSearchTerm, setDeletedSearchTerm] = useState('');
    
    const filteredDeletedUsers = deletedUsers.filter(user =>
      (user.firstName && user.firstName.toLowerCase().includes(deletedSearchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(deletedSearchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(deletedSearchTerm.toLowerCase()))
    );

    const handleRestoreUser = async (userId) => {
      if (window.confirm('Are you sure you want to restore this user?')) {
        try {
          // In a real implementation, you would:
          // 1. Get user data from deletedUsers collection
          // 2. Add it back to users collection
          // 3. Delete from deletedUsers collection
          
          showStatusMessage("User restoration feature coming soon", "info");
        } catch (error) {
          console.error("Error restoring user:", error);
        }
      }
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
        captains={users.filter(u => u.role === 'captain')}
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