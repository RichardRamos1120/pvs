// src/components/NewActivityModal.js
import React, { useState, useEffect, useContext } from 'react';
import { FirestoreContext } from '../App';
import {
  FileSpreadsheet,
  Truck,
  Clipboard,
  Users,
  FileText,
  MoreHorizontal,
  Mic
} from 'lucide-react';

const NewActivityModal = ({ show, onClose, onAddActivity, darkMode, currentStation }) => {
  const [newActivityCategory, setNewActivityCategory] = useState("");
  const [newActivityType, setNewActivityType] = useState("");
  const [newActivityDuration, setNewActivityDuration] = useState("");
  const [newActivityApparatus, setNewActivityApparatus] = useState("");
  const [newActivityMaintenanceType, setNewActivityMaintenanceType] = useState("");
  const [newActivityPassFail, setNewActivityPassFail] = useState("");
  const [newActivityTrainingMethod, setNewActivityTrainingMethod] = useState("");
  const [newActivityStationCoverage, setNewActivityStationCoverage] = useState("");
  const [newActivityDocumentType, setNewActivityDocumentType] = useState("");
  const [newActivityNotes, setNewActivityNotes] = useState("");
  const [newActivityStation, setNewActivityStation] = useState(currentStation || "");
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);

  const firestoreOperations = useContext(FirestoreContext);

  // Fetch stations from Firebase when modal opens
  useEffect(() => {
    const fetchStations = async () => {
      if (show && firestoreOperations) {
        try {
          setLoadingStations(true);
          const stationsData = await firestoreOperations.getStations();
          
          // Format stations for the dropdown - show only station numbers
          const formattedStations = stationsData.map(station => {
            // Extract just the station number
            if (station.number) {
              return station.number.toString();
            } else if (station.name) {
              // Try to extract number from name (e.g., "Station 4" -> "4")
              const numberMatch = station.name.match(/\d+/);
              return numberMatch ? numberMatch[0] : station.name;
            } else {
              // Fallback to extracting number from ID
              const numberMatch = station.id.match(/\d+/);
              return numberMatch ? numberMatch[0] : station.id;
            }
          }).sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
          
          setStations(formattedStations);
        } catch (error) {
          console.error('Error fetching stations:', error);
          // Fallback to empty array if fetch fails
          setStations([]);
        } finally {
          setLoadingStations(false);
        }
      }
    };

    fetchStations();
  }, [show, firestoreOperations]);
  
  // Activity categories definition
  const activityCodes = {
    "ADMIN": [
      "ADMINISTRATIVE WORK",
      "CONFERENCE CALL - DAILY",
      "DISASTERS - DISASTER RELATED",
      "MEETING",
      "PROJECT - DISTRICT PROJECT WORK"
    ],
    "MAINTENANCE": [
      "APP BI-MONTHLY INSPECTION",
      "APP PRE CHECK - ROUTINE DAILY",
      "APP PUMP TESTING",
      "APPARATUS - IN HOUSE MAINTENANCE",
      "COMPLETED",
      "DIVE EQUIPMENT - ROUTINE CHECK",
      "FACILITY - MAJOR",
      "FIRE BOAT - ROUTINE DAILY",
      "FLUIDS - LEVEL CHECKS",
      "FUEL",
      "LADDER - WEEKLY AERIAL INSPECTIONS",
      "NARCS - ROUTINE CHECKS",
      "OUTSIDE - MILL VALLEY CORP YARD",
      "STATION - ROUTINE MAINTENANCE"
    ],
    "MEDICAL": [
      "PHYSICAL - DEPARTMENT PHYSICAL"
    ],
    "OPERATIONS": [
      "CONFERENCE CALL",
      "COVER SMFD STATION",
      "COVER MARIN CITY",
      "COVER CENTRAL MARIN", 
      "COVER THROCKMORTON",
      "COVER TIBURON",
      "MEETING",
      "OTHER",
      "WORK ASSIGNMENTS"
    ],
    "PUBLIC RELATIONS": [
      "COMMUNITY MEETING",
      "STATION TOUR"
    ],
    "PREVENTION": [
      "ACTIVITIES",
      "ADMIN - DUTIES",
      "INSPECTIONS - COMPANY",
      "TRAINING"
    ],
    "TRAINING": [
      "BLOCK TRAINING - MONTHLY",
      "CLASSROOM - LECTURE BASED",
      "CPR TRAINING",
      "EMS - ROUTINE",
      "GENERAL - COMPANY TRAINING",
      "ISO - COMPANY TRAINING DOCUMENTATION",
      "ISO - DRIVER TRAINING DOCUMENTATION",
      "ISO - FACILITY TRAINING DOCUMENTATION",
      "PT - PHYSICAL TRAINING"
    ],
    "UNION": [
      "MEET AND CONFER ACTIVITIES",
      "UNION NEGOTIATION"
    ]
  };
  
  // Training method options
  const trainingMethodOptions = [
    "Hands-on",
    "Classroom",
    "Online"
  ];
  
  // Maintenance type options
  const maintenanceTypeOptions = [
    "Routine",
    "Repair",
    "Inspection",
    "Testing",
    "Cleaning"
  ];
  
  // Document type options for ADMIN
  const documentTypeOptions = [
    "Reports",
    "Memos",
    "SOPs",
    "Training Records",
    "Incident Documentation",
    "Personnel Records"
  ];
  
  // List of apparatus
  const apparatusList = [
    "Engine 1",
    "Engine 2",
    "Ladder 1",
    "Rescue 1",
    "Battalion Chief Vehicle",
    "Utility Vehicle"
  ];
  
  // Stations are now loaded from Firebase - see useEffect above
  
  // Duration options (30 minutes to 8 hours)
  const durationOptions = [
    { value: "0.5", label: "30 minutes" },
    { value: "1", label: "1 hour" },
    { value: "1.5", label: "1.5 hours" },
    { value: "2", label: "2 hours" },
    { value: "2.5", label: "2.5 hours" },
    { value: "3", label: "3 hours" },
    { value: "3.5", label: "3.5 hours" },
    { value: "4", label: "4 hours" },
    { value: "4.5", label: "4.5 hours" },
    { value: "5", label: "5 hours" },
    { value: "5.5", label: "5.5 hours" },
    { value: "6", label: "6 hours" },
    { value: "6.5", label: "6.5 hours" },
    { value: "7", label: "7 hours" },
    { value: "7.5", label: "7.5 hours" },
    { value: "8", label: "8 hours" }
  ];

  // No need to calculate end time since we're only using duration
  
  // Reset form fields
  const resetForm = () => {
    setNewActivityCategory("");
    setNewActivityType("");
    setNewActivityDuration("");
    setNewActivityApparatus("");
    setNewActivityMaintenanceType("");
    setNewActivityPassFail("");
    setNewActivityTrainingMethod("");
    setNewActivityStationCoverage("");
    setNewActivityDocumentType("");
    setNewActivityNotes("");
    setNewActivityStation(currentStation || "");
    // Note: Don't reset stations array as it should persist
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (!newActivityCategory || !newActivityType) {
      alert("Category and activity type are required");
      return;
    }

    // Validate duration field
    if (!newActivityDuration) {
      alert("Duration is required");
      return;
    }

    // Validate SMFD station coverage selection
    if (newActivityCategory === 'OPERATIONS' && newActivityType === 'COVER SMFD STATION' && !newActivityStationCoverage) {
      alert("Please select which SMFD station you are covering");
      return;
    }

    // Get duration hours
    const hours = parseFloat(newActivityDuration);

    // Create activity details based on category
    let details = {
      duration: newActivityDuration
    };

    // Add category-specific details
    if (newActivityCategory === 'MAINTENANCE') {
      details.apparatus = newActivityApparatus;
      details.maintenanceType = newActivityMaintenanceType;
      details.passFailStatus = newActivityPassFail;
    } else if (newActivityCategory === 'TRAINING') {
      details.trainingMethod = newActivityTrainingMethod;
    } else if (newActivityCategory === 'OPERATIONS' && newActivityType.includes('COVER')) {
      if (newActivityType === 'COVER SMFD STATION') {
        details.stationCoverage = newActivityStationCoverage;
      } else {
        details.coverageLocation = newActivityType.replace('COVER ', '');
      }
      details.apparatus = newActivityApparatus;
    } else if (newActivityCategory === 'ADMIN') {
      details.documentType = newActivityDocumentType;
    }

    const newActivity = {
      id: `activity-${Date.now()}`,
      type: newActivityCategory,
      description: newActivityType,
      hours: hours.toFixed(1),
      details,
      notes: newActivityNotes,
      station: newActivityStation
    };
    
    // Call the parent component function to add this activity
    onAddActivity(newActivity);
    
    // Reset form and close modal
    resetForm();
    onClose();
  };
  
  // Close modal and reset form
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add New Activity</h2>
          <button 
            onClick={handleClose}
            className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Category selection */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Activity Category*
              </label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={newActivityCategory}
                onChange={(e) => {
                  setNewActivityCategory(e.target.value);
                  setNewActivityType("");
                }}
                required
              >
                <option value="">Select Category</option>
                {Object.keys(activityCodes).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Type selection */}
            {newActivityCategory && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Activity Type*
                </label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  required
                >
                  <option value="">Select Activity Type</option>
                  {activityCodes[newActivityCategory].map((activity) => (
                    <option key={activity} value={activity}>{activity}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Duration input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Duration*
            </label>
            <select
              className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
              value={newActivityDuration}
              onChange={(e) => setNewActivityDuration(e.target.value)}
              required
            >
              <option value="">Select Duration</option>
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Station selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Station
            </label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={newActivityStation}
              onChange={(e) => setNewActivityStation(e.target.value)}
            >
              <option value="">Select Station</option>
              <option value={currentStation}>{currentStation} (Current)</option>
              {stations.filter(s => s !== currentStation?.replace('Station ', '')).map((station) => (
                <option key={station} value={`Station ${station}`}>Station {station}</option>
              ))}
            </select>
          </div>
          
          {/* Category-specific details */}
          {newActivityCategory === 'MAINTENANCE' && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 pb-1 border-b">
                Maintenance Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apparatus
                  </label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={newActivityApparatus}
                    onChange={(e) => setNewActivityApparatus(e.target.value)}
                  >
                    <option value="">Select Apparatus</option>
                    {apparatusList.map((apparatus) => (
                      <option key={apparatus} value={apparatus}>{apparatus}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Maintenance Type
                  </label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={newActivityMaintenanceType}
                    onChange={(e) => setNewActivityMaintenanceType(e.target.value)}
                  >
                    <option value="">Select Type</option>
                    {maintenanceTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={newActivityPassFail}
                    onChange={(e) => setNewActivityPassFail(e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Pass">Pass</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {newActivityCategory === 'TRAINING' && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 pb-1 border-b">
                Training Details
              </h3>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Training Method
                </label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newActivityTrainingMethod}
                  onChange={(e) => setNewActivityTrainingMethod(e.target.value)}
                >
                  <option value="">Select Method</option>
                  {trainingMethodOptions.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {newActivityCategory === 'OPERATIONS' && newActivityType === 'COVER SMFD STATION' && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 pb-1 border-b">
                SMFD Station Coverage Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    SMFD Station Number *
                  </label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={newActivityStationCoverage}
                    onChange={(e) => setNewActivityStationCoverage(e.target.value)}
                    required
                    disabled={loadingStations}
                  >
                    <option value="">
                      {loadingStations ? "Loading stations..." : "Select Station Number"}
                    </option>
                    {stations.map((station) => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apparatus
                  </label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={newActivityApparatus}
                    onChange={(e) => setNewActivityApparatus(e.target.value)}
                  >
                    <option value="">Select Apparatus</option>
                    {apparatusList.map((apparatus) => (
                      <option key={apparatus} value={apparatus}>{apparatus}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {newActivityCategory === 'OPERATIONS' && (newActivityType === 'COVER MARIN CITY' || newActivityType === 'COVER CENTRAL MARIN' || newActivityType === 'COVER THROCKMORTON' || newActivityType === 'COVER TIBURON') && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 pb-1 border-b">
                Coverage Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Coverage Location
                  </label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded-lg bg-gray-100"
                    value={newActivityType.replace('COVER ', '')}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apparatus
                  </label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={newActivityApparatus}
                    onChange={(e) => setNewActivityApparatus(e.target.value)}
                  >
                    <option value="">Select Apparatus</option>
                    {apparatusList.map((apparatus) => (
                      <option key={apparatus} value={apparatus}>{apparatus}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {newActivityCategory === 'ADMIN' && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 pb-1 border-b">
                Administrative Details
              </h3>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Document Type
                </label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={newActivityDocumentType}
                  onChange={(e) => setNewActivityDocumentType(e.target.value)}
                >
                  <option value="">Select Document Type</option>
                  {documentTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Notes
            </label>
            <div className="relative">
              <textarea 
                className="w-full p-2 border rounded-lg"
                rows="3"
                placeholder="Add any additional notes here..."
                value={newActivityNotes}
                onChange={(e) => setNewActivityNotes(e.target.value)}
              ></textarea>
              <button 
                className={`absolute right-2 bottom-2 ${
                  darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Voice input"
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={handleClose}
              className={`px-4 py-2 border rounded-md text-sm font-medium ${
                darkMode 
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={!newActivityCategory || !newActivityType || !newActivityDuration}
            >
              Add Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewActivityModal;