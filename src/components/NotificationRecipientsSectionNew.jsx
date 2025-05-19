import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  const [errorLoading, setErrorLoading] = useState(false);

  // Filter out dummy users with admin@example.com addresses
  const removeDummyUsers = (userList) => {
    if (!userList || !Array.isArray(userList)) return [];
    
    // Filter out users with example.com email addresses or other dummy data markers
    const cleanUsers = userList.filter(user => {
      // Skip any users with example.com email domains
      if (user.email && user.email.includes('@example.com')) return false;
      
      // Skip any users with auto-generated IDs that start with "captain-" and contain a UUID
      if (user.id && typeof user.id === 'string' && 
          (user.id.startsWith('captain-') && user.id.length > 30)) return false;
          
      // Skip any users with explicitly removed IDs
      if (user.id === 'captain-Mh1Rdoc3YImtfN0KBaXv') return false;
      
      // Keep real users
      return true;
    });
    
    console.log(`Removed ${userList.length - cleanUsers.length} dummy users, kept ${cleanUsers.length} real users`);
    return cleanUsers;
  };

  // Debug logging for users list and auto-fetch on initial load
  useEffect(() => {
    console.log("Loaded users:", allUsers);
    console.log("Total user count:", allUsers?.length || 0);
    
    if (allUsers && allUsers.length > 0) {
      // Remove any dummy users from the list first
      const cleanedUsers = removeDummyUsers(allUsers);
      
      // If removing dummy users changed the count, update the list
      if (cleanedUsers.length !== allUsers.length) {
        console.log("Removed dummy users - updating users list");
        setAllUsers(cleanedUsers);
        return; // Early return since setAllUsers will trigger this effect again
      }
      
      // Check for users with incorrect ID fields
      const usersWithUserId = cleanedUsers.filter(user => !user.id && user.userId);
      if (usersWithUserId.length > 0) {
        console.log(`Found ${usersWithUserId.length} users with userId but no id field`);
        
        // Create a copy with corrected id fields
        const correctedUsers = cleanedUsers.map(user => {
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
    }
  }, [allUsers, setAllUsers]);

  // Use fallback values to prevent errors - start with completely empty selections
  const notificationRecipients = assessmentData.notificationRecipients || {
    groups: [], // No default groups
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
            groups: [], // No default groups
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
            groups: [], // No default groups
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
      filtered = filtered.filter(user => {
        const userRole = (user.role || user.rank || '').toLowerCase();
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

  // Direct Firestore access to get users
  const loadUsersDirectlyFromFirestore = async () => {
    try {
      console.log("Loading users directly from Firestore");
      
      // Get Firestore reference
      const db = getFirestore();
      
      // Access the users collection directly
      const usersRef = collection(db, "users");
      
      // Get all users
      const usersSnapshot = await getDocs(usersRef);
      
      if (!usersSnapshot.empty) {
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Remove any dummy users from the list
        const cleanedUsers = removeDummyUsers(users);
        
        console.log(`Successfully loaded ${cleanedUsers.length} users directly from Firestore`);
        return cleanedUsers;
      }
      
      return [];
    } catch (error) {
      console.error("Error loading users directly from Firestore:", error);
      return [];
    }
  };
  
  // Load users by role (like in TodayLog.jsx)
  const loadUsersByRole = async () => {
    try {
      console.log("Loading users by role from Firestore");
      
      // Get Firestore reference
      const db = getFirestore();
      
      // Access the users collection
      const usersRef = collection(db, "users");
      
      // Create queries for each role
      const firefighterQuery = query(usersRef, where("role", "==", "firefighter"));
      const captainQuery = query(usersRef, where("role", "==", "captain"));
      const adminQuery = query(usersRef, where("role", "==", "admin"));
      
      // Add more role options to make sure we catch all users
      const dispatcherQuery = query(usersRef, where("role", "==", "dispatcher"));
      const chiefQuery = query(usersRef, where("role", "==", "chief"));
      const officerQuery = query(usersRef, where("role", "==", "officer"));
      
      // Execute all queries in parallel
      const [ffDocs, captDocs, adminDocs, dispatcherDocs, chiefDocs, officerDocs] = await Promise.all([
        getDocs(firefighterQuery),
        getDocs(captainQuery),
        getDocs(adminQuery),
        getDocs(dispatcherQuery),
        getDocs(chiefQuery),
        getDocs(officerQuery)
      ]);
      
      // Combine all results
      const combinedUsers = [
        ...ffDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...captDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...adminDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...dispatcherDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...chiefDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...officerDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Remove any dummy users from the list
      const cleanedUsers = removeDummyUsers(combinedUsers);
      
      console.log(`Successfully loaded ${cleanedUsers.length} users by role`);
      
      // Add better debugging to see what we got
      if (cleanedUsers.length > 0) {
        console.log("Example user data:", JSON.stringify(cleanedUsers[0]));
        const roles = cleanedUsers.map(u => u.role);
        console.log("Roles found:", [...new Set(roles)]);
        
        // Log emails to help debug
        console.log("User emails:", cleanedUsers.map(u => u.email).join(", "));
      }
      
      return cleanedUsers;
    } catch (error) {
      console.error("Error loading users by role:", error);
      return [];
    }
  };

  // Force refresh users from Firestore - completely rewritten
  const refreshUsers = async () => {
    try {
      console.log("Forcing refresh of users from Firestore...");
      setErrorLoading(false);
      
      // Clear search and filters first
      setSearchTerm('');
      setStationFilter('all');
      setRankFilter('all');
      
      // Show that we're updating
      setIsLoadingUsers(true);
      setFilteredUsers([]);
      
      // Clear current users to force fresh load
      setAllUsers([]);
      
      // Try to load users by role first
      console.log("Trying to load users by role...");
      const roleUsers = await loadUsersByRole();
      
      if (roleUsers.length > 0) {
        console.log(`Got ${roleUsers.length} users by role`);
        setAllUsers(roleUsers);
        return; // Success - no need to try other methods
      }
      
      // If role-based loading failed, try direct Firestore access
      console.log("Role-based loading failed, trying direct Firestore access...");
      const directUsers = await loadUsersDirectlyFromFirestore();
      
      if (directUsers.length > 0) {
        console.log(`Got ${directUsers.length} users from direct Firestore access`);
        setAllUsers(directUsers);
        return; // Success - no need to try fetchUsers
      }
      
      // Last resort - try the fetchUsers function
      if (typeof fetchUsers === 'function') {
        console.log("Direct access failed, trying fetchUsers function...");
        try {
          await fetchUsers();
          
          // Check if fetchUsers added any users
          if (allUsers && allUsers.length > 0) {
            console.log(`Got ${allUsers.length} users from fetchUsers function`);
            return; // Success!
          }
        } catch (error) {
          console.error("Error in fetchUsers:", error);
        }
      }
      
      // If all methods failed, log error
      console.warn("All methods failed to load users");
      setErrorLoading(true);
      
    } catch (error) {
      console.error('Error refreshing users:', error);
      setErrorLoading(true);
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
                        key={`user-${user.id || user.userId}-${index}`}
                        className={`p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${
                          isUserSelected(user.id || user.userId) ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleUserSelection(user.id || user.userId);
                        }}
                      >
                        <input
                          id={`user-checkbox-${user.id || user.userId}-${index}`}
                          type="checkbox"
                          checked={isUserSelected(user.id || user.userId)}
                          onChange={() => toggleUserSelection(user.id || user.userId)}
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
              ) : errorLoading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <div className="mb-4 text-red-500">No users found in database</div>
                    <div className="mb-4 text-gray-500 dark:text-gray-400">
                      Please check if users exist in the Firestore database
                    </div>
                    <button
                      onClick={refreshUsers}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <div className="mb-4">Click "Refresh Users" to load personnel</div>
                    <button
                      onClick={refreshUsers}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                    >
                      Load Users
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
                          key={`selected-${user.id || user.userId}-${index}`}
                          className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-md text-sm flex items-center"
                          title="Click to remove"
                        >
                          {user.displayName || user.name}
                          <button
                            type="button"
                            className="ml-2 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-green-100"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              toggleUserSelection(user.id || user.userId);
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