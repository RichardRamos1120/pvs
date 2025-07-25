import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ChevronRight, ChevronLeft, Check, X, AlertTriangle, Clipboard, Truck, Building, Ship, Home, Anchor, LifeBuoy, Clock, Download, Search, Filter, Eye, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import Layout from './Layout';
import { FirestoreContext } from '../App';
import { formatDatePST } from '../utils/timezone';

const EquipmentInspection = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true;
  });
  
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || '';
  });
  
  // Inspection state
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [completedInspections, setCompletedInspections] = useState({});
  const [inspectionMetadata, setInspectionMetadata] = useState({});
  
  // Loading and notification states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previousInspections, setPreviousInspections] = useState([]);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  
  // Inspection management states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortField, setSortField] = useState('completedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInspectionForAction, setSelectedInspectionForAction] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Load previous inspections when component mounts (globally, not filtered by station)
  useEffect(() => {
    const loadPreviousInspections = async () => {
      try {
        setLoading(true);
        // Load all inspections globally (not filtered by station)
        const inspections = await firestoreOperations.getEquipmentInspections(null, null, 100);
        setPreviousInspections(inspections);
      } catch (error) {
        console.error('Error loading previous inspections:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreviousInspections();
  }, [firestoreOperations]);
  
  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
  };

  const inspectionTypes = {
    medic: {
      title: "Daily Check - Medic",
      icon: <Truck className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["Medic 1", "Medic 2", "Medic 3", "Medic 4", "Medic 5", "Medic 6", "Medic 7", "Medic 8", "Medic 9", "Medic 10"] },
        { id: "mileage", label: "Mileage", type: "number", required: true }
      ],
      sections: [
        {
          name: "Engine & Pre-Trip",
          passAllEnabled: true,
          questions: [
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" },
            { id: "dmv_pretrip", text: "All DMV pre-trip items functioning properly?", type: "pass/fail", passText: "Yes", failText: "Issues Found" },
            { id: "oil_level", text: "Engine oil level within acceptable range?", type: "pass/fail", passText: "Acceptable", failText: "Low/High" },
            { id: "coolant", text: "Coolant level at or above minimum?", type: "pass/fail", passText: "Acceptable", failText: "Low" },
            { id: "engine_issues", text: "Any visible engine issues found?", type: "pass/fail", passText: "None", failText: "Issues Found" },
            { id: "engine_notes", text: "If issues found, describe:", type: "text", placeholder: "Describe engine issues..." }
          ]
        },
        {
          name: "Chassis & Exterior",
          passAllEnabled: true,
          questions: [
            { id: "tire_pressure", text: "Tire pressure and tread depth acceptable on all tires?", type: "pass/fail", passText: "Acceptable", failText: "Issues Found" },
            { id: "body_condition", text: "Any new body damage found?", type: "pass/fail", passText: "None Found", failText: "Damage Found" },
            { id: "damage_notes", text: "If damage found, describe location and severity:", type: "text", placeholder: "Describe damage..." },
            { id: "exhaust", text: "Exhaust system intact with no excessive smoke?", type: "pass/fail", passText: "Normal", failText: "Issues Found" },
            { id: "emergency_lights", text: "All emergency lights functioning properly?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "warning_devices", text: "Sirens and horns operational?", type: "pass/fail", passText: "Working", failText: "Issues Found" }
          ]
        },
        {
          name: "Cab Equipment",
          passAllEnabled: true,
          questions: [
            { id: "cab_clean", text: "Cab area clean and organized?", type: "pass/fail", passText: "Yes", failText: "No" },
            { id: "scba_count", text: "Number of functional SCBA units in cab:", type: "number", placeholder: "Enter number (should be 2)" },
            { id: "epcr_ipad", text: "ePCR iPad present and charged?", type: "pass/fail", passText: "Ready", failText: "Missing/Dead", allowNA: true },
            { id: "command_tablet", text: "Command tablet present and functioning?", type: "pass/fail", passText: "Working", failText: "Issues Found", allowNA: true },
            { id: "iphone", text: "Department iPhone present and charged?", type: "pass/fail", passText: "Ready", failText: "Missing/Dead" },
            { id: "mera_portables", text: "Number of functional MERA portable radios:", type: "number", placeholder: "Enter number (should be 2)" },
            { id: "mera_mobile1", text: "MERA mobile radio #1 functioning?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "mera_mobile2", text: "MERA mobile radio #2 functioning?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "kenwood", text: "Kenwood base radio functioning?", type: "pass/fail", passText: "Working", failText: "Issues Found" }
          ]
        },
        {
          name: "EMS Equipment",
          passAllEnabled: true,
          questions: [
            { id: "ems_bag", text: "EMS bag fully stocked and organized?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "airway_bag", text: "Airway bag fully stocked and organized?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "cardiac_monitor", text: "Cardiac monitor operational with charged batteries?", type: "pass/fail", passText: "Ready", failText: "Issues Found" },
            { id: "lucas_device", text: "Lucas CPR device present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found", allowNA: true },
            { id: "portable_suction", text: "Portable suction unit charged and functioning?", type: "pass/fail", passText: "Ready", failText: "Issues Found" },
            { id: "o2_system", text: "Oxygen system operational with adequate supply?", type: "pass/fail", passText: "Ready", failText: "Issues Found" }
          ]
        },
        {
          name: "Compartment Inventory",
          passAllEnabled: true,
          questions: [
            { id: "i1a", text: "Compartment I-1A complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i1b", text: "Compartment I-1B complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i2a", text: "Compartment I-2A complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i2b", text: "Compartment I-2B complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i1c", text: "Compartment I-1C complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i4a", text: "Compartment I-4A complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i4b", text: "Compartment I-4B complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i5a", text: "Compartment I-5A complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i5b", text: "Compartment I-5B complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i5c", text: "Compartment I-5C complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i6a", text: "Compartment I-6A complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "i6b", text: "Compartment I-6B complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" }
          ]
        },
        {
          name: "Outside Compartments",
          passAllEnabled: true,
          questions: [
            { id: "o1", text: "Compartment O-1 complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "o3", text: "Compartment O-3 complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "o4", text: "Compartment O-4 complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "o5", text: "Compartment O-5 complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" },
            { id: "o6", text: "Compartment O-6 complete and organized?", type: "pass/fail", passText: "Complete", failText: "Issues Found" }
          ]
        }
      ]
    },
    engine: {
      title: "NFPA 1911 Daily - Engine",
      icon: <Truck className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["Engine 1", "Engine 2", "Engine 3", "Engine 4", "Engine 5", "Engine 6", "Engine 7", "Engine 8", "Engine 9", "Engine 10"] },
        { id: "mileage", label: "Mileage", type: "number", required: true }
      ],
      sections: [
        {
          name: "Fuel & Basic Inventory",
          passAllEnabled: true,
          questions: [
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" },
            { id: "flares", text: "Traffic flares/reflectors present and in good condition?", type: "pass/fail", passText: "Complete", failText: "Missing/Damaged" },
            { id: "keys", text: "All required keys accounted for?", type: "pass/fail", passText: "Complete", failText: "Missing" },
            { id: "portable_equipment", text: "All portable equipment secured and present?", type: "pass/fail", passText: "Complete", failText: "Issues Found" }
          ]
        },
        {
          name: "EMS Equipment",
          passAllEnabled: true,
          questions: [
            { id: "ems_bag", text: "EMS bag fully stocked and organized?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "airway_bag", text: "Airway bag fully stocked and organized?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "scbas", text: "SCBAs present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" },
            { id: "aed", text: "AED present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" }
          ]
        },
        {
          name: "Communications & Technology",
          passAllEnabled: true,
          questions: [
            { id: "run_books", text: "Run books present and up to date?", type: "pass/fail", passText: "Current", failText: "Missing/Outdated" },
            { id: "mera_mobile", text: "MERA Mobile Radio functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "motorola_mobile", text: "Motorola Mobile Radio functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "mera_portables", text: "All MERA Portable Radios present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" },
            { id: "kng_portables", text: "All KNG Portable Radios present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" },
            { id: "command_tablet", text: "Command Tablet functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "engine_phone", text: "Engine Phone functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" }
          ]
        }
      ]
    },
    truck: {
      title: "NFPA 1911 Daily - Truck",
      icon: <Truck className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["Truck 1", "Truck 2", "Truck 3", "Truck 4", "Truck 5"] },
        { id: "mileage", label: "Mileage", type: "number", required: true }
      ],
      sections: [
        {
          name: "Fuel & Basic Inventory",
          passAllEnabled: true,
          questions: [
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" },
            { id: "cones", text: "Traffic cones present?", type: "pass/fail", passText: "Present", failText: "Missing" },
            { id: "keys", text: "All keys present?", type: "pass/fail", passText: "Complete", failText: "Missing" },
            { id: "portable_equipment", text: "All portable equipment present?", type: "pass/fail", passText: "Complete", failText: "Missing Items" }
          ]
        },
        {
          name: "EMS & Safety Equipment",
          passAllEnabled: true,
          questions: [
            { id: "ems_bag", text: "EMS Bag-T4 complete?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "airway_bag", text: "Airway Bag-T4 complete?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "collar_bag", text: "C-Collar Bag present and complete?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "scbas", text: "All 5 SCBAs present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" },
            { id: "shooter_packs", text: "All 3 Active Shooter Backpacks present?", type: "pass/fail", passText: "Complete", failText: "Missing" }
          ]
        },
        {
          name: "Aerial Systems",
          passAllEnabled: true,
          questions: [
            { id: "aerial_hydraulics", text: "Aerial hydraulics operate properly?", type: "pass/fail", passText: "Normal", failText: "Issues Found" },
            { id: "outriggers", text: "Aerial outriggers operate properly?", type: "pass/fail", passText: "Normal", failText: "Issues Found" },
            { id: "aerial_operation", text: "Aerial operates properly?", type: "pass/fail", passText: "Normal", failText: "Issues Found" },
            { id: "hydraulic_fluid", text: "Aerial hydraulic fluid at proper level?", type: "pass/fail", passText: "Acceptable", failText: "Low" },
            { id: "aerial_structure", text: "Aerial structure visually inspected and secure?", type: "pass/fail", passText: "Good Condition", failText: "Issues Found" }
          ]
        }
      ]
    },
    rescue: {
      title: "NFPA 1911 Daily - Rescue",
      icon: <Truck className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["Rescue 1", "Rescue 2", "Rescue 3"] },
        { id: "mileage", label: "Mileage", type: "number", required: true }
      ],
      sections: [
        {
          name: "Engine & Basic Inventory",
          passAllEnabled: true,
          questions: [
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" },
            { id: "fluid_levels", text: "All fluid levels checked and acceptable?", type: "pass/fail", passText: "Acceptable", failText: "Issues Found" },
            { id: "keys", text: "All keys present?", type: "pass/fail", passText: "Complete", failText: "Missing" },
            { id: "portable_equipment", text: "All portable equipment present?", type: "pass/fail", passText: "Complete", failText: "Missing Items" }
          ]
        },
        {
          name: "EMS Equipment",
          passAllEnabled: true,
          questions: [
            { id: "ems_bag", text: "EMS Bag complete and organized?", type: "pass/fail", passText: "Complete", failText: "Incomplete" },
            { id: "lucas_device", text: "Lucas Device present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found", allowNA: true },
            { id: "scbas", text: "SCBAs present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" }
          ]
        }
      ]
    },
    diveTender: {
      title: "Dive Tender Daily Check",
      icon: <LifeBuoy className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["Dive Tender 1", "Dive Tender 2", "Dive Tender 3"] }
      ],
      sections: [
        {
          name: "Cab & Communications",
          passAllEnabled: true,
          questions: [
            { id: "mera_radio", text: "MERA Radio functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "bk_mobile", text: "BK Mobile Radio functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" }
          ]
        },
        {
          name: "Dive Equipment",
          passAllEnabled: true,
          questions: [
            { id: "bcd1", text: "BCD 1 and Bailout Cylinder at 3000psi?", type: "pass/fail", passText: "3000psi", failText: "Low Pressure" },
            { id: "bcd2", text: "BCD 2 and Bailout Cylinder at 3000psi?", type: "pass/fail", passText: "3000psi", failText: "Low Pressure" },
            { id: "spare_cylinders", text: "All 4 Spare Scuba Cylinders at 3000psi?", type: "pass/fail", passText: "3000psi", failText: "Low Pressure" },
            { id: "compressor", text: "Portable Compressor present and functional?", type: "pass/fail", passText: "Ready", failText: "Issues Found" }
          ]
        }
      ]
    },
    boat: {
      title: "Daily Check - Boat",
      icon: <Ship className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["Boat 1", "Boat 2", "Boat 3", "Boat 4", "Boat 5"] },
        { id: "engine_hours", label: "Engine Hours", type: "number", required: true }
      ],
      sections: [
        {
          name: "Vessel & Safety",
          passAllEnabled: true,
          questions: [
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" },
            { id: "engine_compartment", text: "Engine compartment condition satisfactory?", type: "pass/fail", passText: "Good Condition", failText: "Issues Found" },
            { id: "fluid_leaks", text: "Any fluid leaks found?", type: "pass/fail", passText: "None Found", failText: "Leaks Found" },
            { id: "mooring_lines", text: "Mooring lines secure and in good condition?", type: "pass/fail", passText: "Secure", failText: "Issues Found" }
          ]
        },
        {
          name: "Communications",
          passAllEnabled: true,
          questions: [
            { id: "mera_radio", text: "MERA Radio functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "marine_band", text: "Marine Band Radio functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "nav_equipment", text: "Navigation Equipment functional?", type: "pass/fail", passText: "Working", failText: "Issues Found" }
          ]
        }
      ]
    },
    irb: {
      title: "IRB Daily Check",
      icon: <Anchor className="w-6 h-6" />,
      metadata: [
        { id: "unit_number", label: "Unit Number", type: "dropdown", required: true, options: ["IRB 1", "IRB 2", "IRB 3", "IRB 4", "IRB 5"] }
      ],
      sections: [
        {
          name: "Engine & Hull",
          passAllEnabled: true,
          questions: [
            { id: "fuel", text: "What is the current fuel level?", type: "fuel" },
            { id: "start_engine", text: "Engine starts and runs normally?", type: "pass/fail", passText: "Normal", failText: "Issues Found" },
            { id: "inflation", text: "IRB properly inflated to correct pressure?", type: "pass/fail", passText: "Proper Pressure", failText: "Under/Over Inflated" },
            { id: "plugs", text: "All 3 drain plugs secure and watertight?", type: "pass/fail", passText: "Secure", failText: "Issues Found" }
          ]
        },
        {
          name: "Safety Equipment",
          passAllEnabled: true,
          questions: [
            { id: "pfd_count", text: "Number of PFDs and Helmets present:", type: "number", placeholder: "Enter number (minimum 4)" },
            { id: "anchor", text: "Anchor present and secure?", type: "pass/fail", passText: "Secure", failText: "Missing/Loose" },
            { id: "throw_bags", text: "Both throw bags present and ready?", type: "pass/fail", passText: "Ready", failText: "Missing/Issues" }
          ]
        }
      ]
    },
    facilities: {
      title: "Monthly Workplace Safety - Station",
      icon: <Building className="w-6 h-6" />,
      metadata: [
        { id: "station_number", label: "Station Number", type: "dropdown", required: true, options: ["Station 1", "Station 2", "Station 3", "Station 4", "Station 5"] }
      ],
      sections: [
        {
          name: "Emergency & Fire Safety",
          passAllEnabled: true,
          questions: [
            { id: "exits", text: "All exits clearly marked and unobstructed?", type: "pass/fail", passText: "Clear", failText: "Obstructed" },
            { id: "exit_notes", text: "If obstructed, describe location and issue:", type: "text", placeholder: "Describe obstruction..." },
            { id: "emergency_lighting", text: "Emergency lighting tested and functioning?", type: "pass/fail", passText: "Working", failText: "Issues Found" },
            { id: "fire_extinguishers", text: "Fire extinguishers mounted, accessible, and currently inspected?", type: "pass/fail", passText: "Current", failText: "Overdue" },
            { id: "extinguisher_date", text: "Date of last extinguisher inspection:", type: "text", placeholder: "MM/YYYY" },
            { id: "sprinklers", text: "Fire sprinkler system inspection current?", type: "pass/fail", passText: "Current", failText: "Overdue", allowNA: true },
            { id: "smoke_detectors", text: "Smoke detectors in place and operational?", type: "pass/fail", passText: "Working", failText: "Issues Found" }
          ]
        },
        {
          name: "Electrical Safety",
          passAllEnabled: true,
          questions: [
            { id: "extension_cords", text: "Any permanent use of extension cords observed?", type: "pass/fail", passText: "None Found", failText: "Found" },
            { id: "outlets", text: "All electrical outlets have proper covers and are secure?", type: "pass/fail", passText: "Secure", failText: "Issues Found" },
            { id: "electrical_clearance", text: "36-inch clearance maintained in front of electrical panels?", type: "pass/fail", passText: "Clear", failText: "Obstructed" },
            { id: "multi_plug", text: "Any multi-plug adapters (daisy chains) in use?", type: "pass/fail", passText: "None Found", failText: "Found" },
            { id: "appliances", text: "All appliances plugged directly into outlets (no adapters)?", type: "pass/fail", passText: "Compliant", failText: "Issues Found" }
          ]
        }
      ]
    },
    alsFirstResponder: {
      title: "ALS First Responder - Monthly Inventory",
      icon: <Clipboard className="w-6 h-6" />,
      metadata: [
        { id: "unit_type", label: "Unit Type", type: "dropdown", required: true, options: ["Engine", "Truck", "Rescue", "Squad", "Other"] },
        { id: "unit_number", label: "Unit Number", type: "text", required: true }
      ],
      sections: [
        {
          name: "Airway Equipment",
          passAllEnabled: true,
          questions: [
            { id: "nasal_airways", text: "Nasopharyngeal airways: sizes 14-36 Fr (1 each)?", type: "inventory" },
            { id: "oral_airways", text: "Oropharyngeal airways: sizes 0-6 (1 each)?", type: "inventory" },
            { id: "igel", text: "i-gel airways: sizes 1.0-5.0 (1 each)?", type: "inventory" },
            { id: "laryngoscope", text: "Laryngoscope handle with batteries?", type: "inventory" },
            { id: "et_tubes", text: "ET tubes: sizes 6.0-8.0mm (1 each)?", type: "inventory" }
          ]
        },
        {
          name: "Medications",
          passAllEnabled: true,
          questions: [
            { id: "epinephrine", text: "Epinephrine 1mg/ml (5mg minimum)?", type: "inventory" },
            { id: "naloxone", text: "Naloxone 2mg/5ml (3)?", type: "inventory" },
            { id: "albuterol", text: "Albuterol unit doses (3)?", type: "inventory" },
            { id: "aspirin", text: "Aspirin 81mg (1 bottle)?", type: "inventory" }
          ]
        }
      ]
    },
    alsTransport: {
      title: "ALS Transport Unit - Monthly Inventory",
      icon: <Clipboard className="w-6 h-6" />,
      metadata: [
        { id: "unit_type", label: "Unit Type", type: "dropdown", required: true, options: ["Ambulance", "Medic", "Transport", "Other"] },
        { id: "unit_number", label: "Unit Number", type: "text", required: true }
      ],
      sections: [
        {
          name: "Advanced Equipment",
          passAllEnabled: true,
          questions: [
            { id: "cardiac_monitor", text: "Cardiac monitor with strip recorder and pacing?", type: "inventory" },
            { id: "mechanical_cpr", text: "Mechanical CPR device?", type: "inventory" },
            { id: "cpap", text: "CPAP device (1)?", type: "inventory" },
            { id: "io_device", text: "IO device with needles?", type: "inventory" }
          ]
        },
        {
          name: "Enhanced Medications",
          passAllEnabled: true,
          questions: [
            { id: "adenosine", text: "Adenosine 6mg/2ml (36mg total)?", type: "inventory" },
            { id: "amiodarone", text: "Amiodarone 150mg/3ml (6)?", type: "inventory" },
            { id: "midazolam", text: "Midazolam 2mg/2ml (4)?", type: "inventory" },
            { id: "morphine", text: "Morphine 10mg/ml (6)?", type: "inventory" }
          ]
        }
      ]
    },
    blsTransport: {
      title: "BLS Transport Unit - Monthly Inventory",
      icon: <Clipboard className="w-6 h-6" />,
      metadata: [
        { id: "unit_type", label: "Unit Type", type: "dropdown", required: true, options: ["Ambulance", "Transport", "Other"] },
        { id: "unit_number", label: "Unit Number", type: "text", required: true }
      ],
      sections: [
        {
          name: "Basic Equipment",
          passAllEnabled: true,
          questions: [
            { id: "aed", text: "AED?", type: "inventory" },
            { id: "bvm_adult", text: "BVM: adult?", type: "inventory" },
            { id: "o2_portable", text: "Portable O2 tanks (min D-tank) (2)?", type: "inventory" },
            { id: "pulse_ox", text: "Portable pulse oximeter?", type: "inventory" }
          ]
        },
        {
          name: "Basic Medications",
          passAllEnabled: true,
          questions: [
            { id: "aspirin", text: "Aspirin 81mg (1 bottle)?", type: "inventory" },
            { id: "glucose_paste", text: "Glucose paste 15gm/tube (2)?", type: "inventory" },
            { id: "naloxone_spray", text: "Naloxone nasal spray kit?", type: "inventory" }
          ]
        }
      ]
    },
    alsFireline: {
      title: "ALS Fireline Tactical - Monthly Inventory",
      icon: <Clipboard className="w-6 h-6" />,
      metadata: [
        { id: "unit_type", label: "Unit Type", type: "dropdown", required: true, options: ["Squad", "Brush", "Patrol", "Other"] },
        { id: "unit_number", label: "Unit Number", type: "text", required: true }
      ],
      sections: [
        {
          name: "Tactical Equipment",
          passAllEnabled: true,
          questions: [
            { id: "tourniquets", text: "Tourniquets (CAT/SWAT) (2)?", type: "inventory" },
            { id: "chest_seal", text: "Occlusive dressings (2)?", type: "inventory" },
            { id: "decompression", text: "Pleural decompression kit?", type: "inventory" },
            { id: "burn_sheets", text: "Burn sheets (2)?", type: "inventory" }
          ]
        },
        {
          name: "Tactical Medications",
          passAllEnabled: true,
          questions: [
            { id: "epi_conc", text: "Epinephrine 1mg/ml (4)?", type: "inventory" },
            { id: "midazolam", text: "Midazolam 2mg/2ml (10)?", type: "inventory" },
            { id: "morphine", text: "Morphine 10mg/ml (2)?", type: "inventory" },
            { id: "naloxone", text: "Naloxone 2mg/5ml (2)?", type: "inventory" }
          ]
        }
      ]
    },
    cct: {
      title: "CCT Unit - Monthly Inventory",
      icon: <Clipboard className="w-6 h-6" />,
      metadata: [
        { id: "unit_type", label: "Unit Type", type: "dropdown", required: true, options: ["CCT Ambulance", "CCT Transport", "Other"] },
        { id: "unit_number", label: "Unit Number", type: "text", required: true }
      ],
      sections: [
        {
          name: "Critical Care Equipment",
          passAllEnabled: true,
          questions: [
            { id: "vent", text: "Transport ventilator?", type: "inventory" },
            { id: "isolette", text: "Neonatal isolette?", type: "inventory" },
            { id: "infusion_pump", text: "Infusion pump?", type: "inventory" },
            { id: "arterial_line", text: "Arterial line equipment?", type: "inventory" }
          ]
        },
        {
          name: "Critical Care Medications",
          passAllEnabled: true,
          questions: [
            { id: "dexamethasone", text: "Dexamethasone?", type: "inventory" },
            { id: "diazepam", text: "Diazepam?", type: "inventory" },
            { id: "heparin", text: "Heparin?", type: "inventory" },
            { id: "nitro_drip", text: "Nitroglycerin drip?", type: "inventory" }
          ]
        }
      ]
    }
  };

  const handleResponse = (questionId, value) => {
    const inspectionKey = selectedInspection;
    const sectionKey = inspectionTypes[inspectionKey].sections[currentSection].name;
    
    setResponses(prev => ({
      ...prev,
      [inspectionKey]: {
        ...prev[inspectionKey],
        [sectionKey]: {
          ...prev[inspectionKey]?.[sectionKey],
          [questionId]: value
        }
      }
    }));
  };

  const renderAnswerOptions = (question) => {
    const section = inspectionTypes[selectedInspection].sections[currentSection];
    
    if (question.type === 'text') {
      return (
        <input
          type="text"
          value={responses[selectedInspection]?.[section.name]?.[question.id] || ''}
          onChange={(e) => handleResponse(question.id, e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder={question.placeholder || "Enter details..."}
        />
      );
    }

    if (question.type === 'number') {
      return (
        <input
          type="number"
          value={responses[selectedInspection]?.[section.name]?.[question.id] || ''}
          onChange={(e) => handleResponse(question.id, e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder={question.placeholder || "Enter value..."}
        />
      );
    }

    const buttons = [];
    
    if (question.type === 'fuel') {
      buttons.push(
        <button
          key="full"
          onClick={() => handleResponse(question.id, 'full')}
          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'full'
              ? 'bg-green-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Full
        </button>
      );
      buttons.push(
        <button
          key="3/4"
          onClick={() => handleResponse(question.id, '3/4')}
          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === '3/4'
              ? 'bg-yellow-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          3/4
        </button>
      );
      buttons.push(
        <button
          key="1/2"
          onClick={() => handleResponse(question.id, '1/2')}
          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === '1/2'
              ? 'bg-orange-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          1/2
        </button>
      );
      buttons.push(
        <button
          key="refill"
          onClick={() => handleResponse(question.id, 'refill')}
          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'refill'
              ? 'bg-red-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Needs Refill
        </button>
      );
    } else if (question.type === 'inventory') {
      buttons.push(
        <button
          key="present"
          onClick={() => handleResponse(question.id, 'present')}
          className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'present'
              ? 'bg-green-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Present</span>
        </button>
      );
      buttons.push(
        <button
          key="missing"
          onClick={() => handleResponse(question.id, 'missing')}
          className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'missing'
              ? 'bg-red-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <X className="w-4 h-4" />
          <span>Missing</span>
        </button>
      );
    } else {
      buttons.push(
        <button
          key="pass"
          onClick={() => handleResponse(question.id, 'pass')}
          className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'pass'
              ? 'bg-green-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{question.passText || 'Pass'}</span>
        </button>
      );
      buttons.push(
        <button
          key="fail"
          onClick={() => handleResponse(question.id, 'fail')}
          className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'fail'
              ? 'bg-red-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <X className="w-4 h-4" />
          <span>{question.failText || 'Fail'}</span>
        </button>
      );
    }

    if (question.allowNA) {
      buttons.push(
        <button
          key="na"
          onClick={() => handleResponse(question.id, 'na')}
          className={`flex-1 py-2 px-4 rounded-md text-sm transition-colors ${
            responses[selectedInspection]?.[section.name]?.[question.id] === 'na'
              ? 'bg-gray-600 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          N/A
        </button>
      );
    }

    return <div className="flex space-x-3 flex-wrap gap-2">{buttons}</div>;
  };

  const handleMetadataChange = (metadataId, value) => {
    setInspectionMetadata(prev => ({
      ...prev,
      [selectedInspection]: {
        ...prev[selectedInspection],
        [metadataId]: value
      }
    }));
  };

  const handlePassAll = () => {
    const inspectionKey = selectedInspection;
    const section = inspectionTypes[inspectionKey].sections[currentSection];
    const sectionKey = section.name;
    
    const allPassed = {};
    section.questions.forEach(q => {
      if (q.type === 'text' || q.type === 'number') {
        return;
      } else if (q.type === 'fuel') {
        allPassed[q.id] = 'full';
      } else if (q.type === 'inventory') {
        allPassed[q.id] = 'present';
      } else {
        allPassed[q.id] = 'pass';
      }
    });
    
    setResponses(prev => ({
      ...prev,
      [inspectionKey]: {
        ...prev[inspectionKey],
        [sectionKey]: {
          ...prev[inspectionKey]?.[sectionKey],
          ...allPassed
        }
      }
    }));
  };

  const isMetadataComplete = () => {
    if (!selectedInspection || !inspectionTypes[selectedInspection].metadata) return true;
    
    const metadata = inspectionTypes[selectedInspection].metadata;
    return metadata.every(m => {
      if (m.required) {
        return inspectionMetadata[selectedInspection]?.[m.id];
      }
      return true;
    });
  };

  const isSectionComplete = () => {
    const inspectionKey = selectedInspection;
    const section = inspectionTypes[inspectionKey].sections[currentSection];
    const sectionKey = section.name;
    
    return section.questions.every(q => 
      responses[inspectionKey]?.[sectionKey]?.[q.id] !== undefined
    );
  };

  const getProgress = () => {
    if (!selectedInspection) return { answered: 0, total: 0 };
    
    const inspection = inspectionTypes[selectedInspection];
    let answered = 0;
    let total = 0;
    
    inspection.sections.forEach(section => {
      section.questions.forEach(q => {
        total++;
        if (responses[selectedInspection]?.[section.name]?.[q.id] !== undefined) {
          answered++;
        }
      });
    });
    
    return { answered, total };
  };

  const completeInspection = async () => {
    if (!selectedInspection || !selectedStation) {
      showNotification('error', 'Missing required information to complete inspection');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare inspection data
      const inspectionData = {
        inspectionType: selectedInspection,
        inspectionTitle: inspectionTypes[selectedInspection].title,
        station: selectedStation,
        responses: responses[selectedInspection] || {},
        metadata: inspectionMetadata[selectedInspection] || {},
        completedAt: new Date().toISOString(),
        status: 'completed'
      };
      
      // Save to database
      const result = await firestoreOperations.createEquipmentInspection(inspectionData);
      
      if (result && result.id) {
        // Update local state
        setCompletedInspections(prev => ({
          ...prev,
          [selectedInspection]: {
            id: result.id,
            timestamp: new Date().toISOString(),
            responses: responses[selectedInspection],
            metadata: inspectionMetadata[selectedInspection]
          }
        }));
        
        // Reload previous inspections globally
        const updatedInspections = await firestoreOperations.getEquipmentInspections(null, null, 100);
        setPreviousInspections(updatedInspections);
        
        showNotification('success', 'Equipment inspection completed and saved successfully!');
        
        // Reset form
        setSelectedInspection(null);
        setCurrentSection(0);
        setResponses({});
        setInspectionMetadata({});
        
      } else {
        throw new Error('Failed to save inspection');
      }
      
    } catch (error) {
      console.error('Error completing inspection:', error);
      showNotification('error', 'Failed to save inspection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Export inspection to PDF
  const exportInspectionToPDF = async (inspection) => {
    if (!inspection) return;
    
    try {
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Helper functions
      const addSectionTitle = (text, y) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(text, 15, y);
        pdf.setDrawColor(0, 0, 0);
        pdf.line(15, y + 2, 195, y + 2);
        return y + 10;
      };

      const addField = (label, value, y) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(label, 15, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '-', 80, y);
        return y + 6;
      };

      const addQuestion = (question, answer, y) => {
        // Check if we need a new page
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        const questionLines = pdf.splitTextToSize(question, 170);
        
        questionLines.forEach((line, index) => {
          pdf.text(line, 15, y + (index * 5));
        });
        
        y += questionLines.length * 5 + 2;
        
        // Add answer with color coding
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        let answerText = answer || 'No Answer';
        let textColor = [0, 0, 0]; // Default black
        
        // Color code based on answer type
        if (answer === 'pass' || answer === 'present' || answer === 'full') {
          textColor = [0, 128, 0]; // Green
          answerText = answer === 'pass' ? '✓ PASS' : answer === 'present' ? '✓ PRESENT' : '✓ FULL';
        } else if (answer === 'fail' || answer === 'missing' || answer === 'refill') {
          textColor = [255, 0, 0]; // Red
          answerText = answer === 'fail' ? '✗ FAIL' : answer === 'missing' ? '✗ MISSING' : '✗ NEEDS REFILL';
        } else if (answer === 'na') {
          textColor = [128, 128, 128]; // Gray
          answerText = 'N/A';
        } else if (answer === '3/4') {
          textColor = [255, 165, 0]; // Orange
          answerText = '3/4 FULL';
        } else if (answer === '1/2') {
          textColor = [255, 140, 0]; // Dark orange
          answerText = '1/2 FULL';
        }
        
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.text(answerText, 25, y);
        pdf.setTextColor(0, 0, 0); // Reset to black
        
        return y + 8;
      };

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('EQUIPMENT INSPECTION REPORT', 15, 20);

      let currentY = 35;

      // Inspection details
      currentY = addSectionTitle('Inspection Details', currentY);
      currentY = addField('Inspection Type:', inspection.inspectionTitle, currentY);
      currentY = addField('Date:', inspection.completedAt ? formatDatePST(new Date(inspection.completedAt), { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }) : 'Unknown', currentY);
      currentY = addField('Time:', inspection.completedAt ? formatDatePST(new Date(inspection.completedAt), { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }) : 'Unknown', currentY);
      currentY = addField('Inspector:', inspection.createdBy, currentY);
      
      // Metadata
      if (inspection.metadata && Object.keys(inspection.metadata).length > 0) {
        currentY += 5;
        currentY = addSectionTitle('Unit Information', currentY);
        Object.entries(inspection.metadata).forEach(([key, value]) => {
          if (value) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ':';
            currentY = addField(label, value.toString(), currentY);
          }
        });
      }

      // Inspection responses
      if (inspection.responses && Object.keys(inspection.responses).length > 0) {
        currentY += 5;
        
        Object.entries(inspection.responses).forEach(([sectionName, questions]) => {
          currentY = addSectionTitle(sectionName, currentY);
          
          if (questions && typeof questions === 'object') {
            Object.entries(questions).forEach(([questionId, answer]) => {
              // Find the question text
              let questionText = questionId;
              const inspectionType = inspectionTypes[inspection.inspectionType];
              if (inspectionType) {
                const section = inspectionType.sections.find(s => s.name === sectionName);
                if (section) {
                  const question = section.questions.find(q => q.id === questionId);
                  if (question) {
                    questionText = question.text;
                  }
                }
              }
              
              currentY = addQuestion(questionText, answer, currentY);
            });
          }
          
          currentY += 5; // Space between sections
        });
      }

      // Footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`Generated on ${formatDatePST(new Date())}`, 15, 285);
        pdf.text(`Page ${i} of ${pageCount}`, 180, 285);
      }

      // Save the PDF
      const fileName = `${inspection.inspectionTitle.replace(/\s+/g, '_')}_${formatDatePST(new Date(inspection.completedAt), { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      
      showNotification('success', 'PDF report generated successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification('error', 'Failed to generate PDF report');
    }
  };

  // Filter and search functions
  const getFilteredAndSortedInspections = () => {
    let filtered = [...previousInspections];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(inspection => 
        inspection.inspectionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.metadata?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.createdBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Type filter
    if (selectedTypeFilter !== 'all') {
      filtered = filtered.filter(inspection => inspection.inspectionType === selectedTypeFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'completedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  };

  const getPaginatedInspections = () => {
    const filtered = getFilteredAndSortedInspections();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredAndSortedInspections();
    return Math.ceil(filtered.length / itemsPerPage);
  };


  // Action handlers
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleDeleteInspection = async () => {
    if (!selectedInspectionForAction) return;
    
    try {
      setDeleting(true);
      const success = await firestoreOperations.deleteEquipmentInspection(selectedInspectionForAction.id);
      
      if (success) {
        // Reload inspections
        const updatedInspections = await firestoreOperations.getEquipmentInspections(null, null, 100);
        setPreviousInspections(updatedInspections);
        
        showNotification('success', 'Inspection deleted successfully');
        setCurrentPage(1); // Reset to first page
      } else {
        showNotification('error', 'Failed to delete inspection');
      }
    } catch (error) {
      console.error('Error deleting inspection:', error);
      showNotification('error', 'Failed to delete inspection');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setSelectedInspectionForAction(null);
    }
  };

  const openDeleteModal = (inspection) => {
    setSelectedInspectionForAction(inspection);
    setShowDeleteModal(true);
  };

  const openViewModal = (inspection) => {
    setSelectedInspectionForAction(inspection);
    setShowViewModal(true);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTypeFilter]);

  if (!selectedInspection) {
    return (
      <Layout 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
      >
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
          {/* Notification */}
          {notification.show && (
            <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg ${
              notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {notification.message}
            </div>
          )}
          
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className={`rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Equipment Inspection Tool
                  </h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(inspectionTypes).map(([key, inspection]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedInspection(key)}
                      className={`border rounded-lg p-4 transition-all text-left ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:shadow-md' 
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="text-blue-600">{inspection.icon}</div>
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {inspection.title}
                        </h3>
                      </div>
                      {completedInspections[key] && (
                        <p className="text-sm text-green-600">
                          ✓ Completed {formatDatePST(new Date(completedInspections[key].timestamp), {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                      <div className={`mt-2 flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="text-sm">Start Inspection</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Professional Inspections Management */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Equipment Inspections Management
                    </h3>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {getFilteredAndSortedInspections().length} total inspections
                    </div>
                  </div>
                  
                  {/* Search and Filters */}
                  <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <input
                          type="text"
                          placeholder="Search inspections, units, or inspectors..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>
                    </div>
                    
                    {/* Type Filter */}
                    <div className="sm:w-48">
                      <select
                        value={selectedTypeFilter}
                        onChange={(e) => setSelectedTypeFilter(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="all">All Inspection Types</option>
                        {Object.entries(inspectionTypes).map(([key, type]) => (
                          <option key={key} value={key}>{type.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
                      Loading inspections...
                    </div>
                  ) : getFilteredAndSortedInspections().length === 0 ? (
                    <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clipboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No inspections found</p>
                      <p>Try adjusting your search or filter criteria</p>
                    </div>
                  ) : (
                    <>
                      {/* Professional Table */}
                      <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`overflow-x-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                              <tr>
                                <th 
                                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-75 ${
                                    darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'
                                  }`}
                                  onClick={() => handleSort('inspectionTitle')}
                                >
                                  <div className="flex items-center space-x-1">
                                    <span>Inspection</span>
                                    {sortField === 'inspectionTitle' && (
                                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Unit
                                </th>
                                <th 
                                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-75 ${
                                    darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'
                                  }`}
                                  onClick={() => handleSort('completedAt')}
                                >
                                  <div className="flex items-center space-x-1">
                                    <span>Completed</span>
                                    {sortField === 'completedAt' && (
                                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-75 ${
                                    darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'
                                  }`}
                                  onClick={() => handleSort('createdBy')}
                                >
                                  <div className="flex items-center space-x-1">
                                    <span>Inspector</span>
                                    {sortField === 'createdBy' && (
                                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Status
                                </th>
                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                              {getPaginatedInspections().map((inspection) => (
                                <tr key={inspection.id} className={`hover:bg-opacity-50 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="text-blue-600 mr-3">
                                        {inspectionTypes[inspection.inspectionType]?.icon || <Clipboard className="w-5 h-5" />}
                                      </div>
                                      <div>
                                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {inspection.inspectionTitle || 'Unknown Inspection'}
                                        </div>
                                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {inspection.inspectionType}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {inspection.metadata?.unit_number || 'Unknown Unit'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {inspection.completedAt ? formatDatePST(new Date(inspection.completedAt), {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit'
                                      }) : 'Unknown'}
                                    </div>
                                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {inspection.completedAt ? formatDatePST(new Date(inspection.completedAt), {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : ''}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {inspection.createdBy || 'Unknown'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Completed
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                      <button
                                        onClick={() => openViewModal(inspection)}
                                        className={`p-1 rounded hover:bg-opacity-75 ${
                                          darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                        }`}
                                        title="View inspection"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => exportInspectionToPDF(inspection)}
                                        className={`p-1 rounded hover:bg-opacity-75 ${
                                          darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                        }`}
                                        title="Export PDF"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => openDeleteModal(inspection)}
                                        className={`p-1 rounded hover:bg-opacity-75 ${
                                          darkMode ? 'text-gray-400 hover:bg-red-700 hover:text-red-200' : 'text-gray-500 hover:bg-red-100 hover:text-red-700'
                                        }`}
                                        title="Delete inspection"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination */}
                      {getTotalPages() > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredAndSortedInspections().length)} of {getFilteredAndSortedInspections().length} results
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                                currentPage === 1
                                  ? darkMode ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  : darkMode ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              Previous
                            </button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    page === currentPage
                                      ? 'bg-blue-600 text-white'
                                      : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                              disabled={currentPage === getTotalPages()}
                              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                                currentPage === getTotalPages()
                                  ? darkMode ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  : darkMode ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Delete Inspection
                    </h3>
                  </div>
                </div>
                
                <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <p className="mb-2">Are you sure you want to permanently delete this inspection?</p>
                  {selectedInspectionForAction && (
                    <div className={`mt-3 p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedInspectionForAction.inspectionTitle}
                      </p>
                      <p className="text-sm">
                        {selectedInspectionForAction.metadata?.unit_number || 'Unknown Unit'}
                      </p>
                      <p className="text-sm">
                        {selectedInspectionForAction.completedAt && formatDatePST(new Date(selectedInspectionForAction.completedAt), {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  <p className="mt-3 text-sm text-red-600">This action cannot be undone.</p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedInspectionForAction(null);
                    }}
                    disabled={deleting}
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                      deleting 
                        ? 'cursor-not-allowed opacity-50'
                        : darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteInspection}
                    disabled={deleting}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                      deleting
                        ? 'bg-red-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                  >
                    {deleting && <Clock className="w-4 h-4 animate-spin" />}
                    <span>{deleting ? 'Deleting...' : 'Delete Inspection'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Inspection Modal */}
        {showViewModal && selectedInspectionForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full max-h-[90vh] overflow-auto rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="sticky top-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-inherit">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600">
                      {inspectionTypes[selectedInspectionForAction.inspectionType]?.icon || <Clipboard className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedInspectionForAction.inspectionTitle}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {selectedInspectionForAction.metadata?.unit_number || 'Unknown Unit'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedInspectionForAction(null);
                    }}
                    className={`p-2 rounded-md hover:bg-opacity-75 ${
                      darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Inspection Details */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Inspection Details
                    </h4>
                    <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <p><span className="font-medium">Type:</span> {selectedInspectionForAction.inspectionTitle}</p>
                      <p><span className="font-medium">Unit:</span> {selectedInspectionForAction.metadata?.unit_number || 'N/A'}</p>
                      <p><span className="font-medium">Inspector:</span> {selectedInspectionForAction.createdBy}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Completion Info
                    </h4>
                    <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <p><span className="font-medium">Date:</span> {selectedInspectionForAction.completedAt ? formatDatePST(new Date(selectedInspectionForAction.completedAt), {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'Unknown'}</p>
                      <p><span className="font-medium">Time:</span> {selectedInspectionForAction.completedAt ? formatDatePST(new Date(selectedInspectionForAction.completedAt), {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : 'Unknown'}</p>
                      <p><span className="font-medium">Status:</span> <span className="text-green-600">Completed</span></p>
                      {selectedInspectionForAction.metadata?.mileage && (
                        <p><span className="font-medium">Mileage:</span> {selectedInspectionForAction.metadata.mileage}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inspection Responses */}
                {selectedInspectionForAction.responses && Object.keys(selectedInspectionForAction.responses).length > 0 && (
                  <div>
                    <h4 className={`text-sm font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Inspection Results
                    </h4>
                    <div className="space-y-6">
                      {Object.entries(selectedInspectionForAction.responses).map(([sectionName, questions]) => (
                        <div key={sectionName} className={`border rounded-lg p-4 ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                          <h5 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {sectionName}
                          </h5>
                          <div className="space-y-3">
                            {Object.entries(questions).map(([questionId, answer]) => {
                              // Find the question text
                              let questionText = questionId;
                              const inspectionType = inspectionTypes[selectedInspectionForAction.inspectionType];
                              if (inspectionType) {
                                const section = inspectionType.sections.find(s => s.name === sectionName);
                                if (section) {
                                  const question = section.questions.find(q => q.id === questionId);
                                  if (question) {
                                    questionText = question.text;
                                  }
                                }
                              }
                              
                              // Format answer
                              let answerDisplay = answer;
                              let answerClass = darkMode ? 'text-gray-300' : 'text-gray-600';
                              
                              if (answer === 'pass') {
                                answerDisplay = '✓ PASS';
                                answerClass = 'text-green-600';
                              } else if (answer === 'fail') {
                                answerDisplay = '✗ FAIL';
                                answerClass = 'text-red-600';
                              } else if (answer === 'present') {
                                answerDisplay = '✓ PRESENT';
                                answerClass = 'text-green-600';
                              } else if (answer === 'missing') {
                                answerDisplay = '✗ MISSING';
                                answerClass = 'text-red-600';
                              } else if (answer === 'full') {
                                answerDisplay = '✓ FULL';
                                answerClass = 'text-green-600';
                              } else if (answer === 'refill') {
                                answerDisplay = '✗ NEEDS REFILL';
                                answerClass = 'text-red-600';
                              } else if (answer === '3/4') {
                                answerDisplay = '3/4 FULL';
                                answerClass = 'text-yellow-600';
                              } else if (answer === '1/2') {
                                answerDisplay = '1/2 FULL';
                                answerClass = 'text-orange-600';
                              } else if (answer === 'na') {
                                answerDisplay = 'N/A';
                                answerClass = 'text-gray-500';
                              }
                              
                              return (
                                <div key={questionId} className="flex justify-between items-start">
                                  <div className={`text-sm flex-1 mr-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {questionText}
                                  </div>
                                  <div className={`text-sm font-medium ${answerClass}`}>
                                    {answerDisplay}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => exportInspectionToPDF(selectedInspectionForAction)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  const inspection = inspectionTypes[selectedInspection];
  const section = inspection.sections[currentSection];
  const progress = getProgress();

  return (
    <Layout 
      darkMode={darkMode} 
      setDarkMode={setDarkMode}
      selectedStation={selectedStation}
      setSelectedStation={setSelectedStation}
    >
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {notification.message}
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className={`rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {inspection.title}
                </h2>
                <button 
                  onClick={() => setSelectedInspection(null)}
                  className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-4 flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                    1
                  </div>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start
                  </span>
                </div>
                <div className={`flex-1 h-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Assessment
                  </span>
                </div>
                <div className={`flex-1 h-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-600'
                  }`}>
                    3
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Mitigation
                  </span>
                </div>
                <div className={`flex-1 h-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-600'
                  }`}>
                    4
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Publish
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {inspection.metadata && currentSection === 0 && (
                <div className="mb-6">
                  <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Assessment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date
                      </label>
                      <input
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Time
                      </label>
                      <input
                        type="time"
                        defaultValue={new Date().toTimeString().slice(0, 5)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    {inspection.metadata.map(meta => (
                      <div key={meta.id}>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {meta.label} {meta.required && <span className="text-red-500">*</span>}
                        </label>
                        {meta.type === 'dropdown' ? (
                          <select
                            value={inspectionMetadata[selectedInspection]?.[meta.id] || ''}
                            onChange={(e) => handleMetadataChange(meta.id, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            <option value="">Select {meta.label}</option>
                            {meta.options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={meta.type}
                            value={inspectionMetadata[selectedInspection]?.[meta.id] || ''}
                            onChange={(e) => handleMetadataChange(meta.id, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300'
                            }`}
                            placeholder={`Enter ${meta.label.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className={`flex space-x-1 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {inspection.sections.map((sec, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSection(idx)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        idx === currentSection 
                          ? `${darkMode ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600'} shadow-sm` 
                          : `${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
                      }`}
                    >
                      {sec.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {section.name}
                  </h3>
                  {section.passAllEnabled && (
                    <button
                      onClick={handlePassAll}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                      Pass All ✓
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {section.questions.map((question) => (
                    <div key={question.id} className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {question.text}
                      </h4>
                      {renderAnswerOptions(question)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                {currentSection > 0 ? (
                  <button
                    onClick={() => setCurrentSection(currentSection - 1)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Previous Section
                  </button>
                ) : (
                  <div></div>
                )}
                
                {currentSection < inspection.sections.length - 1 ? (
                  <button
                    onClick={() => setCurrentSection(currentSection + 1)}
                    disabled={!isSectionComplete() || (currentSection === 0 && !isMetadataComplete())}
                    className={`px-6 py-2 rounded-md transition-colors ${
                      isSectionComplete() && (currentSection !== 0 || isMetadataComplete())
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={completeInspection}
                    disabled={progress.answered < progress.total || !isMetadataComplete() || saving}
                    className={`px-6 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                      progress.answered === progress.total && isMetadataComplete() && !saving
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {saving && <Clock className="w-4 h-4 animate-spin" />}
                    <span>{saving ? 'Saving...' : 'Complete Inspection'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EquipmentInspection;