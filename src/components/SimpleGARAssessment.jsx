import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { Calendar, Clock, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle, FileText, Home, Trash2 } from 'lucide-react';
import Layout from './Layout';
import { FirestoreContext } from '../App';
import { v4 as uuidv4 } from 'uuid';
import RiskFactorOptimized from './RiskFactorOptimized';
import ReadOnlyAssessmentView from './ReadOnlyAssessmentView';

// Main component
const GARAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // Get assessment ID from URL if present
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // List of stations - same as in Layout component
  const stations = ['Station 1', 'Station 4', 'Station 7', 'Station 10', 'Station 11', 'Station 14', 'Station 23'];
  
  // Refs for form inputs to keep them uncontrolled
  const dateRef = useRef();
  const timeRef = useRef();
  const typeRef = useRef();
  const stationRef = useRef();
  const tempRef = useRef();
  const tempUnitRef = useRef();
  const windRef = useRef();
  const windDirRef = useRef();
  const humidityRef = useRef();
  const precipRef = useRef();
  const precipRateRef = useRef();
  const alertsRef = useRef();
  const mitigationRefs = {
    supervision: useRef(),
    planning: useRef(),
    teamSelection: useRef(),
    teamFitness: useRef(),
    environment: useRef(),
    complexity: useRef()
  };

  // Initialize darkMode from localStorage with default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });

  // Initialize selectedStation from localStorage
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'Station 1';
  });

  // Try to recover saved risk factors from localStorage if they exist
  useEffect(() => {
    try {
      const savedRiskFactors = localStorage.getItem('currentAssessmentRiskFactors');
      if (savedRiskFactors) {
        const parsed = JSON.parse(savedRiskFactors);
        console.log('[DEBUG] Recovered risk factors from localStorage:', parsed);
        // Only update if we have valid risk factors
        if (parsed && typeof parsed === 'object') {
          setAssessmentData(prev => ({
            ...prev,
            riskFactors: {
              ...prev.riskFactors,
              ...parsed
            }
          }));
        }
      }
    } catch (err) {
      console.error('[DEBUG] Error recovering risk factors from localStorage:', err);
    }
  }, []);
  
  // State for loading, assessments, and error handling
  const [loading, setLoading] = useState(true);
  const [pastAssessments, setPastAssessments] = useState([]);
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [draftAssessment, setDraftAssessment] = useState(null);

  // State for assessment form
  const [showAssessment, setShowAssessment] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [assessmentData, setAssessmentData] = useState({
    id: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    rawDate: new Date().toISOString(),
    time: new Date().toTimeString().substring(0, 5),
    type: "",
    station: "",
    status: "draft",
    weather: {
      temperature: "",
      temperatureUnit: "°F",
      wind: "",
      windDirection: "N",
      humidity: "",
      precipitation: "",
      precipitationRate: "",
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
    }
  });
  
  // Check if assessment ID was passed via URL params or query params
  useEffect(() => {
    // Parse the search params to check for ?a=ID format
    const searchParams = new URLSearchParams(location.search);
    const queryId = searchParams.get('a');

    console.log("[DEBUG] URL changed, id:", id, "queryId:", queryId, "pathname:", location.pathname);

    if (id) {
      console.log("[DEBUG] Found assessment ID in URL path:", id);
      setLoading(true);
      loadAssessmentById(id);
    } else if (queryId) {
      console.log("[DEBUG] Found assessment ID in query param:", queryId);
      setLoading(true);
      loadAssessmentById(queryId);
    } else if (location.pathname === '/gar-assessment') {
      // When we're on the main GAR assessment page with no ID, always reset to list view
      console.log("[DEBUG] On main GAR assessment page, resetting to list view");
      setShowAssessment(false);
      setCurrentStep(1);
      setCurrentAssessmentId(null);

      // Clear any temporary assessment data from localStorage - same as in closeAssessment
      try {
        localStorage.removeItem('currentAssessmentRiskFactors');
      } catch (err) {
        console.error('[DEBUG] Error clearing localStorage:', err);
      }

      // Refresh the assessments list
      fetchAssessments(selectedStation);
    }
  }, [id, location.search, location.pathname]);

  // Handle browser back button
  useEffect(() => {
    // This handles the browser back button specifically
    const handlePopState = (event) => {
      console.log("[DEBUG] PopState detected, current path:", window.location.pathname);

      // If we navigated back to the main GAR assessment page (from a detail page)
      if (window.location.pathname === '/gar-assessment' && !window.location.search) {
        // Force a full page reload to ensure clean state
        window.location.reload();
      }
    };

    // Add event listener for browser back/forward buttons
    window.addEventListener('popstate', handlePopState);

    // Clean up
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Load assessment by ID from URL parameter
  const loadAssessmentById = async (assessmentId) => {
    try {
      console.log("[DEBUG] Loading assessment from URL param:", assessmentId);

      if (!assessmentId) {
        console.error("[DEBUG] Invalid assessment ID");
        setError("Invalid assessment ID");
        setLoading(false);
        return;
      }

      console.log("[DEBUG] Fetching assesments for current station:", selectedStation);
      // First try to get all assessments for the current station to see if the ID matches any
      const stationAssessments = await firestoreOperations.getAssessmentsByStation(selectedStation);
      console.log("[DEBUG] Found these assessments:", stationAssessments);

      let assessment = null;

      // Look through station assessments for matching ID
      if (stationAssessments && stationAssessments.length > 0) {
        console.log("[DEBUG] Searching for ID match in station assessments");
        const match = stationAssessments.find(a => a.id === assessmentId);
        if (match) {
          console.log("[DEBUG] Found match in station assessments:", match);
          assessment = match;
        } else {
          console.log("[DEBUG] No match found in station assessments");
          // Also check if any assessment has this value in their "id" field (not Firebase ID)
          const fieldMatch = stationAssessments.find(a => a.id === assessmentId);
          if (fieldMatch) {
            console.log("[DEBUG] Found match in assessment ID fields:", fieldMatch);
            assessment = fieldMatch;
          }
        }
      }

      // If we didn't find it in the station assessments, try direct lookup
      if (!assessment) {
        console.log("[DEBUG] Trying direct assessment lookup");
        assessment = await firestoreOperations.getAssessment(assessmentId);
        console.log("[DEBUG] Direct lookup result:", assessment);
      }

      // Check if we found an assessment
      if (assessment && (assessment.id || assessment._id)) {
        // Make sure we have an ID property
        if (!assessment.id && assessment._id) {
          assessment.id = assessment._id;
        }

        console.log("[DEBUG] Successfully loaded assessment:", assessment);

        // Store assessment data in state
        // Make sure we're using the Firestore document ID, not the UUID
        const firestoreId = assessment.id;
        console.log("[DEBUG] Using Firestore document ID:", firestoreId);

        setAssessmentData(assessment);
        setCurrentAssessmentId(firestoreId);

        // When loading an assessment from URL, set it to read-only mode
        setReadOnlyMode(true);
        console.log("[DEBUG] Setting assessment to read-only mode for viewing");

        // Set form values through refs when they're available and make them read-only
        setTimeout(() => {
          // Set input values and make them disabled
          if (dateRef.current) {
            dateRef.current.value = assessment.date || "";
            dateRef.current.disabled = true;
          }
          if (timeRef.current) {
            timeRef.current.value = assessment.time || "";
            timeRef.current.disabled = true;
          }
          if (typeRef.current) {
            typeRef.current.value = assessment.type || "Department-wide";
            typeRef.current.disabled = true;
          }
          if (stationRef.current) {
            stationRef.current.value = assessment.station || selectedStation;
            stationRef.current.disabled = true;
          }

          // Set weather input values and make them disabled
          if (tempRef.current) {
            tempRef.current.value = assessment.weather?.temperature || "";
            tempRef.current.disabled = true;
          }
          if (tempUnitRef.current) {
            tempUnitRef.current.value = assessment.weather?.temperatureUnit || "°F";
            tempUnitRef.current.disabled = true;
          }
          if (windRef.current) {
            windRef.current.value = assessment.weather?.wind || "";
            windRef.current.disabled = true;
          }
          if (windDirRef.current) {
            windDirRef.current.value = assessment.weather?.windDirection || "N";
            windDirRef.current.disabled = true;
          }
          if (humidityRef.current) {
            humidityRef.current.value = assessment.weather?.humidity || "";
            humidityRef.current.disabled = true;
          }
          if (precipRef.current) {
            precipRef.current.value = assessment.weather?.precipitation || "";
            precipRef.current.disabled = true;
          }
          if (precipRateRef.current) {
            precipRateRef.current.value = assessment.weather?.precipitationRate || "";
            precipRateRef.current.disabled = true;
          }
          if (alertsRef.current) {
            alertsRef.current.value = assessment.weather?.alerts || "";
            alertsRef.current.disabled = true;
          }

          // Set mitigation values and make them disabled
          Object.keys(mitigationRefs).forEach(factor => {
            if (mitigationRefs[factor].current) {
              mitigationRefs[factor].current.value = assessment.mitigations?.[factor] || "";
              mitigationRefs[factor].current.disabled = true;
            }
          });
        }, 100);

        // Reset state flags
        setHasChanges(false);
        setShowAssessment(true);
        setCurrentStep(1);
      } else {
        console.error("[DEBUG] Failed to load assessment - null or missing ID");
        console.log("[DEBUG] As a last resort, trying to fetch all assessments");

        try {
          const allAssessments = await firestoreOperations.getAllAssessments();
          console.log("[DEBUG] All assessments:", allAssessments);

          if (allAssessments && allAssessments.length > 0) {
            const match = allAssessments.find(a => a.id === assessmentId);
            if (match) {
              console.log("[DEBUG] Found match in all assessments:", match);
              // Use recursive call with a different method now that we found it
              return loadAssessmentById(match.id);
            }
          }
        } catch (err) {
          console.error("[DEBUG] Error fetching all assessments:", err);
        }

        setError("Assessment not found. Please try again or create a new assessment.");
      }
    } catch (error) {
      console.error("[DEBUG] Error loading assessment by ID:", error);
      setError(`Failed to load assessment: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };
  
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
      // For GAR Assessment page, we want to see all assessments
      const assessments = await firestoreOperations.getAllAssessments();
      console.log("Fetched assessments:", assessments);

      // Check each assessment has an ID
      assessments.forEach((assessment, index) => {
        if (!assessment.id) {
          console.error(`Assessment at index ${index} is missing an ID:`, assessment);
        }
      });

      // Check for any draft assessments and update state
      if (Array.isArray(assessments)) {
        const draftFound = assessments.find(a => a.status === 'draft');
        if (draftFound) {
          console.log("Found a draft assessment:", draftFound);
          setDraftAssessment(draftFound);
        } else {
          setDraftAssessment(null);
        }

        setPastAssessments(assessments);
        setFilteredAssessments(assessments);
      } else {
        console.warn("Received non-array assessments data:", assessments);
        setPastAssessments([]);
        setFilteredAssessments([]);
        setDraftAssessment(null);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setError("Failed to load assessment data. Please try again.");
      setPastAssessments([]); // Reset to empty array on error
      setFilteredAssessments([]);
      setDraftAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  // Filter assessments based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAssessments(pastAssessments);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = pastAssessments.filter(assessment => {
      // Search in multiple fields
      return (
        (assessment.station && assessment.station.toLowerCase().includes(searchTermLower)) ||
        (assessment.type && assessment.type.toLowerCase().includes(searchTermLower)) ||
        (assessment.date && assessment.date.toLowerCase().includes(searchTermLower)) ||
        (assessment.captain && assessment.captain.toLowerCase().includes(searchTermLower)) ||
        (assessment.weather?.precipitation && assessment.weather.precipitation.toLowerCase().includes(searchTermLower)) ||
        (assessment.weather?.alerts && assessment.weather.alerts.toLowerCase().includes(searchTermLower))
      );
    });

    setFilteredAssessments(filtered);
  }, [searchTerm, pastAssessments]);
  
  // Fetch user profile and assessments on component mount
  useEffect(() => {
    if (id) return; // Skip if loading by ID from URL
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const user = auth.currentUser;
        if (!user) {
          setUserChecked(true);
          setLoading(false);
          return;
        }
        
        // Get user profile
        const profile = await firestoreOperations.getUserProfile(user.uid);
        setUserProfile(profile);
        
        // Check user role for permissions
        if (profile?.role) {
          if (profile.role === 'captain' || profile.role === 'admin') {
            setReadOnlyMode(false);
          } else {
            setReadOnlyMode(true);
          }
        } else {
          setReadOnlyMode(true);
        }
        
        // Only set station from profile if user hasn't manually selected one
        const savedStation = localStorage.getItem('selectedStation');
        if (!savedStation && profile && profile.station) {
          handleStationChange(profile.station);
        }
        
        // Fetch assessments for the selected station
        const stationToUse = savedStation || (profile && profile.station) || selectedStation;
        await fetchAssessments(stationToUse);
        
        setUserChecked(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [auth, firestoreOperations, id]);
  
  // Initialize values when component mounts or showAssessment changes
  useEffect(() => {
    // After slight delay to ensure refs are set
    setTimeout(() => {
      // Handle station field based on assessment type
      if (typeRef.current && stationRef.current) {
        const currentType = typeRef.current.value;

        // Set initial station value based on assessment type
        if (currentType === "Department-wide") {
          stationRef.current.value = "All Stations";
          assessmentData.station = "All Stations";
          stationRef.current.disabled = true;
        } else if (currentType === "Station-specific") {
          // Keep existing value if not All Stations
          if (assessmentData.station === "All Stations") {
            stationRef.current.value = selectedStation || "";
            assessmentData.station = selectedStation || "";
          } else if (assessmentData.station) {
            stationRef.current.value = assessmentData.station;
          }
          stationRef.current.disabled = false;
        } else {
          // For empty type, disable station
          stationRef.current.disabled = true;
        }
      }
    }, 100);
  }, [showAssessment, selectedStation]);  // Re-run when showAssessment or selectedStation changes

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

  // Handle slider change - modified to avoid unnecessary re-renders
  const handleSliderChange = (factor, value) => {
    console.log(`[DEBUG] Changing risk factor: ${factor} to ${value}`);
    // Update the risk factors directly without re-rendering the whole component
    assessmentData.riskFactors[factor] = parseInt(value);

    // For safety, we'll still update the state, but less frequently
    // Use a debounce-like approach
    setTimeout(() => {
      // Update the state copy to trigger recalculation of totals
      setAssessmentData({...assessmentData});
      setHasChanges(true);
      console.log("[DEBUG] Updated risk factors:", assessmentData.riskFactors);

      // Save updated risk factors to localStorage for backup
      try {
        localStorage.setItem('currentAssessmentRiskFactors', JSON.stringify(assessmentData.riskFactors));
      } catch (err) {
        console.error("[DEBUG] Failed to save risk factors to localStorage:", err);
      }
    }, 100);
  };

  // Collect form data from refs into an object - used when navigating or saving
  const collectFormData = () => {
    return {
      date: dateRef.current?.value || assessmentData.date,
      time: timeRef.current?.value || assessmentData.time,
      type: typeRef.current?.value || assessmentData.type,
      station: stationRef.current?.value || selectedStation,
      weather: {
        temperature: tempRef.current?.value || assessmentData.weather.temperature,
        temperatureUnit: tempUnitRef.current?.value || assessmentData.weather.temperatureUnit,
        wind: windRef.current?.value || assessmentData.weather.wind,
        windDirection: windDirRef.current?.value || assessmentData.weather.windDirection,
        humidity: humidityRef.current?.value || assessmentData.weather.humidity,
        precipitation: precipRef.current?.value || assessmentData.weather.precipitation,
        precipitationRate: precipRateRef.current?.value || assessmentData.weather.precipitationRate,
        alerts: alertsRef.current?.value || assessmentData.weather.alerts
      }
    };
  };

  // Collect mitigation data from refs
  const collectMitigationData = () => {
    const mitigations = {};
    Object.keys(mitigationRefs).forEach(factor => {
      if (mitigationRefs[factor].current) {
        mitigations[factor] = mitigationRefs[factor].current.value;
      }
    });
    return mitigations;
  };

  // Navigation functions
  const nextStep = async () => {
    // On steps with form inputs, sync data to assessment data
    if (currentStep === 1) {
      // Collect form details from refs
      const formData = collectFormData();

      // Update assessment data with form data
      setAssessmentData(prev => ({
        ...prev,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        station: formData.station,
        weather: formData.weather
      }));
    } else if (currentStep === 3) {
      // Collect mitigation strategies from refs
      const mitigations = collectMitigationData();

      // Update assessment data with mitigations
      setAssessmentData(prev => ({
        ...prev,
        mitigations: {
          ...prev.mitigations,
          ...mitigations
        }
      }));
    }

    // Only save to database if there are changes
    if (hasChanges) {
      try {
        setLoading(true);
        console.log("[DEBUG] Saving data during navigation, current data:", assessmentData);

        // Create a complete assessment object with ALL data
        let assessmentToSave = {
          ...assessmentData,
          // Always include risk factors
          riskFactors: {
            ...assessmentData.riskFactors
          }
        };

        // Add form data or mitigations based on current step
        if (currentStep === 1) {
          const formData = collectFormData();
          assessmentToSave = {
            ...assessmentToSave,
            date: formData.date,
            time: formData.time,
            type: formData.type,
            station: formData.station,
            weather: formData.weather
          };
        } else if (currentStep === 3) {
          const mitigations = collectMitigationData();
          assessmentToSave = {
            ...assessmentToSave,
            mitigations: {
              ...assessmentToSave.mitigations,
              ...mitigations
            }
          };
        }

        console.log("[DEBUG] Assessment data being saved:", assessmentToSave);
        console.log("[DEBUG] Risk factors during navigation:", assessmentToSave.riskFactors);

        if (currentAssessmentId) {
          // Update existing assessment
          console.log("[DEBUG] Updating existing assessment during navigation:", currentAssessmentId);
          await firestoreOperations.updateAssessment(currentAssessmentId, assessmentToSave);
        } else {
          // First time saving this assessment
          assessmentToSave.status = "draft";
          assessmentToSave.captain = auth.currentUser?.displayName || "Captain";

          console.log("[DEBUG] Creating new assessment during navigation");
          console.log("[DEBUG] Assessment data being sent to Firestore:", assessmentToSave);
          const created = await firestoreOperations.createAssessment(assessmentToSave);
          console.log("[DEBUG] Firebase create response:", created);

          if (created && created.id) {
            console.log("[DEBUG] Created assessment with Firestore ID:", created.id);
            // Use the Firestore document ID, not the UUID
            setCurrentAssessmentId(created.id);

            // Update the assessment data with the correct ID
            setAssessmentData(prev => ({
              ...prev,
              id: created.id
            }));
          } else {
            console.error("[DEBUG] Failed to get ID for new assessment:", created);
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
    // On steps with form inputs, sync data to assessment data
    if (currentStep === 1) {
      // Collect form details from refs
      const formData = collectFormData();

      // Update assessment data with form data
      setAssessmentData(prev => ({
        ...prev,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        station: formData.station,
        weather: formData.weather
      }));
    } else if (currentStep === 3) {
      // Collect mitigation strategies from refs
      const mitigations = collectMitigationData();

      // Update assessment data with mitigations
      setAssessmentData(prev => ({
        ...prev,
        mitigations: {
          ...prev.mitigations,
          ...mitigations
        }
      }));
    }

    // Only save to database if there are changes
    if (hasChanges) {
      try {
        setLoading(true);
        console.log("[DEBUG] Saving data during navigation (prev), current data:", assessmentData);

        // Create a complete assessment object with ALL data
        let assessmentToSave = {
          ...assessmentData,
          // Always include risk factors
          riskFactors: {
            ...assessmentData.riskFactors
          }
        };

        // Add form data or mitigations based on current step
        if (currentStep === 1) {
          const formData = collectFormData();
          assessmentToSave = {
            ...assessmentToSave,
            date: formData.date,
            time: formData.time,
            type: formData.type,
            station: formData.station,
            weather: formData.weather
          };
        } else if (currentStep === 3) {
          const mitigations = collectMitigationData();
          assessmentToSave = {
            ...assessmentToSave,
            mitigations: {
              ...assessmentToSave.mitigations,
              ...mitigations
            }
          };
        }

        console.log("[DEBUG] Assessment data being saved (prev):", assessmentToSave);
        console.log("[DEBUG] Risk factors during navigation (prev):", assessmentToSave.riskFactors);

        if (currentAssessmentId) {
          // Update existing assessment
          console.log("[DEBUG] Updating existing assessment during prev navigation:", currentAssessmentId);
          await firestoreOperations.updateAssessment(currentAssessmentId, assessmentToSave);
        } else {
          // First time saving this assessment
          assessmentToSave.status = "draft";
          assessmentToSave.captain = auth.currentUser?.displayName || "Captain";

          console.log("[DEBUG] Creating new assessment during prev navigation");
          console.log("[DEBUG] Assessment data being sent to Firestore:", assessmentToSave);
          const created = await firestoreOperations.createAssessment(assessmentToSave);
          console.log("[DEBUG] Firebase create response:", created);

          if (created && created.id) {
            console.log("[DEBUG] Created assessment with Firestore ID:", created.id);
            // Use the Firestore document ID, not the UUID
            setCurrentAssessmentId(created.id);

            // Update the assessment data with the correct ID
            setAssessmentData(prev => ({
              ...prev,
              id: created.id
            }));
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

  // Continue with an existing draft assessment
  const continueDraft = (draft) => {
    if (!draft || !draft.id) {
      console.error("Invalid draft assessment");
      setError("Cannot load draft: Invalid data");
      return;
    }

    try {
      setLoading(true);
      console.log("[DEBUG] Loading draft assessment:", draft.id);

      // Store the assessment data and ID
      setAssessmentData(draft);
      setCurrentAssessmentId(draft.id);
      setReadOnlyMode(false);

      // Set form values through refs when they're available
      setTimeout(() => {
        if (dateRef.current) dateRef.current.value = draft.date || new Date().toISOString().split('T')[0];
        if (timeRef.current) timeRef.current.value = draft.time || new Date().toTimeString().substring(0, 5);
        if (typeRef.current) typeRef.current.value = draft.type || "";

        // Handle station dropdown and value based on assessment type
        if (stationRef.current) {
          if (draft.type === "Department-wide") {
            // For Department-wide, set to All Stations and disable
            assessmentData.station = "All Stations";
            stationRef.current.value = "All Stations";
            stationRef.current.disabled = true;
          } else if (draft.type === "Station-specific") {
            // For Station-specific, set correct value and enable
            if (draft.station === "All Stations" || !draft.station) {
              // Reset to current station if it was All Stations or empty
              assessmentData.station = selectedStation || "";
              stationRef.current.value = selectedStation || "";
            } else {
              // Use the draft's station value
              assessmentData.station = draft.station;
              stationRef.current.value = draft.station;
            }
            stationRef.current.disabled = false;
          } else {
            // For empty type, disable station
            stationRef.current.disabled = true;
          }
        }

        if (tempRef.current) tempRef.current.value = draft.weather?.temperature || "";
        if (tempUnitRef.current) tempUnitRef.current.value = draft.weather?.temperatureUnit || "°F";
        if (windRef.current) windRef.current.value = draft.weather?.wind || "";
        if (windDirRef.current) windDirRef.current.value = draft.weather?.windDirection || "N";
        if (humidityRef.current) humidityRef.current.value = draft.weather?.humidity || "";
        if (precipRef.current) precipRef.current.value = draft.weather?.precipitation || "";
        if (precipRateRef.current) precipRateRef.current.value = draft.weather?.precipitationRate || "";
        if (alertsRef.current) alertsRef.current.value = draft.weather?.alerts || "";

        // Set mitigation values
        Object.keys(mitigationRefs).forEach(factor => {
          if (mitigationRefs[factor].current) {
            mitigationRefs[factor].current.value = draft.mitigations?.[factor] || "";
          }
        });
      }, 100);

      // Reset control states
      setHasChanges(false);
      setCurrentStep(1);
      setShowAssessment(true);
    } catch (error) {
      console.error("Error loading draft assessment:", error);
      setError("Failed to load draft assessment");
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async () => {
    // If there's an existing draft assessment, use it instead of creating a new one
    if (draftAssessment) {
      continueDraft(draftAssessment);
      return;
    }

    // Create new assessment data object (but DON'T add ID - let Firestore create it)
    const newAssessmentData = {
      date: new Date().toISOString().split('T')[0],
      rawDate: new Date().toISOString(),
      time: new Date().toTimeString().substring(0, 5),
      type: "",
      station: "",
      status: "draft",
      weather: {
        temperature: "",
        temperatureUnit: "°F",
        wind: "",
        windDirection: "N",
        humidity: "",
        precipitation: "",
        precipitationRate: "",
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
      captain: auth.currentUser?.displayName || "Captain"
    };

    try {
      setLoading(true);

      // IMMEDIATELY create a draft assessment in Firebase to get a valid ID
      console.log("[DEBUG] Creating initial draft assessment in database");
      const created = await firestoreOperations.createAssessment(newAssessmentData);

      if (created && created.id) {
        console.log("[DEBUG] Initial draft created with Firestore ID:", created.id);

        // Use the Firestore-generated ID
        newAssessmentData.id = created.id;
        setCurrentAssessmentId(created.id);

        // Set assessment data with the Firestore ID
        setAssessmentData(newAssessmentData);

        // Set form values through refs when they're available
        setTimeout(() => {
          if (dateRef.current) dateRef.current.value = newAssessmentData.date;
          if (timeRef.current) timeRef.current.value = newAssessmentData.time;
          if (typeRef.current) typeRef.current.value = newAssessmentData.type;

          // Set station value based on assessment type
          if (newAssessmentData.type === "Department-wide") {
            // For Department-wide, always use "All Stations"
            newAssessmentData.station = "All Stations";
            if (stationRef.current) {
              stationRef.current.value = "All Stations";
              stationRef.current.disabled = true;
            }
          } else if (newAssessmentData.type === "Station-specific") {
            // For Station-specific, set to current station
            newAssessmentData.station = selectedStation || "";
            if (stationRef.current) {
              stationRef.current.value = selectedStation || "";
              stationRef.current.disabled = false;
            }
          } else {
            // For empty type, leave station empty but disabled
            newAssessmentData.station = "";
            if (stationRef.current) {
              stationRef.current.value = "";
              stationRef.current.disabled = true;
            }
          }

          if (tempRef.current) tempRef.current.value = newAssessmentData.weather.temperature;
          if (tempUnitRef.current) tempUnitRef.current.value = newAssessmentData.weather.temperatureUnit;
          if (windRef.current) windRef.current.value = newAssessmentData.weather.wind;
          if (windDirRef.current) windDirRef.current.value = newAssessmentData.weather.windDirection;
          if (humidityRef.current) humidityRef.current.value = newAssessmentData.weather.humidity;
          if (precipRef.current) precipRef.current.value = newAssessmentData.weather.precipitation;
          if (precipRateRef.current) precipRateRef.current.value = newAssessmentData.weather.precipitationRate;
          if (alertsRef.current) alertsRef.current.value = newAssessmentData.weather.alerts;

          // Reset mitigation values
          Object.keys(mitigationRefs).forEach(factor => {
            if (mitigationRefs[factor].current) {
              mitigationRefs[factor].current.value = "";
            }
          });
        }, 100);

        // Reset control states
        setHasChanges(false);
        setCurrentStep(1);
        setShowAssessment(true);
      } else {
        console.error("[DEBUG] Failed to create initial draft assessment");
        setError("Failed to create new assessment");
      }
    } catch (error) {
      console.error("Error creating initial assessment:", error);
      setError("Failed to start new assessment");
    } finally {
      setLoading(false);
    }
  };

  const closeAssessment = async () => {
    // Clear any temporary assessment data from localStorage
    try {
      localStorage.removeItem('currentAssessmentRiskFactors');
      console.log('[DEBUG] Cleared assessment data from localStorage');
    } catch (err) {
      console.error('[DEBUG] Error clearing localStorage:', err);
    }

    // Use direct browser navigation - same as the working GAR Assessment button
    window.location.href = '/gar-assessment';
  };

  // View assessment function now navigates to URL with ID
  const viewAssessment = (assessmentId) => {
    if (!assessmentId) {
      console.error("Invalid assessment ID");
      setError("Cannot view assessment: Invalid ID");
      return;
    }

    console.log("[DEBUG] Viewing assessment by ID:", assessmentId);

    // First check if this is a Firebase document ID or a field ID
    if (assessmentId.length > 20) {
      // Looks like a Firebase document ID
      navigate(`/gar-assessment/${assessmentId}`);
    } else {
      // Use the format suggested by user
      navigate(`/gar-assessment?a=${assessmentId}`);
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
      console.log("[DEBUG] Saving assessment draft, current data:", assessmentData);

      // First collect current form values
      const formData = collectFormData();
      const mitigations = collectMitigationData();

      // Create a complete assessment object with ALL data
      const assessmentToSave = {
        ...assessmentData,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        station: formData.station,
        weather: formData.weather,
        // Explicitly include risk factors
        riskFactors: {
          ...assessmentData.riskFactors
        },
        mitigations: {
          ...assessmentData.mitigations,
          ...mitigations
        },
        status: "draft",
        captain: auth.currentUser?.displayName || "Captain",
      };

      console.log("[DEBUG] Complete assessment to save:", assessmentToSave);

      if (currentAssessmentId) {
        // Update existing assessment
        console.log("[DEBUG] Updating existing assessment", currentAssessmentId);
        await firestoreOperations.updateAssessment(currentAssessmentId, assessmentToSave);
      } else {
        // Create new assessment
        console.log("[DEBUG] Creating new assessment");
        console.log("[DEBUG] Assessment data being sent to Firestore:", assessmentToSave);
        const created = await firestoreOperations.createAssessment(assessmentToSave);
        console.log("[DEBUG] Firebase create response:", created);

        if (created && created.id) {
          console.log("[DEBUG] New assessment created with Firestore ID:", created.id);
          // Use the Firestore document ID, not the UUID
          setCurrentAssessmentId(created.id);

          // Update the assessment data with the correct ID
          setAssessmentData(prev => ({
            ...prev,
            id: created.id
          }));
        }
      }

      // Update draft assessment state
      setDraftAssessment(assessmentToSave);

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
      console.log("[DEBUG] Publishing assessment, current data:", assessmentData);

      // First collect current form values
      const formData = collectFormData();
      const mitigations = collectMitigationData();

      // Make sure to include ALL data, especially risk factors
      const assessmentToPublish = {
        ...assessmentData,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        station: formData.station,
        weather: formData.weather,
        // Explicitly include risk factors
        riskFactors: {
          ...assessmentData.riskFactors
        },
        mitigations: {
          ...assessmentData.mitigations,
          ...mitigations
        },
        status: "complete",
        captain: auth.currentUser?.displayName || "Captain",
        completedAt: new Date().toISOString(),
        completedBy: auth.currentUser?.displayName || "Captain"
      };

      console.log("[DEBUG] Complete assessment to publish:", assessmentToPublish);
      console.log("[DEBUG] Risk factors being saved:", assessmentToPublish.riskFactors);
      console.log("[DEBUG] Total score:", totalScore);

      if (currentAssessmentId) {
        // Update existing assessment
        console.log("[DEBUG] Updating existing assessment", currentAssessmentId);
        await firestoreOperations.updateAssessment(currentAssessmentId, assessmentToPublish);
      } else {
        // Create new assessment
        console.log("[DEBUG] Creating new assessment");
        console.log("[DEBUG] Assessment data being sent to Firestore:", assessmentToPublish);
        const created = await firestoreOperations.createAssessment(assessmentToPublish);
        console.log("[DEBUG] Firebase create response:", created);

        if (created && created.id) {
          console.log("[DEBUG] New assessment created with Firestore ID:", created.id);
          // Use the Firestore document ID, not the UUID
          setCurrentAssessmentId(created.id);

          // Update the assessment data with the correct ID
          setAssessmentData(prev => ({
            ...prev,
            id: created.id
          }));
        }
      }

      // Successfully published, now close assessment and return to list
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

  // Step 1: Start/Details USING UNCONTROLLED INPUTS
  const Step1 = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Assessment Details</h2>

      {readOnlyMode && (
        <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 mb-4 rounded-md">
          <p className="text-sm">You are viewing this assessment in read-only mode.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <div className="relative">
            <input
              type="date"
              className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
              ref={dateRef}
              defaultValue={assessmentData.date}
              onBlur={(e) => {
                // Simple direct update
                assessmentData.date = e.target.value;
                setHasChanges(true);
              }}
              disabled={readOnlyMode}
            />
            <div className="absolute left-3 top-3 w-4 h-4 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <div className="relative">
            <input
              type="time"
              className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
              ref={timeRef}
              defaultValue={assessmentData.time}
              onBlur={(e) => {
                // Simple direct update
                assessmentData.time = e.target.value;
                setHasChanges(true);
              }}
              disabled={readOnlyMode}
            />
            <div className="absolute left-3 top-3 w-4 h-4 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="12 6 12 12 16 14" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment Type</label>
          <select
            className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
            ref={typeRef}
            onChange={(e) => {
              // Update data on change for the type
              const newType = e.target.value;
              assessmentData.type = newType;

              // Update station value based on assessment type
              if (newType === "Department-wide") {
                // For Department-wide, always set to All Stations
                assessmentData.station = "All Stations";

                // Update the select element to show All Stations and disable it
                if (stationRef.current) {
                  stationRef.current.value = "All Stations";
                  stationRef.current.disabled = true;
                }
              } else if (newType === "Station-specific") {
                // If previously All Stations, initialize with selected station
                if (assessmentData.station === "All Stations") {
                  const stationValue = selectedStation || "";
                  assessmentData.station = stationValue;

                  // Initialize with current station
                  if (stationRef.current) {
                    stationRef.current.value = stationValue;
                  }
                }

                // Make sure station selector is enabled
                if (stationRef.current) {
                  stationRef.current.disabled = false;
                }
              } else {
                // For no selection, disable station
                if (stationRef.current) {
                  stationRef.current.disabled = true;
                }
              }

              setHasChanges(true);
            }}
            disabled={readOnlyMode}
          >
            <option value="">Select assessment type</option>
            <option value="Department-wide">Department-wide</option>
            <option value="Station-specific">Station-specific</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Station</label>
          <select
            className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
            ref={stationRef}
            onChange={(e) => {
              const selectedStationValue = e.target.value;

              // If All Stations is selected, switch assessment type to Department-wide
              if (selectedStationValue === "All Stations" && typeRef.current) {
                // Update assessment type to Department-wide
                typeRef.current.value = "Department-wide";
                assessmentData.type = "Department-wide";

                // Disable the station selector
                e.target.disabled = true;
              }

              // Update the station value
              assessmentData.station = selectedStationValue;
              setHasChanges(true);
            }}
            disabled={readOnlyMode || !typeRef.current || typeRef.current.value !== "Station-specific"}
          >
            <option value="">Select station</option>
            <option value="All Stations">All Stations</option>
            {/* Only show the current station once */}
            {!stations.includes(selectedStation) && (
              <option value={selectedStation}>{selectedStation}</option>
            )}
            {stations.map(station => (
              <option key={station} value={station}>{station}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Weather Conditions</h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                  ref={tempRef}
                  placeholder="Enter temperature"
                  onBlur={(e) => {
                    // Update data on blur instead of onChange to avoid focus issues
                    const newTemp = e.target.value;
                    assessmentData.weather.temperature = newTemp;
                    setHasChanges(true);
                  }}
                  disabled={readOnlyMode}
                />
                <select
                  className={`p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                  ref={tempUnitRef}
                  onBlur={(e) => {
                    // Update data on blur instead of onChange to avoid focus issues
                    const newTempUnit = e.target.value;
                    assessmentData.weather.temperatureUnit = newTempUnit;
                    setHasChanges(true);
                  }}
                  disabled={readOnlyMode}
                >
                  <option value="°F">°F</option>
                  <option value="°C">°C</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wind</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                  ref={windRef}
                  placeholder="Enter wind speed"
                  onBlur={(e) => {
                    // Update data on blur instead of onChange to avoid focus issues
                    const newWind = e.target.value;
                    assessmentData.weather.wind = newWind;
                    setHasChanges(true);
                  }}
                  disabled={readOnlyMode}
                />
                <select
                  className={`p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white w-20 ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                  ref={windDirRef}
                  onBlur={(e) => {
                    // Update data on blur instead of onChange to avoid focus issues
                    const newWindDir = e.target.value;
                    assessmentData.weather.windDirection = newWindDir;
                    setHasChanges(true);
                  }}
                  disabled={readOnlyMode}
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
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                ref={humidityRef}
                placeholder="Enter humidity percentage"
                onBlur={(e) => {
                  // Update data on blur instead of onChange to avoid focus issues
                  const newHumidity = e.target.value;
                  assessmentData.weather.humidity = newHumidity;
                  setHasChanges(true);
                }}
                disabled={readOnlyMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precipitation</label>
              <input
                type="text"
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                placeholder="Type (e.g., Rain, Snow)"
                ref={precipRef}
                defaultValue={assessmentData.weather.precipitation}
                onBlur={(e) => {
                  // Update data on blur instead of onChange to avoid focus issues
                  const newPrecip = e.target.value;
                  assessmentData.weather.precipitation = newPrecip;
                  setHasChanges(true);
                }}
                disabled={readOnlyMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (in/hr)</label>
              <input
                type="text"
                className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                ref={precipRateRef}
                placeholder="Enter rate (e.g., 0.5)"
                onBlur={(e) => {
                  // Update data on blur instead of onChange to avoid focus issues
                  const newPrecipRate = e.target.value;
                  assessmentData.weather.precipitationRate = newPrecipRate;
                  setHasChanges(true);
                }}
                disabled={readOnlyMode}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weather Alerts</label>
            <input
              type="text"
              className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
              placeholder="Enter any active weather alerts"
              ref={alertsRef}
              defaultValue={assessmentData.weather.alerts}
              onBlur={(e) => {
                // Update data on blur instead of onChange to avoid focus issues
                const newAlerts = e.target.value;
                assessmentData.weather.alerts = newAlerts;
                setHasChanges(true);
              }}
              disabled={readOnlyMode}
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

      {readOnlyMode && (
        <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 mb-4 rounded-md">
          <p className="text-sm">You are viewing this assessment in read-only mode.</p>
        </div>
      )}

      <div className="space-y-6">
        <RiskFactorOptimized
          name="Supervision"
          description="Quality and effectiveness of oversight"
          value={assessmentData.riskFactors.supervision}
          onChange={(value) => handleSliderChange('supervision', value)}
          disabled={readOnlyMode}
          getFactorRiskColor={getFactorRiskColor}
        />

        <RiskFactorOptimized
          name="Planning"
          description="Adequacy of operational planning"
          value={assessmentData.riskFactors.planning}
          onChange={(value) => handleSliderChange('planning', value)}
          disabled={readOnlyMode}
          getFactorRiskColor={getFactorRiskColor}
        />

        <RiskFactorOptimized
          name="Team Selection"
          description="Personnel qualifications and experience"
          value={assessmentData.riskFactors.teamSelection}
          onChange={(value) => handleSliderChange('teamSelection', value)}
          disabled={readOnlyMode}
          getFactorRiskColor={getFactorRiskColor}
        />

        <RiskFactorOptimized
          name="Team Fitness"
          description="Physical and mental readiness"
          value={assessmentData.riskFactors.teamFitness}
          onChange={(value) => handleSliderChange('teamFitness', value)}
          disabled={readOnlyMode}
          getFactorRiskColor={getFactorRiskColor}
        />

        <RiskFactorOptimized
          name="Environment"
          description="Weather, terrain, and other external conditions"
          value={assessmentData.riskFactors.environment}
          onChange={(value) => handleSliderChange('environment', value)}
          disabled={readOnlyMode}
          getFactorRiskColor={getFactorRiskColor}
        />

        <RiskFactorOptimized
          name="Event Complexity"
          description="Technical difficulty and operational complexity"
          value={assessmentData.riskFactors.complexity}
          onChange={(value) => handleSliderChange('complexity', value)}
          disabled={readOnlyMode}
          getFactorRiskColor={getFactorRiskColor}
        />
      </div>
    </div>
  );

  // Risk Factor component for Step 2
  const RiskFactor = ({ name, description, value, onChange, disabled = false }) => {
    const riskColor = getFactorRiskColor(value);

    return (
      <div className={`border border-gray-200 dark:border-gray-700 rounded-md p-4 ${disabled ? 'opacity-90' : ''}`}>
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
            className={`flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{
              background: `linear-gradient(to right,
                #4ade80 0%, #4ade80 40%,
                #f59e0b 40%, #f59e0b 70%,
                #ef4444 70%, #ef4444 100%)`
            }}
            disabled={disabled}
          />
          <span className="text-xs text-red-600 dark:text-red-400 ml-2">High Risk</span>
        </div>
      </div>
    );
  };

  // Step 3: Mitigation Strategies with UNCONTROLLED INPUTS
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

        {readOnlyMode && (
          <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 mb-4 rounded-md">
            <p className="text-sm">You are viewing this assessment in read-only mode.</p>
          </div>
        )}

        {highRiskFactors.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Required Mitigation Strategies</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {readOnlyMode
                ? "The following mitigation strategies have been provided for high-risk factors:"
                : "Please provide specific mitigation strategies for all factors rated 5 or higher:"}
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
                      className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnlyMode ? 'cursor-not-allowed opacity-90' : ''}`}
                      rows="3"
                      placeholder={`Describe mitigation strategies for ${factorLabels[factor]}...`}
                      key={`mitigation-${factor}`}
                      ref={mitigationRefs[factor]}
                      defaultValue={assessmentData.mitigations[factor] || ''}
                      onBlur={(e) => {
                        // Update mitigation data directly on blur instead of on every keystroke
                        const newMitigations = {...assessmentData.mitigations};
                        newMitigations[factor] = e.target.value;
                        assessmentData.mitigations = newMitigations;
                        setHasChanges(true);
                      }}
                      disabled={readOnlyMode}
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
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Total Score:</div>
                  <div className="font-bold text-xl">{totalScore}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="font-medium">Risk Level:</div>
                  <div className="font-bold text-xl">{riskLevel.level}</div>
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
                <div className="text-gray-900 dark:text-white">{assessmentData.weather.temperature} {assessmentData.weather.temperatureUnit}</div>

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
                {highRiskFactors.map((factor) => {
                  const mitigationText = mitigationRefs[factor]?.current?.value || assessmentData.mitigations[factor] || "No mitigation strategy provided";
                  
                  return (
                    <div key={factor} className="border-l-4 border-gray-300 dark:border-gray-600 pl-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {factorLabels[factor]} ({assessmentData.riskFactors[factor]})
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {mitigationText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4 mb-6">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Notification Preview</h3>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden max-w-xs mx-auto">
            <div className={`${riskLevel.color} text-white py-2 px-3 font-bold flex flex-col`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  <span>GAR Risk Alert</span>
                </div>
                <span className="font-bold">{riskLevel.level}</span>
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-700 text-sm">
              <div className="text-gray-900 dark:text-white flex flex-col space-y-1">
                <div className="font-semibold">Score: {totalScore}</div>
                {assessmentData.weather.precipitation && <div>{assessmentData.weather.precipitation}</div>}
                {assessmentData.weather.alerts && <div className="text-amber-600 dark:text-amber-400">{assessmentData.weather.alerts}</div>}
              </div>
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
  if (!userChecked && !id) {
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

  // If assessment ID passed in URL, or if showing assessment form
  if (id || showAssessment) {
    // Special case for read-only mode - show the beautiful detailed view
    if (readOnlyMode) {
      return (
        <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
          <ReadOnlyAssessmentView
            assessment={assessmentData}
            calculateRiskScore={calculateRiskScore}
            getRiskLevel={getRiskLevel}
            getFactorRiskColor={getFactorRiskColor}
            onClose={closeAssessment}
          />
        </Layout>
      );
    }

    // Regular edit mode layout
    return (
      <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
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
      </Layout>
    );
  }

  // Main application rendering - assessment list view
  return (
    <Layout darkMode={darkMode} setDarkMode={handleDarkModeChange} selectedStation={selectedStation} setSelectedStation={handleStationChange}>
      <div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">GAR Risk Assessment</h1>
            <p className="text-gray-600 dark:text-gray-400">Create and manage risk assessments for your department</p>
            
            <div className="flex mt-4 space-x-4">
              <button
                className={`flex items-center px-4 py-2 ${
                  id || location.search.includes('a=')
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-md`}
                onClick={startAssessment}
                disabled={readOnlyMode || id || location.search.includes('a=')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {draftAssessment ? "Continue Draft Assessment" : "Create New Assessment"}
              </button>
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assessment History</h2>

            {/* Search bar */}
            <div className="relative w-full md:w-1/3">
              <input
                type="text"
                placeholder="Search by station, date, type..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          {filteredAssessments.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssessments.map(assessment => {
                const assessmentScore = Object.values(assessment.riskFactors || {}).reduce((acc, val) => acc + val, 0);
                const assessmentRisk = getRiskLevel(assessmentScore);

                return (
                  <div key={assessment.id || "unknown"} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 flex flex-col md:flex-row justify-between">
                    <div className="flex items-start mb-2 md:mb-0">
                      <div className={`${assessmentRisk.color} p-2 rounded-lg mr-4 text-white flex-shrink-0`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 dark:text-white">{assessment.type || "Unknown Type"}</h3>
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded text-xs">
                            {assessment.type === "Department-wide" ? "All Stations" : assessment.station || "All Stations"}
                          </span>
                          {assessment.status && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              assessment.status === "complete"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                                : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300"
                            }`}>
                              {assessment.status === "complete" ? "Published" : "Draft"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {assessment.date || "No date"} • Score: {assessmentScore} ({assessmentRisk.level})
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {assessment.captain && <span>By: {assessment.captain}</span>}
                          {assessment.weather?.precipitation && (
                            <span className="ml-2">{assessment.weather.precipitation}</span>
                          )}
                          {assessment.weather?.alerts && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">{assessment.weather.alerts}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-9 md:ml-0">
                      {!readOnlyMode && (
                        <button
                          onClick={() => setConfirmDelete(assessment.id)}
                          className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          disabled={!assessment.id}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}

                      {/* Edit button only for draft assessments */}
                      {assessment.status === 'draft' && !readOnlyMode && (
                        <button
                          onClick={() => continueDraft(assessment)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 px-3 py-1 border border-amber-600 dark:border-amber-400 rounded-md text-sm flex items-center"
                        >
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (assessment.id) {
                            viewAssessment(assessment.id);
                          } else {
                            setError("Cannot view assessment: missing ID");
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-md text-sm flex items-center"
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
              {searchTerm.trim() ? (
                <>
                  <p className="text-lg">No matching assessments found</p>
                  <p className="text-sm mt-1">Try adjusting your search</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No assessments found</p>
                  <p className="text-sm mt-1">Create your first risk assessment to get started</p>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Delete confirmation modal */}
        <DeleteConfirmationModal />
      </div>
    </Layout>
  );
};

export default GARAssessment;