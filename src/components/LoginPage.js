import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Brain, Heart, Star, Mail, Lock } from "lucide-react";
import { signInUser } from '../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await signInUser(formData.email, formData.password);
      
      if (result.success) {
        console.log('User signed in successfully:', result.user);
        navigate('/dashboard');
      } else {
        setErrors({ general: result.error });
      }
    } catch (err) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupRedirect = () => {
    navigate('/signup');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden slide-up"
      style={{
        background: "linear-gradient(to bottom, #0B0E14 0%, #1C1F2E 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-16 left-12 opacity-8">
          <svg width="100" height="50" viewBox="0 0 100 50" fill="none" stroke="#7DD3C0" strokeWidth="0.4">
            <path d="M12 30c0-10 6-16 16-16s16 6 16 30c0 5-3 10-8 13H20c-5-3-8-8-8-13z" />
            <path d="M40 25c0-8 5-12 12-12s12 4 12 25c0 4-2 8-5 10H45c-3-2-5-6-5-10z" />
            <path d="M70 20c0-6 4-10 10-10s10 4 10 20c0 3-1 6-4 8H74c-3-2-4-5-4-8z" />
          </svg>
        </div>

        <div className="absolute top-60 right-16 opacity-7">
          <svg width="120" height="45" viewBox="0 0 120 45" fill="none" stroke="#D4AF37" strokeWidth="0.3">
            <path d="M15 27c0-9 5.5-14.5 14.5-14.5s14.5 5.5 14.5 27c0 4.5-2.25 9-7.25 11.25H22.25c-5-2.25-7.25-6.75-7.25-11.25z" />
            <path d="M45 22c0-7 4.5-10.5 10.5-10.5s10.5 3.5 10.5 22c0 3.5-1.75 7-5.25 8.75H50.25c-3.5-1.75-5.25-5.25-5.25-8.75z" />
            <path d="M75 18c0-5.5 3.5-9 9-9s9 3.5 9 18c0 2.75-0.75 5.5-3.5 7H78.5c-2.75-1.5-3.5-4.25-3.5-7z" />
          </svg>
        </div>

        <div className="absolute bottom-32 left-8 opacity-9">
          <svg width="90" height="35" viewBox="0 0 90 35" fill="none" stroke="#9BB5FF" strokeWidth="0.4">
            <path d="M10 21c0-8.5 5-13.5 13.5-13.5s13.5 5 13.5 21c0 4.25-2.5 8.5-6.75 11H16.75c-4.25-2.5-6.75-6.75-6.75-11z" />
            <path d="M35 17c0-6.5 4-10 10-10s10 3.5 10 17c0 3.25-1.5 6.5-4.5 8H39.5c-3-1.5-4.5-4.75-4.5-8z" />
            <path d="M60 14c0-5 3-8 8-8s8 3 8 14c0 2.5-0.5 5-3 6.5H63c-2.5-1.5-3-4-3-6.5z" />
          </svg>
        </div>

        <div className="absolute top-40 left-20 opacity-6">
          <svg width="160" height="18" viewBox="0 0 160 18" fill="none" stroke="#7DD3C0" strokeWidth="0.5">
            <path d="M4 9c12-4 24 4 36-4s24 4 36-4s24 4 36-4s24 4 36 4" />
            <path d="M10 6c8-2.5 16 2.5 24-2.5s16 2.5 24-2.5s16 2.5 24-2.5s16 2.5 24 2.5" opacity="0.4" />
            <circle cx="25" cy="7" r="0.6" fill="#7DD3C0" opacity="0.3" />
            <circle cx="75" cy="11" r="0.6" fill="#7DD3C0" opacity="0.3" />
            <circle cx="125" cy="8" r="0.6" fill="#7DD3C0" opacity="0.3" />
          </svg>
        </div>

        <div className="absolute bottom-48 right-12 opacity-7">
          <svg width="140" height="22" viewBox="0 0 140 22" fill="none" stroke="#D4AF37" strokeWidth="0.4">
            <path d="M5 11c10-3.5 20 3.5 30-3.5s20 3.5 30-3.5s20 3.5 30-3.5s20 3.5 30 3.5" />
            <path d="M12 7c7-2 14 2 21-2s14 2 21-2s14 2 21-2s14 2 21 2" opacity="0.5" />
            <circle cx="40" cy="9" r="0.5" fill="#D4AF37" opacity="0.4" />
            <circle cx="90" cy="13" r="0.5" fill="#D4AF37" opacity="0.4" />
          </svg>
        </div>

        <Heart
          className="absolute top-1/5 left-1/8 w-4 h-4 animate-bounce opacity-12"
          style={{ color: "#7DD3C0", animationDelay: "0.3s", animationDuration: "4s" }}
        />
        <Heart
          className="absolute top-2/3 right-1/6 w-3 h-3 animate-bounce opacity-15"
          style={{ color: "#D4AF37", animationDelay: "2s", animationDuration: "3.5s" }}
        />
        <Heart
          className="absolute bottom-1/4 right-3/4 w-5 h-5 animate-bounce opacity-13"
          style={{ color: "#9BB5FF", animationDelay: "1.2s", animationDuration: "3.8s" }}
        />

        <Star
          className="absolute top-1/8 right-1/4 w-3 h-3 animate-pulse opacity-18"
          style={{ color: "#D4AF37", animationDelay: "0.8s", animationDuration: "2.8s" }}
        />
        <Star
          className="absolute bottom-1/3 left-1/5 w-4 h-4 animate-pulse opacity-14"
          style={{ color: "#9BB5FF", animationDelay: "2.5s", animationDuration: "3.2s" }}
        />
        <Star
          className="absolute top-3/4 left-2/3 w-3 h-3 animate-pulse opacity-16"
          style={{ color: "#7DD3C0", animationDelay: "1.7s", animationDuration: "2.5s" }}
        />
      </div>

      <div className="flex flex-col items-center text-center space-y-8 relative z-10 max-w-md w-full">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center relative overflow-hidden backdrop-blur-lg"
            style={{
              backgroundColor: "rgba(28, 31, 46, 0.4)",
              boxShadow: "inset 0 0 25px rgba(125, 211, 192, 0.15), 0 12px 40px rgba(125, 211, 192, 0.1)",
              border: "1px solid rgba(125, 211, 192, 0.2)",
            }}
          >
            <Brain className="w-10 h-10 relative z-10" style={{ color: "#7DD3C0" }} strokeWidth={1.5} />
          </div>
        </div>

        <div
          className="w-full rounded-2xl p-8 border backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            boxShadow: "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 16px 48px rgba(125, 211, 192, 0.08)",
            border: "1px solid rgba(125, 211, 192, 0.18)",
          }}
        >
          <h1 className="text-2xl font-bold text-white mb-6">Log In</h1>

          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: "#7DD3C0" }}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 text-white placeholder-gray-400 backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(11, 14, 20, 0.6)",
                  border: `1px solid ${errors.email ? '#ff6b6b' : 'rgba(155, 181, 255, 0.15)'}`,
                  boxShadow: "inset 0 0 20px rgba(155, 181, 255, 0.08)",
                }}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: "#D4AF37" }}
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 text-white placeholder-gray-400 backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(11, 14, 20, 0.6)",
                  border: `1px solid ${errors.password ? '#ff6b6b' : 'rgba(155, 181, 255, 0.15)'}`,
                  boxShadow: "inset 0 0 20px rgba(155, 181, 255, 0.08)",
                }}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 mt-6 backdrop-blur-lg relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background:
                  "linear-gradient(135deg, rgba(125, 211, 192, 0.8) 0%, rgba(212, 175, 55, 0.8) 50%, rgba(155, 181, 255, 0.8) 100%)",
                boxShadow: "inset 0 0 30px rgba(255, 255, 255, 0.1), 0 16px 48px rgba(125, 211, 192, 0.2)",
                color: "#0B0E14",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              {loading ? 'Signing In...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              Don't have an account?{" "}
              <button 
                onClick={handleSignupRedirect}
                className="font-medium underline cursor-pointer hover:opacity-80" 
                style={{ color: "#7DD3C0" }}
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


