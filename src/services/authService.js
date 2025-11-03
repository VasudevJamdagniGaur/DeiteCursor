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
  
  console.log('🔍 Attempting to load Browser plugin...');
  console.log('🔍 Capacitor platform:', Capacitor.getPlatform());
  console.log('🔍 Is native platform:', Capacitor.isNativePlatform());
  
  // Method 1: Try dynamic import (preferred for ES modules)
  try {
    console.log('📦 Attempting dynamic import of @capacitor/browser...');
    const browserModule = await import('@capacitor/browser');
    const Browser = browserModule.Browser;
    
    if (Browser) {
      console.log('✅ Browser plugin loaded successfully via dynamic import');
      return Browser;
    } else {
      console.warn('⚠️ Browser module imported but Browser is null');
    }
  } catch (importError) {
    console.error('❌ Dynamic import failed:', importError);
    console.error('❌ Error message:', importError.message);
    console.error('❌ Error stack:', importError.stack);
  }
  
  // Method 2: Try accessing via Capacitor.Plugins (native bridge)
  try {
    if (window.Capacitor?.Plugins?.Browser) {
      console.log('✅ Found Browser via Capacitor.Plugins');
      return window.Capacitor.Plugins.Browser;
    } else {
      console.warn('⚠️ Browser not found in Capacitor.Plugins');
      console.log('🔍 Available plugins:', Object.keys(window.Capacitor?.Plugins || {}));
    }
  } catch (pluginsError) {
    console.error('❌ Error accessing Capacitor.Plugins:', pluginsError);
  }
  
  // Method 3: Try accessing via window (some plugin registrations)
  try {
    if (window.Browser) {
      console.log('✅ Found Browser via window.Browser');
      return window.Browser;
    }
  } catch (windowError) {
    console.error('❌ Error accessing window.Browser:', windowError);
  }
  
  console.error('❌ All methods failed - Browser plugin not available');
  console.error('❌ This usually means:');
  console.error('   1. @capacitor/browser is not installed (run: npm install @capacitor/browser)');
  console.error('   2. Plugin not synced to Android (run: npx cap sync android)');
  console.error('   3. APK was built without syncing (rebuild after sync)');
  
  return null;
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
    
    // NATIVE APP: Use Firebase's signInWithRedirect with storage workaround
    // FIX: Address storage-partitioned browser issue by ensuring state persistence
    if (isNativeApp) {
      console.log('📱 Detected native platform - using Firebase signInWithRedirect');
      
      // Store app info for redirect handling
      try {
        localStorage.setItem('appOrigin', window.location.origin);
        localStorage.setItem('googleSignInPending', 'true');
        // Store timestamp to help with state recovery
        localStorage.setItem('googleSignInTimestamp', Date.now().toString());
        console.log('✅ Stored app origin:', window.location.origin);
      } catch (e) {
        console.warn('Could not store app info:', e);
      }
      
      try {
        // CRITICAL FIX: Check BOTH sessionStorage and localStorage
        // Some browsers partition sessionStorage but allow localStorage
        let storageAvailable = false;
        let sessionStorageAvailable = false;
        let localStorageAvailable = false;
        
        try {
          sessionStorage.setItem('__firebase_redirect_check__', 'test');
          const sessionValue = sessionStorage.getItem('__firebase_redirect_check__');
          sessionStorage.removeItem('__firebase_redirect_check__');
          if (sessionValue === 'test') {
            sessionStorageAvailable = true;
            storageAvailable = true;
          }
        } catch (e) {
          console.warn('⚠️ sessionStorage check failed:', e);
        }
        
        try {
          localStorage.setItem('__firebase_redirect_check__', 'test');
          const localValue = localStorage.getItem('__firebase_redirect_check__');
          localStorage.removeItem('__firebase_redirect_check__');
          if (localValue === 'test') {
            localStorageAvailable = true;
            storageAvailable = true;
          }
        } catch (e) {
          console.warn('⚠️ localStorage check failed:', e);
        }
        
        if (!storageAvailable) {
          console.error('❌ Both sessionStorage and localStorage are blocked');
          return {
            success: false,
            error: 'Your browser\'s privacy settings are preventing Google sign-in. Please enable cookies and storage for this site, or use the email/password sign-up option.',
            code: 'storage-partitioned',
            useEmailInstead: true
          };
        }
        
        console.log('✅ Storage check passed:', {
          sessionStorage: sessionStorageAvailable,
          localStorage: localStorageAvailable
        });
        
        // Get app origin - in Capacitor native apps, this is capacitor://localhost
        const appOrigin = window.location.origin;
        
        console.log('🔄 Using Firebase signInWithRedirect...');
        console.log('📍 App origin (WebView):', appOrigin);
        console.log('📍 Firebase will redirect to:', appOrigin);
        
        // EXPLANATION:
        // Firebase signInWithRedirect() redirects back to window.location.origin
        // In Capacitor apps, that's capacitor://localhost (the app itself!)
        // 
        // Flow:
        // 1. Firebase stores state in sessionStorage
        // 2. WebView navigates to Google OAuth (accounts.google.com) - stays in WebView
        // 3. User selects account, Google redirects to Firebase handler - stays in WebView
        // 4. Firebase handler processes OAuth and redirects back to capacitor://localhost
        // 5. WebView receives redirect, JavaScript checks auth state
        // 6. User is authenticated and navigated to dashboard
        //
        // SOLUTION: MainActivity keeps all OAuth URLs in WebView, preventing storage partitioning
        
        // Use Firebase's proper signInWithRedirect method
        const provider = new GoogleAuthProvider();
        
        // CRITICAL: Set custom parameters to help with state management
        // This ensures the OAuth flow includes proper state parameters
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        
        // CRITICAL: Configure redirect URL to use deep link
        // Firebase will redirect to this after OAuth completes
        // We set it to our app's deep link scheme
        try {
          // Store the deep link we want to redirect to
          const deepLinkRedirect = 'com.deite.app://auth';
          localStorage.setItem('oauthDeepLink', deepLinkRedirect);
          console.log('✅ Stored deep link for OAuth redirect:', deepLinkRedirect);
        } catch (e) {
          console.warn('⚠️ Could not store deep link:', e);
        }
        
        // Pre-store redirect information in localStorage (persists across redirects)
        // This helps us recover state if sessionStorage is partitioned
        try {
          const redirectState = {
            timestamp: Date.now(),
            appOrigin: appOrigin,
            expectedReturnUrl: `${appOrigin}/__/auth/handler`
          };
          localStorage.setItem('firebase_redirect_state_backup', JSON.stringify(redirectState));
          console.log('✅ Stored redirect state backup in localStorage');
        } catch (e) {
          console.warn('⚠️ Could not store redirect state backup:', e);
        }
        
        // Firebase signInWithRedirect() flow:
        // 1. Stores OAuth state in sessionStorage
        // 2. Navigates WebView to Google OAuth (MainActivity keeps in WebView)
        // 3. User selects account, Google redirects to Firebase handler (stays in WebView)
        // 4. Firebase handler processes OAuth and redirects back to capacitor://localhost
        // 5. WebView receives redirect, handleGoogleRedirect() processes it
        // 6. User is authenticated and navigated to dashboard
        //
        // IMPORTANT: MainActivity.java keeps all OAuth URLs in WebView
        // This ensures the ENTIRE flow happens in the SAME WebView context
        // sessionStorage persists because it's the same WebView (not external browser)
        await signInWithRedirect(auth, provider);
        
        console.log('✅ signInWithRedirect called - redirecting now');
        console.log('📍 Flow: WebView → Google OAuth → Firebase Handler → capacitor://localhost');
        console.log('📍 ALL redirects stay in WebView (MainActivity intercepts)');
        console.log('📍 User will be signed in automatically when redirect completes');
        
        // Return immediately - redirect will happen
        return {
          success: true,
          redirecting: true,
          message: 'Redirecting to Google sign-in...'
        };
      } catch (redirectError) {
        console.error('❌ signInWithRedirect failed:', redirectError);
        
        // Clean up stored state on error
        try {
          localStorage.removeItem('firebase_redirect_state_backup');
        } catch (e) {
          // Ignore cleanup errors
        }
        
        // If redirect fails, provide helpful error
        if (redirectError.code === 'auth/argument-error' || 
            redirectError.message?.includes('initial state') ||
            redirectError.message?.includes('storage') ||
            redirectError.message?.includes('sessionStorage')) {
          return {
            success: false,
            error: 'Google sign-in encountered a storage issue. This may happen if your browser has strict privacy settings. Please try: 1) Clear app data and retry, 2) Use email/password sign-up instead, or 3) Check that capacitor://localhost is in Firebase Authorized Domains.',
            code: 'storage-partitioned',
            useEmailInstead: true
          };
        }
        
        return {
          success: false,
          error: redirectError.message || 'Google sign-in failed. Please try again or use email/password sign-up.',
          code: redirectError.code || 'unknown-error'
        };
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
// Handles deep links when returning from external browser
// IMPORTANT: When using external browser, getRedirectResult won't work because
// redirect state is in browser's sessionStorage, not app's WebView
export const handleGoogleRedirect = async () => {
  try {
    // Check if we're returning via deep link
    const currentUrl = window.location.href;
    const isDeepLink = currentUrl.includes('com.deite.app://');
    const isOnAuthHandler = currentUrl.includes('__/auth/handler');
    const storedAppOrigin = localStorage.getItem('appOrigin');
    const appOrigin = storedAppOrigin || window.location.origin;
    const hasPendingSignIn = localStorage.getItem('googleSignInPending') === 'true';
    
    // CRITICAL: Check if we're on localhost redirect (Firebase fallback)
    // Firebase redirects to http://localhost when capacitor://localhost isn't available
    // We need to immediately redirect back to the app
    const isOnLocalhost = window.location.origin === 'http://localhost' || 
                         window.location.origin === 'https://localhost';
    
    if (isOnLocalhost && hasPendingSignIn) {
      console.log('📍 Detected localhost redirect from Firebase - redirecting back to app IMMEDIATELY');
      console.log('📍 App origin:', appOrigin);
      
      // IMMEDIATE redirect - don't wait, redirect now
      // Firebase authentication happens server-side, so we'll check auth state after redirect
      console.log('🚀 Redirecting to app dashboard immediately...');
      window.location.replace(`${appOrigin}/dashboard`);
      
      // Return immediately - redirect is happening
      return {
        success: false,
        noRedirect: true,
        message: 'Redirecting back to app...',
        redirecting: true
      };
    }
    
    console.log('🔍 Checking for Google Sign-In result...', {
      isDeepLink,
      isOnAuthHandler,
      isOnLocalhost,
      hasPendingSignIn,
      currentUrl: currentUrl.substring(0, 100)
    });
    
    if (isDeepLink) {
      console.log('🔗 Detected deep link return:', currentUrl);
      
      // Parse deep link URL to extract auth parameters
      // Firebase might include auth tokens in the URL
      const urlObj = new URL(currentUrl.replace('com.deite.app://', 'http://'));
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const error = urlObj.searchParams.get('error');
      
      if (error) {
        console.error('❌ Auth error in deep link:', error);
        return {
          success: false,
          error: `Authentication error: ${error}`,
          code: 'auth-error'
        };
      }
      
      console.log('📍 Deep link contains auth params:', { code: !!code, state: !!state });
      
      // Clear the deep link from URL bar for cleaner navigation
      if (isDeepLink) {
        window.history.replaceState({}, '', '/signup');
      }
    }
    
    // Note: Auth handler detection - don't block processing here
    // We'll handle redirects after checking auth state
    
    // FIRST: Try getRedirectResult (works for WebView redirects)
    // FIX: Enhanced error handling for storage-partitioned errors
    let result = null;
    try {
      result = await getRedirectResult(auth);
      if (result && result.user) {
        const user = result.user;
        console.log('✅ Google Sign-In successful via getRedirectResult:', user);
        
        // Clear any pending sign-in flags and backup state
        try {
          localStorage.removeItem('googleSignInPending');
          localStorage.removeItem('firebase_redirect_state_backup');
          localStorage.removeItem('googleSignInTimestamp');
        } catch (e) {
          // Ignore storage errors
        }
        
        // If we got here from deep link redirect, user is already in app
        // Just return success - no need to redirect again
        if (isDeepLink) {
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
        
        // If we're on the auth handler page (Firebase domain), redirect to app
        if (isOnAuthHandler && !window.location.origin.startsWith(appOrigin)) {
          console.log('📍 Firebase handler - redirecting to app via deep link');
          
          // Try deep link first (if supported)
          try {
            const deepLink = 'com.deite.app://auth';
            console.log('🚀 Attempting deep link redirect:', deepLink);
            // Use setTimeout to allow current execution to complete
            setTimeout(() => {
              window.location.href = deepLink;
            }, 100);
          } catch (e) {
            console.warn('⚠️ Deep link redirect failed, using app origin:', e);
            // Fallback to app origin
            window.location.replace(`${appOrigin}/dashboard`);
          }
          
          return { 
            success: true, 
            user: { 
              uid: user.uid, 
              email: user.email, 
              displayName: user.displayName, 
              photoURL: user.photoURL 
            },
            redirecting: true
          };
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
    } catch (redirectError) {
      // Check if this is the storage-partitioned error
      if (redirectError.message?.includes('missing initial state') || 
          redirectError.message?.includes('sessionStorage') ||
          redirectError.code === 'auth/argument-error') {
        console.warn('⚠️ Storage-partitioned error detected in getRedirectResult');
        console.warn('⚠️ This means sessionStorage was partitioned - checking auth state directly...');
        
        // CRITICAL WORKAROUND: Even if getRedirectResult fails due to storage partitioning,
        // Firebase may have successfully authenticated the user. Check auth state directly.
        // Firebase stores auth tokens server-side, so even if sessionStorage is partitioned,
        // the user might still be authenticated and we can detect that via auth.currentUser
        
        // Wait a moment for Firebase to complete authentication
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user is authenticated despite the error
        const authenticatedUser = auth.currentUser;
        if (authenticatedUser) {
          console.log('✅ User is authenticated despite storage error! (Firebase worked)');
          
          // Clear pending flags
          try {
            localStorage.removeItem('googleSignInPending');
            localStorage.removeItem('firebase_redirect_state_backup');
            localStorage.removeItem('googleSignInTimestamp');
          } catch (e) {
            // Ignore
          }
          
          // Navigate back to app if on handler page
          if (isOnAuthHandler && !window.location.origin.startsWith(appOrigin)) {
            window.location.replace(`${appOrigin}/dashboard`);
          }
          
          return {
            success: true,
            user: {
              uid: authenticatedUser.uid,
              email: authenticatedUser.email,
              displayName: authenticatedUser.displayName,
              photoURL: authenticatedUser.photoURL
            }
          };
        }
        
        // Try to recover using auth state listener (see below)
        // Don't return error yet - let the auth state check below handle it
      } else {
        console.warn('⚠️ getRedirectResult error:', redirectError.message);
      }
    }
    
    // SECOND: Check current auth state (works for WebView redirect flows)
    // FIX: Enhanced recovery for storage-partitioned scenarios
    // If user signed in via WebView redirect, Firebase auth state should be updated
    // We check this when app loads or resumes
    if (hasPendingSignIn || isDeepLink || isOnAuthHandler) {
      console.log('🔍 Checking current auth state (WebView redirect flow)...');
      
      // Check if we have a stored redirect state backup (indicates storage partitioning)
      const storedRedirectState = localStorage.getItem('firebase_redirect_state_backup');
      if (storedRedirectState) {
        try {
          const state = JSON.parse(storedRedirectState);
          const age = Date.now() - state.timestamp;
          console.log('📍 Found redirect state backup (storage partitioning detected), age:', age, 'ms');
          
          // If state is too old (more than 5 minutes), clean it up
          if (age > 5 * 60 * 1000) {
            localStorage.removeItem('firebase_redirect_state_backup');
            console.log('⚠️ Redirect state backup is too old, removed');
          }
        } catch (e) {
          console.warn('⚠️ Could not parse redirect state backup:', e);
        }
      }
      
      // CRITICAL WORKAROUND: Check auth state directly even if getRedirectResult failed
      // Firebase may have authenticated on the handler page despite storage-partitioned error
      let authCheckAttempts = 0;
      const maxAuthChecks = 10; // Check up to 5 seconds (10 * 500ms)
      
      while (authCheckAttempts < maxAuthChecks) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('✅ User authenticated! (detected via auth state check)');
          
          // Clear pending flags and backup state
          try {
            localStorage.removeItem('googleSignInPending');
            localStorage.removeItem('firebase_redirect_state_backup');
            localStorage.removeItem('googleSignInTimestamp');
          } catch (e) {
            // Ignore storage errors
          }
          
          // If we're on the Firebase handler page, navigate back to app
          if (isOnAuthHandler && !window.location.origin.startsWith(appOrigin)) {
            console.log('📍 Redirecting from Firebase handler back to app:', appOrigin);
            window.location.replace(`${appOrigin}/dashboard`);
            return {
              success: true,
              user: {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL
              }
            };
          }
          
          return {
            success: true,
            user: {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL
            }
          };
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 500));
        authCheckAttempts++;
      }
      
      // If we didn't find authenticated user after polling, continue with other checks
      if (authCheckAttempts >= maxAuthChecks) {
        console.log('⚠️ User not authenticated after polling, checking other methods...');
      }
      
      // If we still don't have a user, try listening for auth state change
      if (!auth.currentUser && (hasPendingSignIn || isDeepLink || isOnAuthHandler)) {
        console.log('⚠️ User not authenticated yet, but pending sign-in flag exists');
        console.log('⚠️ This may be a storage-partitioned scenario - will listen for auth state change');
        
        // Wait a moment and check again (Firebase might still be processing)
        // Also listen for auth state change as Firebase processes the sign-in
        return new Promise((resolve) => {
          let resolved = false;
          const maxWaitTime = 5000; // Wait up to 5 seconds
          const startTime = Date.now();
          
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && (hasPendingSignIn || isDeepLink || isOnAuthHandler)) {
              console.log('✅ Auth state changed - user is now authenticated!');
              
              if (!resolved) {
                resolved = true;
                unsubscribe(); // Stop listening
                
                // Clear pending flags and backup state
                try {
                  localStorage.removeItem('googleSignInPending');
                  localStorage.removeItem('firebase_redirect_state_backup');
                  localStorage.removeItem('googleSignInTimestamp');
                } catch (e) {
                  // Ignore
                }
                
                resolve({
                  success: true,
                  user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                  }
                });
              }
            }
          });
          
          // Also check periodically in case auth state listener doesn't fire
          const checkInterval = setInterval(() => {
            if (resolved) {
              clearInterval(checkInterval);
              return;
            }
            
            const elapsed = Date.now() - startTime;
            if (elapsed >= maxWaitTime) {
              clearInterval(checkInterval);
              unsubscribe();
              
              // Final check
              if (auth.currentUser) {
                const finalUser = auth.currentUser;
                resolved = true;
                try {
                  localStorage.removeItem('googleSignInPending');
                  localStorage.removeItem('firebase_redirect_state_backup');
                  localStorage.removeItem('googleSignInTimestamp');
                } catch (e) {}
                resolve({
                  success: true,
                  user: {
                    uid: finalUser.uid,
                    email: finalUser.email,
                    displayName: finalUser.displayName,
                    photoURL: finalUser.photoURL
                  }
                });
              } else {
                resolved = true;
                console.warn('⚠️ No sign-in detected after waiting');
                resolve({
                  success: false,
                  noRedirect: true,
                  message: 'Sign-in may have failed due to browser storage restrictions. Please try again or use email/password sign-up.',
                  storagePartitioned: true
                });
              }
            } else if (auth.currentUser && !resolved) {
              // Found user during periodic check
              const foundUser = auth.currentUser;
              clearInterval(checkInterval);
              unsubscribe();
              resolved = true;
              try {
                localStorage.removeItem('googleSignInPending');
                localStorage.removeItem('firebase_redirect_state_backup');
                localStorage.removeItem('googleSignInTimestamp');
              } catch (e) {}
              resolve({
                success: true,
                user: {
                  uid: foundUser.uid,
                  email: foundUser.email,
                  displayName: foundUser.displayName,
                  photoURL: foundUser.photoURL
                }
              });
            }
          }, 500); // Check every 500ms
        });
      }
    }
    
    // If we're on auth handler but no result, it might be a storage-partitioned error
    if (isOnAuthHandler) {
      console.warn('⚠️ On auth handler page but no redirect result - likely storage-partitioned error');
      // Navigate back to the app domain signup page
      if (!window.location.origin.startsWith(appOrigin)) {
        console.log('📍 Redirecting from Firebase handler back to app:', appOrigin);
        window.location.replace(`${appOrigin}/signup`);
      }
      return {
        success: false,
        error: 'Browser storage restrictions prevented sign-in. Please try using email/password sign-up instead.',
        code: 'storage-partitioned',
        isNormalLoad: false
      };
    }
    
    // Note: Localhost redirects are handled at the top of the function
    // This section is for other redirect scenarios
    
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
  if (!auth) {
    console.warn('⚠️ Auth not initialized yet, returning no-op');
    return () => {}; // Return no-op unsubscribe
  }
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  if (!auth) {
    return null;
  }
  return auth.currentUser;
};
