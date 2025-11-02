import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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

// Component to handle Google Sign-In redirects
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle Google Sign-In redirect on app load
    // This also catches popup fallbacks to redirect on mobile
    // Also handles deep links when returning from external browser
    const handleAuthRedirect = async () => {
      try {
        // Check if we're returning from a deep link
        const url = window.location.href;
        if (url.includes('com.deite.app://') || url.includes('__/auth/handler')) {
          console.log('🔗 Detected deep link or auth handler URL:', url);
        }
        
        const result = await handleGoogleRedirect();
        
        if (result.success && result.user) {
          console.log('✅ Google Sign-In successful via redirect/handler, navigating to dashboard');
          // Navigate to dashboard after successful redirect sign-in
          navigate('/dashboard', { replace: true });
        } else if (result.error && !result.isNormalLoad) {
          // Only log errors that aren't expected (like normal page loads)
          console.warn('⚠️ Google redirect handling:', result.error || 'No redirect pending');
          
          // Special handling for storage-partitioned errors
          if (result.storagePartitioned || result.error?.includes('storage') || result.error?.includes('initial state')) {
            console.error('❌ Storage-partitioned error detected');
            console.error('❌ This means the browser blocked sessionStorage access during redirect');
            console.error('❌ The sign-in may have actually succeeded - checking auth state...');
            
            // Wait a moment and check auth state - Firebase might have authenticated despite the error
            setTimeout(async () => {
              try {
                const { getCurrentUser } = await import('./services/authService');
                const user = getCurrentUser();
                if (user) {
                  console.log('✅ User is authenticated despite storage error - sign-in succeeded!');
                  navigate('/dashboard', { replace: true });
                  return;
                }
              } catch (e) {
                console.warn('⚠️ Could not check auth state:', e);
              }
              
              // If no user found, navigate back to signup
              if (window.location.href.includes('__/auth/handler') || window.location.href.includes('firebaseapp.com')) {
                console.log('🔄 Navigating back to signup due to storage error');
                navigate('/signup', { replace: true });
              }
            }, 2000);
            
            return; // Don't navigate immediately - wait for auth check
          }
          
          // If we're on the Firebase auth handler page with an error, navigate back to signup
          if (window.location.href.includes('__/auth/handler') && result.error) {
            console.log('🔄 Redirected to auth handler with error, navigating back to signup');
            navigate('/signup', { replace: true });
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error handling Google redirect:', error);
        
        // If we're stuck on the auth handler page, navigate back
        if (window.location.href.includes('__/auth/handler')) {
          console.log('🔄 Caught error on auth handler page, navigating back to signup');
          navigate('/signup', { replace: true });
        }
      }
    };
    
    // Initial check
    handleAuthRedirect();
    
    // Setup deep link listener for automatic return from browser
    let appUrlListener = null;
    
    const setupDeepLinkListener = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const App = await getAppPlugin();
          if (App) {
            console.log('✅ Setting up deep link listener for automatic return...');
            
            // Listen for app URL open events (when deep link opens the app)
            appUrlListener = await App.addListener('appUrlOpen', (data) => {
              console.log('🔗 Deep link opened app:', data.url);
              
              // Check if it's a Google Sign-In redirect
              if (data.url.includes('com.deite.app://')) {
                console.log('✅ Detected deep link return from Google Sign-In');
                console.log('📍 Deep link URL:', data.url);
                
                // Wait a moment for Firebase to process, then check redirect result
                setTimeout(async () => {
                  try {
                    const result = await handleGoogleRedirect();
                    if (result.success && result.user) {
                      console.log('✅ Google Sign-In successful via deep link!');
                      navigate('/dashboard', { replace: true });
                    } else {
                      console.log('⚠️ No redirect result yet, will check again...');
                      // Try again after another delay
                      setTimeout(async () => {
                        const retryResult = await handleGoogleRedirect();
                        if (retryResult.success && retryResult.user) {
                          console.log('✅ Google Sign-In successful on retry!');
                          navigate('/dashboard', { replace: true });
                        }
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('❌ Error processing deep link:', error);
                  }
                }, 1000);
              }
            });
            
            console.log('✅ Deep link listener registered');
          }
        } catch (error) {
          console.warn('⚠️ Could not set up deep link listener:', error);
        }
      }
    };
    
    setupDeepLinkListener();
    
    // Also listen for app resume events (when returning from external browser)
    const handleAppResume = () => {
      console.log('📱 App resumed - checking for pending Google Sign-In');
      setTimeout(() => {
        handleAuthRedirect();
      }, 1000); // Give it a moment for Firebase to process
    };
    
    // Listen for visibility change (app coming to foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ App became visible - checking for pending Google Sign-In');
        setTimeout(() => {
          handleAuthRedirect();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Remove deep link listener on cleanup
      if (appUrlListener) {
        appUrlListener.remove();
      }
    };
  }, [navigate]);

  return (
    <Routes>
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

