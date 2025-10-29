import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser, signInWithGoogle } from '../services/authService';
import Shuffle from './ShuffleAdvanced';
import LaserFlow from './LaserFlow';

const SignupPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  // Words for the shuffle text animation
  const shuffleWords = ['Feel', 'Reflect', 'Heal', 'Deite'];

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        if (result.redirecting) {
          // User is being redirected to Google - navigation will happen automatically
          // App.js will handle the redirect result when user returns
          console.log('🔄 Redirecting to Google sign-in...');
          // Optionally show a message or loading state
          return;
        } else if (result.user) {
          // Popup sign-in successful (desktop)
          console.log('✅ Google Sign-In successful:', result.user);
          navigate('/dashboard');
        }
      } else {
        console.error('❌ Google Sign-In failed:', result.error);
        alert('Failed to sign in with Google: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error during Google Sign-In:', error);
      alert('An error occurred during Google Sign-In');
    }
  };

  useEffect(() => {
    // Trigger fade-in animation on component mount
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // Change shuffle word every 2.5 seconds
    const interval = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % shuffleWords.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [shuffleWords.length]);

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden transition-all duration-1000 background-animated ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 2 }}>
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: 'white',
              boxShadow: `0 0 ${Math.random() * 10 + 2}px rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`,
              animation: `twinkle ${Math.random() * 5 + 3}s ease-in-out ${Math.random() * 5}s infinite`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
        </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Centered glowing logo */}
      <div className="flex-1 flex items-center justify-center mobile-container relative" style={{ zIndex: 10 }}>
          <div className="relative">
          {/* Outer glow ring */}
            <div
            className={`absolute inset-0 rounded-full animate-pulse transition-all duration-2000 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
              style={{
              background: 'radial-gradient(circle, rgba(139, 195, 74, 0.3) 0%, transparent 70%)',
              width: '200px',
              height: '200px',
              filter: 'blur(20px)',
            }}
          />

          {/* Inner logo circle */}
          <div
            className={`relative mobile-logo rounded-full flex items-center justify-center transition-all duration-1500 delay-300 logo-glow ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          >
            <div className="text-3xl font-bold tracking-wider">
              <Shuffle
                key={currentWordIndex}
                text={shuffleWords[currentWordIndex]}
                shuffleDirection="right"
                duration={0.9}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.07}
                threshold={0}
                rootMargin="0px"
                triggerOnce={false}
                triggerOnHover={false}
                respectReducedMotion={true}
                tag="span"
                style={{
                  background: 'linear-gradient(135deg, #8BC34A 0%, #A5D6A7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                }}
                className="shuffle-text"
              />
            </div>
            </div>
          </div>
        </div>

      {/* LaserFlow Background - centered with tail at top */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: '140vh',
          overflow: 'visible',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      >
        <LaserFlow
          horizontalBeamOffset={0.0}
          verticalBeamOffset={0.2}
          color="#8BC34A"
        />
      </div>

      {/* Bottom card with buttons */}
      <div style={{ position: 'relative', width: '100%' }}>

        <div
          className={`mobile-container mb-8 rounded-3xl p-6 transition-all duration-1000 delay-700 card-float ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            position: 'relative'
          }}
        >
          <div className="space-y-4">
          {/* Continue with Google */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full mobile-button rounded-2xl font-semibold text-gray-800 transition-all duration-300 hover:scale-[0.98] active:scale-[0.96] flex items-center justify-center gap-3"
            style={{
              background: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

          {/* Sign up */}
          <button
            className="w-full mobile-button rounded-2xl font-semibold transition-all duration-300 hover:scale-[0.98] active:scale-[0.96]"
              style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              }}
            >
              Sign up
            </button>

          {/* Log in */}
          <button
            className="w-full mobile-button rounded-2xl font-semibold transition-all duration-300 hover:scale-[0.98] active:scale-[0.96]"
            style={{
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
            }}
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
