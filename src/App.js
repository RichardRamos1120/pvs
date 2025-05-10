// src/App.js
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, getDoc, query, where, orderBy, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import TodayLog from './components/TodayLog';
import Reports from './components/Reports';
import ReportDetail from './components/ReportDetail';
import Login from './components/Login';
import Signup from './components/Signup';
import './App.css';

// Initialize dark mode on app load
(() => {
  const savedMode = localStorage.getItem('darkMode');
  const isDarkMode = savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)

  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-mode');
  }
})();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDk6-WRfKSXei7T7YYJQpJ40mFEPno8rQ0",
  authDomain: "pvs-app-61e6b.firebaseapp.com",
  projectId: "pvs-app-61e6b",
  storageBucket: "pvs-app-61e6b.firebasestorage.app",
  messagingSenderId: "93001920295",
  appId: "1:93001920295:web:1b8363e21bec439e444302",
  measurementId: "G-VJ936SN1LP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return children;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// FirestoreContext for database operations
export const FirestoreContext = React.createContext();

const App = () => {
  // Firebase database operations
  const firestoreOperations = {
    // Get user profile (for station assignment, role, etc.)
    getUserProfile: async (userId) => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          return userSnap.data();
        } else {
          console.log("No user profile found");
          return null;
        }
      } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
      }
    },

    // Create or update user profile
    setUserProfile: async (userId, profileData) => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          await updateDoc(userRef, profileData);
        } else {
          // FIXED: Use setDoc instead of addDoc to use the userId as the document ID
          await setDoc(userRef, {
            userId,
            ...profileData,
            createdAt: serverTimestamp()
          });
        }
        return true;
      } catch (error) {
        console.error("Error setting user profile:", error);
        return false;
      }
    },

    // Get station data
    getStations: async () => {
      try {
        const stationsRef = collection(db, "stations");
        const stationsSnapshot = await getDocs(stationsRef);
        const stationsList = stationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return stationsList;
      } catch (error) {
        console.error("Error getting stations:", error);
        return [];
      }
    },

    // Get firefighters for a station
    getFirefighters: async (stationId) => {
      try {
        const firefightersRef = collection(db, "firefighters");
        const q = query(firefightersRef, where("stationId", "==", stationId));
        const snapshot = await getDocs(q);
        const firefightersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return firefightersList;
      } catch (error) {
        console.error("Error getting firefighters:", error);
        return [];
      }
    },

    // Get logs for a station
    getLogs: async (stationId, status = null) => {
      try {
        const logsRef = collection(db, "logs");
        let q;

        if (status) {
          q = query(logsRef,
            where("station", "==", stationId),
            where("status", "==", status),
            orderBy("rawDate", "desc")
          );
        } else {
          q = query(logsRef,
            where("station", "==", stationId),
            orderBy("rawDate", "desc")
          );
        }

        const snapshot = await getDocs(q);
        const logsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return logsList;
      } catch (error) {
        console.error("Error getting logs:", error);
        return [];
      }
    },

    // Get logs for a station by date range
    getLogsByDateAndStation: async (stationId, startDate, endDate) => {
      try {
        console.log(`Searching logs for ${stationId} between ${startDate} and ${endDate}`);
        const logsRef = collection(db, "logs");
        
        // Query for logs in the date range for the station
        const q = query(
          logsRef,
          where("station", "==", stationId),
          where("rawDate", ">=", startDate),
          where("rawDate", "<=", endDate),
          orderBy("rawDate", "desc")
        );
        
        const snapshot = await getDocs(q);
        const logsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${logsList.length} logs`);
        return logsList;
      } catch (error) {
        console.error("Error getting logs by date and station:", error);
        return [];
      }
    },

    // Get all logs (for admin)
    getAllLogs: async () => {
      try {
        const logsRef = collection(db, "logs");
        const q = query(logsRef, orderBy("rawDate", "desc"));
        const snapshot = await getDocs(q);
        const logsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return logsList;
      } catch (error) {
        console.error("Error getting all logs:", error);
        return [];
      }
    },

    // Get a specific log
    getLog: async (logId) => {
      try {
        const logRef = doc(db, "logs", logId);
        const logSnap = await getDoc(logRef);

        if (logSnap.exists()) {
          return {
            id: logSnap.id,
            ...logSnap.data()
          };
        } else {
          console.log("No log found");
          return null;
        }
      } catch (error) {
        console.error("Error getting log:", error);
        return null;
      }
    },

    // Create a new log
    createLog: async (logData) => {
      try {
        const newLog = {
          ...logData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "logs"), newLog);
        return {
          id: docRef.id,
          ...newLog
        };
      } catch (error) {
        console.error("Error creating log:", error);
        return null;
      }
    },

    // Update an existing log
    updateLog: async (logId, logData) => {
      try {
        const logRef = doc(db, "logs", logId);

        const updateData = {
          ...logData,
          updatedAt: serverTimestamp()
        };

        await updateDoc(logRef, updateData);
        return true;
      } catch (error) {
        console.error("Error updating log:", error);
        return false;
      }
    },

    // Delete a log
    deleteLog: async (logId) => {
      try {
        await deleteDoc(doc(db, "logs", logId));
        return true;
      } catch (error) {
        console.error("Error deleting log:", error);
        return false;
      }
    },

    // Get users by role
    getUsersByRole: async (role, stationFilter = null) => {
      try {
        const usersRef = collection(db, "users");
        let q;

        if (stationFilter) {
          // Filter by role and station
          q = query(usersRef,
            where("role", "==", role),
            where("station", "==", stationFilter)
          );
        } else {
          // Filter by role only
          q = query(usersRef, where("role", "==", role));
        }

        const snapshot = await getDocs(q);
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return usersList;
      } catch (error) {
        console.error("Error getting users by role:", error);
        return [];
      }
    }
  };

  return (
    <Router>
      <AuthProvider>
        <FirestoreContext.Provider value={firestoreOperations}>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/today" element={
                <ProtectedRoute>
                  <TodayLog />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/report/:id" element={
                <ProtectedRoute>
                  <ReportDetail />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </FirestoreContext.Provider>
      </AuthProvider>
    </Router>
  );
};

export default App;