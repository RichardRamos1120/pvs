const fs = require('fs');
const path = require('path');

// Read the original file
const filePath = path.join(__dirname, 'src', 'components', 'SimpleGARAssessment.jsx');
const backupPath = path.join(__dirname, 'src', 'components', 'SimpleGARAssessment.jsx.backup2');
const content = fs.readFileSync(filePath, 'utf8');

// Create regex to match the notification recipients section
const pattern = /<div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4 mb-6">[\s\S]*?<h3 className="font-medium mb-2 text-gray-900 dark:text-white">Notification Recipients<\/h3>[\s\S]*?{\/\* Selection summary \*\/}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

// Find the match
const match = content.match(pattern);
if (!match) {
  console.error('Could not find notification section pattern');
  process.exit(1);
}

// The new implementation
const newSection = `<div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Recipients</h3>
          
          {/* Search bar - Prominently displayed at the top */}
          <div className="mb-4 relative">
            <div className="flex items-center absolute inset-y-0 left-0 pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search recipients by name, email, station..."
              value={recipientSearchTerm}
              onChange={(e) => setRecipientSearchTerm(e.target.value)}
              className="w-full pl-10 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter options - Moved under search bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Station
              </label>
              <select
                value={selectedStationFilter}
                onChange={(e) => setSelectedStationFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="All">All Stations</option>
                {stations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Rank
              </label>
              <select
                value={selectedRankFilter}
                onChange={(e) => setSelectedRankFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="All">All Ranks</option>
                <option value="Captain">Captains</option>
                <option value="Lieutenant">Lieutenants</option>
                <option value="Firefighter">Firefighters</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left column - Recipient list */}
            <div>
              <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Available Recipients</h4>
              
              {/* User list - Enhanced with better styling */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-2 bg-white dark:bg-gray-800">
                <div className="max-h-96 overflow-y-auto">
                  {filteredUsers && filteredUsers.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Staff groups first */}
                      <div className="bg-gray-50 dark:bg-gray-750 p-2">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Department Groups</h5>
                      </div>
                      
                      {/* Render groups - Without dummy counts */}
                      {notificationRecipients?.groups?.map(group => (
                        <div 
                          key={group.id} 
                          className={\`p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer \${
                            group.selected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                          }\`}
                          onClick={() => toggleRecipientGroup(group.id)}
                        >
                          <input 
                            type="checkbox" 
                            checked={group.selected || false}
                            onChange={() => toggleRecipientGroup(group.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium">{group.name}</div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Individual users section */}
                      <div className="bg-gray-50 dark:bg-gray-750 p-2">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Individual Personnel</h5>
                      </div>
                      
                      {/* Render users */}
                      {filteredUsers.map(user => (
                        <div 
                          key={user.id} 
                          className={\`p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer \${
                            isUserSelected(user.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                          }\`}
                          onClick={() => toggleUserSelection(user.id)}
                        >
                          <input 
                            type="checkbox" 
                            checked={isUserSelected(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.station} • {user.rank || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {allUsers.length === 0 ? (
                        <div>
                          <div className="mb-4">No personnel data available</div>
                          <button 
                            onClick={() => fetchUsers()} 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                          >
                            Load Personnel Data
                          </button>
                        </div>
                      ) : (
                        'No recipients match your search criteria'
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right column - Selected recipients */}
            <div>
              <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Selected Recipients</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-800 h-full min-h-[200px]">
                {/* Groups */}
                {(notificationRecipients?.groups?.some(g => g.selected) || 
                  (notificationRecipients?.users && notificationRecipients.users.length > 0)) ? (
                  <div className="space-y-4">
                    {/* Selected groups - without dummy counts */}
                    {notificationRecipients?.groups?.filter(group => group.selected)?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Groups</h5>
                        <div className="flex flex-wrap gap-2">
                          {notificationRecipients?.groups
                            ?.filter(group => group.selected)
                            ?.map(group => (
                              <div 
                                key={group.id} 
                                className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md text-sm flex items-center"
                                title="Click to remove"
                              >
                                {group.name}
                                <button 
                                  className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                                  onClick={() => toggleRecipientGroup(group.id)}
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
                          {notificationRecipients?.users?.map(user => (
                            <div 
                              key={user.id} 
                              className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-md text-sm flex items-center"
                              title="Click to remove"
                            >
                              {user.name}
                              <button 
                                className="ml-2 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-green-100"
                                onClick={() => toggleUserSelection(user.id)}
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
        </div>`;

// Replace the matched section with the new section
const updatedContent = content.replace(match[0], newSection);

// Save a backup of the original file
fs.writeFileSync(backupPath, content);
console.log(`Backup saved to ${backupPath}`);

// Write the updated file
fs.writeFileSync(filePath, updatedContent);
console.log(`Updated file saved to ${filePath}`);