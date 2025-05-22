// src/components/Login.js
import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { Clipboard } from 'lucide-react';
import { FirestoreContext } from '../App';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const firestoreOperations = useContext(FirestoreContext);
  
  // Allowed email domains
  const ALLOWED_DOMAINS = ['smfd.org', 'eirene.ai'];
  
  const from = location.state?.from?.pathname || '/dashboard';
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Check email domain for email/password login too
    if (!validateEmailDomain(email)) {
      setError(`Access restricted to authorized email domains only.`);
      setLoading(false);
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update lastLogin timestamp and track activity
      try {
        console.log('Updating lastLogin for user:', userCredential.user.uid);
        await firestoreOperations.setUserProfile(userCredential.user.uid, {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Track user login activity
        await firestoreOperations.trackUserLogin(
          userCredential.user.uid,
          userCredential.user.email,
          userCredential.user.displayName || 'User'
        );
        
        console.log('Successfully updated lastLogin timestamp and tracked activity');
      } catch (profileError) {
        console.error('Failed to update login timestamp:', profileError);
      }
      
      // Successfully logged in
      console.log('Logged in:', userCredential.user);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to log in. Please try again.';
      
      switch(error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        default:
          errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const validateEmailDomain = (email) => {
    if (!email) return false;
    
    const domain = email.split('@').pop()?.toLowerCase();
    if (!domain) return false;
    
    return ALLOWED_DOMAINS.includes(domain);
  };
  
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      
      // First step: Get the credential but don't sign in yet
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if the email domain is allowed
      if (!validateEmailDomain(user.email)) {
        // Immediately sign out the user
        await auth.signOut();
        throw new Error(`Access restricted to authorized email domains only.`);
      }
      
      // Email domain is allowed, proceed with the login flow
      
      // Check if the user profile already exists in Firestore
      const existingProfile = await firestoreOperations.getUserProfile(user.uid);
      
      if (!existingProfile) {
        // If no profile exists, create a new one with default values
        await firestoreOperations.setUserProfile(user.uid, {
          displayName: user.displayName || 'User',
          email: user.email,
          station: 'Station 1', // Default station
          role: 'firefighter', // Default role
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          authProvider: 'google'
        });
        console.log('Created new user profile for Google user:', user.email);
      } else {
        // Update lastLogin for existing users
        console.log('Updating lastLogin for existing Google user:', user.uid);
        await firestoreOperations.setUserProfile(user.uid, {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Successfully updated lastLogin for Google user');
        console.log('Google user already has a profile:', existingProfile);
      }
      
      // Track user login activity for Google users
      await firestoreOperations.trackUserLogin(
        user.uid,
        user.email,
        user.displayName || 'User'
      );
      
      // Successfully logged in
      console.log('Logged in with Google:', user);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Google login error:', error);
      let errorMessage = 'Failed to log in with Google. Please try again.';
      
      if (error.message.includes('Sign-in restricted')) {
        errorMessage = error.message;
      } else {
        switch(error.code) {
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'The popup was blocked by your browser. Please allow popups for this site.';
            break;
          case 'auth/popup-closed-by-user':
            errorMessage = 'The login popup was closed before authentication was completed.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="flex justify-center">
            <Clipboard className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Fire Department Daily Log
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your station's dashboard
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 rounded-t-md text-gray-900 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 rounded-b-md text-gray-900 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </div>
          
          {/* Google Sign-in */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>
          
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {/* Google Logo */}
              <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              Sign in with Google
            </button>
          </div>
          
          <div className="flex items-center justify-end">
            {/* Signup link removed - app is invite-only */}
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Forgot your password?
              </a>
            </div>
          </div>
          
          {/* Info message about invite-only access */}
          <div className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
            <p>This application is invite-only for authorized personnel.</p>
            <p className="mt-1">Please use Google Sign-in with your official email.</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;