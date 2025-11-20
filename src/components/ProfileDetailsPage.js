import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signUpUser, getCurrentUser } from '../services/authService';
import LaserFlow from './LaserFlow';

const ProfileDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [aboutYou, setAboutYou] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get email and password from navigation state
  const email = location.state?.email;
  const password = location.state?.password;

  useEffect(() => {
    // If no email/password, redirect back to signup
    if (!email || !password) {
      navigate('/signup/email', { replace: true });
    }
  }, [email, password, navigate]);

  const validate = () => {
    if (!name.trim()) return 'Please enter your name.';
    if (!age.trim()) return 'Please enter your age.';
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) return 'Please enter a valid age (13-120).';
    if (!gender) return 'Please select your gender.';
    if (!aboutYou.trim()) return 'Please tell us about yourself.';
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

      // Create the account with name as displayName
      const result = await signUpUser(email, password, name.trim());
      
      if (result.success) {
        // Get the current user to save profile data
        const user = getCurrentUser();
        if (user) {
          // Save profile data to localStorage (used by deite context and profile page)
          localStorage.setItem(`user_age_${user.uid}`, age.trim());
          localStorage.setItem(`user_gender_${user.uid}`, gender);
          localStorage.setItem(`user_bio_${user.uid}`, aboutYou.trim());
          
          console.log('✅ Profile data saved:', {
            name: name.trim(),
            age: age.trim(),
            gender: gender,
            aboutYou: aboutYou.trim()
          });
        }

        // Navigate to dashboard
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

      {/* LaserFlow Background */}
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

      {/* Centered card */}
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
          <h1 className="text-xl font-semibold mb-6" style={{ color: 'white' }}>Tell us about yourself</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mobile-button mobile-input w-full px-4 py-3 rounded-xl text-base"
                style={{ 
                  fontSize: '16px',
                  minHeight: '48px'
                }}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mobile-button mobile-input w-full px-4 py-3 rounded-xl text-base"
                style={{ 
                  fontSize: '16px',
                  minHeight: '48px'
                }}
                placeholder="Your age"
                min="13"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm mb-3" style={{ color: '#cbd5e1' }}>Gender</label>
              <div className="space-y-2">
                {[
                  { value: 'female', label: 'Female 👩' },
                  { value: 'male', label: 'Male 👨' },
                  { value: 'other', label: 'Other 🌈' },
                ].map((option) => (
                  <label key={option.value} className="cursor-pointer block">
                    <input
                      type="radio"
                      name="gender"
                      value={option.value}
                      checked={gender === option.value}
                      onChange={(e) => setGender(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`p-3 text-center rounded-xl border-2 transition-all duration-300 font-medium ${
                        gender === option.value
                          ? 'border-purple-400 text-white'
                          : 'border-gray-600 text-gray-300 hover:border-gray-500'
                      }`}
                      style={{
                        backgroundColor: gender === option.value
                          ? "rgba(129, 201, 149, 0.2)"
                          : "rgba(42, 42, 45, 0.6)",
                      }}
                    >
                      {option.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>About you</label>
              <textarea
                value={aboutYou}
                onChange={(e) => setAboutYou(e.target.value)}
                className="mobile-button mobile-input w-full px-4 py-3 rounded-xl text-base resize-none"
                style={{ 
                  fontSize: '16px',
                  minHeight: '100px'
                }}
                placeholder="Tell us a bit about yourself..."
                rows="4"
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
              onClick={() => navigate('/signup/email')}
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

export default ProfileDetailsPage;

