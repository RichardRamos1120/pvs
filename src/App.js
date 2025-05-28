// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, getDoc, query, where, orderBy, serverTimestamp, deleteDoc, setDoc, writeBatch, limit, startAfter, getCountFromServer } from 'firebase/firestore';
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
          console.log("No user profile found with UID, trying email lookup");
          // Fallback: try to find user by email
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser?.email) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", currentUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              console.log("Found user profile by email");
              return querySnapshot.docs[0].data();
            }
          }
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

    // Get paginated logs
    getPaginatedLogs: async (page = 1, logsPerPage = 10, stationFilter = null, statusFilter = null) => {
      try {
        const logsRef = collection(db, "logs");
        let baseQuery = logsRef;

        // Build query conditions
        const conditions = [orderBy("rawDate", "desc")];
        
        if (stationFilter && stationFilter !== 'all') {
          conditions.unshift(where("station", "==", stationFilter));
        }
        
        if (statusFilter && statusFilter !== 'all') {
          conditions.unshift(where("status", "==", statusFilter));
        }

        // Get total count for pagination
        const countQuery = query(baseQuery, ...conditions.filter(c => c.type !== 'orderBy'));
        const countSnapshot = await getCountFromServer(countQuery);
        const totalLogs = countSnapshot.data().count;

        // Get paginated data
        const offset = (page - 1) * logsPerPage;
        const paginatedQuery = query(baseQuery, ...conditions, limit(logsPerPage));

        // If not first page, we need to use startAfter
        let finalQuery = paginatedQuery;
        if (offset > 0) {
          // Get the last document of the previous page to use as startAfter
          const prevPageQuery = query(baseQuery, ...conditions, limit(offset));
          const prevPageSnapshot = await getDocs(prevPageQuery);
          const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
          
          if (lastDoc) {
            finalQuery = query(baseQuery, ...conditions, startAfter(lastDoc), limit(logsPerPage));
          }
        }

        const snapshot = await getDocs(finalQuery);
        const logsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return {
          logs: logsList,
          totalLogs,
          totalPages: Math.ceil(totalLogs / logsPerPage),
          currentPage: page,
          hasNextPage: offset + logsPerPage < totalLogs,
          hasPrevPage: page > 1
        };
      } catch (error) {
        console.error("Error getting paginated logs:", error);
        return {
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
    },

    // Get paginated users  
    getPaginatedUsers: async (page = 1, usersPerPage = 20, roleFilter = null, stationFilter = null, statusFilter = null, rankFilter = null) => {
      try {
        console.log('API getPaginatedUsers called with:', { page, usersPerPage, roleFilter, stationFilter, statusFilter, rankFilter });
        
        const usersRef = collection(db, "users");
        
        // Try server-side filtering first, fall back to client-side if indexes are missing
        try {
          // Build query conditions
          const conditions = [orderBy("createdAt", "desc")];
          
          if (roleFilter && roleFilter !== 'all') {
            console.log('Adding role filter:', roleFilter);
            conditions.unshift(where("role", "==", roleFilter));
          }
          
          if (stationFilter && stationFilter !== 'all') {
            console.log('Adding station filter:', stationFilter);
            conditions.unshift(where("station", "==", stationFilter));
          }
          
          if (statusFilter && statusFilter !== 'all') {
            console.log('Adding status filter:', statusFilter);
            conditions.unshift(where("status", "==", statusFilter));
          }
          
          if (rankFilter && rankFilter !== 'all') {
            console.log('Adding rank filter:', rankFilter);
            conditions.unshift(where("rank", "==", rankFilter));
          }

          console.log('Trying server-side filtering with', conditions.length, 'conditions');

          // Get total count
          const countQuery = query(usersRef, ...conditions.filter(c => c.type !== 'orderBy'));
          const countSnapshot = await getCountFromServer(countQuery);
          const totalUsers = countSnapshot.data().count;

          // Get paginated data
          const offset = (page - 1) * usersPerPage;
          const paginatedQuery = query(usersRef, ...conditions, limit(usersPerPage));

          let finalQuery = paginatedQuery;
          if (offset > 0) {
            const prevPageQuery = query(usersRef, ...conditions, limit(offset));
            const prevPageSnapshot = await getDocs(prevPageQuery);
            const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
            
            if (lastDoc) {
              finalQuery = query(usersRef, ...conditions, startAfter(lastDoc), limit(usersPerPage));
            }
          }

          const snapshot = await getDocs(finalQuery);
          const usersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          console.log('Server-side filtering successful:', usersList.length, 'users returned');

          return {
            users: usersList,
            totalUsers,
            totalPages: Math.ceil(totalUsers / usersPerPage),
            currentPage: page,
            hasNextPage: offset + usersPerPage < totalUsers,
            hasPrevPage: page > 1
          };

        } catch (serverError) {
          console.warn('Server-side filtering failed, falling back to client-side:', serverError.message);
          
          // Fall back to client-side filtering
          console.log('Falling back to client-side filtering...');
          const allUsersSnapshot = await getDocs(query(usersRef, orderBy("createdAt", "desc")));
          let allUsers = allUsersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Apply client-side filters
          const filteredUsers = allUsers.filter(user => {
            // Ensure all required fields exist with defaults
            const userRole = user.role || 'firefighter';
            const userStatus = user.status || 'active';
            const userRank = user.rank || 'Firefighter';
            
            const matchesRole = !roleFilter || roleFilter === 'all' || userRole === roleFilter;
            const matchesStatus = !statusFilter || statusFilter === 'all' || userStatus === statusFilter;
            const matchesRank = !rankFilter || rankFilter === 'all' || userRank === rankFilter;
            const matchesStation = !stationFilter || stationFilter === 'all' || user.stationId === stationFilter || user.station === stationFilter;
            
            return matchesRole && matchesStatus && matchesRank && matchesStation;
          });

          console.log('Client-side filtering complete:', filteredUsers.length, 'users match filters');

          // Apply pagination client-side
          const totalUsers = filteredUsers.length;
          const offset = (page - 1) * usersPerPage;
          const paginatedUsers = filteredUsers.slice(offset, offset + usersPerPage);

          return {
            users: paginatedUsers,
            totalUsers,
            totalPages: Math.ceil(totalUsers / usersPerPage),
            currentPage: page,
            hasNextPage: offset + usersPerPage < totalUsers,
            hasPrevPage: page > 1,
            clientSideFiltered: true // Flag to indicate fallback was used
          };
        }
      } catch (error) {
        console.error("Error getting paginated users:", error);
        return {
          users: [],
          totalUsers: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
    },

    getPaginatedStations: async (page = 1, stationsPerPage = 5) => {
      try {
        const stationsRef = collection(db, "stations");
        
        // Build query conditions
        const conditions = [orderBy("number", "asc")];

        // Get total count
        const countQuery = query(stationsRef);
        const countSnapshot = await getCountFromServer(countQuery);
        const totalStations = countSnapshot.data().count;

        // Get paginated data
        const offset = (page - 1) * stationsPerPage;
        const paginatedQuery = query(stationsRef, ...conditions, limit(stationsPerPage));

        let finalQuery = paginatedQuery;
        if (offset > 0) {
          const prevPageQuery = query(stationsRef, ...conditions, limit(offset));
          const prevPageSnapshot = await getDocs(prevPageQuery);
          const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
          
          if (lastDoc) {
            finalQuery = query(stationsRef, ...conditions, startAfter(lastDoc), limit(stationsPerPage));
          }
        }

        const snapshot = await getDocs(finalQuery);
        const stationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return {
          stations: stationsList,
          totalStations,
          totalPages: Math.ceil(totalStations / stationsPerPage),
          currentPage: page,
          hasNextPage: offset + stationsPerPage < totalStations,
          hasPrevPage: page > 1
        };
      } catch (error) {
        console.error("Error getting paginated stations:", error);
        return {
          stations: [],
          totalStations: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
    },

    getPaginatedAssessments: async (page = 1, assessmentsPerPage = 5, stationFilter = null) => {
      try {
        const assessmentsRef = collection(db, "assessments");
        
        // Build query conditions
        const conditions = [orderBy("rawDate", "desc")];
        
        if (stationFilter && stationFilter !== 'all') {
          conditions.unshift(where("station", "==", stationFilter));
        }

        // Get total count
        const countQuery = query(assessmentsRef, ...conditions.filter(c => c.type !== 'orderBy'));
        const countSnapshot = await getCountFromServer(countQuery);
        const totalAssessments = countSnapshot.data().count;

        // Get paginated data
        const offset = (page - 1) * assessmentsPerPage;
        const paginatedQuery = query(assessmentsRef, ...conditions, limit(assessmentsPerPage));

        let finalQuery = paginatedQuery;
        if (offset > 0) {
          const prevPageQuery = query(assessmentsRef, ...conditions, limit(offset));
          const prevPageSnapshot = await getDocs(prevPageQuery);
          const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
          
          if (lastDoc) {
            finalQuery = query(assessmentsRef, ...conditions, startAfter(lastDoc), limit(assessmentsPerPage));
          }
        }

        const snapshot = await getDocs(finalQuery);
        const assessmentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return {
          assessments: assessmentsList,
          totalAssessments,
          totalPages: Math.ceil(totalAssessments / assessmentsPerPage),
          currentPage: page,
          hasNextPage: offset + assessmentsPerPage < totalAssessments,
          hasPrevPage: page > 1
        };
      } catch (error) {
        console.error("Error getting paginated assessments:", error);
        return {
          assessments: [],
          totalAssessments: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        };
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
        
        // Track log creation activity
        const userId = auth.currentUser?.uid;
        if (userId) {
          await firestoreOperations.trackUserActivity(userId, 'log_created', {
            logId: docRef.id,
            station: logData.station,
            status: logData.status
          });
        }
        
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

    // Fix users missing required fields for filtering
    fixUserFieldsForFiltering: async () => {
      try {
        console.log("Checking and fixing user fields for filtering...");
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        
        let fixedCount = 0;
        const batch = [];
        
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data();
          const userId = userDoc.id;
          
          let needsUpdate = false;
          const updates = {};
          
          // Ensure role field exists
          if (!userData.role) {
            updates.role = 'firefighter';
            needsUpdate = true;
            console.log(`Adding missing role for user ${userId}`);
          }
          
          // Ensure status field exists
          if (!userData.status) {
            updates.status = 'active';
            needsUpdate = true;
            console.log(`Adding missing status for user ${userId}`);
          }
          
          // Ensure rank field exists
          if (!userData.rank) {
            updates.rank = 'Firefighter';
            needsUpdate = true;
            console.log(`Adding missing rank for user ${userId}`);
          }
          
          // Ensure createdAt field exists
          if (!userData.createdAt) {
            updates.createdAt = serverTimestamp();
            needsUpdate = true;
            console.log(`Adding missing createdAt for user ${userId}`);
          }
          
          if (needsUpdate) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, updates);
            fixedCount++;
          }
        }
        
        console.log(`Fixed ${fixedCount} users with missing fields`);
        return { success: true, fixedCount };
      } catch (error) {
        console.error("Error fixing user fields:", error);
        return { success: false, error: error.message };
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
        
        // Track GAR assessment creation activity
        const userId = auth.currentUser?.uid;
        if (userId) {
          await firestoreOperations.trackUserActivity(userId, 'gar_created', {
            assessmentId: docRef.id,
            station: assessmentData.station,
            overallRisk: assessmentData.overallRisk,
            status: assessmentData.status
          });
        }
        
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
    },

    // Get recent activity for admin dashboard
    getRecentActivity: async (maxItems = 10) => {
      try {
        const activities = [];
        
        // Get recent logs
        console.log("Querying logs collection...");
        const logsRef = collection(db, "logs");
        
        // First check if any logs exist at all
        const allLogsSnapshot = await getDocs(logsRef);
        console.log(`Total logs in database: ${allLogsSnapshot.docs.length}`);
        
        if (allLogsSnapshot.docs.length > 0) {
          // Show sample log data
          const sampleLog = allLogsSnapshot.docs[0].data();
          console.log("Sample log data:", sampleLog);
          
          // Try ordered query
          try {
            const recentLogsQuery = query(logsRef, orderBy("createdAt", "desc"), limit(3));
            const logsSnapshot = await getDocs(recentLogsQuery);
            
            console.log(`Found ${logsSnapshot.docs.length} recent logs with createdAt ordering`);
            logsSnapshot.forEach(doc => {
              const data = doc.data();
              console.log(`Log ${doc.id}:`, data);
              activities.push({
                id: doc.id,
                type: 'log',
                message: `Daily log completed for ${data.station || 'Unknown Station'}`,
                timestamp: data.createdAt,
                station: data.station
              });
            });
          } catch (orderError) {
            console.warn("Failed to order logs by createdAt:", orderError);
            // Fallback: just get the first few logs
            allLogsSnapshot.docs.slice(0, 3).forEach(doc => {
              const data = doc.data();
              activities.push({
                id: doc.id,
                type: 'log',
                message: `Daily log completed for ${data.station || 'Unknown Station'}`,
                timestamp: data.createdAt || data.date || new Date(),
                station: data.station
              });
            });
          }
        } else {
          console.log("No logs found in database");
        }

        // Get recent assessments
        console.log("Querying assessments collection...");
        const assessmentsRef = collection(db, "assessments");
        
        // Check if any assessments exist
        const allAssessmentsSnapshot = await getDocs(assessmentsRef);
        console.log(`Total assessments in database: ${allAssessmentsSnapshot.docs.length}`);
        
        if (allAssessmentsSnapshot.docs.length > 0) {
          // Show sample assessment data
          const sampleAssessment = allAssessmentsSnapshot.docs[0].data();
          console.log("Sample assessment data:", sampleAssessment);
          
          try {
            const recentAssessmentsQuery = query(assessmentsRef, orderBy("createdAt", "desc"), limit(3));
            const assessmentsSnapshot = await getDocs(recentAssessmentsQuery);
            
            console.log(`Found ${assessmentsSnapshot.docs.length} recent assessments with createdAt ordering`);
            assessmentsSnapshot.forEach(doc => {
              const data = doc.data();
              const riskColor = data.overallRisk?.toLowerCase() || 'unknown';
              activities.push({
                id: doc.id,
                type: 'assessment',
                message: `GAR Assessment (${riskColor.toUpperCase()}) published for ${data.station || 'Unknown Station'}`,
                timestamp: data.createdAt,
                station: data.station,
                risk: riskColor
              });
            });
          } catch (orderError) {
            console.warn("Failed to order assessments by createdAt:", orderError);
            // Fallback: just get the first few assessments
            allAssessmentsSnapshot.docs.slice(0, 3).forEach(doc => {
              const data = doc.data();
              const riskColor = data.overallRisk?.toLowerCase() || 'unknown';
              activities.push({
                id: doc.id,
                type: 'assessment',
                message: `GAR Assessment (${riskColor.toUpperCase()}) published for ${data.station || 'Unknown Station'}`,
                timestamp: data.createdAt || data.date || new Date(),
                station: data.station,
                risk: riskColor
              });
            });
          }
        } else {
          console.log("No assessments found in database");
        }

        // Get recent user logins (users with recent lastLogin timestamps)
        const usersRef = collection(db, "users");
        
        // Try to get users ordered by lastLogin - but handle cases where field might not exist
        try {
          const recentUsersQuery = query(usersRef, orderBy("lastLogin", "desc"), limit(10));
          const usersSnapshot = await getDocs(recentUsersQuery);
          
          console.log(`Found ${usersSnapshot.docs.length} users with login data via orderBy`);
          usersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`User ${doc.id} lastLogin:`, data.lastLogin);
            if (data.lastLogin) {
              // Only include logins from the last 7 days to keep it relevant
              const loginDate = data.lastLogin.seconds ? new Date(data.lastLogin.seconds * 1000) : new Date(data.lastLogin);
              const daysSinceLogin = (new Date() - loginDate) / (1000 * 60 * 60 * 24);
              
              console.log(`User ${data.firstName || data.displayName} login was ${daysSinceLogin.toFixed(1)} days ago`);
              
              if (daysSinceLogin <= 7) {
                activities.push({
                  id: doc.id,
                  type: 'user_login',
                  message: `User ${data.firstName || data.displayName || 'Unknown'} ${data.lastName || ''} logged in`,
                  timestamp: data.lastLogin,
                  userId: doc.id
                });
              }
            }
          });
        } catch (queryError) {
          console.warn("OrderBy lastLogin failed, trying alternative approach:", queryError);
          
          // Fallback: get all users and filter client-side
          const allUsersSnapshot = await getDocs(usersRef);
          const usersWithLogin = [];
          
          allUsersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.lastLogin) {
              const loginDate = data.lastLogin.seconds ? new Date(data.lastLogin.seconds * 1000) : new Date(data.lastLogin);
              const daysSinceLogin = (new Date() - loginDate) / (1000 * 60 * 60 * 24);
              
              if (daysSinceLogin <= 7) {
                usersWithLogin.push({
                  ...data,
                  id: doc.id,
                  loginDate: loginDate
                });
              }
            }
          });
          
          // Sort by login date and take the most recent
          usersWithLogin.sort((a, b) => b.loginDate - a.loginDate);
          usersWithLogin.slice(0, 5).forEach(user => {
            activities.push({
              id: user.id,
              type: 'user_login',
              message: `User ${user.firstName || user.displayName || 'Unknown'} ${user.lastName || ''} logged in`,
              timestamp: user.lastLogin,
              userId: user.id
            });
          });
          
          console.log(`Found ${usersWithLogin.length} users with recent logins via fallback method`);
        }

        // Sort all activities by timestamp (newest first)
        activities.sort((a, b) => {
          let aTime, bTime;
          
          // Handle different timestamp formats
          if (a.timestamp?.seconds) {
            aTime = a.timestamp.seconds;
          } else if (a.timestamp instanceof Date) {
            aTime = a.timestamp.getTime() / 1000;
          } else if (typeof a.timestamp === 'string') {
            aTime = new Date(a.timestamp).getTime() / 1000;
          } else {
            aTime = 0;
          }
          
          if (b.timestamp?.seconds) {
            bTime = b.timestamp.seconds;
          } else if (b.timestamp instanceof Date) {
            bTime = b.timestamp.getTime() / 1000;
          } else if (typeof b.timestamp === 'string') {
            bTime = new Date(b.timestamp).getTime() / 1000;
          } else {
            bTime = 0;
          }
          
          return bTime - aTime;
        });

        console.log(`Returning ${activities.length} total activities`);
        return activities.slice(0, maxItems);
      } catch (error) {
        console.error("Error getting recent activity:", error);
        return [];
      }
    },

    // Export recent activity
    exportRecentActivity: async function(maxItems = 50) {
      try {
        const activities = await this.getRecentActivity(maxItems);
        return {
          success: true,
          data: activities,
          filename: `recent_activity_export_${new Date().toISOString().split('T')[0]}.csv`
        };
      } catch (error) {
        console.error("Error exporting recent activity:", error);
        return { success: false, message: error.message };
      }
    },

    // Export data functions
    exportUsers: async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return {
          success: true,
          data: users,
          filename: `users_export_${new Date().toISOString().split('T')[0]}.csv`
        };
      } catch (error) {
        console.error("Error exporting users:", error);
        return { success: false, message: error.message };
      }
    },

    exportStations: async () => {
      try {
        const stationsRef = collection(db, "stations");
        const snapshot = await getDocs(stationsRef);
        const stations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return {
          success: true,
          data: stations,
          filename: `stations_export_${new Date().toISOString().split('T')[0]}.csv`
        };
      } catch (error) {
        console.error("Error exporting stations:", error);
        return { success: false, message: error.message };
      }
    },

    exportGARHistory: async () => {
      try {
        const assessmentsRef = collection(db, "assessments");
        const q = query(assessmentsRef, orderBy("rawDate", "desc"));
        const snapshot = await getDocs(q);
        const assessments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return {
          success: true,
          data: assessments,
          filename: `gar_history_export_${new Date().toISOString().split('T')[0]}.csv`
        };
      } catch (error) {
        console.error("Error exporting GAR history:", error);
        return { success: false, message: error.message };
      }
    },

    exportDailyLogs: async () => {
      try {
        const logsRef = collection(db, "logs");
        const q = query(logsRef, orderBy("rawDate", "desc"));
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return {
          success: true,
          data: logs,
          filename: `daily_logs_export_${new Date().toISOString().split('T')[0]}.csv`
        };
      } catch (error) {
        console.error("Error exporting daily logs:", error);
        return { success: false, message: error.message };
      }
    },

    // Restore deleted user
    restoreUser: async (userId) => {
      try {
        // Get user data from deletedUsers collection
        const deletedUserRef = doc(db, "deletedUsers", userId);
        const deletedUserSnap = await getDoc(deletedUserRef);
        
        if (!deletedUserSnap.exists()) {
          return { success: false, message: "Deleted user not found" };
        }
        
        const userData = deletedUserSnap.data();
        const { deletedAt, originalId, ...restoredUserData } = userData;
        
        // Add back to users collection
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, {
          ...restoredUserData,
          restoredAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Remove from deletedUsers collection
        await deleteDoc(deletedUserRef);
        
        return { 
          success: true, 
          message: "User restored successfully",
          userData: { id: userId, ...restoredUserData }
        };
      } catch (error) {
        console.error("Error restoring user:", error);
        return { success: false, message: error.message };
      }
    },

    // User Activity Tracking Functions
    // Track user login activity
    trackUserLogin: async (userId, userEmail, displayName) => {
      try {
        const loginData = {
          userId,
          email: userEmail,
          displayName,
          loginTime: serverTimestamp(),
          action: 'login',
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Add to user_activity collection
        await addDoc(collection(db, "user_activity"), loginData);

        // Update user's lastLogin timestamp
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          loginCount: serverTimestamp() // We'll increment this in a moment
        });

        console.log(`Login tracked for user ${displayName}`);
        return true;
      } catch (error) {
        console.error("Error tracking user login:", error);
        return false;
      }
    },

    // Track general user activity
    trackUserActivity: async (userId, action, details = {}) => {
      try {
        const activityData = {
          userId,
          action,
          timestamp: serverTimestamp(),
          details: {
            ...details,
            userAgent: navigator.userAgent,
            page: window.location.pathname
          },
          sessionId: localStorage.getItem('currentSessionId') || 'unknown'
        };

        await addDoc(collection(db, "user_activity"), activityData);
        return true;
      } catch (error) {
        console.error("Error tracking user activity:", error);
        return false;
      }
    },

    // Get user engagement analytics
    getUserEngagementAnalytics: async (timeframe = 30) => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframe);

        // Get user activity for the timeframe
        let activities = [];
        try {
          const activityRef = collection(db, "user_activity");
          
          // Try the optimized query first
          try {
            const q = query(
              activityRef,
              where("timestamp", ">=", startDate),
              orderBy("timestamp", "desc")
            );
            const snapshot = await getDocs(q);
            activities = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          } catch (indexError) {
            console.log("Composite index not available, falling back to simple query");
            // Fallback: get all activities and filter client-side
            const allSnapshot = await getDocs(activityRef);
            activities = allSnapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter(activity => {
                const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
                return activityDate >= startDate;
              })
              .sort((a, b) => {
                const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
                const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
                return bTime - aTime;
              });
          }
        } catch (collectionError) {
          console.log("User activity collection doesn't exist yet, returning empty analytics");
          activities = [];
        }

        // Get all users for analysis
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Analyze the data
        const analytics = {
          totalUsers: users.length,
          activeUsers: new Set(activities.map(a => a.userId)).size,
          totalActivities: activities.length,
          loginCount: activities.filter(a => a.action === 'login').length,
          logCreations: activities.filter(a => a.action === 'log_created').length,
          garAssessments: activities.filter(a => a.action === 'gar_created').length,
          dashboardViews: activities.filter(a => a.action === 'dashboard_view').length,
          reportsViews: activities.filter(a => a.action === 'reports_view').length,
          
          // User engagement by action type
          actionBreakdown: {},
          
          // Most active users
          userActivity: {},
          
          // Activity by station
          stationActivity: {},
          
          // Daily activity trend
          dailyActivity: {}
        };

        // Calculate action breakdown
        activities.forEach(activity => {
          analytics.actionBreakdown[activity.action] = 
            (analytics.actionBreakdown[activity.action] || 0) + 1;
        });

        // Calculate user activity
        activities.forEach(activity => {
          if (!analytics.userActivity[activity.userId]) {
            const user = users.find(u => u.id === activity.userId);
            analytics.userActivity[activity.userId] = {
              userId: activity.userId,
              userName: user?.displayName || user?.firstName || 'Unknown User',
              email: user?.email || '',
              station: user?.station || '',
              role: user?.role || '',
              activityCount: 0,
              lastActive: null,
              actions: {}
            };
          }
          
          analytics.userActivity[activity.userId].activityCount++;
          analytics.userActivity[activity.userId].actions[activity.action] = 
            (analytics.userActivity[activity.userId].actions[activity.action] || 0) + 1;
            
          // Update last active time
          const activityTime = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
          if (!analytics.userActivity[activity.userId].lastActive || 
              activityTime > analytics.userActivity[activity.userId].lastActive) {
            analytics.userActivity[activity.userId].lastActive = activityTime;
          }
        });

        // Calculate station activity
        Object.values(analytics.userActivity).forEach(userActivity => {
          if (userActivity.station) {
            if (!analytics.stationActivity[userActivity.station]) {
              analytics.stationActivity[userActivity.station] = {
                stationName: userActivity.station,
                userCount: 0,
                totalActivity: 0,
                actions: {}
              };
            }
            
            analytics.stationActivity[userActivity.station].userCount++;
            analytics.stationActivity[userActivity.station].totalActivity += userActivity.activityCount;
            
            Object.entries(userActivity.actions).forEach(([action, count]) => {
              analytics.stationActivity[userActivity.station].actions[action] = 
                (analytics.stationActivity[userActivity.station].actions[action] || 0) + count;
            });
          }
        });

        // Calculate daily activity trend (last 7 days)
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayActivities = activities.filter(activity => {
            const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
            return activityDate.toISOString().split('T')[0] === dateStr;
          });
          
          analytics.dailyActivity[dateStr] = {
            date: dateStr,
            totalActivity: dayActivities.length,
            uniqueUsers: new Set(dayActivities.map(a => a.userId)).size,
            logins: dayActivities.filter(a => a.action === 'login').length,
            logCreations: dayActivities.filter(a => a.action === 'log_created').length,
            garAssessments: dayActivities.filter(a => a.action === 'gar_created').length
          };
        }

        // Convert userActivity object to sorted array
        analytics.topUsers = Object.values(analytics.userActivity)
          .sort((a, b) => b.activityCount - a.activityCount)
          .slice(0, 10);

        // Convert stationActivity object to sorted array
        analytics.topStations = Object.values(analytics.stationActivity)
          .sort((a, b) => b.totalActivity - a.totalActivity);

        return analytics;
      } catch (error) {
        console.error("Error getting user engagement analytics:", error);
        return null;
      }
    },

    // Get system usage statistics
    getSystemUsageStats: async () => {
      try {
        const stats = {
          totalUsers: 0,
          totalLogs: 0,
          totalAssessments: 0,
          totalStations: 0,
          activeUsersToday: 0,
          logsCreatedToday: 0,
          assessmentsToday: 0
        };

        // Get total counts
        const [usersSnapshot, logsSnapshot, assessmentsSnapshot, stationsSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "logs")),
          getDocs(collection(db, "assessments")),
          getDocs(collection(db, "stations"))
        ]);

        stats.totalUsers = usersSnapshot.size;
        stats.totalLogs = logsSnapshot.size;
        stats.totalAssessments = assessmentsSnapshot.size;
        stats.totalStations = stationsSnapshot.size;

        // Get today's activity
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        try {
          const activityRef = collection(db, "user_activity");
          const todayQuery = query(
            activityRef,
            where("timestamp", ">=", today)
          );
          
          const todaySnapshot = await getDocs(todayQuery);
          const todayActivities = todaySnapshot.docs.map(doc => doc.data());

          stats.activeUsersToday = new Set(todayActivities.map(a => a.userId)).size;
          stats.logsCreatedToday = todayActivities.filter(a => a.action === 'log_created').length;
          stats.assessmentsToday = todayActivities.filter(a => a.action === 'gar_created').length;
        } catch (error) {
          console.log("Error fetching today's activity, using defaults:", error);
          // Default values if activity collection doesn't exist
          stats.activeUsersToday = 0;
          stats.logsCreatedToday = 0;
          stats.assessmentsToday = 0;
        }

        return stats;
      } catch (error) {
        console.error("Error getting system usage stats:", error);
        return null;
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
              {/* Redirect signup to login - app is invite-only with Google authentication */}
              <Route path="/signup" element={<Navigate to="/login" replace />} />
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