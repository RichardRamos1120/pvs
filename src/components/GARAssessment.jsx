import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { Calendar, Clock, ChevronRight, ChevronLeft, Edit, AlertTriangle, CheckCircle, FileText, Home, Trash2, Save } from 'lucide-react';
import Layout from './Layout';
import { FirestoreContext } from '../App';
import { v4 as uuidv4 } from 'uuid';

// Main component
const GARAssessment = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });
  
  // CRITICAL: Force initialize with empty array to prevent flickering the button
  // This empty array ensures the button won't show until we confirm stations exist in database
  const [stations, setStations] = useState(() => {
    console.log("INITIALIZATION: Force setting stations to empty array");
    return [];  // This ensures button is hidden until we load real database stations
  });
  
  // Initialize selectedStation from localStorage
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'No Stations Available';
  });
  
  /**
   * Fetch stations from Firestore database
   * This function gets the actual station data from the database
   * and updates the state accordingly
   */
  const fetchStations = async () => {
    try {
      console.log("Fetching stations from Firestore database...");
      // Clear existing stations first to ensure UI updates correctly
      setStations([]);
      
      // Get stations from Firestore through the provided context
      const stationsData = await firestoreOperations.getStations();
      console.log("Raw station data from database:", stationsData);
      
      // Validate we have proper data
      if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
        console.log("No stations found in database - showing No Stations Available message");
        setStations([]);
        handleStationChange('No Stations Available');
        return;
      }
      
      // Format station names from the database records
      const stationNames = stationsData.map(station => 
        `Station ${station.number || station.id.replace('station_', '')}`
      );
      console.log("Formatted station names from database:", stationNames);
      
      // Update the stations state with the actual station names from the database
      setStations(stationNames);
      
      // If current selection is invalid or a placeholder, update to first available station
      const isValidStation = stationNames.includes(selectedStation);
      const isPlaceholder = selectedStation === 'No Stations Available' || 
                          selectedStation === 'Error Loading Stations';
                          
      if (!isValidStation || isPlaceholder) {
        console.log(`Current selected station "${selectedStation}" is invalid or placeholder, updating to ${stationNames[0]}`);
        handleStationChange(stationNames[0]);
      }
    } catch (error) {
      console.error("Error fetching stations from database:", error);
      // On error, clear stations and update UI
      setStations([]);
      handleStationChange('Error Loading Stations');
    }
  };
  
  // State for loading, assessments, and error handling
  const [loading, setLoading] = useState(true);
  const [pastAssessments, setPastAssessments] = useState([]);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state to avoid saving on every keystroke - SIMPLE VERSION
  const [localMitigations, setLocalMitigations] = useState({});
  const [localFormData, setLocalFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    type: "Department-wide",
    station: '',
    weather: {
      temperature: "37",
      temperatureUnit: "°F",
      wind: "18",
      windDirection: "NW",
      humidity: "85",
      precipitation: "Heavy Rain",
      precipitationRate: "1.2",
      alerts: "Flash Flood Warning until 5:00 PM"
    }
  });

  // State for assessment form
  const [showAssessment, setShowAssessment] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [assessmentData, setAssessmentData] = useState({
    id: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    rawDate: new Date().toISOString(),
    time: new Date().toTimeString().substring(0, 5),
    type: "Department-wide",
    station: selectedStation,
    status: "draft",
    weather: {
      temperature: "37",
      temperatureUnit: "°F",
      wind: "18",
      windDirection: "NW",
      humidity: "85",
      precipitation: "Heavy Rain",
      precipitationRate: "1.2",
      alerts: "Flash Flood Warning until 5:00 PM"
    },
    riskFactors: {
      supervision: 0,
      planning: 0,
      teamSelection: 0,
      teamFitness: 0,
      environment: 0,
      complexity: 0
    },
    mitigations: {
      supervision: "",
      planning: "",
      teamSelection: "",
      teamFitness: "",
      environment: "",
      complexity: ""
    }
  });
  
  // Wrapper functions to update localStorage when state changes
  const handleDarkModeChange = (mode) => {
    setDarkMode(mode);
    localStorage.setItem('darkMode', mode.toString());
  };
  
  const handleStationChange = (station) => {
    setSelectedStation(station);
    localStorage.setItem('selectedStation', station);
    
    // If we're on the assessment list view, refresh the assessments for the new station
    if (!showAssessment && pastAssessments.length > 0) {
      fetchAssessments(station);
    }
  };
  
  // Fetch assessments from Firebase
  const fetchAssessments = async (station) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      console.log("Fetching assessments for station:", station);
      const assessments = await firestoreOperations.getAssessmentsByStation(station);
      console.log("Fetched assessments:", assessments);
      
      // Check each assessment has an ID
      assessments.forEach((assessment, index) => {
        if (!assessment.id) {
          console.error(`Assessment at index ${index} is missing an ID:`, assessment);
        }
      });
      
      // Ensure we have a valid array and update past assessments
      if (Array.isArray(assessments)) {
        setPastAssessments(assessments);
      } else {
        console.warn("Received non-array assessments data:", assessments);
        setPastAssessments([]);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setError("Failed to load assessment data. Please try again.");
      setPastAssessments([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Load component data on mount
   * This handles loading the user profile, stations from the database,
   * and initializing the component state
   */
  useEffect(() => {
    const loadComponentData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // First verify we have a logged-in user
        const user = auth.currentUser;
        if (!user) {
          setUserChecked(true);
          setLoading(false);
          return;
        }
        
        // Get user profile info
        const profile = await firestoreOperations.getUserProfile(user.uid);
        setUserProfile(profile);
        
        // Set read-only mode based on user role (only captains and admins can edit)
        const isEditor = profile?.role === 'captain' || profile?.role === 'admin';
        setReadOnlyMode(!isEditor);
        
        // CRITICAL: Load stations directly from Firestore database
        // This is the key part that ensures we're using actual database stations
        console.log("Loading stations from Firestore database...");
        
        // Get raw station data from database
        const stationsData = await firestoreOperations.getStations();
        
        // If no stations in database, clear stations and show message
        if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
          console.log("NO STATIONS FOUND IN DATABASE - Setting empty stations array");
          setStations([]);
          if (selectedStation !== 'No Stations Available') {
            handleStationChange('No Stations Available');
          }
          setPastAssessments([]);
          setUserChecked(true);
          setLoading(false);
          return;
        }
        
        // If we get here, we have actual stations in the database
        console.log(`Found ${stationsData.length} stations in the database:`, stationsData);
        
        // Format the station names from database records
        const stationNames = stationsData.map(station => 
          `Station ${station.number || station.id.replace('station_', '')}`
        );
        console.log("Station names from database:", stationNames);
        
        // Update state with these database-sourced stations
        setStations(stationNames);
        
        // Handle station selection logic
        const savedStation = localStorage.getItem('selectedStation');
        const noStationsMarker = ['No Stations Available', 'Error Loading Stations'];
        
        // Determine which station to use
        let stationToUse;
        
        // If saved station is valid, use it
        if (savedStation && stationNames.includes(savedStation) && !noStationsMarker.includes(savedStation)) {
          stationToUse = savedStation;
        } 
        // Otherwise if profile has a valid station, use that
        else if (profile?.station && stationNames.includes(profile.station)) {
          stationToUse = profile.station;
        } 
        // Otherwise use the first station from the database
        else {
          stationToUse = stationNames[0];
        }
        
        // Apply the station selection
        console.log(`Setting selected station to: ${stationToUse}`);
        handleStationChange(stationToUse);
        
        // Load assessments for the selected station
        await fetchAssessments(stationToUse);
        
        setUserChecked(true);
      } catch (error) {
        console.error('Error initializing component:', error);
        setError('Failed to load data. Please try again.');
        
        // On error, ensure stations are cleared
        setStations([]);
        handleStationChange('Error Loading Stations');
      } finally {
        setLoading(false);
      }
    };
    
    // Execute the initialization
    loadComponentData();
  }, [auth, firestoreOperations]);
  
  // Calculate total risk score and determine risk level
  const calculateRiskScore = () => {
    const { supervision, planning, teamSelection, teamFitness, environment, complexity } = assessmentData.riskFactors;
    return supervision + planning + teamSelection + teamFitness + environment + complexity;
  };

  const getRiskLevel = (score) => {
    if (score >= 0 && score <= 23) return { level: "GREEN", color: "bg-green-500" };
    if (score >= 24 && score <= 44) return { level: "AMBER", color: "bg-amber-500" };
    return { level: "RED", color: "bg-red-500" };
  };

  const totalScore = calculateRiskScore();
  const riskLevel = getRiskLevel(totalScore);

  // Get risk color for individual factor
  const getFactorRiskColor = (value) => {
    if (value >= 0 && value <= 4) return "bg-green-500";
    if (value >= 5 && value <= 7) return "bg-amber-500";
    return "bg-red-500";
  };

  // Handle slider change
  const handleSliderChange = (factor, value) => {
    setAssessmentData({
      ...assessmentData,
      riskFactors: {
        ...assessmentData.riskFactors,
        [factor]: parseInt(value)
      }
    });
  };

  // SIMPLIFIED HANDLERS FOR INPUT FIELDS
  // Handle mitigation text change - use the simple approach from TodayLog
  const handleMitigationChange = (factor, text) => {
    setLocalMitigations(prev => ({
      ...prev,
      [factor]: text
    }));
    
    setHasChanges(true);
  };

  // Handle form field changes - simple direct approach
  const handleInputChange = (section, field, value) => {
    if (section) {
      setLocalFormData(prevData => ({
        ...prevData,
        [section]: {
          ...prevData[section],
          [field]: value
        }
      }));
    } else {
      setLocalFormData(prevData => ({
        ...prevData,
        [field]: value
      }));
    }
    
    setHasChanges(true);
  };

  // Sync local mitigations to assessment data when navigating between steps
  const syncMitigations = () => {
    // First, check if we have any local mitigations
    if (Object.keys(localMitigations).length === 0) return;

    // Update assessment data with local mitigations
    setAssessmentData({
      ...assessmentData,
      mitigations: {
        ...assessmentData.mitigations,
        ...localMitigations
      }
    });
  };

  // Sync local form data to assessment data
  const syncFormData = () => {
    // Update assessment data with local form data
    setAssessmentData({
      ...assessmentData,
      date: localFormData.date,
      time: localFormData.time,
      type: localFormData.type,
      station: localFormData.station || selectedStation, // Use selected station as fallback
      weather: localFormData.weather
    });
  };

  // Navigation functions
  const nextStep = async () => {
    // On steps with form inputs, sync local data to assessment data
    if (currentStep === 1) {
      // Sync form details (date, time, type, station, weather)
      syncFormData();
    } else if (currentStep === 3) {
      // Sync mitigation strategies
      syncMitigations();
    }

    // Only save to database if there are changes
    if (hasChanges) {
      try {
        setLoading(true);

        // Only save if we have a current assessment ID or if this is a new assessment
        if (currentAssessmentId) {
          // Make sure we have all local data synced
          const updatedAssessment = {
            ...assessmentData
          };

          // Add local data based on current step
          if (currentStep === 1) {
            updatedAssessment.date = localFormData.date;
            updatedAssessment.time = localFormData.time;
            updatedAssessment.type = localFormData.type;
            updatedAssessment.station = localFormData.station || selectedStation;
            updatedAssessment.weather = localFormData.weather;
          } else if (currentStep === 3) {
            updatedAssessment.mitigations = {
              ...assessmentData.mitigations,
              ...localMitigations
            };
          }

          await firestoreOperations.updateAssessment(currentAssessmentId, updatedAssessment);
        } else {
          // First time saving this assessment
          let assessmentToSave = { ...assessmentData };

          // Add local data based on current step
          if (currentStep === 1) {
            assessmentToSave.date = localFormData.date;
            assessmentToSave.time = localFormData.time;
            assessmentToSave.type = localFormData.type;
            assessmentToSave.station = localFormData.station || selectedStation;
            assessmentToSave.weather = localFormData.weather;
          } else if (currentStep === 3) {
            assessmentToSave.mitigations = {
              ...assessmentData.mitigations,
              ...localMitigations
            };
          }

          assessmentToSave.status = "draft";
          assessmentToSave.captain = auth.currentUser?.displayName || "Captain";

          const created = await firestoreOperations.createAssessment(assessmentToSave);
          if (created && created.id) {
            console.log("Created assessment with ID:", created.id);
            setCurrentAssessmentId(created.id);
          } else {
            console.error("Failed to get ID for new assessment:", created);
          }
        }

        // Reset hasChanges after saving
        setHasChanges(false);
      } catch (error) {
        console.error("Error saving assessment:", error);
      } finally {
        setLoading(false);
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = async () => {
    // On steps with form inputs, sync local data to assessment data
    if (currentStep === 1) {
      // Sync form details (date, time, type, station, weather)
      syncFormData();
    } else if (currentStep === 3) {
      // Sync mitigation strategies
      syncMitigations();
    }

    // Only save to database if there are changes
    if (hasChanges) {
      try {
        setLoading(true);

        // Only save if we have a current assessment ID or if this is a new assessment
        if (currentAssessmentId) {
          // Make sure we have all local data synced
          const updatedAssessment = {
            ...assessmentData
          };

          // Add local data based on current step
          if (currentStep === 1) {
            updatedAssessment.date = localFormData.date;
            updatedAssessment.time = localFormData.time;
            updatedAssessment.type = localFormData.type;
            updatedAssessment.station = localFormData.station || selectedStation;
            updatedAssessment.weather = localFormData.weather;
          } else if (currentStep === 3) {
            updatedAssessment.mitigations = {
              ...assessmentData.mitigations,
              ...localMitigations
            };
          }

          await firestoreOperations.updateAssessment(currentAssessmentId, updatedAssessment);
        } else {
          // First time saving this assessment
          let assessmentToSave = { ...assessmentData };

          // Add local data based on current step
          if (currentStep === 1) {
            assessmentToSave.date = localFormData.date;
            assessmentToSave.time = localFormData.time;
            assessmentToSave.type = localFormData.type;
            assessmentToSave.station = localFormData.station || selectedStation;
            assessmentToSave.weather = localFormData.weather;
          } else if (currentStep === 3) {
            assessmentToSave.mitigations = {
              ...assessmentData.mitigations,
              ...localMitigations
            };
          }

          assessmentToSave.status = "draft";
          assessmentToSave.captain = auth.currentUser?.displayName || "Captain";

          const created = await firestoreOperations.createAssessment(assessmentToSave);
          if (created && created.id) {
            setCurrentAssessmentId(created.id);
          }
        }

        // Reset hasChanges after saving
        setHasChanges(false);
      } catch (error) {
        console.error("Error saving assessment:", error);
      } finally {
        setLoading(false);
      }
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Start a new assessment
   * This function is called when the user clicks "Create New Assessment"
   * It verifies stations exist in the database before allowing creation
   */
  const startAssessment = async () => {
    // Check if we have stations from the database before doing anything
    if (stations.length === 0) {
      console.log("Attempted to create assessment with no stations in database");
      setError('Cannot create assessment: No stations are available in the database. Please contact an administrator to set up stations.');
      return;
    }
    
    // Double-check by fetching stations from database again
    try {
      const stationsData = await firestoreOperations.getStations();
      if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
        console.log("Verified no stations in database during startAssessment");
        setError('Cannot create assessment: No stations are available in the database. Please contact an administrator to set up stations.');
        setStations([]);
        return;
      }
    } catch (error) {
      console.error("Error verifying stations in startAssessment:", error);
      setError('Error checking stations. Please try again.');
      return;
    }
    
    // At this point we've verified stations exist in the database
    console.log("Creating new assessment with stations from database");
    
    // Use a valid station for the assessment
    const useStation = stations.includes(selectedStation) ? selectedStation : stations[0];
    console.log(`Using station: ${useStation} for new assessment`);
      
    const newAssessmentData = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      rawDate: new Date().toISOString(),
      time: new Date().toTimeString().substring(0, 5),
      type: "Department-wide",
      station: useStation, // Using validated station from database
      status: "draft",
      weather: {
        temperature: "37",
        temperatureUnit: "°F",
        wind: "18",
        windDirection: "NW",
        humidity: "85",
        precipitation: "Heavy Rain",
        precipitationRate: "1.2",
        alerts: "Flash Flood Warning until 5:00 PM"
      },
      riskFactors: {
        supervision: 0,
        planning: 0,
        teamSelection: 0,
        teamFitness: 0,
        environment: 0,
        complexity: 0
      },
      mitigations: {
        supervision: "",
        planning: "",
        teamSelection: "",
        teamFitness: "",
        environment: "",
        complexity: ""
      }
    };
    
    // Set assessment data
    setAssessmentData(newAssessmentData);
    
    // Initialize local form data
    setLocalFormData({
      date: newAssessmentData.date,
      time: newAssessmentData.time,
      type: newAssessmentData.type,
      station: newAssessmentData.station,
      weather: { ...newAssessmentData.weather }
    });
    
    // Reset mitigations data
    setLocalMitigations({});
    
    // Reset control states
    setHasChanges(false);
    setCurrentAssessmentId(null);
    setCurrentStep(1);
    setShowAssessment(true);
  };

  const closeAssessment = () => {
    setShowAssessment(false);
    setCurrentStep(1);
    setCurrentAssessmentId(null);
  };

  // Fixed viewAssessment function that properly handles errors and logging
  const viewAssessment = async (assessmentId) => {
    try {
      console.log("View assessment - ID:", assessmentId);
      
      // Clear any previous errors
      setError("");
      setLoading(true);
      
      if (!assessmentId) {
        console.error("Invalid assessment ID (empty or undefined)");
        setError("Cannot view assessment: Invalid ID");
        setLoading(false);
        return;
      }
      
      console.log("Fetching assessment data for ID:", assessmentId);
      const assessment = await firestoreOperations.getAssessment(assessmentId);
      console.log("Fetched assessment:", assessment);

      if (assessment && assessment.id) {
        console.log("Successfully loaded assessment with ID:", assessment.id);
        
        // Store assessment data in state
        setAssessmentData(assessment);
        setCurrentAssessmentId(assessmentId);

        // IMPORTANT: Initialize local state copies to match the loaded assessment
        // For Step 3: Mitigation strategies
        const mitigations = assessment.mitigations || {};
        setLocalMitigations({...mitigations});
        
        // For Step 1: Form data
        setLocalFormData({
          date: assessment.date || new Date().toISOString().split('T')[0],
          time: assessment.time || new Date().toTimeString().substring(0, 5),
          type: assessment.type || "Department-wide",
          station: assessment.station || selectedStation,
          weather: assessment.weather ? {...assessment.weather} : {
            temperature: "37",
            temperatureUnit: "°F",
            wind: "18",
            windDirection: "NW",
            humidity: "85",
            precipitation: "Heavy Rain",
            precipitationRate: "1.2",
            alerts: "Flash Flood Warning until 5:00 PM"
          }
        });

        // Reset state flags
        setHasChanges(false);
        setShowAssessment(true);
        setCurrentStep(1);
      } else {
        console.error("Failed to load assessment - null or missing ID");
        setError("Assessment not found. Please try again or create a new assessment.");
      }
    } catch (error) {
      console.error("Error in viewAssessment:", error);
      setError(`Failed to load assessment: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAssessment = async (assessmentId) => {
    try {
      setLoading(true);
      await firestoreOperations.deleteAssessment(assessmentId);
      
      // Refresh assessments list
      await fetchAssessments(selectedStation);
      setConfirmDelete(null);
    } catch (error) {
      console.error("Error deleting assessment:", error);
      setError("Failed to delete assessment");
    } finally {
      setLoading(false);
    }
  };

  // Save assessment as draft
  const saveAsDraft = async () => {
    try {
      setLoading(true);
      
      const assessmentToSave = {
        ...assessmentData,
        station: selectedStation,
        status: "draft",
        captain: auth.currentUser?.displayName || "Captain",
      };
      
      if (currentAssessmentId) {
        // Update existing assessment
        await firestoreOperations.updateAssessment(currentAssessmentId, assessmentToSave);
      } else {
        // Create new assessment
        const created = await firestoreOperations.createAssessment(assessmentToSave);
        if (created && created.id) {
          setCurrentAssessmentId(created.id);
        }
      }
      
      // Show success message or other feedback
      alert("Assessment saved as draft");
    } catch (error) {
      console.error("Error saving assessment:", error);
      setError("Failed to save assessment");
    } finally {
      setLoading(false);
    }
  };

  // Publication function
  const publishAssessment = async () => {
    try {
      setLoading(true);
      
      const assessmentToPublish = {
        ...assessmentData,
        station: selectedStation,
        status: "complete",
        captain: auth.currentUser?.displayName || "Captain",
        completedAt: new Date().toISOString(),
        completedBy: auth.currentUser?.displayName || "Captain"
      };
      
      if (currentAssessmentId) {
        // Update existing assessment
        await firestoreOperations.updateAssessment(currentAssessmentId, assessmentToPublish);
      } else {
        // Create new assessment
        await firestoreOperations.createAssessment(assessmentToPublish);
      }
      
      alert(`GAR Assessment published with risk level: ${riskLevel.level} and score: ${totalScore}`);
      closeAssessment();
      
      // Refresh assessments list
      await fetchAssessments(selectedStation);
    } catch (error) {
      console.error("Error publishing assessment:", error);
      setError("Failed to publish assessment");
    } finally {
      setLoading(false);
    }
  };

  // Stat card component for dashboard
  const StatCard = ({ icon, title, value }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-start">
      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
        {icon}
      </div>
      <div>
        <h3 className="text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  // Progress indicator component
  const ProgressIndicator = ({ currentStep, totalSteps }) => {
    const steps = [
      { name: "Start", icon: <Home className="w-4 h-4" /> },
      { name: "Assessment", icon: <AlertTriangle className="w-4 h-4" /> },
      { name: "Mitigation", icon: <FileText className="w-4 h-4" /> },
      { name: "Publish", icon: <CheckCircle className="w-4 h-4" /> }
    ];

    return (
      <div className="w-full py-4">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep > index + 1 ? "bg-blue-600 border-blue-600" : 
                  currentStep === index + 1 ? "bg-white dark:bg-gray-800 border-blue-600" : 
                  "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                }`}>
                  <span className={`${
                    currentStep > index + 1 ? "text-white" : 
                    currentStep === index + 1 ? "text-blue-600 dark:text-blue-400" : 
                    "text-gray-400 dark:text-gray-500"
                  }`}>
                    {currentStep > index + 1 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </span>
                </div>
                <span className={`mt-2 text-xs ${
                  currentStep >= index + 1 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-500 dark:text-gray-400"
                }`}>
                  {step.name}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > index + 1 ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // Step 1: Start/Details
  const Step1 = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Assessment Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <div className="relative">
            <input
              type="date"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localFormData.date}
              onChange={(e) => handleInputChange(null, 'date', e.target.value)}
            />
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <div className="relative">
            <input
              type="time"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localFormData.time}
              onChange={(e) => handleInputChange(null, 'time', e.target.value)}
            />
            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment Type</label>
          <select
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={localFormData.type}
            onChange={(e) => handleInputChange(null, 'type', e.target.value)}
          >
            <option value="Department-wide">Department-wide</option>
            <option value="Station-specific">Mission-specific</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Station</label>
          {stations.length === 0 ? (
            // No stations found in database
            <div className="w-full p-2 border border-yellow-300 dark:border-yellow-600 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500 dark:text-yellow-400" />
              No Stations Available in Database
            </div>
          ) : (
            // Stations found in database - show dropdown with database stations
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localFormData.station}
              onChange={(e) => handleInputChange(null, 'station', e.target.value)}
              disabled={localFormData.type !== "Station-specific"}
            >
              {localFormData.type !== "Station-specific" && (
                <option value="All Stations">All Stations</option>
              )}
              
              {/* Map through the actual database stations */}
              {stations.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Weather Conditions</h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
              <div className="flex">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={localFormData.weather?.temperature || ""}
                  onChange={(e) => handleInputChange('weather', 'temperature', e.target.value)}
                />
                <select
                  className="p-2 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                  value={localFormData.weather?.temperatureUnit || "°F"}
                  onChange={(e) => handleInputChange('weather', 'temperatureUnit', e.target.value)}
                >
                  <option value="°F">°F</option>
                  <option value="°C">°C</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wind</label>
              <div className="flex">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={localFormData.weather?.wind || ""}
                  onChange={(e) => handleInputChange('weather', 'wind', e.target.value)}
                />
                <select
                  className="p-2 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white w-20"
                  value={localFormData.weather?.windDirection || "N"}
                  onChange={(e) => handleInputChange('weather', 'windDirection', e.target.value)}
                >
                  <option value="N">N</option>
                  <option value="NE">NE</option>
                  <option value="E">E</option>
                  <option value="SE">SE</option>
                  <option value="S">S</option>
                  <option value="SW">SW</option>
                  <option value="W">W</option>
                  <option value="NW">NW</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Humidity (%)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={localFormData.weather?.humidity || ""}
                onChange={(e) => handleInputChange('weather', 'humidity', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precipitation</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Type (e.g., Rain, Snow)"
                value={localFormData.weather?.precipitation || ""}
                onChange={(e) => handleInputChange('weather', 'precipitation', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (in/hr)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={localFormData.weather?.precipitationRate || ""}
                onChange={(e) => handleInputChange('weather', 'precipitationRate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weather Alerts</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter any active weather alerts"
              value={localFormData.weather?.alerts || ""}
              onChange={(e) => handleInputChange('weather', 'alerts', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Risk Assessment
  const Step2 = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Risk Assessment Factors</h2>
        <div className={`${riskLevel.color} text-white font-bold px-4 py-2 rounded-md flex items-center`}>
          <span className="mr-2">Total:</span>
          <span className="text-2xl">{totalScore}</span>
        </div>
      </div>
      
      <div className="space-y-6">
        <RiskFactor 
          name="Supervision" 
          description="Quality and effectiveness of oversight"
          value={assessmentData.riskFactors.supervision}
          onChange={(value) => handleSliderChange('supervision', value)}
        />
        
        <RiskFactor 
          name="Planning" 
          description="Adequacy of operational planning"
          value={assessmentData.riskFactors.planning}
          onChange={(value) => handleSliderChange('planning', value)}
        />
        
        <RiskFactor 
          name="Team Selection" 
          description="Personnel qualifications and experience"
          value={assessmentData.riskFactors.teamSelection}
          onChange={(value) => handleSliderChange('teamSelection', value)}
        />
        
        <RiskFactor 
          name="Team Fitness" 
          description="Physical and mental readiness"
          value={assessmentData.riskFactors.teamFitness}
          onChange={(value) => handleSliderChange('teamFitness', value)}
        />
        
        <RiskFactor 
          name="Environment" 
          description="Weather, terrain, and other external conditions"
          value={assessmentData.riskFactors.environment}
          onChange={(value) => handleSliderChange('environment', value)}
        />
        
        <RiskFactor 
          name="Event Complexity" 
          description="Technical difficulty and operational complexity"
          value={assessmentData.riskFactors.complexity}
          onChange={(value) => handleSliderChange('complexity', value)}
        />
      </div>
    </div>
  );

  // Risk Factor component for Step 2
  const RiskFactor = ({ name, description, value, onChange }) => {
    const riskColor = getFactorRiskColor(value);
    
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          <div className={`${riskColor} text-white font-bold w-10 h-10 flex items-center justify-center rounded-full`}>
            {value}
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="text-xs text-green-600 dark:text-green-400 mr-2">Low Risk</span>
          <input
            type="range"
            min="0"
            max="10"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                #4ade80 0%, #4ade80 40%, 
                #f59e0b 40%, #f59e0b 70%, 
                #ef4444 70%, #ef4444 100%)`
            }}
          />
          <span className="text-xs text-red-600 dark:text-red-400 ml-2">High Risk</span>
        </div>
      </div>
    );
  };

  // Step 3: Mitigation Strategies
  const Step3 = () => {
    const highRiskFactors = Object.entries(assessmentData.riskFactors)
      .filter(([_, value]) => value >= 5)
      .map(([key, _]) => key);

    const factorLabels = {
      supervision: "Supervision",
      planning: "Planning",
      teamSelection: "Team Selection",
      teamFitness: "Team Fitness",
      environment: "Environment",
      complexity: "Event Complexity"
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-6">
          <div className={`${riskLevel.color} text-white font-bold px-4 py-3 rounded-md`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl">Overall Risk Level: {riskLevel.level}</h2>
              <span className="text-2xl">{totalScore}</span>
            </div>
          </div>
        </div>

        {highRiskFactors.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Required Mitigation Strategies</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please provide specific mitigation strategies for all factors rated 5 or higher:
            </p>

            <div className="space-y-4">
              {highRiskFactors.map((factor) => {
                const factorScore = assessmentData.riskFactors[factor];
                const riskColor = getFactorRiskColor(factorScore);
                const borderColor = riskColor.replace('bg-', 'border-');
                const bgColor = riskColor.replace('bg-', 'bg-') + '/10';

                return (
                  <div key={factor} className={`border-2 ${borderColor} ${bgColor} rounded-md p-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {factorLabels[factor]} ({factorScore})
                      </h3>
                      <div className={`${riskColor} text-white font-bold px-2 py-1 rounded text-sm`}>
                        {factorScore >= 8 ? 'HIGH RISK' : 'MODERATE RISK'}
                      </div>
                    </div>

                    <textarea
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows="3"
                      placeholder={`Describe mitigation strategies for ${factorLabels[factor]}...`}
                      value={localMitigations[factor] || ''}
                      onChange={(e) => handleMitigationChange(factor, e.target.value)}
                    ></textarea>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">No High-Risk Factors Identified</h3>
            <p className="text-gray-600 dark:text-gray-400">
              All factors are rated below 5. No mitigation strategies are required.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Step 4: Review and Publish
  const Step4 = () => {
    const highRiskFactors = Object.entries(assessmentData.riskFactors)
      .filter(([_, value]) => value >= 5)
      .map(([key, _]) => key);
    
    const factorLabels = {
      supervision: "Supervision",
      planning: "Planning",
      teamSelection: "Team Selection",
      teamFitness: "Team Fitness",
      environment: "Environment",
      complexity: "Event Complexity"
    };
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Review Assessment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Assessment Details</h3>
            <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600 dark:text-gray-400">Date:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.date}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Time:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.time}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Type:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.type}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Applied to:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.station}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Risk Summary</h3>
            <div className={`${riskLevel.color} text-white rounded-md p-4`}>
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">Total Score:</div>
                <div className="font-bold text-xl">{totalScore}</div>
                
                <div className="font-medium">Risk Level:</div>
                <div className="font-bold text-xl">{riskLevel.level}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Weather Summary</h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600 dark:text-gray-400">Temperature:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.weather.temperature}{assessmentData.weather.temperatureUnit}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Wind:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.weather.wind} mph {assessmentData.weather.windDirection}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Humidity:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.weather.humidity}%</div>
                
                <div className="text-gray-600 dark:text-gray-400">Precipitation:</div>
                <div className="text-gray-900 dark:text-white">{assessmentData.weather.precipitation} ({assessmentData.weather.precipitationRate}"/hr)</div>
                
                <div className="text-gray-600 dark:text-gray-400">Alerts:</div>
                <div className="text-amber-600 dark:text-amber-400">{assessmentData.weather.alerts}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Factor Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4">
              <div className="space-y-2">
                {Object.entries(assessmentData.riskFactors).map(([factor, value]) => (
                  <div key={factor} className="flex justify-between items-center">
                    <div className="text-gray-900 dark:text-white">{factorLabels[factor]}:</div>
                    <div className={`${getFactorRiskColor(value)} text-white font-bold w-8 h-8 flex items-center justify-center rounded-full`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {highRiskFactors.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Mitigation Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4">
              <div className="text-gray-600 dark:text-gray-400 mb-2">{highRiskFactors.length} Factor(s) with Mitigation Plans:</div>
              
              <div className="space-y-3">
                {highRiskFactors.map((factor) => (
                  <div key={factor} className="border-l-4 border-gray-300 dark:border-gray-600 pl-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {factorLabels[factor]} ({assessmentData.riskFactors[factor]})
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {assessmentData.mitigations[factor] || "No mitigation strategy provided"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4 mb-6">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Notification Preview</h3>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden max-w-xs mx-auto">
            <div className={`${riskLevel.color} text-white p-2 text-center font-bold`}>
              GAR Alert: {riskLevel.level}
            </div>
            <div className="p-3 bg-white dark:bg-gray-700 text-sm">
              <div className="mb-2 text-gray-900 dark:text-white">Score: {totalScore} | {assessmentData.weather.precipitation} | {assessmentData.weather.alerts}</div>
              <div className="text-blue-600 dark:text-blue-400">Tap to view mitigations &gt;</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4 mb-6">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Notification Recipients</h3>
          <div className="flex flex-wrap gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm">
              All Firefighters (231)
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm">
              All Officers (27)
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm">
              Chief Staff (5)
            </div>
            <button className="text-blue-600 dark:text-blue-400 text-sm underline">
              Edit Recipients
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render current step based on state
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 />;
      case 2:
        return <Step2 />;
      case 3:
        return <Step3 />;
      case 4:
        return <Step4 />;
      default:
        return <Step1 />;
    }
  };

  // If still checking user status, show loading
  if (!userChecked) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-600 dark:text-gray-400">Checking user access...</p>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // Delete confirmation modal
  const DeleteConfirmationModal = () => {
    if (!confirmDelete) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Confirm Deletion</h3>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this assessment? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteAssessment(confirmDelete)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // CRITICAL: Monitor station data to ensure UI updates correctly
  useEffect(() => {
    console.log("%c STATION STATE CHANGE DETECTED:", "background: red; color: white; font-size: 16px");
    console.log("%c Current stations array:", "font-weight: bold", stations);
    console.log("%c Stations array length:", "font-weight: bold", stations.length);
    console.log("%c Selected station:", "font-weight: bold", selectedStation);
    
    // IMPORTANT SAFETY MEASURE: Force verify if stations exist in database again
    (async () => {
      try {
        // This is a verification check only - the main data loading is in the component mount effect
        const stationsData = await firestoreOperations.getStations();
        console.log("%c VERIFICATION - Database stations:", "background: blue; color: white", 
          stationsData && Array.isArray(stationsData) ? stationsData : "NONE");
        
        // If database has no stations but our state shows stations, force reset it
        if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
          if (stations.length > 0) {
            console.log("%c CRITICAL MISMATCH - Resetting stations to empty", "background: red; color: white");
            setStations([]);
          }
        }
      } catch (err) {
        console.error("Error in station verification:", err);
      }
    })();
  }, [stations, selectedStation, firestoreOperations]);
  
  // Main application rendering
  return (
    <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
      {!showAssessment ? (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">GAR Risk Assessment</h1>
              <p className="text-gray-600 dark:text-gray-400">Create and manage risk assessments for your department</p>
              
              {/* COMPLETELY REWROTE THIS SECTION FOR BUTTON DISPLAY */}
              <div className="mt-4">
                {/* Force display warning when no stations exist */}
                {stations.length === 0 && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="h-4 w-4 mr-1 text-red-500 dark:text-red-400" />
                      NO STATIONS FOUND IN DATABASE
                    </div>
                    
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                      <div className="flex items-start">
                        <AlertTriangle className="text-red-500 dark:text-red-400 w-5 h-5 mr-2 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Cannot Create Assessments</h3>
                          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                            No fire stations exist in the Firestore database. An administrator must create at least one station in the database before any assessments can be created.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Only show button when stations exist and user has permissions */}
                {stations.length > 0 && !readOnlyMode && (
                  <div className="flex space-x-4">
                    <button 
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      onClick={startAssessment}
                      disabled={stations.length === 0}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Create New Assessment
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard 
                icon={<AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />}
                title="Recent Assessments"
                value={pastAssessments.length > 0 ? String(pastAssessments.length) : "0"}
              />
              
              <StatCard 
                icon={<Clock className="w-6 h-6 text-green-500 dark:text-green-400" />}
                title="High Risk Assessments"
                value={pastAssessments.filter(a => {
                  const riskFactorValues = Object.values(a.riskFactors || {});
                  const sum = riskFactorValues.reduce((acc, val) => acc + val, 0);
                  return sum >= 45;
                }).length.toString()}
              />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assessment History</h2>
            </div>
            
            {pastAssessments.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pastAssessments.map(assessment => {
                  // Debug the assessment structure
                  console.log("Assessment in list:", assessment);
                  console.log("Assessment ID:", assessment.id);
                  
                  const assessmentScore = Object.values(assessment.riskFactors || {}).reduce((acc, val) => acc + val, 0);
                  const assessmentRisk = getRiskLevel(assessmentScore);
                  
                  return (
                    <div key={assessment.id || "unknown"} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`${assessmentRisk.color} p-2 rounded-lg mr-4 text-white`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{assessment.type || "Unknown Type"}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {assessment.date || "No date"} • Score: {assessmentScore} ({assessmentRisk.level})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!readOnlyMode && (
                          <button 
                            onClick={() => setConfirmDelete(assessment.id)}
                            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            disabled={!assessment.id}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            console.log("Clicked view for assessment:", assessment.id);
                            if (assessment.id) {
                              viewAssessment(assessment.id);
                            } else {
                              setError("Cannot view assessment: missing ID");
                            }
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
                          disabled={!assessment.id}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No assessments found</p>
                <p className="text-sm mt-1">Create your first risk assessment to get started</p>
              </div>
            )}
          </div>
          
          {/* Delete confirmation modal */}
          <DeleteConfirmationModal />
        </div>
      ) : (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GAR Assessment Tool</h1>
              <button 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                onClick={closeAssessment}
              >
                Cancel
              </button>
            </div>
          </div>
          
          <ProgressIndicator currentStep={currentStep} totalSteps={4} />
          
          {renderStep()}
          
          <div className="flex justify-between mt-6">
            {currentStep > 1 ? (
              <button 
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                onClick={prevStep}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
            ) : (
              <div></div>
            )}
            
            {currentStep < 4 ? (
              <button 
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                onClick={nextStep}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <div className="space-x-3">
                <button 
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  onClick={saveAsDraft}
                >
                  Save as Draft
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  onClick={publishAssessment}
                >
                  Publish Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GARAssessment;