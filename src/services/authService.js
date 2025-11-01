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

// Lazy load Capacitor Browser plugin for external browser sign-in
const getBrowser = async () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  try {
    const { Browser } = await import('@capacitor/browser');
    return Browser;
  } catch (e) {
    console.warn('⚠️ Capacitor Browser plugin not available:', e);
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
    // This will be true ONLY when running as a native app (APK/IPA)
    // It will be FALSE when running in a mobile browser (even on Android/iOS)
    const isNativeApp = Capacitor.isNativePlatform();
    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && !isNativeApp;
    
    console.log('🔍 Platform Detection:', {
      isNativeApp,
      isMobileBrowser,
      userAgent: navigator.userAgent,
      platform: Capacitor.getPlatform(),
      origin: window.location.origin
    });
    
    // NATIVE APP: Use Browser plugin to open in external browser (bypasses WebView redirect issues)
    // This works without needing to add capacitor://localhost to Firebase Authorized Domains
    if (isNativeApp) {
      console.log('📱 Detected native platform - opening Google Sign-In in external browser');
      
      try {
        const Browser = await getBrowser();
        
        if (Browser) {
          console.log('✅ Browser plugin available');
          
          // First, prepare the redirect by calling signInWithRedirect
          // This will generate the proper Firebase URL
          const provider = new GoogleAuthProvider();
          
          // We need to get the redirect URL that Firebase would use
          // But since we can't intercept it easily, we'll construct it properly
          const authDomain = auth.config?.authDomain || 'deitedatabase.firebaseapp.com';
          const apiKey = auth.config?.apiKey;
          
          if (!apiKey) {
            console.error('❌ Firebase API key missing');
            throw new Error('Firebase configuration incomplete');
          }
          
          // Store app info for redirect handling
          try {
            localStorage.setItem('appOrigin', window.location.origin);
            localStorage.setItem('googleSignInPending', 'true');
          } catch (e) {
            console.warn('Could not store app info:', e);
          }
          
          // Use Firebase's signInWithRedirect() to get the proper URL
          // But open it in external browser instead of WebView
          const provider = new GoogleAuthProvider();
          
          // Prepare the redirect - Firebase will generate the URL
          // We need to intercept before it redirects
          console.log('🔵 Preparing Firebase redirect...');
          
          // Call signInWithRedirect - this prepares everything
          // The redirect will try to happen, but we'll catch it
          try {
            // This will prepare the redirect URL and store state
            const redirectPromise = signInWithRedirect(auth, provider);
            
            // Wait a tiny bit for Firebase to prepare
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Now construct the URL that Firebase would use
            // Firebase redirects to: https://[authDomain]/__/auth/handler with query params
            // The continueUrl must be in authorized domains
            // Let's use http://localhost which should be authorized by default
            const continueUrl = encodeURIComponent('http://localhost/signup');
            const firebaseAuthUrl = `https://${authDomain}/__/auth/handler?apiKey=${apiKey}&providerId=google.com&mode=signIn&continueUrl=${continueUrl}`;
            
            console.log('🌐 Opening Google Sign-In in external browser...');
            console.log('📍 This bypasses WebView redirect issues');
            
            // Open in external browser - this will work properly
            await Browser.open({ 
              url: firebaseAuthUrl
            });
            
            console.log('✅ Browser opened in external Chrome');
            console.log('📍 User will sign in, then return to app');
            
            // Cancel the WebView redirect since we opened external browser
            // The redirectPromise might reject, which is fine
            redirectPromise.catch(() => {
              // Expected - we're using external browser instead
            });
            
            return {
              success: true,
              redirecting: true,
              externalBrowser: true,
              message: 'Opening Google Sign-In in browser...'
            };
          } catch (redirectError) {
            console.warn('⚠️ Redirect prep error (using fallback):', redirectError.message);
            
            // Fallback: simple URL construction
            const continueUrl = encodeURIComponent('http://localhost/signup');
            const firebaseAuthUrl = `https://${authDomain}/__/auth/handler?apiKey=${apiKey}&providerId=google.com&mode=signIn&continueUrl=${continueUrl}`;
            
            await Browser.open({ url: firebaseAuthUrl });
            
            return {
              success: true,
              redirecting: true,
              externalBrowser: true,
              message: 'Opening Google Sign-In in browser...'
            };
          }
        } else {
          console.warn('⚠️ Browser plugin not available');
          // Fall through to WebView redirect
        }
      } catch (browserError) {
        console.error('❌ Failed to open browser:', browserError);
        // Fall through to WebView redirect
      }
    }
    
    // WEB AUTHENTICATION (Browser - desktop OR mobile browser OR native app fallback)
    console.log('🌐 Using web Firebase Authentication...');
    const provider = new GoogleAuthProvider();
    
    // For mobile browsers OR native apps (WebView): ALWAYS use redirect
    // Redirect works in both mobile browsers and Capacitor WebView
    // This ensures user can at least select their Google account
    if (isMobileBrowser || isNativeApp) {
      console.log('📱 Mobile/Native device detected - using web redirect');
      console.log('🔄 Redirecting to Google account selection...');
      console.log('📍 This will open Google sign-in page');
      
      try {
        // Ensure we can save to sessionStorage before redirect (required by Firebase)
        try {
          sessionStorage.setItem('__firebase_redirect_check__', 'test');
          sessionStorage.removeItem('__firebase_redirect_check__');
          console.log('✅ Storage check passed - sessionStorage is available');
        } catch (storageError) {
          console.error('❌ Storage check failed:', storageError);
          return {
            success: false,
            error: 'Your browser\'s privacy settings are preventing Google sign-in. Please enable cookies and storage for this site, or use the email/password sign-up option.',
            code: 'storage-partitioned',
            useEmailInstead: true
          };
        }
        
        console.log('🔄 Attempting redirect on mobile/native app...');
        console.log('📍 Current origin:', window.location.origin);
        console.log('📍 Auth domain:', auth.config?.authDomain || 'not available');
        console.log('🌐 Redirect URL will be: https://' + (auth.config?.authDomain || 'deitedatabase.firebaseapp.com') + '/__/auth/handler');
        
        // CRITICAL: Use signInWithRedirect - this MUST work
        console.log('🚀 Calling signInWithRedirect NOW...');
        console.log('⚠️ This should cause page navigation - if nothing happens, check console for errors');
        
        try {
          console.log('🚀 EXECUTING signInWithRedirect() NOW...');
          console.log('🔵 Auth config:', {
            apiKey: auth.config?.apiKey ? '***' : 'missing',
            authDomain: auth.config?.authDomain || 'missing',
            projectId: auth.config?.projectId || 'missing'
          });
          
          // Call signInWithRedirect
          const redirectPromise = signInWithRedirect(auth, provider);
          
          console.log('⏳ signInWithRedirect() called, waiting for redirect...');
          
          // The redirect should happen immediately
          // We don't await it because it will navigate away
          redirectPromise.catch((err) => {
            console.error('❌ signInWithRedirect promise rejected:', err);
          });
          
          // For native apps, check if redirect actually happened
          if (isNativeApp) {
            console.log('📱 Native app detected - checking if redirect worked...');
            // Give it 500ms - if redirect works, page will navigate away
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if we're still on the same page
            const currentUrl = window.location.href;
            console.log('📍 Current URL after redirect attempt:', currentUrl);
            
            if (currentUrl.includes('signup') || currentUrl.includes('login')) {
              console.error('❌ Redirect failed - still on signup/login page');
              console.error('❌ This means signInWithRedirect() did not navigate');
              console.error('❌ Most likely cause: capacitor://localhost not in Firebase Authorized Domains');
              console.error('❌ FIX: Add capacitor://localhost to Firebase Console → Authentication → Settings → Authorized domains');
              
              return {
                success: false,
                error: 'Redirect failed. Please add capacitor://localhost to Firebase Authorized Domains in Firebase Console.',
                code: 'redirect-failed',
                redirectFailed: true,
                fixInstructions: 'Go to Firebase Console → Authentication → Settings → Authorized domains → Add: capacitor://localhost'
              };
            }
          }
          
          // Return immediately - redirect should have happened
          return {
            success: true,
            redirecting: true,
            message: 'Redirecting to Google sign-in...'
          };
        } catch (redirectCallError) {
          console.error('❌ signInWithRedirect threw an error:', redirectCallError);
          console.error('❌ Error message:', redirectCallError.message);
          console.error('❌ Error code:', redirectCallError.code);
          console.error('❌ Full error:', redirectCallError);
          throw redirectCallError; // Re-throw to be caught by outer catch
        }
      } catch (redirectError) {
        console.error('❌ Redirect failed on mobile:', redirectError);
        console.error('❌ Error code:', redirectError.code);
        console.error('❌ Error message:', redirectError.message);
        console.error('❌ Full error:', redirectError);
        
        if (redirectError.code === 'auth/argument-error' || 
            redirectError.message?.includes('initial state') ||
            redirectError.message?.includes('storage') ||
            redirectError.message?.includes('sessionStorage')) {
          return {
            success: false,
            error: 'Your browser\'s privacy settings are preventing Google sign-in. Please enable cookies and storage for this site, or use the email/password sign-up option.',
            code: 'storage-partitioned',
            useEmailInstead: true
          };
        }
        
        // Check if it's a redirect URI issue
        if (redirectError.message?.includes('redirect_uri') || 
            redirectError.message?.includes('unauthorized') ||
            redirectError.code === 'auth/unauthorized-domain') {
          return {
            success: false,
            error: 'Redirect URI not configured. Please add this URL to Firebase Console Authorized Domains: ' + window.location.origin,
            code: 'redirect-uri-not-configured',
            useEmailInstead: false
          };
        }
        
        return {
          success: false,
          error: redirectError.message || 'Google sign-in failed. Please try using email/password sign-up instead.',
          code: redirectError.code || 'unknown-error',
          details: redirectError.toString()
        };
      }
    }
    
    // Desktop browser - try popup first, fallback to redirect
    console.log('🖥️ Desktop browser detected - attempting popup first...');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google Sign-In successful via popup:', user);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        popup: true
      };
    } catch (popupError) {
      console.log('⚠️ Popup failed, error code:', popupError.code);
      
      // If popup is blocked or closed, fall back to redirect
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request') {
        console.log('⚠️ Popup blocked or cancelled, falling back to redirect...');
        
        try {
          await signInWithRedirect(auth, provider);
          console.log('📱 Using signInWithRedirect fallback');
          return {
            success: true,
            redirecting: true,
            message: 'Redirecting to Google sign-in...'
          };
        } catch (redirectError) {
          console.error('❌ Redirect fallback also failed:', redirectError);
          
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
      
      if (popupError.code === 'auth/popup-closed-by-user') {
        return {
          success: false,
          error: 'Google sign-in was cancelled.',
          code: popupError.code,
          cancelled: true
        };
      }
      
      throw popupError;
    }
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);
    
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
