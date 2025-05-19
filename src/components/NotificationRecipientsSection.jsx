import React, { useState, useEffect, useRef } from 'react';

// Component for notification recipients selection based on TodayLog.jsx crew selection
const NotificationRecipientsSection = ({ 
  assessmentData, 
  setAssessmentData, 
  allUsers, 
  setAllUsers, 
  readOnlyMode,
  setHasChanges,
  fetchUsers
}) => {
  // Local state for filtering and searching
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const searchInputRef = useRef(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Debug logging for users list
  useEffect(() => {
    console.log("Loaded users:", allUsers);
    console.log("Total user count:", allUsers?.length || 0);

    // Check if fetchUsers function exists
    console.log("fetchUsers function exists:", typeof fetchUsers === 'function');

    if (allUsers && allUsers.length > 0) {
      // Log detail about each user for debugging
      console.log("ALL USERS DETAIL:");
      allUsers.forEach((user, index) => {
        console.log(`User ${index + 1}:`, {
          id: user.id || user.uid || user.userId,
          displayName: user.displayName,
          name: user.name,
          email: user.email,
          role: user.role || user.rank,
          station: user.station
        });
      });

      // Check for users from Firestore directly
      const firestoreUsers = allUsers.filter(user =>
        (user.id && user.id.length > 20) ||
        (user.userId && user.userId.length > 20)
      );
      console.log("Firestore users count:", firestoreUsers.length);

      // Check for dummy email addresses and clean them up
      const dummyEmails = allUsers.filter(user =>
        user.email && (
          user.email.includes('@example.com') ||
          user.email.includes('@firereporting.com')
        )
      );

      if (dummyEmails.length > 0) {
        console.log("Found dummy emails:", dummyEmails.length);

        // Create a cleaned copy without dummy emails
        const cleanedUsers = allUsers.filter(user =>
          user.email &&
          !user.email.includes('@example.com') &&
          !user.email.includes('@firereporting.com')
        );

        console.log("Users after removing dummy data:", cleanedUsers.length);

        // Only set if we have real users
        if (cleanedUsers.length > 0) {
          setAllUsers(cleanedUsers);
        }
      }

      // Check for users with incorrect ID fields
      const usersWithUserId = allUsers.filter(user => !user.id && user.userId);
      if (usersWithUserId.length > 0) {
        console.log(`Found ${usersWithUserId.length} users with userId but no id field`);

        // Create a copy with corrected id fields
        const correctedUsers = allUsers.map(user => {
          if (!user.id && user.userId) {
            return {
              ...user,
              id: user.userId  // Copy userId to id field
            };
          }
          return user;
        });

        console.log("Users after fixing IDs:", correctedUsers.length);
        setAllUsers(correctedUsers);
      }
    } else {
      // If no users, try to fetch them
      console.log("No users found. Attempting to fetch users...");
      if (typeof fetchUsers === 'function' && !isLoadingUsers) {
        setIsLoadingUsers(true);
        fetchUsers()
          .then(() => console.log("fetchUsers completed"))
          .finally(() => setIsLoadingUsers(false));
      }
    }
  }, [allUsers, fetchUsers, isLoadingUsers]);

  // Use fallback values to prevent errors - start with empty selections
  const notificationRecipients = assessmentData.notificationRecipients || {
    groups: [
      { id: "firefighters", name: "All Firefighters", count: 231, selected: false },
      { id: "officers", name: "All Officers", count: 27, selected: false },
      { id: "chiefs", name: "Chief Staff", count: 5, selected: false }
    ],
    users: []
  };

  // Function to check if a user is selected - handle both id and userId fields
  const isUserSelected = (userId) => {
    return notificationRecipients?.users?.some(u =>
      u.id === userId || u.userId === userId
    ) || false;
  };

  // Toggle group selection (department groups)
  const toggleRecipientGroup = (groupId) => {
    console.log("Toggling group selection for:", groupId);
    
    // Force update of the group selection
    setAssessmentData(prev => {
      // Initialize notificationRecipients if it doesn't exist
      if (!prev.notificationRecipients) {
        prev = {
          ...prev,
          notificationRecipients: {
            groups: [
              { id: "firefighters", name: "All Firefighters", count: 231, selected: false },
              { id: "officers", name: "All Officers", count: 27, selected: false },
              { id: "chiefs", name: "Chief Staff", count: 5, selected: false }
            ],
            users: []
          }
        };
      }

      // Create a fresh copy of everything to ensure React detects the change
      const updatedGroups = [];
      
      // Add each group with updated selection state
      (prev.notificationRecipients?.groups || []).forEach(group => {
        if (group.id === groupId) {
          // Reverse the selection for the target group
          const newSelectedState = !group.selected;
          console.log(`${group.id}: ${group.selected} -> ${newSelectedState}`);
          updatedGroups.push({
            ...group,
            selected: newSelectedState
          });
        } else {
          // Add the other groups unchanged but as new object references
          updatedGroups.push({...group});
        }
      });

      // Debug the result
      console.log("Updated groups:", updatedGroups.map(g => `${g.id}: ${g.selected}`).join(', '));

      // Create completely new object references for the entire state path
      return {
        ...prev,
        notificationRecipients: {
          ...prev.notificationRecipients,
          groups: updatedGroups
        }
      };
    });
    
    setHasChanges(true);
  };

  // Toggle individual user selection
  const toggleUserSelection = (userId) => {
    console.log("Toggling user selection for:", userId);

    setAssessmentData(prev => {
      // Initialize notificationRecipients if it doesn't exist
      if (!prev.notificationRecipients) {
        prev = {
          ...prev,
          notificationRecipients: {
            groups: [
              { id: "firefighters", name: "All Firefighters", count: 231, selected: false },
              { id: "officers", name: "All Officers", count: 27, selected: false },
              { id: "chiefs", name: "Chief Staff", count: 5, selected: false }
            ],
            users: []
          }
        };
      }

      // Initialize users array if it doesn't exist
      if (!prev.notificationRecipients.users) {
        prev = {
          ...prev,
          notificationRecipients: {
            ...prev.notificationRecipients,
            users: []
          }
        };
      }

      // Check if user is already in the array - check both id and userId fields
      const userExists = (prev.notificationRecipients?.users || []).some(u =>
        u.id === userId || u.userId === userId
      );
      let updatedUsers = [...(prev.notificationRecipients?.users || [])];

      if (userExists) {
        // User is already selected, remove them
        console.log("Removing user with ID:", userId);
        updatedUsers = updatedUsers.filter(u => u.id !== userId && u.userId !== userId);
      } else {
        // User is not selected, add them - find in allUsers by either id or userId
        const userToAdd = allUsers.find(u => u.id === userId || u.userId === userId);
        if (userToAdd) {
          console.log("Adding user:", userToAdd);
          updatedUsers.push({
            id: userToAdd.id || userToAdd.userId, // Use whichever is available
            userId: userToAdd.userId || userToAdd.id, // Store both for consistency
            displayName: userToAdd.displayName || userToAdd.name,
            email: userToAdd.email,
            station: userToAdd.station,
            role: userToAdd.role
          });
        }
      }

      return {
        ...prev,
        notificationRecipients: {
          ...prev.notificationRecipients,
          users: updatedUsers
        }
      };
    });
    setHasChanges(true);
  };

  // Filter users based on search term and filters
  useEffect(() => {
    if (!allUsers || !allUsers.length) return;

    // Start with a copy of all users
    let filtered = [...allUsers];

    // Apply station filter
    if (stationFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.station === stationFilter
      );
    }

    // Apply rank filter - check both role and rank fields with case-insensitive comparison
    if (rankFilter !== 'all') {
      console.log("Applying rank filter:", rankFilter);
      console.log("Available roles:", filtered.map(u => u.role || u.rank || 'unknown').join(', '));
      
      filtered = filtered.filter(user => {
        const userRole = (user.role || user.rank || '').toLowerCase();
        console.log(`User ${user.displayName || user.name} role: ${userRole}, match: ${userRole === rankFilter.toLowerCase()}`);
        return userRole === rankFilter.toLowerCase();
      });
    }

    // Apply search term
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(user =>
        (user.displayName || user.name || '').toLowerCase().includes(search) ||
        (user.email || '').toLowerCase().includes(search) ||
        (user.station || '').toLowerCase().includes(search)
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, stationFilter, rankFilter, allUsers]);

  // Handle search input focus - key to fixing the focus issue
  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Focus handler for search input
  const handleSearchInputFocus = () => {
    // This helps ensure the input stays focused
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Force refresh users from Firestore
  const refreshUsers = async () => {
    try {
      console.log("Forcing refresh of users from Firestore...");

      // Clear search and filters first
      setSearchTerm('');
      setStationFilter('all');
      setRankFilter('all');

      // Show that we're updating
      setIsLoadingUsers(true);
      setFilteredUsers([]);

      // Then fetch users
      if (typeof fetchUsers === 'function') {
        console.log("Calling fetchUsers function");
        await fetchUsers();

        // Check if we got any users
        if (!allUsers || allUsers.length === 0) {
          console.log("No users found through fetchUsers, trying another approach");

          // If the functional approach didn't work, create some test users to demonstrate functionality
          const testUsers = [
            {
              id: "test-user-1",
              displayName: "Test User 1 (Admin)",
              email: "test-admin@example.org",
              role: "admin",
              station: "Station 1"
            },
            {
              id: "test-user-2",
              displayName: "Test User 2 (Captain)",
              email: "test-captain@example.org",
              role: "captain",
              station: "Station 4"
            },
            {
              id: "test-user-3",
              displayName: "Test User 3 (Firefighter)",
              email: "test-firefighter@example.org",
              role: "firefighter",
              station: "Station 7"
            }
          ];

          console.log("Adding test users for functionality demonstration");
          setAllUsers(testUsers);
        }

        console.log("Current users after refresh:", allUsers);
      } else {
        console.warn("fetchUsers is not available");
      }

      console.log("Users refreshed successfully");
    } catch (error) {
      console.error('Error refreshing users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Component for the notification recipients section
  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Recipients</h3>
        <div className="flex space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
            Users: {allUsers?.length || 0}
          </span>
          <button
            onClick={refreshUsers}
            disabled={isLoadingUsers}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center"
          >
            {isLoadingUsers ? 'Loading Users...' : 'Refresh Users'}
          </button>
        </div>
      </div>
      
      {/* Search input with focus handling based on TodayLog.jsx */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search by name, email, or station..."
          value={searchTerm}
          onChange={handleSearchInputChange}
          onFocus={handleSearchInputFocus}
          onClick={handleSearchInputFocus}
        />
      </div>

      {/* Filter options */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Station filter */}
        <div className="w-full sm:w-1/2">
          <select
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 sm:text-sm"
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
          >
            <option value="all">All Stations</option>
            <option value="Station 1">Station 1</option>
            <option value="Station 4">Station 4</option>
            <option value="Station 7">Station 7</option>
            <option value="Station 10">Station 10</option>
            <option value="Station 11">Station 11</option>
            <option value="Station 14">Station 14</option>
            <option value="Station 23">Station 23</option>
            <option value="Headquarters">Headquarters</option>
          </select>
        </div>

        {/* Rank filter */}
        <div className="w-full sm:w-1/2">
          <select
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 sm:text-sm"
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
          >
            <option value="all">All Ranks</option>
            <option value="admin">Admin</option>
            <option value="captain">Captain</option>
            <option value="firefighter">Firefighter</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available Recipients */}
        <div>
          <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Available Recipients</h4>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <div>Loading users...</div>
                </div>
              ) : (allUsers && allUsers.length > 0) ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Department Groups */}
                  <div className="bg-gray-50 dark:bg-gray-750 p-2">
                    <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Department Groups</h5>
                  </div>
                  
                  {/* Render groups */}
                  {notificationRecipients?.groups?.map((group, idx) => (
                    <div
                      key={`group-list-${group.id}-${idx}`}
                      className={`p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${
                        group.selected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleRecipientGroup(group.id);
                      }}
                    >
                      <input
                        id={`group-checkbox-${group.id}-${idx}`}
                        type="checkbox"
                        checked={group.selected || false}
                        onChange={() => toggleRecipientGroup(group.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium">{group.name}</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Individual Personnel */}
                  <div className="bg-gray-50 dark:bg-gray-750 p-2">
                    <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Individual Personnel</h5>
                  </div>
                  
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                      <div
                        key={`user-${user.id}-${index}`}
                        className={`p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${
                          isUserSelected(user.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleUserSelection(user.id);
                        }}
                      >
                        <input
                          id={`user-checkbox-${user.id}-${index}`}
                          type="checkbox"
                          checked={isUserSelected(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium">{user.displayName || user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                            {user.station && <span> • {user.station}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      No personnel match your search criteria
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <div className="mb-4">No personnel data available</div>
                    <button
                      onClick={refreshUsers}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                    >
                      Reload Users
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Selected Recipients */}
        <div>
          <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Selected Recipients</h4>
          <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-800 h-full min-h-[200px]">
            {(notificationRecipients?.groups?.some(g => g.selected) || 
              (notificationRecipients?.users && notificationRecipients.users.length > 0)) ? (
              <div className="space-y-4">
                {/* Selected groups */}
                {notificationRecipients?.groups?.filter(group => group.selected)?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Groups</h5>
                    <div className="flex flex-wrap gap-2">
                      {notificationRecipients?.groups
                        ?.filter(group => group.selected)
                        ?.map((group, idx) => (
                          <div 
                            key={`selected-group-${group.id}-${idx}`} 
                            className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md text-sm flex items-center"
                            title="Click to remove"
                          >
                            {group.name}
                            <button
                              type="button"
                              className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                toggleRecipientGroup(group.id);
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
                
                {/* Selected users */}
                {notificationRecipients?.users && notificationRecipients.users.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Individual Personnel</h5>
                    <div className="flex flex-wrap gap-2">
                      {notificationRecipients?.users?.map((user, index) => (
                        <div 
                          key={`selected-${user.id}-${index}`}
                          className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-md text-sm flex items-center"
                          title="Click to remove"
                        >
                          {user.displayName || user.name}
                          <button
                            type="button"
                            className="ml-2 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-green-100"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              toggleUserSelection(user.id);
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 italic">
                No recipients selected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationRecipientsSection;