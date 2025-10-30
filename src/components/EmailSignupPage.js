import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser } from '../services/authService';
import LaserFlow from './LaserFlow';

const EmailSignupPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Please enter your email.';
    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const result = await signUpUser(email.trim(), password, '');
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Sign up failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Stars background (same as SignupPage) */}
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

        /* Mobile input styling to match app UI */
        .mobile-input {
          background-color: rgba(42, 42, 45, 0.6);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        .mobile-input::placeholder {
          color: #9CA3AF; /* gray-400 */
        }
        .mobile-input:focus {
          outline: none;
          border-color: rgba(139, 195, 74, 0.35); /* #8BC34A accent */
          box-shadow: 0 0 0 2px rgba(139, 195, 74, 0.15), 0 4px 16px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {/* LaserFlow Background - centered with tail at top (same as SignupPage) */}
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

      {/* Centered card - Mobile optimized */}
      <div className="flex-1 flex items-center justify-center relative p-4" style={{ zIndex: 10 }}>
        <div
          className="mobile-container w-full max-w-md rounded-3xl"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            padding: '24px',
            marginBottom: '32px'
          }}
        >
        <h1 className="text-xl font-semibold mb-6" style={{ color: 'white' }}>Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mobile-button mobile-input w-full px-4 py-3 rounded-xl text-base"
              style={{ 
                fontSize: '16px',
                minHeight: '48px'
              }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mobile-button mobile-input w-full px-4 py-3 rounded-xl text-base"
              style={{ 
                fontSize: '16px',
                minHeight: '48px'
              }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mobile-button mobile-input w-full px-4 py-3 rounded-xl text-base"
              style={{ 
                fontSize: '16px',
                minHeight: '48px'
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="text-sm py-2" style={{ color: '#F28B82' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mobile-button w-full rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98]"
            style={{ 
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.9)',
              padding: '14px 16px',
              opacity: isSubmitting ? 0.7 : 1,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              minHeight: '48px',
              fontSize: '16px'
            }}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="mobile-button w-full rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98]"
            style={{ 
              background: 'transparent', 
              color: 'rgba(255, 255, 255, 0.9)', 
              padding: '14px 16px', 
              border: '1px solid rgba(255, 255, 255, 0.3)', 
              backdropFilter: 'blur(10px)',
              minHeight: '48px',
              fontSize: '16px'
            }}
          >
            Back
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default EmailSignupPage;


