import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Brain, Heart, Star } from "lucide-react";
import { getCurrentUser, onAuthStateChange } from '../services/authService';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    console.log('🎬 SplashScreen mounted - checking authentication status');
    
    let navigationTimeout = null;
    let authUnsubscribe = null;
    let hasNavigated = false;

    const navigateToDestination = (user) => {
      if (hasNavigated) return; // Prevent multiple navigations
      hasNavigated = true;
      
      // Clear timeout and unsubscribe
      if (navigationTimeout) clearTimeout(navigationTimeout);
      if (authUnsubscribe) authUnsubscribe();
      
      try {
        if (user) {
          console.log('✅ User is logged in - navigating to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('ℹ️ No user found - navigating to landing page');
          navigate('/landing', { replace: true });
        }
        setHasCheckedAuth(true);
      } catch (error) {
        console.error('❌ Navigation error:', error);
        // Fallback: navigate to landing page
        navigate('/landing', { replace: true });
      }
    };

    // Check auth state immediately
    const initialUser = getCurrentUser();
    if (initialUser) {
      // User is already authenticated, navigate after splash screen
      console.log('✅ User found on mount - will navigate to dashboard after splash');
      navigationTimeout = setTimeout(() => navigateToDestination(initialUser), 2000);
    } else {
      // Listen for auth state changes (handles async auth state restoration)
      console.log('🔍 No user found initially - listening for auth state changes');
      authUnsubscribe = onAuthStateChange((user) => {
        console.log('🔄 Auth state changed in SplashScreen:', user ? 'User authenticated' : 'User signed out');
        if (!hasNavigated) {
          // Navigate immediately if user is authenticated, or wait for splash screen
          if (user) {
            navigationTimeout = setTimeout(() => navigateToDestination(user), 2000);
          } else {
            // Wait a bit longer if no user, in case auth state is still loading
            navigationTimeout = setTimeout(() => navigateToDestination(null), 2500);
          }
        }
      });

      // Fallback: If no auth state change occurs within 3 seconds, navigate to landing
      navigationTimeout = setTimeout(() => {
        if (!hasNavigated) {
          console.log('⏰ Timeout reached (3s) - navigating to landing page');
          navigateToDestination(null);
        }
      }, 3000);
    }

    return () => {
      console.log('🧹 SplashScreen cleanup');
      if (navigationTimeout) clearTimeout(navigationTimeout);
      if (authUnsubscribe) authUnsubscribe();
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "#202124",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-16 opacity-8">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none" stroke="#81C995" strokeWidth="0.4">
            <path d="M15 35c0-12 8-20 20-20s20 8 20 20c0 6-4 12-10 16H25c-6-4-10-10-10-16z" />
            <path d="M50 28c0-8 6-14 14-14s14 6 14 14c0 4-2 8-6 10H56c-4-2-6-6-6-10z" />
            <path d="M80 22c0-6 4-10 10-10s10 4 10 10c0 3-1 6-4 8H84c-3-2-4-5-4-8z" />
          </svg>
        </div>

        <div className="absolute top-40 right-20 opacity-7">
          <svg width="100" height="45" viewBox="0 0 100 45" fill="none" stroke="#FDD663" strokeWidth="0.3">
            <path d="M10 28c0-10 6-16 16-16s16 6 16 16c0 5-3 10-8 13H18c-5-3-8-8-8-13z" />
            <path d="M40 22c0-8 5-12 12-12s12 4 12 12c0 4-2 8-5 10H45c-3-2-5-6-5-10z" />
            <path d="M70 18c0-6 4-10 10-10s10 4 10 10c0 3-1 6-4 8H74c-3-2-4-5-4-8z" />
          </svg>
        </div>

        <div className="absolute bottom-32 left-12 opacity-9">
          <svg width="140" height="55" viewBox="0 0 140 55" fill="none" stroke="#8AB4F8" strokeWidth="0.4">
            <path d="M12 33c0-11 7-18 18-18s18 7 18 33c0 5.5-3 11-8 14H20c-5-3-8-8.5-8-14z" />
            <path d="M45 26c0-8 5-13 13-13s13 5 13 26c0 4-2 8-5 10H50c-3-2-5-6-5-10z" />
            <path d="M80 20c0-6 4-10 10-10s10 4 10 20c0 3-1 6-4 8H84c-3-2-4-5-4-8z" />
          </svg>
        </div>

        <div className="absolute top-60 left-8 opacity-6">
          <svg width="200" height="25" viewBox="0 0 200 25" fill="none" stroke="#81C995" strokeWidth="0.5">
            <path d="M4 12.5c16-6 32 6 48-6s32 6 48-6s32 6 48-6s32 6 48 6" />
            <path d="M10 8c12-4 24 4 36-4s24 4 36-4s24 4 36-4s24 4 36 4" opacity="0.3" />
            <circle cx="30" cy="6" r="1" fill="#81C995" opacity="0.2" />
            <circle cx="90" cy="18" r="1" fill="#81C995" opacity="0.2" />
            <circle cx="150" cy="10" r="1" fill="#81C995" opacity="0.2" />
          </svg>
        </div>

        <div className="absolute bottom-48 right-16 opacity-7">
          <svg width="180" height="30" viewBox="0 0 180 30" fill="none" stroke="#FDD663" strokeWidth="0.4">
            <path d="M6 15c14-5 28 5 42-5s28 5 42-5s28 5 42-5s28 5 42 5" />
            <path d="M16 10c10-3 20 3 30-3s20 3 30-3s20 3 30-3s20 3 30 3" opacity="0.4" />
            <circle cx="50" cy="12" r="0.8" fill="#FDD663" opacity="0.3" />
            <circle cx="110" cy="18" r="0.8" fill="#FDD663" opacity="0.3" />
          </svg>
        </div>

        <Heart
          className="absolute top-1/4 left-1/6 w-4 h-4 animate-bounce opacity-20"
          style={{ color: "#81C995", animationDelay: "0s", animationDuration: "3s" }}
        />
        <Heart
          className="absolute top-3/4 right-1/5 w-3 h-3 animate-bounce opacity-15"
          style={{ color: "#FDD663", animationDelay: "1.5s", animationDuration: "4s" }}
        />
        <Heart
          className="absolute bottom-1/3 left-3/4 w-5 h-5 animate-bounce opacity-18"
          style={{ color: "#8AB4F8", animationDelay: "2.8s", animationDuration: "3.5s" }}
        />
        <Heart
          className="absolute top-1/8 right-1/6 w-3 h-3 animate-bounce opacity-16"
          style={{ color: "#81C995", animationDelay: "4.2s", animationDuration: "3.8s" }}
        />
        <Heart
          className="absolute bottom-1/6 left-1/8 w-4 h-4 animate-bounce opacity-17"
          style={{ color: "#FDD663", animationDelay: "0.8s", animationDuration: "4.5s" }}
        />

        <Star
          className="absolute top-1/6 right-1/3 w-3 h-3 animate-pulse opacity-22"
          style={{ color: "#8AB4F8", animationDelay: "0.5s", animationDuration: "2.5s" }}
        />
        <Star
          className="absolute bottom-1/4 left-1/4 w-4 h-4 animate-pulse opacity-19"
          style={{ color: "#81C995", animationDelay: "1.8s", animationDuration: "3s" }}
        />
        <Star
          className="absolute top-2/3 left-1/8 w-3 h-3 animate-pulse opacity-16"
          style={{ color: "#FDD663", animationDelay: "3.2s", animationDuration: "2.8s" }}
        />
        <Star
          className="absolute top-1/3 right-1/8 w-3 h-3 animate-pulse opacity-14"
          style={{ color: "#8AB4F8", animationDelay: "2.2s", animationDuration: "3.3s" }}
        />
        <Star
          className="absolute bottom-1/8 right-2/3 w-4 h-4 animate-pulse opacity-18"
          style={{ color: "#81C995", animationDelay: "3.8s", animationDuration: "2.7s" }}
        />
        <Star
          className="absolute top-5/6 left-2/3 w-3 h-3 animate-pulse opacity-15"
          style={{ color: "#FDD663", animationDelay: "1.3s", animationDuration: "3.1s" }}
        />
      </div>

      <div className="relative z-10 fade-in">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Brain className="w-12 h-12 relative z-10" style={{ color: "#8AB4F8" }} strokeWidth={1.5} />
        </div>
        
        {/* Loading indicator */}
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: "rgba(129, 201, 149, 0.3)" }}>
            <div 
              className="h-full rounded-full animate-pulse"
              style={{ 
                backgroundColor: "#81C995",
                width: "100%",
                animation: "pulse 1.5s ease-in-out infinite"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

