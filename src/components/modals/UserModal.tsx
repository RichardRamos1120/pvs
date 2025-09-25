// src/components/modals/UserModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

const UserModal = ({ user, stations, setShowModal, saveUser, darkMode }) => {
  const [formData, setFormData] = useState(
    user || {
      firstName: '',
      lastName: '',
      email: '',
      role: 'firefighter',
      rank: 'Firefighter',
      stationId: '',
      status: 'active',
      permissions: []
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    saveUser(formData);
  };

  // Permissions options
  const permissions = [
    { id: 'log-entry', label: 'Log Entry' },
    { id: 'gar-assessment', label: 'GAR Assessment' },
    { id: 'admin-portal', label: 'Admin Portal' },
    { id: 'user-management', label: 'User Management' }
  ];

  const handlePermissionChange = (permissionId) => {
    const newPermissions = [...formData.permissions];
    if (newPermissions.includes(permissionId)) {
      setFormData({ 
        ...formData, 
        permissions: newPermissions.filter(p => p !== permissionId) 
      });
    } else {
      setFormData({ 
        ...formData, 
        permissions: [...newPermissions, permissionId] 
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md relative`}>
        <button
          onClick={() => setShowModal(false)}
          className={`absolute top-4 right-4 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {user ? 'Edit User' : 'Create New User'}
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>First Name</label>
              <input
                type="text"
                name="firstName"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Last Name</label>
              <input
                type="text"
                name="lastName"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Email</label>
            <input
              type="email"
              name="email"
              className={`w-full p-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Role</label>
              <select
                name="role"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.role}
                onChange={handleChange}
              >
                <option value="firefighter">Firefighter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Rank</label>
              <select
                name="rank"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.rank}
                onChange={handleChange}
              >
                <option value="Firefighter">Firefighter</option>
                <option value="Captain">Captain</option>
                <option value="Deputy Chief">Deputy Chief</option>
                <option value="Battalion Chief">Battalion Chief</option>
                <option value="Chief">Chief</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Station</label>
            <select
              name="stationId"
              className={`w-full p-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={formData.stationId}
              onChange={handleChange}
            >
              <option value="">Select Station</option>
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  Station {station.number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Status</label>
            <select
              name="status"
              className={`w-full p-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowModal(false)}
            className={`px-4 py-2 border rounded-md ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;