import React, { useState, useEffect, useContext } from 'react';
import { X, Search, Users, Mail, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { FirestoreContext } from '../App';

const NotificationRecipientsModal = ({ 
  isOpen, 
  onClose, 
  currentRecipients = { groups: [], users: [] },
  onSave 
}) => {
  const firestoreOperations = useContext(FirestoreContext);
  
  // State for managing available users and filtering
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // State for managing selections
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Pagination state for individual users
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;
  
  // Predefined recipient groups
  const availableGroups = [
    { id: 'all_firefighters', name: 'All Firefighters', description: 'All users with firefighter role' },
    { id: 'all_officers', name: 'All Officers', description: 'All users with captain or lieutenant roles' },
    { id: 'all_chiefs', name: 'Chief Staff', description: 'All users with chief or admin roles' },
    { id: 'all_active', name: 'All Active Personnel', description: 'All active users regardless of role' }
  ];

  // Initialize selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedGroups(currentRecipients.groups || []);
      setSelectedUsers(currentRecipients.users || []);
      fetchUsers();
    }
  }, [isOpen, currentRecipients]);

  // Filter users based on search and filter criteria
  useEffect(() => {
    let filtered = availableUsers;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.displayName || '').toLowerCase().includes(searchLower) ||
        (user.firstName || '').toLowerCase().includes(searchLower) ||
        (user.lastName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply station filter
    if (stationFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.station === stationFilter || user.stationId === stationFilter
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [availableUsers, searchTerm, stationFilter, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const users = await firestoreOperations.getAllUsers();
      
      // Clean and filter users
      const cleanedUsers = users
        .filter(user => user.email && !user.email.includes('dummy'))
        .map(user => ({
          id: user.id,
          displayName: user.displayName || user.firstName || 'Unknown User',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          station: user.station || 'Unknown Station',
          stationId: user.stationId || '',
          role: user.role || 'firefighter',
          status: user.status || 'active'
        }))
        .filter(user => user.status === 'active');

      setAvailableUsers(cleanedUsers);
      setFilteredUsers(cleanedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    const recipientsData = {
      groups: selectedGroups,
      users: selectedUsers,
      // Include metadata for display purposes
      groupsData: availableGroups.filter(group => selectedGroups.includes(group.id)),
      usersData: availableUsers.filter(user => selectedUsers.includes(user.id))
    };
    
    onSave(recipientsData);
    onClose();
  };

  const handleClear = () => {
    setSelectedGroups([]);
    setSelectedUsers([]);
  };

  const getSelectedCount = () => {
    let count = 0;
    
    // Count group members
    selectedGroups.forEach(groupId => {
      switch (groupId) {
        case 'all_firefighters':
          count += availableUsers.filter(u => u.role === 'firefighter').length;
          break;
        case 'all_officers':
          count += availableUsers.filter(u => ['captain', 'lieutenant'].includes(u.role)).length;
          break;
        case 'all_chiefs':
          count += availableUsers.filter(u => ['chief', 'admin'].includes(u.role)).length;
          break;
        case 'all_active':
          count += availableUsers.length;
          break;
      }
    });
    
    // Add individual users (but avoid double counting if they're also in groups)
    count += selectedUsers.length;
    
    return count;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Select Notification Recipients
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choose who will receive email notifications about this GAR assessment
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Available Recipients */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Available Recipients
            </h3>
            
            {/* Individual Users */}
            <div className="flex-1 flex flex-col mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Individual Users
              </h4>
              
              {/* Search and Filters */}
              <div className="space-y-2 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <select
                    value={stationFilter}
                    onChange={(e) => setStationFilter(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Stations</option>
                    {[...new Set(availableUsers.map(u => u.station))].map(station => (
                      <option key={station} value={station}>
                        {station === 'Unknown Station' ? 'Unassigned' : station}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="firefighter">Firefighter</option>
                    <option value="lieutenant">Lieutenant</option>
                    <option value="captain">Captain</option>
                    <option value="chief">Chief</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                  ) : filteredUsers.length > 0 ? (() => {
                    // Calculate pagination
                    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                    const startIndex = (currentPage - 1) * usersPerPage;
                    const endIndex = startIndex + usersPerPage;
                    const currentUsers = filteredUsers.slice(startIndex, endIndex);
                    
                    return (
                      <div className="space-y-1 p-2">
                        {currentUsers.map(user => (
                          <div
                            key={user.id}
                            className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                              selectedUsers.includes(user.id)
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => handleUserToggle(user.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserToggle(user.id)}
                              className="sr-only"
                              tabIndex={-1}
                            />
                            <div className={`flex items-center justify-center w-5 h-5 mr-3 border-2 rounded flex-shrink-0 ${
                              selectedUsers.includes(user.id)
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                            }`}>
                              {selectedUsers.includes(user.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-green-500" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {user.displayName}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {user.email} • {user.station} • {user.role}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })() : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No users found matching your criteria
                    </div>
                  )}
                </div>
                
                {/* Pagination Controls */}
                {!loading && filteredUsers.length > usersPerPage && (() => {
                  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                  const startItem = (currentPage - 1) * usersPerPage + 1;
                  const endItem = Math.min(currentPage * usersPerPage, filteredUsers.length);
                  
                  return (
                    <div className="border-t border-gray-200 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {startItem}-{endItem} of {filteredUsers.length}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Recipient Groups */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Department Groups
              </h4>
              <div className="space-y-2">
                {availableGroups.map(group => (
                  <div
                    key={group.id}
                    className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                      selectedGroups.includes(group.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleGroupToggle(group.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="sr-only"
                      tabIndex={-1}
                    />
                    <div className={`flex items-center justify-center w-5 h-5 mr-3 border-2 rounded flex-shrink-0 ${
                      selectedGroups.includes(group.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    }`}>
                      {selectedGroups.includes(group.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {group.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {group.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Selected Recipients Summary */}
          <div className="w-1/2 p-6 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Selected Recipients
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ~{getSelectedCount()} people
              </span>
            </div>

            {/* Selected Groups */}
            {selectedGroups.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Groups
                </h4>
                <div className="space-y-2">
                  {selectedGroups.map(groupId => {
                    const group = availableGroups.find(g => g.id === groupId);
                    return (
                      <div
                        key={groupId}
                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
                      >
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            {group?.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleGroupToggle(groupId)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Individual Users */}
            {selectedUsers.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Individual Users
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                  {selectedUsers.map(userId => {
                    const user = availableUsers.find(u => u.id === userId);
                    return user ? (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <Mail className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {user.displayName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUserToggle(userId)}
                          className="text-green-600 hover:text-green-800 text-xs ml-2 flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {selectedGroups.length === 0 && selectedUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No recipients selected</p>
                <p className="text-sm">Select groups or individual users to notify</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClear}
            disabled={selectedGroups.length === 0 && selectedUsers.length === 0}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Recipients ({getSelectedCount()})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationRecipientsModal;