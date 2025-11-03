// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSqIMCtPOB-ifWC8PUpM52rpFlrP4jbhY",
  authDomain: "deitedatabase.firebaseapp.com",
  projectId: "deitedatabase",
  storageBucket: "deitedatabase.firebasestorage.app",
  messagingSenderId: "300613626896",
  appId: "1:300613626896:web:eaa1c35b138a2a6c07ae95",
  measurementId: "G-CRK45CXML7"
};

// Initialize Firebase immediately but defer Analytics (which can block)
let app = null;
let auth = null;
let db = null;
let analytics = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('⚠️ App will continue without Firebase');
}

// Initialize Analytics AFTER app loads (non-blocking, in background)
// This prevents Analytics from blocking app startup
if (typeof window !== 'undefined' && app) {
  setTimeout(() => {
    try {
      import("firebase/analytics").then(({ getAnalytics }) => {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized');
      }).catch((e) => {
        console.warn('⚠️ Analytics not available:', e.message);
      });
    } catch (e) {
      // Analytics initialization failed - that's OK
    }
  }, 2000); // Wait 2 seconds after app loads
}

export { auth, db, analytics };
export default app;
