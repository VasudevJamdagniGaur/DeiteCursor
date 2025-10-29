import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { handleGoogleRedirect } from './services/authService';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import WelcomePage from './components/WelcomePage';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ChatPage from './components/ChatPage';
import EmotionalWellbeing from './components/EmotionalWellbeing';
import ProfilePage from './components/ProfilePage';

// Component to handle Google Sign-In redirects
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle Google Sign-In redirect on app load
    // This checks if the user is returning from a Google sign-in redirect
    handleGoogleRedirect().then((result) => {
      if (result.success && result.user) {
        console.log('✅ Google Sign-In successful via redirect, navigating to dashboard');
        // Navigate to dashboard after successful redirect sign-in
        navigate('/dashboard', { replace: true });
      } else if (result.error && !result.isNormalLoad) {
        // Only log errors that aren't expected (like normal page loads)
        console.warn('⚠️ Google redirect handling:', result.error || 'No redirect pending');
      }
    }).catch((error) => {
      console.error('❌ Unexpected error handling Google redirect:', error);
    });
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/wellbeing" element={<EmotionalWellbeing />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

