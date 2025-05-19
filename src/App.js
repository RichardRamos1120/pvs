// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, getDoc, query, where, orderBy, serverTimestamp, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import TodayLog from './components/TodayLog';
import Reports from './components/Reports';
import ReportDetail from './components/ReportDetail';
import Login from './components/Login';
import Signup from './components/Signup';
import GARAssessment from './components/SimpleGARAssessment';
import AdminPortal from './components/AdminPortal';
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
    },
    
    // Get users by station name
    getUsersByStation: async (stationName) => {
      try {
        if (!stationName) return [];
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("station", "==", stationName));
        const snapshot = await getDocs(q);
        
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return usersList;
      } catch (error) {
        console.error("Error getting users by station:", error);
        return [];
      }
    },
    
    // Get users by station ID
    getUsersByStationId: async (stationId) => {
      try {
        if (!stationId) return [];
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("stationId", "==", stationId));
        const snapshot = await getDocs(q);
        
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return usersList;
      } catch (error) {
        console.error("Error getting users by stationId:", error);
        return [];
      }
    },

    // Get all users
    getAllUsers: async () => {
      try {
        console.log("Fetching all users from the 'users' collection");
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Found ${usersList.length} users`);
        return usersList;
      } catch (error) {
        console.error("Error getting all users:", error);
        return [];
      }
    },
    
    // Get all deleted users
    getDeletedUsers: async () => {
      try {
        console.log("Fetching users from the 'deletedUsers' collection");
        const deletedUsersRef = collection(db, "deletedUsers");
        // Order by deletedAt timestamp descending (newest first)
        const q = query(deletedUsersRef, orderBy("deletedAt", "desc"));
        const snapshot = await getDocs(q);
        
        const deletedUsersList = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Convert serverTimestamp to JS Date for display
          const deletedAt = data.deletedAt ? 
            new Date(data.deletedAt.seconds * 1000) : 
            new Date();
            
          return {
            id: doc.id,
            ...data,
            deletedAtFormatted: deletedAt.toLocaleString()
          };
        });
        
        console.log(`Found ${deletedUsersList.length} deleted users`);
        return deletedUsersList;
      } catch (error) {
        console.error("Error getting deleted users:", error);
        return [];
      }
    },
    
    // Soft delete a user (move to deletedUsers collection)
    softDeleteUser: async (userId) => {
      try {
        // 1. Get the user data
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          console.error(`User ${userId} not found`);
          return { success: false, message: "User not found" };
        }
        
        const userData = userSnap.data();
        
        // 2. Add to deletedUsers collection with timestamp
        const deletedUserData = {
          ...userData,
          originalId: userId,
          deletedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, "deletedUsers", userId), deletedUserData);
        console.log(`User ${userId} moved to deletedUsers collection`);
        
        // 3. Delete from users collection
        await deleteDoc(userRef);
        console.log(`User ${userId} removed from users collection`);
        
        return { 
          success: true, 
          message: "User has been moved to deletedUsers collection",
          requiresAuthDeletion: true,
          email: userData.email
        };
      } catch (error) {
        console.error("Error soft-deleting user:", error);
        return { success: false, message: error.message };
      }
    },
    
    // Hard delete a user from Firestore (for backward compatibility)
    deleteUser: async (userId) => {
      try {
        await deleteDoc(doc(db, "users", userId));
        console.log(`User ${userId} deleted successfully from Firestore`);
        return true;
      } catch (error) {
        console.error("Error deleting user from Firestore:", error);
        return false;
      }
    },
    
    // For reference only - can't be used in client SDK
    // Delete a user from Firebase Authentication
    deleteUserAuth: async (userEmail) => {
      try {
        console.log(`To delete this user from Firebase Authentication, 
          please go to the Firebase Console > Authentication > Users 
          and delete the user with email: ${userEmail}`);
          
        return {
          success: false,
          message: "Cannot delete users from Authentication via client SDK. Please use Firebase Console."
        };
      } catch (error) {
        console.error("Error with auth user deletion:", error);
        return {
          success: false,
          message: error.message
        };
      }
    },
    
    // Create or update a user
    saveUser: async (userData) => {
      try {
        // Generate ID if it's a new user
        let userId = userData.id;
        if (!userId) {
          userId = `user_${Date.now()}`;
        }
        
        const { id, ...dataWithoutId } = userData;
        const userRef = doc(db, "users", userId);
        
        // Add createdAt for new users, updatedAt for all
        const dataToSave = {
          ...dataWithoutId,
          updatedAt: serverTimestamp()
        };
        
        if (id) {
          // Update existing user
          await updateDoc(userRef, dataToSave);
        } else {
          // Create new user with generated ID
          dataToSave.createdAt = serverTimestamp();
          await setDoc(userRef, dataToSave);
        }
        
        // Return the complete user data with ID
        return {
          id: userId,
          ...dataWithoutId
        };
      } catch (error) {
        console.error("Error saving user:", error);
        return null;
      }
    },
    
    // Create or update a station
    saveStation: async (stationData) => {
      try {
        // Generate ID if it's a new station
        let stationId = stationData.id;
        if (!stationId) {
          stationId = `station_${Date.now()}`;
        }
        
        const { id, ...dataWithoutId } = stationData;
        const stationRef = doc(db, "stations", stationId);
        
        // Add createdAt for new stations, updatedAt for all
        const dataToSave = {
          ...dataWithoutId,
          updatedAt: serverTimestamp()
        };
        
        if (id) {
          // Update existing station
          await updateDoc(stationRef, dataToSave);
        } else {
          // Create new station with generated ID
          dataToSave.createdAt = serverTimestamp();
          await setDoc(stationRef, dataToSave);
        }
        
        // Return the complete station data with ID
        return {
          id: stationId,
          ...dataWithoutId
        };
      } catch (error) {
        console.error("Error saving station:", error);
        return null;
      }
    },
    
    // Delete a station and handle affected data
    deleteStation: async (stationId) => {
      try {
        // 1. Get the station to be deleted
        const stationRef = doc(db, "stations", stationId);
        const stationSnap = await getDoc(stationRef);
        
        if (!stationSnap.exists()) {
          console.error(`Station ${stationId} not found`);
          return { 
            success: false, 
            message: "Station not found" 
          };
        }
        
        const stationData = stationSnap.data();
        const stationNumber = stationData.number || stationId.replace('s', '');
        const stationName = `Station ${stationNumber}`;
        
        // Start a batch for atomic updates
        const batch = writeBatch(db);
        const affectedItems = { users: 0, logs: 0, assessments: 0 };
        
        // 2. Get all users assigned to this station and update them
        const usersRef = collection(db, "users");
        const usersQuery = query(usersRef, where("stationId", "==", stationId));
        const userSnap = await getDocs(usersQuery);
        
        userSnap.forEach(userDoc => {
          // Update each user to remove station assignment
          batch.update(userDoc.ref, { 
            stationId: "",
            station: "",
            updatedAt: serverTimestamp()
          });
          affectedItems.users++;
        });
        
        // 3. Also check for users that might be using station name instead of ID
        const usersStationNameQuery = query(usersRef, where("station", "==", stationName));
        const userNameSnap = await getDocs(usersStationNameQuery);
        
        userNameSnap.forEach(userDoc => {
          if (!userSnap.docs.some(d => d.id === userDoc.id)) { // Avoid duplicates
            batch.update(userDoc.ref, { 
              stationId: "",
              station: "",
              updatedAt: serverTimestamp()
            });
            affectedItems.users++;
          }
        });
        
        // 4. Mark logs for this station as "archived"
        const logsRef = collection(db, "logs");
        const logsQuery = query(logsRef, where("station", "==", stationName));
        const logsSnap = await getDocs(logsQuery);
        
        logsSnap.forEach(logDoc => {
          batch.update(logDoc.ref, { 
            stationDeleted: true,
            originalStation: stationName,
            updatedAt: serverTimestamp()
          });
          affectedItems.logs++;
        });
        
        // 5. Mark assessments for this station as "archived"
        const assessmentsRef = collection(db, "assessments");
        const assessmentsQuery = query(assessmentsRef, where("station", "==", stationName));
        const assessmentsSnap = await getDocs(assessmentsQuery);
        
        assessmentsSnap.forEach(assessmentDoc => {
          batch.update(assessmentDoc.ref, { 
            stationDeleted: true,
            originalStation: stationName,
            updatedAt: serverTimestamp()
          });
          affectedItems.assessments++;
        });
        
        // 6. Delete the station document
        batch.delete(stationRef);
        
        // 7. Commit all changes in one atomic operation
        await batch.commit();
        
        console.log(`Station ${stationId} deleted successfully with cleanup:`, affectedItems);
        return { 
          success: true, 
          message: "Station deleted successfully", 
          affected: affectedItems 
        };
      } catch (error) {
        console.error("Error deleting station:", error);
        return { 
          success: false, 
          message: error.message 
        };
      }
    },

    // GAR Assessment operations
    // Create a new GAR assessment
    createAssessment: async (assessmentData) => {
      try {
        const newAssessment = {
          ...assessmentData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "assessments"), newAssessment);
        return {
          id: docRef.id,
          ...newAssessment
        };
      } catch (error) {
        console.error("Error creating assessment:", error);
        return null;
      }
    },

    // Get a specific assessment
    getAssessment: async (assessmentId) => {
      try {
        console.log(`[FIREBASE DEBUG] Getting assessment with ID: ${assessmentId}`);

        if (!assessmentId) {
          console.error("[FIREBASE DEBUG] Invalid assessment ID provided");
          return null;
        }

        // Try to get all assessments first to debug
        console.log("[FIREBASE DEBUG] Fetching all assessments to check if ID exists");
        try {
          const assessmentsRef = collection(db, "assessments");
          const snapshot = await getDocs(assessmentsRef);
          const allIds = snapshot.docs.map(doc => doc.id);
          console.log("[FIREBASE DEBUG] All assessment IDs:", allIds);
          console.log("[FIREBASE DEBUG] Checking if ID exists:", allIds.includes(assessmentId));

          // If ID doesn't exist in collection, try to find an assessment with this ID as a field
          if (!allIds.includes(assessmentId)) {
            console.log("[FIREBASE DEBUG] ID not found in document IDs, checking if exists as field");
            const q = query(assessmentsRef);
            const allDocs = await getDocs(q);
            const matchingDocs = [];

            allDocs.forEach(doc => {
              const data = doc.data();
              if (data.id === assessmentId) {
                console.log("[FIREBASE DEBUG] Found document with matching field ID:", doc.id);
                matchingDocs.push({...data, id: doc.id});
              }
            });

            if (matchingDocs.length > 0) {
              console.log("[FIREBASE DEBUG] Returning first matching document");
              return matchingDocs[0];
            }
          }
        } catch (e) {
          console.error("[FIREBASE DEBUG] Error fetching all assessments:", e);
        }

        const assessmentRef = doc(db, "assessments", assessmentId);
        console.log("[FIREBASE DEBUG] Created doc reference:", assessmentRef.path);

        const assessmentSnap = await getDoc(assessmentRef);
        console.log("[FIREBASE DEBUG] Document exists?", assessmentSnap.exists());

        if (assessmentSnap.exists()) {
          const data = assessmentSnap.data();
          console.log("[FIREBASE DEBUG] Assessment data retrieved successfully", data);

          // Ensure we always have an ID in the assessment object
          const assessment = {
            id: assessmentSnap.id,
            ...data
          };

          console.log("[FIREBASE DEBUG] Returning assessment with ID:", assessment.id);
          return assessment;
        } else {
          console.log(`[FIREBASE DEBUG] No assessment found with ID ${assessmentId}`);
          return null;
        }
      } catch (error) {
        console.error(`[FIREBASE DEBUG] Error getting assessment ${assessmentId}:`, error);
        return null;
      }
    },

    // Get all assessments
    getAllAssessments: async () => {
      try {
        const assessmentsRef = collection(db, "assessments");
        const q = query(assessmentsRef, orderBy("rawDate", "desc"));
        const snapshot = await getDocs(q);
        const assessmentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return assessmentsList;
      } catch (error) {
        console.error("Error getting all assessments:", error);
        return [];
      }
    },

    // Get assessments for a station
    getAssessmentsByStation: async (stationId, status = null) => {
      try {
        console.log(`Fetching assessments for station: ${stationId}, status: ${status || 'any'}`);
        const assessmentsRef = collection(db, "assessments");
        let q;

        if (status) {
          q = query(assessmentsRef,
            where("station", "==", stationId),
            where("status", "==", status),
            orderBy("rawDate", "desc")
          );
        } else {
          q = query(assessmentsRef,
            where("station", "==", stationId),
            orderBy("rawDate", "desc")
          );
        }

        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.docs.length} assessments`);

        const assessmentsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          };
        });

        // Verify all assessments have IDs
        const missingIds = assessmentsList.filter(a => !a.id).length;
        if (missingIds > 0) {
          console.error(`Warning: ${missingIds} assessments are missing IDs`);
        }

        return assessmentsList;
      } catch (error) {
        console.error("Error getting assessments:", error);
        return [];
      }
    },

    // Update an existing assessment
    updateAssessment: async (assessmentId, assessmentData) => {
      try {
        const assessmentRef = doc(db, "assessments", assessmentId);

        const updateData = {
          ...assessmentData,
          updatedAt: serverTimestamp()
        };

        await updateDoc(assessmentRef, updateData);
        return true;
      } catch (error) {
        console.error("Error updating assessment:", error);
        return false;
      }
    },

    // Delete an assessment
    deleteAssessment: async (assessmentId) => {
      try {
        await deleteDoc(doc(db, "assessments", assessmentId));
        return true;
      } catch (error) {
        console.error("Error deleting assessment:", error);
        return false;
      }
    }
  };

  // Initialize dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : true; // Default to true (dark mode)
  });
  
  // Initialize selectedStation from localStorage with default to Station 1
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('selectedStation') || 'Station 1';
  });

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
              <Route path="/gar-assessment" element={
                <ProtectedRoute>
                  <GARAssessment />
                </ProtectedRoute>
              } />
              <Route path="/gar-assessment/:id" element={
                <ProtectedRoute>
                  <GARAssessment />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPortal 
                    darkMode={darkMode} 
                    setDarkMode={setDarkMode}
                    selectedStation={selectedStation}
                    setSelectedStation={setSelectedStation}
                  />
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