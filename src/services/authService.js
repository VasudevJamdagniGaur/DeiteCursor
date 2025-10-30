import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential
} from "firebase/auth";
import { auth } from "../firebase/config";
import { Capacitor } from '@capacitor/core';

// Lazy load Capacitor Firebase Auth (only works in native)
// We'll import it dynamically when needed to avoid errors in web builds
const getFirebaseAuthentication = async () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    return FirebaseAuthentication;
  } catch (e) {
    console.warn('⚠️ Capacitor Firebase Auth not available:', e);
    return null;
  }
};

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
// Note: We prefer popup first for better UX (popup experience)
const shouldUseRedirect = () => {
  // For now, we'll try popup first on all devices
  // Only use redirect as fallback if popup fails
  return false; // Always try popup first
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

// Sign in with Google - Uses Capacitor native auth on mobile, web popup/redirect on browser
export const signInWithGoogle = async () => {
  try {
    // CRITICAL: Check if we're in a Capacitor native environment
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Detected native platform, attempting Capacitor Firebase Authentication...');
      
      // Lazy load the Capacitor plugin
      const FirebaseAuthentication = await getFirebaseAuthentication();
      
      if (FirebaseAuthentication) {
        console.log('📱 Using Capacitor Firebase Authentication (native)...');
        
        try {
          // Use Capacitor Firebase Authentication plugin
          const result = await FirebaseAuthentication.signInWithGoogle();
          
          console.log('✅ Capacitor Google Sign-In successful:', result);
          
          // The Capacitor plugin returns a user object, but we need to sync it with Firebase Auth
          // The plugin should handle the Firebase auth state automatically
          // However, we can also manually create a credential if needed
          
          // Wait a moment for auth state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the current user from Firebase Auth (should be set by the plugin)
          const user = auth.currentUser;
          
          if (user) {
            return {
              success: true,
              user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
              },
              popup: false,
              native: true
            };
          } else {
            // If user is not set, try to get from result
            if (result.user) {
              return {
                success: true,
                user: {
                  uid: result.user.uid || result.user.id,
                  email: result.user.email,
                  displayName: result.user.displayName,
                  photoURL: result.user.photoURL || result.user.photoUrl
                },
                popup: false,
                native: true
              };
            }
            
            throw new Error('User authentication completed but user object not available');
          }
        } catch (nativeError) {
          console.error('❌ Capacitor Google Sign-In failed:', nativeError);
          
          // If native auth fails, we can't fall back to web methods
          return {
            success: false,
            error: nativeError.message || 'Google sign-in failed on mobile device. Please try again.',
            code: nativeError.code || 'native-auth-error',
            native: true
          };
        }
      } else {
        console.log('⚠️ Native platform detected but Capacitor Firebase Auth plugin not available');
        console.log('⚠️ Falling back to web authentication...');
        // Fall through to web authentication
      }
    }
    
    // WEB FALLBACK: Use web Firebase Auth (popup/redirect)
    console.log('🌐 Using web Firebase Authentication...');
    const provider = new GoogleAuthProvider();
    
    // CRITICAL FOR MOBILE APP: Prepare redirect URL for fallback
    // Always prefer the current app origin so we return to the correct domain
    const currentOrigin = window.location.origin;
    const redirectUrl = currentOrigin;
    
    console.log('📍 Current origin:', currentOrigin);
    console.log('📍 Redirect URL (fallback):', redirectUrl);
    
    // Try popup first for better UX (opens account selection popup)
    console.log('🔐 Attempting Google Sign-In with popup (account selection)...');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google Sign-In successful via popup:', user);
      console.log('✅ Popup closed - user stays in app, auth state will handle navigation');
      
      // Return success without triggering any redirects
      // The auth state listener in SignupPage will handle navigation to dashboard
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        popup: true // Indicate this was via popup - no redirect needed
      };
    } catch (popupError) {
      console.log('⚠️ Popup failed, error code:', popupError.code);
      
      // If popup is blocked or closed, fall back to redirect
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request') {
        console.log('⚠️ Popup blocked or cancelled, falling back to redirect...');
        
        // Set custom parameters for redirect fallback
        const redirectProvider = new GoogleAuthProvider();
        // Keep parameters minimal and standard; rely on Firebase to return to the same origin
        
        try {
          await signInWithRedirect(auth, redirectProvider);
          console.log('📱 Using signInWithRedirect fallback');
          return {
            success: true,
            redirecting: true,
            message: 'Redirecting to Google sign-in...'
          };
        } catch (redirectError) {
          console.error('❌ Redirect fallback also failed:', redirectError);
          
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
            error: redirectError.message || 'Google sign-in failed. Please try using email/password sign-up instead.',
            code: redirectError.code
          };
        }
      }
      
      // Other popup errors - return the error
      if (popupError.code === 'auth/popup-closed-by-user') {
        return {
          success: false,
          error: 'Google sign-in was cancelled.',
          code: popupError.code,
          cancelled: true
        };
      }
      
      throw popupError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);
    
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
      error: error.message || 'An error occurred during Google sign-in. Please try again.',
      code: error.code
    };
  }
};

// Handle redirect result - call this on app initialization
// Also handles cases where popup falls back to redirect on mobile
export const handleGoogleRedirect = async () => {
  try {
    // Check if we're on the Firebase auth handler page (indicates redirect/popup fallback)
    const isOnAuthHandler = window.location.href.includes('__/auth/handler');
    const storedAppOrigin = localStorage.getItem('appOrigin');
    const appOrigin = storedAppOrigin || window.location.origin;
    
    if (isOnAuthHandler) {
      console.log('📍 Detected Firebase auth handler page - attempting to process result');
    }
    
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      console.log('✅ Google Sign-In successful via redirect/handler:', user);
      
      // If we're on the auth handler page hosted on a different domain, ensure we return to the app domain
      if (isOnAuthHandler && !window.location.origin.startsWith(appOrigin)) {
        window.location.replace(`${appOrigin}/dashboard`);
        return { success: true, user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL } };
      }
      
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
    
    // If we're on auth handler but no result, it might be a storage-partitioned error
    if (isOnAuthHandler) {
      console.warn('⚠️ On auth handler page but no redirect result - likely storage-partitioned error');
      // Navigate back to the app domain signup page
      if (!window.location.origin.startsWith(appOrigin)) {
        window.location.replace(`${appOrigin}/signup`);
      }
      return {
        success: false,
        error: 'Browser storage restrictions prevented sign-in. Please try using email/password sign-up instead.',
        code: 'storage-partitioned',
        isNormalLoad: false
      };
    }
    
    // No redirect result - user didn't come from a redirect
    return { success: false, noRedirect: true };
  } catch (error) {
    console.error("❌ Error handling Google redirect:", error);
    
    // Handle storage-partitioned specific errors (missing initial state)
    if (error.code === 'auth/argument-error' && 
        (error.message?.includes('initial state') || 
         error.message?.includes('sessionStorage') ||
         error.message?.includes('storage'))) {
      console.warn('⚠️ Storage-partitioned environment detected - missing initial state');
      
      // If we're on the auth handler page, navigate back to the app domain
      if (window.location.href.includes('__/auth/handler')) {
        console.log('🔄 Clearing auth handler URL due to storage error');
        if (!window.location.origin.startsWith(appOrigin)) {
          window.location.replace(`${appOrigin}/signup`);
        }
      }
      
      // Check if there's an error in the URL
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
        isNormalLoad: !window.location.href.includes('__/auth/handler'),
        warning: 'Storage-partitioned environment detected'
      };
    }
    
    // If we're on auth handler page with any error, try to clear the URL
    if (window.location.href.includes('__/auth/handler')) {
      console.log('🔄 Clearing auth handler URL due to error');
      if (!window.location.origin.startsWith(appOrigin)) {
        window.location.replace(`${appOrigin}/signup`);
      }
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
