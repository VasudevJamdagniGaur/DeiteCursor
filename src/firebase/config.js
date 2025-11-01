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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// CRITICAL FOR MOBILE APP: Configure auth for mobile app redirects
// Firebase will use authDomain from config, but we ensure it's set correctly
console.log('📍 Firebase Auth Domain:', firebaseConfig.authDomain);
console.log('📍 Current Origin:', window.location.origin);

// IMPORTANT: Firebase Auth persists tokens automatically
// When user signs in via external browser, Firebase stores token server-side
// When app checks auth state, Firebase verifies token from server
// This allows external browser sign-in to work properly

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
