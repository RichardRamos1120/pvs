// src/components/modals/StationModal.jsx
import React, { useState } from 'react';
import { X, Plus, Trash } from 'lucide-react';

const StationModal = ({ station, captains, setShowModal, saveStation, darkMode }) => {
  const [formData, setFormData] = useState(
    station || {
      number: '',
      name: '',
      address: '',
      phone: '',
      captainId: ''
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    saveStation(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-lg relative overflow-y-auto max-h-[90vh]`}>
        <button
          onClick={() => setShowModal(false)}
          className={`absolute top-4 right-4 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {station ? 'Edit Station' : 'Create New Station'}
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Station Number</label>
              <input
                type="text"
                name="number"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.number}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Station Name</label>
              <input
                type="text"
                name="name"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Address</label>
            <input
              type="text"
              name="address"
              className={`w-full p-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Phone</label>
              <input
                type="tel"
                name="phone"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Station Captain</label>
              <select
                name="captainId"
                className={`w-full p-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={formData.captainId}
                onChange={handleChange}
              >
                <option value="">Select Captain/Officer</option>
                {captains.length > 0 ? (
                  captains.map(captain => (
                    <option key={captain.id} value={captain.id}>
                      {captain.firstName} {captain.lastName} ({captain.role?.charAt(0).toUpperCase() + captain.role?.slice(1) || 'Unknown'})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No captains or admins available</option>
                )}
              </select>
            </div>
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

export default StationModal;