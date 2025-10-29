import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { auth } from "../firebase/config";

// Sign up new user
export const signUpUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name
    if (displayName) {
      await updateProfile(user, {
        displayName: displayName
      });
    }
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName
      }
    };
  } catch (error) {
    console.error("Error signing up:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Sign in existing user
export const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    console.error("Error signing in:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to detect mobile/unsupported browsers
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if popups are likely blocked or if we should use redirect
const shouldUseRedirect = () => {
  // Use redirect for mobile devices or small screens
  if (isMobileDevice() || window.innerWidth <= 768) {
    return true;
  }
  
  // Check if we're in a storage-partitioned environment (common on mobile)
  try {
    const testKey = '__popup_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return false; // Popups should work
  } catch (e) {
    // sessionStorage is blocked or restricted - use redirect
    console.warn('⚠️ sessionStorage is restricted, will use redirect');
    return true;
  }
};

// Check if we're in a storage-partitioned environment that won't work with redirects
const isStoragePartitioned = () => {
  try {
    // Try to access sessionStorage
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    const value = sessionStorage.getItem(testKey);
    sessionStorage.removeItem(testKey);
    
    // If we can't set or get, or value is null, storage is partitioned
    if (value !== 'test') {
      return true;
    }
    
    // Additional check: try localStorage as well
    try {
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (e) {
      return true; // localStorage also blocked
    }
    
    return false;
  } catch (e) {
    return true; // Storage is completely blocked
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Check if we're in a storage-partitioned environment that won't work
    if (isStoragePartitioned()) {
      console.warn('⚠️ Storage-partitioned environment detected - redirect flow may not work');
      // Still try, but we'll catch the error and provide a better message
    }
    
    const provider = new GoogleAuthProvider();
    
    // Set the correct redirect URL based on current domain
    const currentOrigin = window.location.origin;
    console.log('📍 Current origin:', currentOrigin);
    
    // Use redirect for mobile devices or when popups are blocked
    if (shouldUseRedirect()) {
      console.log('📱 Using signInWithRedirect for mobile/unsupported browser');
      
      // For storage-partitioned environments, we need to provide better error handling
      try {
        await signInWithRedirect(auth, provider);
        // The redirect will happen, so we return here
        // The actual result will be handled by getRedirectResult() in App.js
        return {
          success: true,
          redirecting: true,
          message: 'Redirecting to Google sign-in...'
        };
      } catch (redirectError) {
        // If redirect fails due to storage issues, provide helpful error
        if (redirectError.code === 'auth/argument-error' || 
            redirectError.message?.includes('initial state') ||
            redirectError.message?.includes('storage')) {
          return {
            success: false,
            error: 'Your browser\'s privacy settings are preventing Google sign-in. Please try using email/password sign-up instead, or enable cookies and storage for this site.',
            code: 'storage-partitioned',
            useEmailInstead: true
          };
        }
        throw redirectError;
      }
    } else {
      // Use popup for desktop browsers that support it
      console.log('💻 Using signInWithPopup for desktop');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    }
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);
    
    // If popup fails with a blocked error, try redirect as fallback
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.log('⚠️ Popup blocked, attempting redirect instead...');
      try {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        return {
          success: true,
          redirecting: true,
          message: 'Redirecting to Google sign-in...'
        };
      } catch (redirectError) {
        // Check if it's a storage-partitioned error
        if (redirectError.code === 'auth/argument-error' || 
            redirectError.message?.includes('initial state') ||
            redirectError.message?.includes('storage')) {
          return {
            success: false,
            error: 'Your browser\'s privacy settings are preventing Google sign-in. Please try using email/password sign-up instead, or enable cookies and storage for this site.',
            code: 'storage-partitioned',
            useEmailInstead: true
          };
        }
        return {
          success: false,
          error: redirectError.message
        };
      }
    }
    
    // Handle storage-partitioned specific errors
    if (error.code === 'auth/argument-error' || 
        error.message?.includes('initial state') ||
        error.message?.includes('storage') ||
        error.message?.includes('sessionStorage')) {
      return {
        success: false,
        error: 'Your browser\'s privacy settings are preventing Google sign-in. Please try using email/password sign-up instead, or enable cookies and storage for this site.',
        code: 'storage-partitioned',
        useEmailInstead: true
      };
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Handle redirect result - call this on app initialization
export const handleGoogleRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      console.log('✅ Google Sign-In successful via redirect:', user);
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    }
    // No redirect result - user didn't come from a redirect
    return { success: false, noRedirect: true };
  } catch (error) {
    console.error("❌ Error handling Google redirect:", error);
    
    // Handle storage-partitioned specific errors
    if (error.code === 'auth/argument-error' && 
        (error.message?.includes('initial state') || 
         error.message?.includes('sessionStorage') ||
         error.message?.includes('storage'))) {
      console.warn('⚠️ Storage-partitioned environment detected - redirect flow unavailable');
      // Don't treat this as a critical error on normal page loads
      // But do log it so we know it happened
      if (window.location.search.includes('error') || window.location.hash.includes('error')) {
        // If there's an error in the URL, this might be a failed redirect
        return {
          success: false,
          error: 'Google sign-in failed due to browser privacy settings. Please try using email/password sign-up instead.',
          code: 'storage-partitioned',
          isNormalLoad: false
        };
      }
      return { 
        success: false, 
        noRedirect: true, 
        isNormalLoad: true,
        warning: 'Storage-partitioned environment detected'
      };
    }
    
    // Other errors
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Listen to authentication state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};
