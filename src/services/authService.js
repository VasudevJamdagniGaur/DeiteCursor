import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
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

// Helper function to calculate age from birthday
const calculateAge = (birthday) => {
  if (!birthday || !birthday.year || !birthday.month || !birthday.day) {
    return null;
  }
  
  const today = new Date();
  const birthDate = new Date(birthday.year, birthday.month - 1, birthday.day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to fetch user profile data from Google People API
const fetchGoogleProfileData = async (accessToken) => {
  try {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays,genders',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch Google People API data:', response.status);
      return { age: null, gender: null };
    }

    const data = await response.json();
    
    // Extract age from birthday
    let age = null;
    if (data.birthdays && data.birthdays.length > 0) {
      const birthday = data.birthdays[0].date;
      age = calculateAge(birthday);
      console.log('📅 Calculated age from Google:', age);
    }

    // Extract gender
    let gender = null;
    if (data.genders && data.genders.length > 0) {
      gender = data.genders[0].value || data.genders[0].formattedValue;
      console.log('👤 Gender from Google:', gender);
    }

    return { age, gender };
  } catch (error) {
    console.warn('⚠️ Error fetching Google People API data (this is optional):', error.message);
    return { age: null, gender: null };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add scopes to request birthday and gender permissions
    provider.addScope('https://www.googleapis.com/auth/user.birthday.read');
    provider.addScope('https://www.googleapis.com/auth/user.gender.read');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get access token from credential to call People API
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    // Fetch age and gender from Google People API
    let age = null;
    let gender = null;
    
    if (accessToken) {
      const profileData = await fetchGoogleProfileData(accessToken);
      age = profileData.age;
      gender = profileData.gender;
    }

    // Save age and gender to localStorage if available
    if (user.uid) {
      if (age !== null) {
        localStorage.setItem(`user_age_${user.uid}`, age.toString());
        console.log('💾 Saved age to localStorage:', age);
      }
      if (gender !== null) {
        localStorage.setItem(`user_gender_${user.uid}`, gender);
        console.log('💾 Saved gender to localStorage:', gender);
      }
    }
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        age: age,
        gender: gender
      }
    };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return {
      success: false,
      error: error.message
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
