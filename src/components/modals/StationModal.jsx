// src/components/modals/StationModal.jsx
import React, { useState } from 'react';
import { X, Plus, Trash } from 'lucide-react';

const StationModal = ({ station, captains, setShowModal, saveStation, darkMode }) => {
  const defaultApparatus = {
    id: '',
    name: '',
    status: 'operational'
  };

  const [formData, setFormData] = useState(
    station || {
      number: '',
      name: '',
      address: '',
      phone: '',
      captainId: '',
      apparatus: []
    }
  );

  const [newApparatus, setNewApparatus] = useState(defaultApparatus);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleApparatusChange = (e) => {
    const { name, value } = e.target;
    setNewApparatus({ ...newApparatus, [name]: value });
  };

  const addApparatus = () => {
    if (newApparatus.name.trim() === '') return;
    
    const apparatus = {
      ...newApparatus,
      id: `app${Date.now()}`
    };
    
    setFormData({
      ...formData,
      apparatus: [...formData.apparatus, apparatus]
    });
    
    setNewApparatus(defaultApparatus);
  };

  const removeApparatus = (id) => {
    setFormData({
      ...formData,
      apparatus: formData.apparatus.filter(a => a.id !== id)
    });
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
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Captain</label>
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
                <option value="">Select Captain</option>
                {captains.map(captain => (
                  <option key={captain.id} value={captain.id}>
                    {captain.firstName} {captain.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Apparatus Section */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Apparatus</label>
            
            {/* Existing Apparatus List */}
            {formData.apparatus.length > 0 && (
              <div className={`mb-4 p-3 border rounded-md ${
                darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Current Apparatus ({formData.apparatus.length})
                </h4>
                <div className="space-y-2">
                  {formData.apparatus.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mr-2`}>{item.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'operational' 
                            ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                            : item.status === 'maintenance'
                            ? (darkMode ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-800')
                            : (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeApparatus(item.id)}
                        className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add New Apparatus */}
            <div className={`p-3 border rounded-md ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Add New Apparatus
              </h4>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name (e.g. Engine 23)"
                    className={`w-full p-2 text-sm border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    value={newApparatus.name}
                    onChange={handleApparatusChange}
                  />
                </div>
                <div className="col-span-2">
                  <select
                    name="status"
                    className={`w-full p-2 text-sm border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={newApparatus.status}
                    onChange={handleApparatusChange}
                  >
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out-of-service">Out of Service</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <button
                    onClick={addApparatus}
                    className="w-full p-2 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
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