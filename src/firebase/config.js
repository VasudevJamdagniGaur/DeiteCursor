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

// Configure authentication settings for redirect
// Use Firebase hosting domain for redirects when not in development
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname);

// For production/mobile, ensure we use the Firebase domain for redirects
if (!isLocalhost && auth && auth.config) {
  // Firebase will automatically use authDomain from config for redirects
  // This is just for logging/debugging
  console.log('📍 Firebase Auth Domain:', firebaseConfig.authDomain);
  console.log('📍 Current Origin:', window.location.origin);
}

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
