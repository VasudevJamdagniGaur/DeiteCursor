// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSqIMCtPOB-ifWC8PUpM52rpFlrP4jbhY",
  authDomain: "deitedatabase.firebaseapp.com",
  projectId: "deitedatabase",
  storageBucket: "deitedatabase.firebasestorage.app",
  messagingSenderId: "300613626896",
  appId: "1:300613626896:web:eaa1c35b138a2a6c07ae95",
  measurementId: "G-CRK45CXML7"
};

// Initialize Firebase with error handling - don't throw, allow app to start
let app = null;
let auth = null;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('⚠️ App will continue without Firebase - some features may not work');
  // Don't throw - allow app to start even if Firebase fails
  // Components using Firebase will need to handle null values
}
export { auth };

// CRITICAL FOR MOBILE APP: Firebase redirect configuration
// Firebase signInWithRedirect() uses window.location.origin as the redirect URL
// In Capacitor native apps, this is: capacitor://localhost
// NOT http://localhost - that's why you're seeing localhost errors!
if (app) {
  console.log('📍 Firebase Auth Domain:', firebaseConfig.authDomain);
  console.log('📍 App Origin (redirect target):', window.location.origin);
  console.log('⚠️ Make sure "' + window.location.origin + '" is in Firebase Authorized Domains!');
}

// IMPORTANT: Firebase Auth persists tokens automatically
// When user signs in via external browser, Firebase stores token server-side
// When app checks auth state, Firebase verifies token from server
// This allows external browser sign-in to work properly

// Initialize Firestore and get a reference to the service
let db = null;
try {
  if (app) {
    db = getFirestore(app);
    console.log('✅ Firestore initialized successfully');
  } else {
    console.warn('⚠️ Firestore not initialized - Firebase app is null');
  }
} catch (error) {
  console.error('❌ Firestore initialization failed:', error);
  console.warn('⚠️ App will continue without Firestore - data features may not work');
  // Don't throw - allow app to start even if Firestore fails
}
export { db };

// Initialize Analytics (optional) - wrap in try-catch to prevent crashes in native apps
let analytics = null;
try {
  if (app) {
    // Analytics may not be available in all environments (e.g., native apps)
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized successfully');
  } else {
    console.warn('⚠️ Analytics not initialized - Firebase app is null');
  }
} catch (error) {
  console.warn('⚠️ Firebase Analytics not available:', error.message);
  // Analytics is optional, so we continue without it
}
export { analytics };

export default app;
export { app };
