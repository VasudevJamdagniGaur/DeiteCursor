// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaQHeVVrI3NPtgULvDh4-rJMGoOZeLqAY",
  authDomain: "deitecursor.firebaseapp.com",
  projectId: "deitecursor",
  storageBucket: "deitecursor.firebasestorage.app",
  messagingSenderId: "843757681302",
  appId: "1:843757681302:web:946d0c46ae242427b020b7",
  measurementId: "G-T83EHJQMW3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
