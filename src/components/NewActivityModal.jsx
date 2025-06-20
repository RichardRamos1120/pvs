// src/components/NewActivityModal.js
import React, { useState, useEffect, useContext } from 'react';
import { FirestoreContext } from '../App';
import { calculateEndTimePST } from '../utils/timezone';
import FullscreenModal from './FullscreenModal';
import {
  FileSpreadsheet,
  Truck,
  Clipboard,
  Users,
  FileText,
  MoreHorizontal,
  Mic,
  Clock
} from 'lucide-react';

const NewActivityModal = ({ show, onClose, onAddActivity, darkMode, currentStation }) => {
  const [newActivityCategory, setNewActivityCategory] = useState("");
  const [newActivityType, setNewActivityType] = useState("");
  const [newActivityStartTime, setNewActivityStartTime] = useState("");
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
  
  // Crew assignment states
  const [assignedCrew, setAssignedCrew] = useState([]);
  const [availableFirefighters, setAvailableFirefighters] = useState([]);
  const [showCrewSelection, setShowCrewSelection] = useState(false);
  const [crewSearchTerm, setCrewSearchTerm] = useState("");
  const [tempSelectedCrew, setTempSelectedCrew] = useState([]); // Temporary selection state

  // Custom apparatus dropdown states
  const [apparatusDropdownOpen, setApparatusDropdownOpen] = useState(false);
  const [apparatusSearchTerm, setApparatusSearchTerm] = useState("");

  // Time picker dropdown state
  const [timePickerOpen, setTimePickerOpen] = useState(false);

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

  // Fetch firefighters when modal opens
  useEffect(() => {
    const fetchFirefighters = async () => {
      if (show && firestoreOperations) {
        try {
          const allUsers = await firestoreOperations.getAllUsers();
          setAvailableFirefighters(allUsers);
        } catch (error) {
          console.error('Error fetching users for crew selection:', error);
        }
      }
    };

    fetchFirefighters();
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
    "VEHICLE MAINTENANCE": {
      "Daily Tasks": [
        "APP PRE CHECK - ROUTINE DAILY",
        "FIRE BOAT - ROUTINE DAILY"
      ],
      "Weekly Tasks": [
        "LADDER - WEEKLY AERIAL INSPECTIONS"
      ],
      "Bi-Monthly Tasks": [
        "APP BI-MONTHLY INSPECTION"
      ],
      "As-Needed Tasks": [
        "APP PUMP TESTING",
        "APPARATUS - IN HOUSE MAINTENANCE", 
        "DIVE EQUIPMENT - ROUTINE CHECK",
        "FLUIDS - LEVEL CHECKS",
        "FUEL",
        "NARCS - ROUTINE CHECKS",
        "COMPLETED"
      ]
    },
    "STATION MAINTENANCE": [
      "STATION - ROUTINE MAINTENANCE",
      "FACILITY - MAJOR",
      "OUTSIDE - MILL VALLEY CORP YARD"
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
    "Engine 4",
    "Engine 6",
    "Engine 7",
    "Engine 8",
    "Engine 9",
    "Engine 604",
    "Engine 607",
    "Truck 4",
    "Rescue 9",
    "Fire Boat Liberty",
    "IRB 1",
    "Medic 1",
    "Medic 4",
    "Medic 6",
    "Medic 7",
    "Chief 1",
    "Chief 2",
    "Chief 3",
    "Chief 4",
    "Battalion 1",
    "Battalion 2",
    "Battalion 3",
    "Battalion 4",
    "Unit 1",
    "Unit 4",
    "Unit 6",
    "Unit 7",
    "Unit 8",
    "Unit 9",
    "Dive Tender 1",
    "Prevention 1",
    "Prevention 2",
    "Prevention 3",
    "Prevention 4",
    "Prevention 5",
    "Prevention 6",
    "Prevention 7",
    "Prevention 8",
    "15U9",
    "15R1",
    "15R2",
    "15R3",
    "15R4"
  ];

  // Filter apparatus based on search term
  const filteredApparatus = apparatusList.filter(apparatus =>
    apparatus.toLowerCase().includes(apparatusSearchTerm.toLowerCase())
  );

  // Generate time options (every 15 minutes from 00:00 to 23:45)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        times.push({ value: timeString, display: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Handle apparatus selection
  const handleApparatusSelect = (apparatus) => {
    setNewActivityApparatus(apparatus);
    setApparatusSearchTerm("");
    setApparatusDropdownOpen(false);
  };

  // Handle time selection
  const handleTimeSelect = (timeValue) => {
    setNewActivityStartTime(timeValue);
    setTimePickerOpen(false);
  };

  // Handle apparatus input change
  const handleApparatusInputChange = (e) => {
    const value = e.target.value;
    setApparatusSearchTerm(value);
    setNewActivityApparatus(value);
    setApparatusDropdownOpen(true);
  };
  
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

  // Calculate end time based on start time + duration
  const calculateEndTime = (startTime, durationHours) => {
    if (!startTime || !durationHours) return "";
    return calculateEndTimePST(startTime, durationHours);
  };
  
  // Filter crew based on search term
  const getFilteredCrewMembers = () => {
    if (!crewSearchTerm) return availableFirefighters;
    
    return availableFirefighters.filter(user => {
      const searchTerm = crewSearchTerm.toLowerCase();
      const name = (user.displayName || `${user.firstName || ''} ${user.lastName || ''}`).toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });
  };

  // Close time picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timePickerOpen && !event.target.closest('.time-picker-container')) {
        setTimePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [timePickerOpen]);

  // Reset form fields
  const resetForm = () => {
    setNewActivityCategory("");
    setNewActivityType("");
    setNewActivityStartTime("");
    setNewActivityDuration("");
    setNewActivityApparatus("");
    setNewActivityMaintenanceType("");
    setNewActivityPassFail("");
    setNewActivityTrainingMethod("");
    setNewActivityStationCoverage("");
    setNewActivityDocumentType("");
    setNewActivityNotes("");
    setNewActivityStation(currentStation || "");
    setAssignedCrew([]);
    setShowCrewSelection(false);
    setCrewSearchTerm("");
    setTempSelectedCrew([]);
    setTimePickerOpen(false);
    // Note: Don't reset stations array as it should persist
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (!newActivityCategory || !newActivityType) {
      alert("Category and activity type are required");
      return;
    }

    // Validate start time field
    if (!newActivityStartTime) {
      alert("Start time is required");
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
    
    // Calculate end time
    const endTime = calculateEndTime(newActivityStartTime, newActivityDuration);

    // Create activity details based on category
    let details = {
      duration: newActivityDuration,
      startTime: newActivityStartTime,
      endTime: endTime
    };

    // Add category-specific details
    if (newActivityCategory === 'VEHICLE MAINTENANCE' || newActivityCategory === 'STATION MAINTENANCE') {
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

    // Convert assigned crew IDs to names for display
    const assignedCrewNames = assignedCrew.map(userId => {
      const user = availableFirefighters.find(f => f.id === userId);
      return user ? (user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'Unknown';
    });

    const newActivity = {
      id: `activity-${Date.now()}`,
      type: newActivityCategory,
      description: newActivityType,
      hours: hours.toFixed(1),
      details,
      notes: newActivityNotes,
      station: newActivityStation,
      assignedCrew: assignedCrew,
      assignedCrewNames: assignedCrewNames
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
    <>
    <FullscreenModal
      isOpen={show}
      onClose={handleClose}
      modalId="new-activity"
      title="Add New Activity"
      className="max-w-2xl"
    >
      <div className="px-4 sm:px-6 py-4">
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
                  {Array.isArray(activityCodes[newActivityCategory]) ? (
                    // Handle regular arrays (like ADMIN, MEDICAL, etc.)
                    activityCodes[newActivityCategory].map((activity) => (
                      <option key={activity} value={activity}>{activity}</option>
                    ))
                  ) : (
                    // Handle grouped objects (like VEHICLE MAINTENANCE)
                    Object.entries(activityCodes[newActivityCategory]).map(([groupName, activities]) => (
                      <optgroup key={groupName} label={groupName}>
                        {activities.map((activity) => (
                          <option key={activity} value={activity}>{activity}</option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
          
          {/* Start time and Duration inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Start time input */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Time*
              </label>
              <div className="relative time-picker-container">
                <input
                  type="time"
                  className={`w-full p-2 pr-10 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  value={newActivityStartTime}
                  onChange={(e) => setNewActivityStartTime(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-lg transition-colors"
                  onClick={() => setTimePickerOpen(!timePickerOpen)}
                >
                  <Clock className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                
                {/* Time picker dropdown */}
                {timePickerOpen && (
                  <div className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600' 
                      : 'bg-white border border-gray-300'
                  }`}>
                    {timeOptions.map((time) => (
                      <button
                        key={time.value}
                        type="button"
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg ${
                          newActivityStartTime === time.value 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                            : darkMode 
                              ? 'text-white' 
                              : 'text-gray-900'
                        }`}
                        onClick={() => handleTimeSelect(time.value)}
                      >
                        {time.display}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Duration input */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Duration*
              </label>
            <select
              className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
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
          </div>
          
          {/* Show calculated end time */}
          {newActivityStartTime && newActivityDuration && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <strong>End Time:</strong> {calculateEndTime(newActivityStartTime, newActivityDuration)} 
                <span className="ml-2 text-xs">({newActivityStartTime} + {durationOptions.find(d => d.value === newActivityDuration)?.label})</span>
              </div>
            </div>
          )}
          
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
          {(newActivityCategory === 'VEHICLE MAINTENANCE' || newActivityCategory === 'STATION MAINTENANCE') && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 pb-1 border-b">
                Maintenance Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apparatus
                  </label>
                  {/* Custom searchable apparatus dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="Type to search apparatus..."
                      value={apparatusSearchTerm || newActivityApparatus}
                      onChange={handleApparatusInputChange}
                      onFocus={() => setApparatusDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setApparatusDropdownOpen(false), 150)}
                    />
                    
                    {/* Dropdown list */}
                    {apparatusDropdownOpen && (
                      <div className={`absolute top-full left-0 right-0 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-white border border-gray-300'
                      }`}>
                        {filteredApparatus.length > 0 ? (
                          filteredApparatus.map((apparatus) => (
                            <div
                              key={apparatus}
                              className={`p-2 cursor-pointer last:border-b-0 ${
                                darkMode 
                                  ? 'hover:bg-gray-600 border-b border-gray-600 text-white' 
                                  : 'hover:bg-gray-100 border-b border-gray-100'
                              }`}
                              onMouseDown={() => handleApparatusSelect(apparatus)}
                            >
                              {apparatus}
                            </div>
                          ))
                        ) : (
                          <div className={`p-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No apparatus found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                  {/* Custom searchable apparatus dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="Type to search apparatus..."
                      value={apparatusSearchTerm || newActivityApparatus}
                      onChange={handleApparatusInputChange}
                      onFocus={() => setApparatusDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setApparatusDropdownOpen(false), 150)}
                    />
                    
                    {/* Dropdown list */}
                    {apparatusDropdownOpen && (
                      <div className={`absolute top-full left-0 right-0 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-white border border-gray-300'
                      }`}>
                        {filteredApparatus.length > 0 ? (
                          filteredApparatus.map((apparatus) => (
                            <div
                              key={apparatus}
                              className={`p-2 cursor-pointer last:border-b-0 ${
                                darkMode 
                                  ? 'hover:bg-gray-600 border-b border-gray-600 text-white' 
                                  : 'hover:bg-gray-100 border-b border-gray-100'
                              }`}
                              onMouseDown={() => handleApparatusSelect(apparatus)}
                            >
                              {apparatus}
                            </div>
                          ))
                        ) : (
                          <div className={`p-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No apparatus found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                  {/* Custom searchable apparatus dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="Type to search apparatus..."
                      value={apparatusSearchTerm || newActivityApparatus}
                      onChange={handleApparatusInputChange}
                      onFocus={() => setApparatusDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setApparatusDropdownOpen(false), 150)}
                    />
                    
                    {/* Dropdown list */}
                    {apparatusDropdownOpen && (
                      <div className={`absolute top-full left-0 right-0 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-white border border-gray-300'
                      }`}>
                        {filteredApparatus.length > 0 ? (
                          filteredApparatus.map((apparatus) => (
                            <div
                              key={apparatus}
                              className={`p-2 cursor-pointer last:border-b-0 ${
                                darkMode 
                                  ? 'hover:bg-gray-600 border-b border-gray-600 text-white' 
                                  : 'hover:bg-gray-100 border-b border-gray-100'
                              }`}
                              onMouseDown={() => handleApparatusSelect(apparatus)}
                            >
                              {apparatus}
                            </div>
                          ))
                        ) : (
                          <div className={`p-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No apparatus found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
          
          {/* Crew Assignment */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Assigned Crew ({assignedCrew.length} selected)
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3">
              {assignedCrew.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignedCrew.map(userId => {
                    const user = availableFirefighters.find(f => f.id === userId);
                    const name = user ? (user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'Unknown';
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setAssignedCrew(assignedCrew.filter(id => id !== userId))}
                          className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                  No crew members assigned to this activity
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setTempSelectedCrew([...assignedCrew]); // Initialize temp state with current selection
                  setShowCrewSelection(true);
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
              >
                + {assignedCrew.length > 0 ? 'Edit Assigned Crew' : 'Assign Crew Members'}
              </button>
            </div>
          </div>
          
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
              disabled={!newActivityCategory || !newActivityType || !newActivityStartTime || !newActivityDuration}
            >
              Add Activity
            </button>
          </div>
        </div>
    </FullscreenModal>

    {/* Crew Selection Modal */}
    <FullscreenModal
      isOpen={showCrewSelection}
      onClose={() => setShowCrewSelection(false)}
      modalId="crew-selection"
      title="Select Crew for Activity"
      className="max-w-lg"
    >
      <div className="px-4 sm:px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select the firefighters who participated in this activity.
              </p>

              {/* Search input */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by name or email..."
                    value={crewSearchTerm}
                    onChange={(e) => setCrewSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {availableFirefighters.length === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No firefighters found</h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                        <p>No users found in the system.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : getFilteredCrewMembers().length === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No matches found</h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                        <p>No firefighters match your search criteria.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    {getFilteredCrewMembers().map((firefighter) => (
                      <div
                        key={firefighter.id}
                        className={`flex items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${
                          tempSelectedCrew.includes(firefighter.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => {
                          if (tempSelectedCrew.includes(firefighter.id)) {
                            setTempSelectedCrew(tempSelectedCrew.filter(id => id !== firefighter.id));
                          } else {
                            setTempSelectedCrew([...tempSelectedCrew, firefighter.id]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`activity-firefighter-${firefighter.id}`}
                          checked={tempSelectedCrew.includes(firefighter.id)}
                          onChange={() => {}} // Handled by parent div click
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded pointer-events-none"
                        />
                        <div className="ml-3 block text-gray-900 dark:text-white w-full">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <div>
                              <div className="font-medium">
                                {firefighter.displayName || firefighter.firstName || 'Unknown User'}
                                {firefighter.lastName && ` ${firefighter.lastName}`}
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {firefighter.email || 'No email'}
                              </p>
                              {firefighter.rank && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {firefighter.rank}
                                </p>
                              )}
                            </div>
                            {firefighter.station && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 sm:mt-0">
                                {firefighter.station}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    // Reset temp selection to current assigned crew (cancel changes)
                    setTempSelectedCrew([...assignedCrew]);
                    setShowCrewSelection(false);
                  }}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${
                    darkMode
                      ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Apply temp selection to assigned crew
                    setAssignedCrew([...tempSelectedCrew]);
                    setShowCrewSelection(false);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Selection
                </button>
              </div>
            </div>
    </FullscreenModal>
    </>
  );
};

export default NewActivityModal;