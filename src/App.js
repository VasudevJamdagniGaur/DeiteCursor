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
    // Handle Google Sign-In redirect on app load (non-blocking)
    // CRITICAL: Check localhost redirect FIRST (before other checks) to redirect immediately
    const handleAuthRedirect = async () => {
      try {
        const url = window.location.href;
        const currentPath = window.location.pathname;
        
        // Only handle auth redirects if we're NOT on splash/landing page
        // This prevents blocking the initial app load
        if (currentPath === '/' || currentPath === '/landing') {
          console.log('📍 On splash/landing page - skipping auth redirect check');
          return;
        }
        
        const isLocalhost = window.location.origin === 'http://localhost' || 
                          window.location.origin === 'https://localhost';
        const hasPendingSignIn = localStorage.getItem('googleSignInPending') === 'true';
        
        // PRIORITY 1: Handle localhost redirect IMMEDIATELY (Firebase fallback)
        if (isLocalhost && hasPendingSignIn) {
          console.log('📍 CRITICAL: On localhost - redirecting to app IMMEDIATELY');
          const appOrigin = localStorage.getItem('appOrigin') || 'capacitor://localhost';
          console.log('🚀 Redirecting to:', `${appOrigin}/dashboard`);
          
          // Immediate redirect - don't wait for anything
          window.location.replace(`${appOrigin}/dashboard`);
          return; // Exit immediately
        }
        
        // PRIORITY 2: Handle other redirect scenarios (deep link, auth handler)
        // Only check these if NOT on localhost (already handled above)
        if (!isLocalhost) {
          const isDeepLink = url.includes('com.deite.app://');
          const isAuthHandler = url.includes('__/auth/handler');
          
          if (isDeepLink || isAuthHandler) {
            console.log('🔗 Detected redirect return:', { isDeepLink, isAuthHandler, url });
            
            // Check redirect result (non-blocking with timeout)
            const redirectPromise = handleGoogleRedirect();
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
            
            const result = await Promise.race([redirectPromise, timeoutPromise]).catch(() => null);
            
            if (result && result.success && result.user) {
              console.log('✅ Google Sign-In successful via redirect, navigating to dashboard');
              navigate('/dashboard', { replace: true });
            } else if (result && result.error && !result.isNormalLoad) {
              console.warn('⚠️ Google redirect handling:', result.error || 'No redirect pending');
              
              // If on auth handler, navigate back to signup
              if (isAuthHandler) {
                console.log('🔄 Navigating back to signup');
                navigate('/signup', { replace: true });
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error handling Google redirect:', error);
        // Don't block app - just log the error
      }
    };
    
    // Run asynchronously after app has rendered (don't block startup)
    // Increased delay to ensure splash screen can navigate first
    setTimeout(handleAuthRedirect, 3000);
    
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
    
    // Cleanup
    return () => {
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

