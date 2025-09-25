import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { Calendar, Clock, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle, FileText, Home, Trash2, Edit3, Users, Mail, X, Search } from 'lucide-react';
import Layout from './Layout';
import { FirestoreContext } from '../App';
import ReadOnlyAssessmentView from './ReadOnlyAssessmentView';
import NotificationRecipientsModal from './NotificationRecipientsModal';
import Pagination from './Pagination';
import { initEmailJS, sendGARAssessmentNotifications } from '../utils/emailService';
import { getGARWeatherData, refreshGARWeatherData } from '../services/garWeatherService';

// Main component
const GARAssessment = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get assessment ID from URL if present
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // DEBUG: Track renders
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  console.log(`🔄 GAR Assessment Render #${renderCount.current}`);
  
  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });
  
  // DEBUG: Track state changes
  React.useEffect(() => {
    console.log(`🌓 darkMode changed:`, darkMode);
  }, [darkMode]);
  
  // CRITICAL: Force initialize with empty array to prevent flickering the button
  // This empty array ensures the button won't show until we confirm stations exist in database
  const [stations, setStations] = useState(() => {
    return [];  // This ensures button is hidden until we load real database stations
  });
  
  // Initialize selectedStation from localStorage
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'No Stations Available';
  });
  
  React.useEffect(() => {
    console.log(`🏢 selectedStation changed:`, selectedStation);
  }, [selectedStation]);
  
  React.useEffect(() => {
    console.log(`🏭 stations changed:`, stations);
  }, [stations]);
  
  /**
   * Fetch stations from Firestore database
   * This function gets the actual station data from the database
   * and updates the state accordingly
   */
  const fetchStations = async () => {
    try {
      // Clear existing stations first to ensure UI updates correctly
      setStations([]);
      
      // Get stations from Firestore through the provided context
      const stationsData = await firestoreOperations.getStations();
      
      // Validate we have proper data
      if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
        setStations([]);
        handleStationChange('No Stations Available');
        return;
      }
      
      // Format station names from the database records
      const stationNames = stationsData.map(station => 
        `Station ${station.number || station.id.replace('station_', '')}`
      );
      
      // Update the stations state with the actual station names from the database
      setStations(stationNames);
      
      // If current selection is invalid or a placeholder, update to first available station
      const isValidStation = stationNames.includes(selectedStation);
      const isPlaceholder = selectedStation === 'No Stations Available' || 
                          selectedStation === 'Error Loading Stations';
                          
      if (!isValidStation || isPlaceholder) {
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
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [showReadOnlyView, setShowReadOnlyView] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationRecipients, setNotificationRecipients] = useState({
    groups: [],
    users: [],
    groupsData: [],
    usersData: []
  });
  
  // Notification state for better UX instead of alerts
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // Cancel loading state
  const [cancelLoading, setCancelLoading] = useState(false);
  
  // Weather loading state for professional loading indicators
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // Assessment history pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'published', 'draft'
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'low', 'medium', 'high'
  const itemsPerPage = 5;
  
  // Show notification helper function
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // USE REFS FOR MITIGATION TEXTAREAS TO PREVENT RE-RENDERS
  const mitigationRefs = React.useRef({
    supervision: null,
    planning: null,
    teamSelection: null,
    teamFitness: null,
    environment: null,
    complexity: null
  });
  
  // USE REFS FOR ALL FORM INPUTS TO PREVENT RE-RENDERS
  const formRefs = React.useRef({
    date: null,
    time: null,
    type: null,
    station: null,
    temperature: null,
    temperatureUnit: null,
    wind: null,
    windDirection: null,
    humidity: null,
    precipitation: null,
    precipitationRate: null,
    waveHeight: null,
    wavePeriod: null,
    waveDirection: null,
    alerts: null
  });
  
  // INITIAL FORM DATA (NOT REACTIVE STATE)
  const initialFormData = React.useRef({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    type: "Department-wide",
    station: '',
    weather: {
      temperature: "",
      temperatureUnit: "°F",
      wind: "",
      windDirection: "NW",
      humidity: "",
      precipitation: "",
      precipitationRate: "",
      waveHeight: "",
      wavePeriod: "",
      waveDirection: "NW",
      alerts: ""
    }
  });
  

  // State for assessment form
  const [showAssessment, setShowAssessment] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [assessmentData, setAssessmentData] = useState({
    date: new Date().toISOString().split('T')[0],
    rawDate: new Date().toISOString(),
    time: new Date().toTimeString().substring(0, 5),
    type: "Department-wide",
    station: selectedStation,
    status: "draft",
    userId: null, // Will be set when creating assessment
    weather: {
      temperature: "",
      temperatureUnit: "°F",
      wind: "",
      windDirection: "NW",
      humidity: "",
      precipitation: "",
      precipitationRate: "",
      waveHeight: "",
      wavePeriod: "",
      waveDirection: "NW",
      alerts: ""
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
    },
    notificationRecipients: {
      groups: [],
      users: [],
      groupsData: [],
      usersData: []
    }
  });
  
  // FUNCTION TO GET CURRENT FORM VALUES FROM REFS
  const getCurrentFormData = React.useCallback(() => {
    return {
      date: formRefs.current.date?.value || "",
      time: formRefs.current.time?.value || "",
      type: formRefs.current.type?.value || "",
      station: formRefs.current.station?.value || "",
      weather: {
        temperature: formRefs.current.temperature?.value || "",
        temperatureUnit: formRefs.current.temperatureUnit?.value || "°F",
        wind: formRefs.current.wind?.value || "",
        windDirection: formRefs.current.windDirection?.value || "NW",
        humidity: formRefs.current.humidity?.value || "",
        precipitation: formRefs.current.precipitation?.value || "",
        precipitationRate: formRefs.current.precipitationRate?.value || "",
        waveHeight: formRefs.current.waveHeight?.value || "",
        wavePeriod: formRefs.current.wavePeriod?.value || "",
        waveDirection: formRefs.current.waveDirection?.value || "NW",
        alerts: formRefs.current.alerts?.value || ""
      }
    };
  }, []);

  // FUNCTION TO GET CURRENT MITIGATION VALUES FROM REFS
  const getCurrentMitigationData = React.useCallback(() => {
    return {
      supervision: mitigationRefs.current.supervision?.value || "",
      planning: mitigationRefs.current.planning?.value || "",
      teamSelection: mitigationRefs.current.teamSelection?.value || "",
      teamFitness: mitigationRefs.current.teamFitness?.value || "",
      environment: mitigationRefs.current.environment?.value || "",
      complexity: mitigationRefs.current.complexity?.value || ""
    };
  }, []);
  
  // Wrapper functions to update localStorage when state changes
  const handleDarkModeChange = (mode) => {
    setDarkMode(mode);
    localStorage.setItem('darkMode', mode.toString());
  };
  
  const handleStationChange = (station) => {
    setSelectedStation(station);
    localStorage.setItem('selectedStation', station);
    
    // If we're on the assessment list view, refresh the assessments
    if (!showAssessment && pastAssessments.length > 0) {
      fetchAssessments();
    }
  };
  
  // Fetch all assessments from Firebase (no longer filtered by station)
  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      const assessments = await firestoreOperations.getAllAssessments();
      
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
        
        // Initialize EmailJS for notifications
        initEmailJS();
        
        // Check for publish notification after reload
        const publishNotification = localStorage.getItem('garPublishNotification');
        if (publishNotification) {
          showNotification(publishNotification, 'success');
          localStorage.removeItem('garPublishNotification');
        }
        
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
        
        // Anyone can create and edit GAR assessments now
        setReadOnlyMode(false);
        
        // CRITICAL: Load stations directly from Firestore database
        // This is the key part that ensures we're using actual database stations
        
        // Get raw station data from database
        const stationsData = await firestoreOperations.getStations();
        
        // If no stations in database, clear stations and show message
        if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
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
        
        // Format the station names from database records
        const stationNames = stationsData.map(station => 
          `Station ${station.number || station.id.replace('station_', '')}`
        );
        
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
        handleStationChange(stationToUse);
        
        // Load all assessments
        await fetchAssessments();
        
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
  
  /**
   * Automatically fetch weather data when component is ready
   */
  useEffect(() => {
    // Only fetch weather data if:
    // 1. User is checked and authenticated
    // 2. Component is not loading
    // 3. We're not in read-only view mode
    // 4. We haven't already fetched weather data
    if (userChecked && !loading && !showReadOnlyView && !id) {
      console.log('🌤️ Component ready, fetching initial weather data...');
      
      // Fetch weather data automatically (cache-first approach)
      const fetchInitialWeather = async () => {
        try {
          setWeatherLoading(true);
          console.log('🌤️ [GAR] Fetching initial weather data (cache-first)...');
          const weatherData = await getGARWeatherData(); // Use cache-first instead of force refresh
          
          if (weatherData) {
            console.log('✅ [GAR] Initial weather data loaded:', weatherData);
            
            // Update assessment data
            setAssessmentData(prev => ({
              ...prev,
              weather: {
                ...prev.weather,
                ...weatherData
              }
            }));
            
            // Update form fields
            setTimeout(() => {
              if (formRefs.current.temperature) formRefs.current.temperature.value = weatherData.temperature || '';
              if (formRefs.current.temperatureUnit) formRefs.current.temperatureUnit.value = weatherData.temperatureUnit || '°F';
              if (formRefs.current.wind) formRefs.current.wind.value = weatherData.wind || '';
              if (formRefs.current.windDirection) formRefs.current.windDirection.value = weatherData.windDirection || 'NW';
              if (formRefs.current.humidity) formRefs.current.humidity.value = weatherData.humidity || '';
              if (formRefs.current.precipitation) formRefs.current.precipitation.value = weatherData.precipitation || '';
              if (formRefs.current.precipitationRate) formRefs.current.precipitationRate.value = weatherData.precipitationRate || '';
              if (formRefs.current.waveHeight) formRefs.current.waveHeight.value = weatherData.waveHeight || '';
              if (formRefs.current.wavePeriod) formRefs.current.wavePeriod.value = weatherData.wavePeriod || '';
              if (formRefs.current.waveDirection) formRefs.current.waveDirection.value = weatherData.waveDirection || 'N';
              if (formRefs.current.alerts) formRefs.current.alerts.value = weatherData.alerts || '';
            }, 100);
          } else {
            console.log('⚠️ [GAR] No initial weather data available');
          }
        } catch (error) {
          console.error('Failed to fetch initial weather data:', error);
          // Don't show error notification for initial fetch failure
          // User can manually refresh if needed
        } finally {
          setWeatherLoading(false);
        }
      };
      
      // Small delay to ensure form is ready
      const timer = setTimeout(() => {
        fetchInitialWeather();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [userChecked, loading, showReadOnlyView, id]);
  
  // Station verification useEffect - only run once after initial load
  useEffect(() => {
    // Only run verification if we have loaded stations initially
    if (!userChecked) return;
    
    // IMPORTANT SAFETY MEASURE: Force verify if stations exist in database again
    (async () => {
      try {
        // This is a verification check only - the main data loading is in the component mount effect
        const stationsData = await firestoreOperations.getStations();
        
        // If database has no stations but our state shows stations, force reset it
        if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
          if (stations.length > 0) {
            setStations([]);
          }
        }
      } catch (err) {
        console.error("Error in station verification:", err);
      }
    })();
  }, [userChecked, firestoreOperations]); // Removed stations and selectedStation to prevent re-renders
  
  // Handle URL parameter changes for assessment viewing
  useEffect(() => {
    // Only run if component is initialized and user is checked
    if (!userChecked) return;
    
    if (id) {
      console.log(`🔍 URL changed - Loading assessment: ${id}`);
      const loadAssessmentFromURL = async () => {
        try {
          setError(''); // Clear any existing errors
          setLoading(true);
          
          const assessment = await firestoreOperations.getAssessment(id);
          if (assessment && assessment.id) {
            console.log(`✅ Assessment loaded from URL change:`, assessment);
            setViewingAssessment(assessment);
            setShowReadOnlyView(true);
          } else {
            console.error("Assessment not found for ID:", id);
            setError("Assessment not found. It may have been deleted or you may not have permission to view it.");
          }
        } catch (error) {
          console.error("Error loading assessment from URL change:", error);
          setError(`Failed to load assessment: ${error.message || "Unknown error"}`);
        } finally {
          setLoading(false);
        }
      };
      
      loadAssessmentFromURL();
    } else {
      // No ID in URL, close any read-only view
      if (showReadOnlyView) {
        setShowReadOnlyView(false);
        setViewingAssessment(null);
      }
    }
  }, [id, userChecked, firestoreOperations, showReadOnlyView]);
  
  // Calculate total risk score and determine risk level
  const calculateRiskScore = () => {
    const { supervision, planning, teamSelection, teamFitness, environment, complexity } = assessmentData.riskFactors;
    return supervision + planning + teamSelection + teamFitness + environment + complexity;
  };

  const getRiskLevel = (score) => {
    if (score >= 0 && score <= 23) return { level: "LOW RISK", color: "bg-green-500" };
    if (score >= 24 && score <= 44) return { level: "MODERATE RISK", color: "bg-amber-500" };
    return { level: "HIGH RISK", color: "bg-red-500" };
  };

  const totalScore = calculateRiskScore();
  const riskLevel = getRiskLevel(totalScore);

  // Get risk color for individual factor
  const getFactorRiskColor = (value) => {
    if (value >= 0 && value <= 4) return "bg-green-500";
    if (value >= 5 && value <= 7) return "bg-amber-500";
    return "bg-red-500";
  };

  // Handle slider change - NO AUTO DATABASE UPDATE
  const handleSliderChange = React.useCallback((factor, value) => {
    React.startTransition(() => {
      setAssessmentData(prevData => ({
        ...prevData,
        riskFactors: {
          ...prevData.riskFactors,
          [factor]: parseInt(value)
        }
      }));
      
      // Don't set hasChanges immediately to prevent focus loss
      // setHasChanges(true);
    });
  }, []);

  // SIMPLIFIED HANDLERS FOR INPUT FIELDS
  // Handle mitigation text change - NO STATE UPDATES TO PREVENT RE-RENDERS
  const handleMitigationChange = React.useCallback((factor, text) => {
    console.log(`📝 handleMitigationChange called: ${factor} = "${text}"`);
    
    // No state updates = no re-renders = no focus loss!
    // Data is stored in refs and collected when needed
  }, []);

  // Auto-update draft in database whenever fields change
  const updateDraftInDatabase = async (updatedData) => {
    if (!currentDraftId) return;
    
    try {
      await firestoreOperations.updateAssessment(currentDraftId, {
        ...updatedData,
        status: "draft",
        captain: auth.currentUser?.displayName || "Captain",
        userId: auth.currentUser?.uid // Required for security rules
      });
    } catch (error) {
      console.error("Error auto-updating draft:", error);
    }
  };

  // Handle bidirectional logic for station/type without state updates
  const handleStationTypeLogic = React.useCallback((field, value) => {
    if (field === 'station') {
      if (value === 'All Stations' && formRefs.current.type) {
        formRefs.current.type.value = 'Department-wide';
      } else if (value && value !== 'All Stations' && stations.includes(value) && formRefs.current.type) {
        formRefs.current.type.value = 'Mission-specific';
      }
    } else if (field === 'type') {
      if (value === 'Department-wide' && formRefs.current.station) {
        formRefs.current.station.value = 'All Stations';
      } else if (value === 'Mission-specific' && formRefs.current.station?.value === 'All Stations') {
        if (stations.length > 0 && formRefs.current.station) {
          formRefs.current.station.value = stations[0];
        }
      }
    }
  }, [stations]);
  
  // SIMPLE INPUT CHANGE HANDLER THAT DOESN'T TRIGGER RE-RENDERS
  const handleInputChange = React.useCallback((field, value) => {
    console.log(`📝 handleInputChange called: ${field} = "${value}"`);
    
    // Handle bidirectional logic
    handleStationTypeLogic(field, value);
    
    // No state updates = no re-renders = no focus loss!
  }, [handleStationTypeLogic]);

  // Sync mitigation data from refs to assessment data when navigating between steps
  const syncMitigations = () => {
    // Get current mitigation data from refs
    const currentMitigationData = getCurrentMitigationData();

    // Update assessment data with current mitigation data
    setAssessmentData({
      ...assessmentData,
      mitigations: {
        ...assessmentData.mitigations,
        ...currentMitigationData
      }
    });
  };

  // Sync form data from refs to assessment data
  const syncFormData = () => {
    const currentFormData = getCurrentFormData();
    setAssessmentData({
      ...assessmentData,
      date: currentFormData.date,
      time: currentFormData.time,
      type: currentFormData.type,
      station: currentFormData.station || selectedStation,
      weather: currentFormData.weather
    });
  };

  // Sync assessment data back to form refs (when navigating back to step 1)
  const syncAssessmentDataToRefs = React.useCallback(() => {
    if (!assessmentData) return;
    
    console.log('🔄 Syncing assessment data back to form refs:', assessmentData);
    
    // Sync basic fields
    if (formRefs.current.date) formRefs.current.date.value = assessmentData.date || '';
    if (formRefs.current.time) formRefs.current.time.value = assessmentData.time || '';
    if (formRefs.current.type) formRefs.current.type.value = assessmentData.type || 'Department-wide';
    if (formRefs.current.station) formRefs.current.station.value = assessmentData.station || '';
    
    // Sync weather fields
    const weather: any = assessmentData.weather || {};
    if (formRefs.current.temperature) formRefs.current.temperature.value = weather.temperature || '';
    if (formRefs.current.temperatureUnit) formRefs.current.temperatureUnit.value = weather.temperatureUnit || '°F';
    if (formRefs.current.wind) formRefs.current.wind.value = weather.wind || '';
    if (formRefs.current.windDirection) formRefs.current.windDirection.value = weather.windDirection || 'NW';
    if (formRefs.current.humidity) formRefs.current.humidity.value = weather.humidity || '';
    if (formRefs.current.precipitation) formRefs.current.precipitation.value = weather.precipitation || '';
    if (formRefs.current.precipitationRate) formRefs.current.precipitationRate.value = weather.precipitationRate || '';
    if (formRefs.current.waveHeight) formRefs.current.waveHeight.value = weather.waveHeight || '';
    if (formRefs.current.wavePeriod) formRefs.current.wavePeriod.value = weather.wavePeriod || '';
    if (formRefs.current.waveDirection) formRefs.current.waveDirection.value = weather.waveDirection || 'NW';
    if (formRefs.current.alerts) formRefs.current.alerts.value = weather.alerts || '';
  }, [assessmentData]);

  // Sync assessment data back to Step 2 (risk factors)
  const syncAssessmentDataToStep2 = React.useCallback(() => {
    if (!assessmentData?.riskFactors) return;
    
    console.log('🔄 Syncing assessment risk factors to Step 2:', assessmentData.riskFactors);
    
    // The risk factors are already in assessmentData.riskFactors and Step2 reads from there
    // No additional sync needed since Step2 uses controlled components that read from assessmentData
  }, [assessmentData]);

  // Sync assessment data back to Step 3 (mitigations)
  const syncAssessmentDataToStep3 = React.useCallback(() => {
    if (!assessmentData?.mitigations) return;
    
    console.log('🔄 Syncing assessment mitigations to Step 3:', assessmentData.mitigations);
    
    // Update mitigation refs with saved data
    const mitigations = assessmentData.mitigations;
    if (mitigationRefs.current.supervision) mitigationRefs.current.supervision.value = mitigations.supervision || "";
    if (mitigationRefs.current.planning) mitigationRefs.current.planning.value = mitigations.planning || "";
    if (mitigationRefs.current.teamSelection) mitigationRefs.current.teamSelection.value = mitigations.teamSelection || "";
    if (mitigationRefs.current.teamFitness) mitigationRefs.current.teamFitness.value = mitigations.teamFitness || "";
    if (mitigationRefs.current.environment) mitigationRefs.current.environment.value = mitigations.environment || "";
    if (mitigationRefs.current.complexity) mitigationRefs.current.complexity.value = mitigations.complexity || "";
  }, [assessmentData]);

  // Sync assessment data to Step 4 (review - NO STATE UPDATES, just for display)
  const syncAssessmentDataToStep4 = React.useCallback(() => {
    console.log('🔄 Step 4 review - data is already synced from navigation');
    
    // Step 4 is read-only, no need to update state here
    // All data syncing happens during navigation in nextStep/prevStep functions
    // This prevents infinite re-render loops
  }, []);

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

    // Always save to database when moving from step 1 (form data), step 2 (risk factors), or step 3 (mitigations)
    const shouldSave = currentStep === 1 || currentStep === 2 || currentStep === 3;
    if (shouldSave) {
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
            const currentFormData = getCurrentFormData();
            updatedAssessment.date = currentFormData.date;
            updatedAssessment.time = currentFormData.time;
            updatedAssessment.type = currentFormData.type;
            updatedAssessment.station = currentFormData.station || selectedStation;
            updatedAssessment.weather = currentFormData.weather;
          } else if (currentStep === 3) {
            updatedAssessment.mitigations = {
              ...assessmentData.mitigations,
              ...getCurrentMitigationData()
            };
          }

          await firestoreOperations.updateAssessment(currentAssessmentId, updatedAssessment);
        } else {
          // First time saving this assessment
          let assessmentToSave: any = { ...assessmentData };

          // Add local data based on current step
          if (currentStep === 1) {
            const currentFormData = getCurrentFormData();
            assessmentToSave.date = currentFormData.date;
            assessmentToSave.time = currentFormData.time;
            assessmentToSave.type = currentFormData.type;
            assessmentToSave.station = currentFormData.station || selectedStation;
            assessmentToSave.weather = currentFormData.weather;
          } else if (currentStep === 3) {
            assessmentToSave.mitigations = {
              ...assessmentData.mitigations,
              ...getCurrentMitigationData()
            };
          }

          assessmentToSave.status = "draft";
          assessmentToSave.captain = auth.currentUser?.displayName || "Captain";

          const created = await firestoreOperations.createAssessment(assessmentToSave);
          if (created && created.id) {
            setCurrentAssessmentId(created.id);
          } else {
            console.error("Failed to get ID for new assessment:", created);
          }
        }

        console.log("✅ Assessment draft saved successfully during navigation");
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

    // Always save to database when moving from step 1 (form data), step 2 (risk factors), or step 3 (mitigations)
    const shouldSave = currentStep === 1 || currentStep === 2 || currentStep === 3;
    if (shouldSave) {
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
            const currentFormData = getCurrentFormData();
            updatedAssessment.date = currentFormData.date;
            updatedAssessment.time = currentFormData.time;
            updatedAssessment.type = currentFormData.type;
            updatedAssessment.station = currentFormData.station || selectedStation;
            updatedAssessment.weather = currentFormData.weather;
          } else if (currentStep === 3) {
            updatedAssessment.mitigations = {
              ...assessmentData.mitigations,
              ...getCurrentMitigationData()
            };
          }

          await firestoreOperations.updateAssessment(currentAssessmentId, updatedAssessment);
        } else {
          // First time saving this assessment
          let assessmentToSave: any = { ...assessmentData };

          // Add local data based on current step
          if (currentStep === 1) {
            const currentFormData = getCurrentFormData();
            assessmentToSave.date = currentFormData.date;
            assessmentToSave.time = currentFormData.time;
            assessmentToSave.type = currentFormData.type;
            assessmentToSave.station = currentFormData.station || selectedStation;
            assessmentToSave.weather = currentFormData.weather;
          } else if (currentStep === 3) {
            assessmentToSave.mitigations = {
              ...assessmentData.mitigations,
              ...getCurrentMitigationData()
            };
          }

          assessmentToSave.status = "draft";
          assessmentToSave.captain = auth.currentUser?.displayName || "Captain";

          const created = await firestoreOperations.createAssessment(assessmentToSave);
          if (created && created.id) {
            setCurrentAssessmentId(created.id);
          }
        }

        console.log("✅ Assessment draft saved successfully during navigation");
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
   * Refresh weather data
   * This function fetches fresh weather data and updates the form
   */
  const refreshWeatherData = async () => {
    try {
      setWeatherLoading(true);
      console.log('🔄 [GAR] Refreshing weather data...');
      
      const weatherData = await refreshGARWeatherData();
      
      if (weatherData) {
        console.log('✅ [GAR] Weather data refreshed successfully:', weatherData);
        
        // Update assessment data
        setAssessmentData(prev => ({
          ...prev,
          weather: {
            ...prev.weather,
            ...weatherData
          }
        }));
        
        // Update form refs
        if (formRefs.current.temperature) formRefs.current.temperature.value = weatherData.temperature || '';
        if (formRefs.current.temperatureUnit) formRefs.current.temperatureUnit.value = weatherData.temperatureUnit || '°F';
        if (formRefs.current.wind) formRefs.current.wind.value = weatherData.wind || '';
        if (formRefs.current.windDirection) formRefs.current.windDirection.value = weatherData.windDirection || 'NW';
        if (formRefs.current.humidity) formRefs.current.humidity.value = weatherData.humidity || '';
        if (formRefs.current.precipitation) formRefs.current.precipitation.value = weatherData.precipitation || '';
        if (formRefs.current.precipitationRate) formRefs.current.precipitationRate.value = weatherData.precipitationRate || '';
        if (formRefs.current.waveHeight) formRefs.current.waveHeight.value = weatherData.waveHeight || '';
        if (formRefs.current.wavePeriod) formRefs.current.wavePeriod.value = weatherData.wavePeriod || '';
        if (formRefs.current.waveDirection) formRefs.current.waveDirection.value = weatherData.waveDirection || 'NW';
        if (formRefs.current.alerts) formRefs.current.alerts.value = weatherData.alerts || '';
        
        setHasChanges(true);
      }
    } catch (error) {
      console.error('❌ [GAR] Error refreshing weather data:', error);
    } finally {
      setWeatherLoading(false);
    }
  };

  /**
   * Start a new assessment
   * This function is called when the user clicks "Create New Assessment"
   * It creates an initial draft in the database immediately
   */
  const startAssessment = async () => {
    // Check if there's already a draft assessment for today
    if (todayDraftAssessment) {
      setError('Cannot create new assessment: You already have a draft assessment for today. Please complete or delete the existing draft first.');
      return;
    }
    
    // Check if we have stations from the database before doing anything
    if (stations.length === 0) {
      setError('Cannot create assessment: No stations are available in the database. Please contact an administrator to set up stations.');
      return;
    }
    
    // Double-check by fetching stations from database again
    try {
      const stationsData = await firestoreOperations.getStations();
      if (!stationsData || !Array.isArray(stationsData) || stationsData.length === 0) {
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
    
    // Use All Stations for department-wide by default
    const newAssessmentData = {
      date: new Date().toISOString().split('T')[0],
      rawDate: new Date().toISOString(),
      time: new Date().toTimeString().substring(0, 5),
      type: "Department-wide",
      station: "All Stations", // Default to All Stations for department-wide
      status: "draft",
      captain: auth.currentUser?.displayName || "Captain",
      userId: auth.currentUser?.uid, // Required for security rules
      weather: {
        temperature: "",
        temperatureUnit: "°F",
        wind: "",
        windDirection: "NW",
        humidity: "",
        precipitation: "",
        precipitationRate: "",
        waveHeight: "",
        wavePeriod: "",
        waveDirection: "NW",
        alerts: ""
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
      },
      notificationRecipients: {
        groups: [],
        users: [],
        groupsData: [],
        usersData: []
      }
    };
    
    // Create initial draft in database immediately
    try {
      setLoading(true);
      const created = await firestoreOperations.createAssessment(newAssessmentData);
      if (created && created.id) {
        setCurrentDraftId(created.id);
        setCurrentAssessmentId(created.id);
      } else {
        console.error("Failed to create initial draft:", created);
        setError('Failed to create assessment draft. Please try again.');
        return;
      }
    } catch (error) {
      console.error("Error creating initial draft:", error);
      setError('Error creating assessment. Please try again.');
      return;
    } finally {
      setLoading(false);
    }
    
    // Fetch weather data
    try {
      setWeatherLoading(true);
      console.log('🌤️ [GAR] Fetching weather data for new assessment...');
      const weatherData = await getGARWeatherData();
      
      if (weatherData) {
        console.log('✅ [GAR] Weather data loaded:', weatherData);
        newAssessmentData.weather = {
          ...newAssessmentData.weather,
          ...weatherData
        };
      } else {
        console.log('⚠️ [GAR] No weather data available, using defaults');
      }
    } catch (error) {
      console.error('❌ [GAR] Error fetching weather data:', error);
      // Continue with empty weather data if fetch fails
    } finally {
      setWeatherLoading(false);
    }
    
    // Set assessment data
    setAssessmentData(newAssessmentData);
    
    // Initialize form refs with data
    setTimeout(() => {
      if (formRefs.current.date) formRefs.current.date.value = newAssessmentData.date;
      if (formRefs.current.time) formRefs.current.time.value = newAssessmentData.time;
      if (formRefs.current.type) formRefs.current.type.value = newAssessmentData.type;
      if (formRefs.current.station) formRefs.current.station.value = newAssessmentData.station;
      
      // Weather fields
      if (formRefs.current.temperature) formRefs.current.temperature.value = newAssessmentData.weather.temperature || '';
      if (formRefs.current.temperatureUnit) formRefs.current.temperatureUnit.value = newAssessmentData.weather.temperatureUnit;
      if (formRefs.current.wind) formRefs.current.wind.value = newAssessmentData.weather.wind || '';
      if (formRefs.current.windDirection) formRefs.current.windDirection.value = newAssessmentData.weather.windDirection;
      if (formRefs.current.humidity) formRefs.current.humidity.value = newAssessmentData.weather.humidity || '';
      if (formRefs.current.precipitation) formRefs.current.precipitation.value = newAssessmentData.weather.precipitation || '';
      if (formRefs.current.precipitationRate) formRefs.current.precipitationRate.value = newAssessmentData.weather.precipitationRate || '';
      if (formRefs.current.waveHeight) formRefs.current.waveHeight.value = newAssessmentData.weather.waveHeight || '';
      if (formRefs.current.wavePeriod) formRefs.current.wavePeriod.value = newAssessmentData.weather.wavePeriod || '';
      if (formRefs.current.waveDirection) formRefs.current.waveDirection.value = newAssessmentData.weather.waveDirection;
      if (formRefs.current.alerts) formRefs.current.alerts.value = newAssessmentData.weather.alerts || '';
    }, 0);
    
    // Reset mitigation refs
    Object.keys(mitigationRefs.current).forEach(factor => {
      if (mitigationRefs.current[factor]) {
        mitigationRefs.current[factor].value = "";
      }
    });
    
    // Reset control states
    setHasChanges(false);
    setCurrentStep(1);
    setShowAssessment(true);
  };

  const closeAssessment = async () => {
    setCancelLoading(true);
    try {
      // Delete the draft assessment if it exists
      if (currentDraftId) {
        await firestoreOperations.deleteAssessment(currentDraftId, {
          userEmail: auth.currentUser?.email,
          userDisplayName: auth.currentUser?.displayName,
          userId: auth.currentUser?.uid
        });
      }
    } catch (error) {
      console.error("Error deleting draft assessment:", error);
    }
    
    // Full page reload
    window.location.reload();
  };

  const closeReadOnlyView = () => {
    setShowReadOnlyView(false);
    setViewingAssessment(null);
    // If we're viewing an assessment via URL, navigate back to the main GAR page
    if (id) {
      navigate('/gar-assessment');
    }
  };

  // Handle notification recipients save
  const handleNotificationRecipientsSave = (recipientsData) => {
    setNotificationRecipients(recipientsData);
    setAssessmentData(prevData => ({
      ...prevData,
      notificationRecipients: recipientsData
    }));
  };

  // Check if there's a draft assessment for today - MEMOIZED
  const todayDraftAssessment = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return pastAssessments.find(assessment => 
      assessment.status === 'draft' && 
      assessment.date === today &&
      assessment.userId === auth.currentUser?.uid
    );
  }, [pastAssessments, auth.currentUser?.uid]);

  // Continue working on draft assessment
  const continueDraftAssessment = async (draftAssessment) => {
    // Set the assessment data
    setAssessmentData(draftAssessment);
    setCurrentAssessmentId(draftAssessment.id);
    setCurrentDraftId(draftAssessment.id);
    
    // Set notification recipients if they exist in the draft
    if (draftAssessment.notificationRecipients) {
      setNotificationRecipients(draftAssessment.notificationRecipients);
    }
    
    // Check if weather data needs refreshing (cache-first approach)
    let weatherToUse = draftAssessment.weather || {};
    
    try {
      setWeatherLoading(true);
      console.log('🌤️ [GAR] Checking weather data for draft assessment...');
      // This will use cached data if it's fresh, or fetch new data if cache is stale
      const freshWeatherData = await getGARWeatherData();
      
      if (freshWeatherData) {
        console.log('✅ [GAR] Using refreshed weather data for draft');
        weatherToUse = freshWeatherData;
        
        // Update the assessment data with fresh weather
        const updatedAssessment = {
          ...draftAssessment,
          weather: weatherToUse
        };
        setAssessmentData(updatedAssessment);
      } else {
        console.log('📦 [GAR] Using existing weather data from draft');
      }
    } catch (error) {
      console.error('❌ [GAR] Error checking weather data for draft:', error);
      // Continue with existing weather data if fetch fails
    } finally {
      setWeatherLoading(false);
    }
    
    // Initialize form refs with draft data (using potentially refreshed weather)
    setTimeout(() => {
      if (formRefs.current.date) formRefs.current.date.value = draftAssessment.date;
      if (formRefs.current.time) formRefs.current.time.value = draftAssessment.time;
      if (formRefs.current.type) formRefs.current.type.value = draftAssessment.type;
      if (formRefs.current.station) formRefs.current.station.value = draftAssessment.station;
      
      if (formRefs.current.temperature) formRefs.current.temperature.value = weatherToUse.temperature || "";
      if (formRefs.current.temperatureUnit) formRefs.current.temperatureUnit.value = weatherToUse.temperatureUnit || "°F";
      if (formRefs.current.wind) formRefs.current.wind.value = weatherToUse.wind || "";
      if (formRefs.current.windDirection) formRefs.current.windDirection.value = weatherToUse.windDirection || "NW";
      if (formRefs.current.humidity) formRefs.current.humidity.value = weatherToUse.humidity || "";
      if (formRefs.current.precipitation) formRefs.current.precipitation.value = weatherToUse.precipitation || "";
      if (formRefs.current.precipitationRate) formRefs.current.precipitationRate.value = weatherToUse.precipitationRate || "";
      if (formRefs.current.waveHeight) formRefs.current.waveHeight.value = weatherToUse.waveHeight || "";
      if (formRefs.current.wavePeriod) formRefs.current.wavePeriod.value = weatherToUse.wavePeriod || "";
      if (formRefs.current.waveDirection) formRefs.current.waveDirection.value = weatherToUse.waveDirection || "NW";
      if (formRefs.current.alerts) formRefs.current.alerts.value = weatherToUse.alerts || "";
    }, 0);
    
    // Initialize mitigation refs with draft data
    const mitigations = draftAssessment.mitigations || {};
    setTimeout(() => {
      Object.keys(mitigationRefs.current).forEach(factor => {
        if (mitigationRefs.current[factor]) {
          mitigationRefs.current[factor].value = mitigations[factor] || "";
        }
      });
    }, 0);
    
    // Start from step 1
    setCurrentStep(1);
    setShowAssessment(true);
    setHasChanges(false);
  };

  // Navigate to assessment view page instead of opening modal
  const viewAssessment = (assessmentId) => {
    if (!assessmentId) {
      console.error("Invalid assessment ID (empty or undefined)");
      setError("Cannot view assessment: Invalid ID");
      return;
    }
    
    console.log(`🔗 Navigating to assessment: ${assessmentId}`);
    // Navigate to the assessment view URL
    navigate(`/gar-assessment/${assessmentId}`);
  };

  const deleteAssessment = async (assessmentId) => {
    try {
      setLoading(true);
      // Pass user info to the delete function for audit logging
      await firestoreOperations.deleteAssessment(assessmentId, {
        userEmail: auth.currentUser?.email,
        userDisplayName: userProfile?.displayName || auth.currentUser?.displayName || 'Unknown User',
        userId: auth.currentUser?.uid
      });
      
      
      // Clear confirmDelete state first
      setConfirmDelete(null);
      
      // Add small delay to ensure deletion completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force refresh assessments list
      await fetchAssessments();
      
    } catch (error) {
      console.error("Error deleting assessment:", error);
      setError("Failed to delete assessment");
      showNotification("Failed to delete assessment", 'error');
    } finally {
      setLoading(false);
    }
  };


  // Publication function
  const publishAssessment = async () => {
    try {
      setLoading(true);
      
      // ONLY update status and completion fields - DON'T touch form data
      const finalAssessmentData = {
        ...assessmentData, // Keep ALL existing data exactly as is
        status: "complete",
        completedAt: new Date().toISOString(),
        completedBy: auth.currentUser?.displayName || "Captain",
        totalScore: totalScore,
        riskLevel: riskLevel,
        overallRisk: riskLevel.level
      };
      
      if (currentDraftId || currentAssessmentId) {
        // Update existing draft to complete status
        await firestoreOperations.updateAssessment(currentDraftId || currentAssessmentId, finalAssessmentData);
      } else {
        // Fallback: create new assessment if somehow we don't have a draft ID
        await firestoreOperations.createAssessment(finalAssessmentData);
      }
      
      // Send email notifications if recipients are configured
      let emailSuccess = true;
      if (notificationRecipients && (notificationRecipients.groups?.length > 0 || notificationRecipients.users?.length > 0)) {
        try {
          console.log("[DEBUG] Sending email notifications for published GAR assessment");
          emailSuccess = await sendGARAssessmentNotifications(
            finalAssessmentData, 
            notificationRecipients, 
            firestoreOperations,
            currentDraftId || currentAssessmentId
          );
          
          if (emailSuccess) {
            console.log("[DEBUG] Email notifications sent successfully");
          } else {
            console.warn("[DEBUG] Some email notifications may have failed");
          }
        } catch (emailError) {
          console.error("[DEBUG] Error sending email notifications:", emailError);
          emailSuccess = false;
        }
      }
      
      // Show success message with email status
      const baseMessage = `GAR Assessment published with risk level: ${riskLevel.level} and score: ${totalScore}`;
      const emailMessage = emailSuccess && (notificationRecipients.groups?.length > 0 || notificationRecipients.users?.length > 0) 
        ? "\n\nEmail notifications have been sent to selected recipients."
        : (notificationRecipients.groups?.length > 0 || notificationRecipients.users?.length > 0) 
          ? "\n\nNote: There was an issue sending email notifications. The assessment was still published successfully."
          : "";
      
      // Store message in localStorage to show after reload
      localStorage.setItem('garPublishNotification', baseMessage + emailMessage);
      
      // Reload the page
      window.location.reload();
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

  // Filter and search functions for assessment history
  const getFilteredAndSearchedAssessments = React.useMemo(() => {
    let filtered = [...pastAssessments];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(assessment => 
        (assessment.type || '').toLowerCase().includes(searchLower) ||
        (assessment.station || '').toLowerCase().includes(searchLower) ||
        (assessment.captain || '').toLowerCase().includes(searchLower) ||
        (assessment.date || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assessment => {
        if (statusFilter === 'published') return assessment.status !== 'draft';
        if (statusFilter === 'draft') return assessment.status === 'draft';
        return true;
      });
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(assessment => {
        const riskFactorValues = Object.values(assessment.riskFactors || {});
        const totalScore = riskFactorValues.reduce((acc: number, val: any) => acc + val, 0);
        const riskLevel = getRiskLevel(totalScore);
        
        if (riskFilter === 'green') return riskLevel.level === 'LOW RISK';
        if (riskFilter === 'amber') return riskLevel.level === 'MODERATE RISK';
        if (riskFilter === 'red') return riskLevel.level === 'HIGH RISK';
        return true;
      });
    }

    return filtered;
  }, [pastAssessments, searchTerm, statusFilter, riskFilter]);

  // Get paginated assessments
  const getPaginatedAssessments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return getFilteredAndSearchedAssessments.slice(startIndex, endIndex);
  }, [getFilteredAndSearchedAssessments, currentPage, itemsPerPage]);

  // Calculate pagination values
  const totalFilteredAssessments = getFilteredAndSearchedAssessments.length;
  const totalPages = Math.ceil(totalFilteredAssessments / itemsPerPage);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, riskFilter]);

  // Handle filter changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };

  const handleRiskFilterChange = (value) => {
    setRiskFilter(value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

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
  const Step1 = () => {
    console.log(`🔧 Step1 rendering`);
    
    // Sync assessment data back to form refs when Step1 renders
    React.useEffect(() => {
      console.log('📋 Step1 mounted, syncing assessment data to refs');
      syncAssessmentDataToRefs();
    }, [currentStep]); // Only run when currentStep changes (when navigating to Step 1)
    
    return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Assessment Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <div className="relative">
            <input
              ref={(el) => { formRefs.current.date = el; }}
              type="date"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              defaultValue={initialFormData.current.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <div className="relative">
            <input
              ref={(el) => { formRefs.current.time = el; }}
              type="time"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              defaultValue={initialFormData.current.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
            />
            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment Type</label>
          <select
            ref={(el) => { formRefs.current.type = el; }}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            defaultValue={initialFormData.current.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
          >
            <option value="Department-wide">Department-wide</option>
            <option value="Mission-specific">Mission-specific</option>
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
              ref={(el) => { formRefs.current.station = el; }}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              defaultValue={initialFormData.current.station}
              onChange={(e) => handleInputChange('station', e.target.value)}
            >
              <option value="All Stations">All Stations</option>
              
              {/* Map through the actual database stations */}
              {stations.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Weather Conditions</h3>
          <button
            type="button"
            onClick={refreshWeatherData}
            disabled={weatherLoading}
            className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
              weatherLoading 
                ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={weatherLoading ? "Loading weather data..." : "Refresh weather data"}
          >
            <svg className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {weatherLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 relative">
          {/* Loading Overlay */}
          {weatherLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-md flex items-center justify-center z-10">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Loading weather data...</span>
              </div>
            </div>
          )}
          
          {/* Professional Weather Data Attribution */}
          {(assessmentData.weather as any)?.weatherDataSource && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Weather Data Pre-filled by Authorized Sources
                  </div>
                  <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        <strong>Primary Source:</strong> {(assessmentData.weather as any).weatherDataSource === 'NOAA' ? 'National Oceanic and Atmospheric Administration (NOAA)' : (assessmentData.weather as any).weatherDataSource}
                      </span>
                      <span>
                        <strong>Data Provider:</strong> {(assessmentData.weather as any).apiSource}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        <strong>Last Updated:</strong> {(assessmentData.weather as any).lastUpdatedPST}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified Marine Weather Data
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 italic">
                    Weather conditions are automatically populated from official meteorological sources for accuracy and compliance with marine safety protocols.
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
              <div className="flex">
                <input
                  ref={(el) => { formRefs.current.temperature = el; }}
                  type="text"
                  disabled={weatherLoading}
                  className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-900 dark:text-white ${
                    weatherLoading 
                      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                      : 'bg-white dark:bg-gray-700'
                  }`}
                  placeholder=""
                  defaultValue={""}
                  onChange={(e) => handleInputChange('temperature', e.target.value)}
                  onFocus={() => console.log('🎯 Temperature input FOCUSED')}
                  onBlur={() => console.log('❌ Temperature input LOST FOCUS')}
                />
                <select
                  ref={(el) => { formRefs.current.temperatureUnit = el; }}
                  disabled={weatherLoading}
                  className={`p-2 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-md text-gray-900 dark:text-white ${
                    weatherLoading 
                      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                      : 'bg-gray-50 dark:bg-gray-600'
                  }`}
                  defaultValue={"°F"}
                  onChange={(e) => handleInputChange('temperatureUnit', e.target.value)}
                >
                  <option value="°F">°F</option>
                  <option value="°C">°C</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wind Speed (mph)</label>
              <div className="flex">
                <input
                  ref={(el) => { formRefs.current.wind = el; }}
                  type="text"
                  disabled={weatherLoading}
                  className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-900 dark:text-white ${
                    weatherLoading 
                      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                      : 'bg-white dark:bg-gray-700'
                  }`}
                  placeholder=""
                  defaultValue={""}
                  onChange={(e) => handleInputChange('wind', e.target.value)}
                />
                <select
                  ref={(el) => { formRefs.current.windDirection = el; }}
                  disabled={weatherLoading}
                  className={`p-2 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-md text-gray-900 dark:text-white w-20 ${
                    weatherLoading 
                      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                      : 'bg-gray-50 dark:bg-gray-600'
                  }`}
                  defaultValue={"NW"}
                  onChange={(e) => handleInputChange('windDirection', e.target.value)}
                >
                  <option value="N">N</option>
                  <option value="NNE">NNE</option>
                  <option value="NE">NE</option>
                  <option value="ENE">ENE</option>
                  <option value="E">E</option>
                  <option value="ESE">ESE</option>
                  <option value="SE">SE</option>
                  <option value="SSE">SSE</option>
                  <option value="S">S</option>
                  <option value="SSW">SSW</option>
                  <option value="SW">SW</option>
                  <option value="WSW">WSW</option>
                  <option value="W">W</option>
                  <option value="WNW">WNW</option>
                  <option value="NW">NW</option>
                  <option value="NNW">NNW</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Humidity (%)</label>
              <input
                ref={(el) => { formRefs.current.humidity = el; }}
                type="text"
                disabled={weatherLoading}
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white ${
                  weatherLoading 
                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                placeholder=""
                defaultValue={""}
                onChange={(e) => handleInputChange('humidity', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precipitation Condition</label>
              <input
                ref={(el) => { formRefs.current.precipitation = el; }}
                type="text"
                disabled={weatherLoading}
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white ${
                  weatherLoading 
                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                placeholder=""
                defaultValue={""}
                onChange={(e) => handleInputChange('precipitation', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precipitation Rate (in/hr)</label>
              <input
                ref={(el) => { formRefs.current.precipitationRate = el; }}
                type="text"
                disabled={weatherLoading}
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white ${
                  weatherLoading 
                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                placeholder=""
                defaultValue={""}
                onChange={(e) => handleInputChange('precipitationRate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wave Height (ft)</label>
              <input
                ref={(el) => { formRefs.current.waveHeight = el; }}
                type="text"
                disabled={weatherLoading}
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white ${
                  weatherLoading 
                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                placeholder=""
                defaultValue={""}
                onChange={(e) => handleInputChange('waveHeight', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wave Period (sec)</label>
              <input
                ref={(el) => { formRefs.current.wavePeriod = el; }}
                type="text"
                disabled={weatherLoading}
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white ${
                  weatherLoading 
                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                placeholder=""
                defaultValue={""}
                onChange={(e) => handleInputChange('wavePeriod', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wave Direction</label>
              <select
                ref={(el) => { formRefs.current.waveDirection = el; }}
                disabled={weatherLoading}
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white ${
                  weatherLoading 
                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                defaultValue={"NW"}
                onChange={(e) => handleInputChange('waveDirection', e.target.value)}
              >
                <option value="N">N</option>
                <option value="NNE">NNE</option>
                <option value="NE">NE</option>
                <option value="ENE">ENE</option>
                <option value="E">E</option>
                <option value="ESE">ESE</option>
                <option value="SE">SE</option>
                <option value="SSE">SSE</option>
                <option value="S">S</option>
                <option value="SSW">SSW</option>
                <option value="SW">SW</option>
                <option value="WSW">WSW</option>
                <option value="W">W</option>
                <option value="WNW">WNW</option>
                <option value="NW">NW</option>
                <option value="NNW">NNW</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weather Alerts</label>
            <input
              ref={(el) => { formRefs.current.alerts = el; }}
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder=""
              defaultValue={""}
              onChange={(e) => handleInputChange('alerts', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Step 2: Risk Assessment
  const Step2 = () => {
    // Sync assessment data back to Step 2 when it renders
    React.useEffect(() => {
      console.log('📋 Step2 mounted, syncing assessment data');
      syncAssessmentDataToStep2();
    }, [currentStep]); // Only run when currentStep changes (when navigating to Step 2)
    
    return (
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
  };

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
    // Sync assessment data back to Step 3 when it renders
    React.useEffect(() => {
      console.log('📋 Step3 mounted, syncing mitigation data', assessmentData?.mitigations);
      
      // Use a longer timeout to ensure all data is loaded and refs are available
      setTimeout(() => {
        if (assessmentData?.mitigations) {
          const mitigations = assessmentData.mitigations;
          console.log('🔄 Actually syncing mitigations to refs:', mitigations);
          
          Object.keys(mitigationRefs.current).forEach(factor => {
            if (mitigationRefs.current[factor]) {
              // Always update with saved value (including empty strings)
              const savedValue = mitigations[factor] || "";
              mitigationRefs.current[factor].value = savedValue;
              console.log(`📝 Set ${factor} to: "${savedValue}"`);
            }
          });
        }
      }, 100); // Longer timeout to ensure everything is ready
    }, [currentStep, assessmentData?.mitigations]); // Also depend on mitigations data
    
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
                      ref={(el) => { mitigationRefs.current[factor] = el; }}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      placeholder={`Describe mitigation strategies for ${factorLabels[factor]}...`}
                      defaultValue=""
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
    // Sync all data when Step 4 renders to ensure review shows latest info
    React.useEffect(() => {
      console.log('📋 Step4 mounted, syncing all data for review');
      syncAssessmentDataToStep4();
    }, [currentStep]); // Only run when currentStep changes (when navigating to Step 4)
    
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
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Total Score:</div>
                  <div className="font-bold text-2xl">{totalScore}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="font-medium">Risk Level:</div>
                  <div className="font-bold text-2xl">{riskLevel.level}</div>
                </div>
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
                <div className="text-gray-900 dark:text-white">{(assessmentData.weather as any).temperature}{(assessmentData.weather as any).temperatureUnit}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Wind:</div>
                <div className="text-gray-900 dark:text-white">{(assessmentData.weather as any).wind} mph {(assessmentData.weather as any).windDirection}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Humidity:</div>
                <div className="text-gray-900 dark:text-white">{(assessmentData.weather as any).humidity}%</div>
                
                <div className="text-gray-600 dark:text-gray-400">Precipitation:</div>
                <div className="text-gray-900 dark:text-white">{(assessmentData.weather as any).precipitation} ({(assessmentData.weather as any).precipitationRate}"/hr)</div>
                
                <div className="text-gray-600 dark:text-gray-400">Wave Height:</div>
                <div className="text-gray-900 dark:text-white">{(assessmentData.weather as any).waveHeight} ft</div>
                
                <div className="text-gray-600 dark:text-gray-400">Wave Period:</div>
                <div className="text-gray-900 dark:text-white">{(assessmentData.weather as any).wavePeriod} sec {(assessmentData.weather as any).waveDirection}</div>
                
                <div className="text-gray-600 dark:text-gray-400">Alerts:</div>
                <div className="text-amber-600 dark:text-amber-400">{(assessmentData.weather as any).alerts}</div>
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
        
        <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Notification Recipients</h3>
            <button 
              onClick={() => setShowNotificationModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Mail className="w-4 h-4 mr-2" />
              Edit Recipients
            </button>
          </div>
          
          {(notificationRecipients.groups?.length > 0 || notificationRecipients.users?.length > 0) ? (
            <div className="space-y-3">
              {/* Selected Groups */}
              {notificationRecipients.groupsData?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Department Groups:</p>
                  <div className="flex flex-wrap gap-2">
                    {notificationRecipients.groupsData.map(group => (
                      <div key={group.id} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md text-sm flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {group.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Selected Individual Users */}
              {notificationRecipients.usersData?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Individual Users:</p>
                  <div className="flex flex-wrap gap-2">
                    {notificationRecipients.usersData.slice(0, 5).map(user => (
                      <div key={user.id} className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-md text-sm flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.displayName}
                      </div>
                    ))}
                    {notificationRecipients.usersData.length > 5 && (
                      <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-md text-sm">
                        +{notificationRecipients.usersData.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Email notifications will be sent to selected recipients when this assessment is published.
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notification recipients selected</p>
              <p className="text-xs mt-1">Click "Edit Recipients" to select who should be notified</p>
            </div>
          )}
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

  // Main application rendering
  return (
    <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
      {/* Notification Component */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
          <div className={`flex items-center ${notification.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
              className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {showReadOnlyView && viewingAssessment ? (
        <ReadOnlyAssessmentView
          assessment={viewingAssessment}
          getFactorRiskColor={getFactorRiskColor}
          calculateRiskScore={() => {
            const { supervision, planning, teamSelection, teamFitness, environment, complexity } = viewingAssessment.riskFactors;
            return supervision + planning + teamSelection + teamFitness + environment + complexity;
          }}
          getRiskLevel={getRiskLevel}
          onClose={closeReadOnlyView}
        />
      ) : !showAssessment ? (
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
                
                {/* Only show button when stations exist */}
                {stations.length > 0 && (
                  <div className="flex space-x-4">
                    {/* Check for draft assessment */}
                    {todayDraftAssessment ? (
                      <button 
                        className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                        onClick={() => continueDraftAssessment(todayDraftAssessment)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Continue Draft Assessment
                      </button>
                    ) : (
                      <button 
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={startAssessment}
                        disabled={stations.length === 0}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Create New Assessment
                      </button>
                    )}
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
                  const sum = riskFactorValues.reduce((acc: number, val: number) => acc + val, 0);
                  return (sum as number) >= 45;
                }).length.toString()}
              />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Assessment History</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {totalFilteredAssessments} of {pastAssessments.length} assessments
                </div>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Search Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:sr-only">
                    Search assessments
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by type, station, captain, or date..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                
                {/* Status Filter */}
                <div className="sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:sr-only">
                    Filter by status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                
                {/* Risk Level Filter */}
                <div className="sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:sr-only">
                    Filter by risk level
                  </label>
                  <select
                    value={riskFilter}
                    onChange={(e) => handleRiskFilterChange(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="green">🟢 LOW RISK</option>
                    <option value="amber">🟡 MODERATE RISK</option>
                    <option value="red">🔴 HIGH RISK</option>
                  </select>
                </div>
              </div>
            </div>
            
            {totalFilteredAssessments > 0 ? (
              <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {getPaginatedAssessments.map(assessment => {
                  // Debug the assessment structure
                  
                  const assessmentScore = Object.values(assessment.riskFactors || {}).reduce((acc: number, val: number) => acc + val, 0);
                  const assessmentRisk = getRiskLevel(assessmentScore);
                  
                  return (
                    <div key={assessment.id || "unknown"} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-750 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
                      <div className="flex items-start sm:items-center">
                        <div className={`${assessmentRisk.color} p-2 sm:p-3 rounded-lg mr-3 sm:mr-4 text-white flex-shrink-0`}>
                          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                            <h3 className="font-medium text-gray-900 dark:text-white text-base sm:text-sm leading-relaxed">
                              <span className="block sm:inline">{assessment.type || "Unknown Type"}</span>
                              <span className="block sm:inline"> - {assessment.station || "Unknown Station"}</span>
                            </h3>
                            {assessment.status === 'draft' && (
                              <span className="self-start sm:ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 rounded-full">
                                DRAFT
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            <span className="block sm:inline">{assessment.date || "No date"}</span>
                            <span className="block sm:inline sm:ml-2">Score: {assessmentScore as number} ({assessmentRisk.level})</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end sm:justify-start space-x-3 sm:space-x-2 flex-shrink-0">
                        {!readOnlyMode && (
                          <button 
                            onClick={() => setConfirmDelete(assessment.id)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            disabled={!assessment.id}
                            aria-label="Delete assessment"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        {assessment.status === 'draft' ? (
                          <button 
                            onClick={() => {
                              if (assessment.id) {
                                continueDraftAssessment(assessment);
                              } else {
                                setError("Cannot continue assessment: missing ID");
                              }
                            }}
                            className="px-3 py-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm flex items-center rounded-lg transition-colors min-w-0"
                            disabled={!assessment.id}
                          >
                            <Edit3 className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="whitespace-nowrap">Continue</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              if (assessment.id) {
                                viewAssessment(assessment.id);
                              } else {
                                setError("Cannot view assessment: missing ID");
                              }
                            }}
                            className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm flex items-center rounded-lg transition-colors min-w-0"
                            disabled={!assessment.id}
                          >
                            <span className="whitespace-nowrap">View</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Pagination Component */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalFilteredAssessments}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    darkMode={darkMode}
                    showItemCount={true}
                  />
                )}
              </>
            ) : (
              <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-16 h-16 sm:w-12 sm:h-12 mx-auto mb-4 sm:mb-6 opacity-30" />
                <p className="text-lg sm:text-xl font-medium mb-2">
                  {pastAssessments.length === 0 ? "No assessments found" : "No assessments match your search criteria"}
                </p>
                <p className="text-sm sm:text-base leading-relaxed">
                  {pastAssessments.length === 0 ? "Create your first risk assessment to get started" : "Try adjusting your search or filters"}
                </p>
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
                className={`flex items-center ${cancelLoading ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                onClick={closeAssessment}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-400 mr-2"></div>
                    Canceling...
                  </>
                ) : (
                  'Cancel'
                )}
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
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                onClick={publishAssessment}
              >
                Publish Now
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Success/Error Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        } transition-all duration-300 ease-in-out transform`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}
      
      {/* Notification Recipients Modal */}
      <NotificationRecipientsModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        currentRecipients={notificationRecipients}
        onSave={handleNotificationRecipientsSave}
      />
    </Layout>
  );
};

export default GARAssessment;