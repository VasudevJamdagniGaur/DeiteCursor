import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { handleGoogleRedirect } from './services/authService';
import { Capacitor } from '@capacitor/core';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import WelcomePage from './components/WelcomePage';
import SignupPage from './components/SignupPage';
import EmailSignupPage from './components/EmailSignupPage';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ChatPage from './components/ChatPage';
import EmotionalWellbeing from './components/EmotionalWellbeing';
import ProfilePage from './components/ProfilePage';

// Lazy load Capacitor App plugin for deep link handling
const getAppPlugin = async () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  try {
    const { App } = await import('@capacitor/app');
    return App;
  } catch (e) {
    console.warn('⚠️ Capacitor App plugin not available:', e);
    return null;
  }
};

// Component to handle Google Sign-In redirects and route transitions
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
    }
  }, [location.pathname, displayLocation.pathname]);

  useEffect(() => {
    // Handle Google Sign-In redirect on app load
    const handleAuthRedirect = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result.success && result.user) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error handling Google redirect:', error);
      }
    };
    
    // Check for redirect result after app loads
    setTimeout(handleAuthRedirect, 500);
  }, [navigate]);

  return (
    <div
      className={transitionStage}
      onAnimationEnd={() => {
        if (transitionStage === 'fadeOut') {
          setTransitionStage('fadeIn');
          setDisplayLocation(location);
        }
      }}
      style={{
        width: '100%',
        minHeight: '100vh',
      }}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/email" element={<EmailSignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/wellbeing" element={<EmotionalWellbeing />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App" style={{ backgroundColor: '#202124', minHeight: '100vh' }}>
          <AppContent />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

