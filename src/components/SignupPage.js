import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpUser } from '../services/authService';

import { Brain, Heart, Star, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await signUpUser(formData.email, formData.password, formData.name);
      
      if (result.success) {
        console.log('User created successfully:', result.user);
        // Redirect to dashboard or welcome page
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden slide-up"
      style={{
        background: "#202124",
      }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-16 left-12 opacity-8">
            <svg width="100" height="50" viewBox="0 0 100 50" fill="none" stroke="#8AB4F8" strokeWidth="0.4">
              <path d="M12 30c0-10 6-16 16-16s16 6 16 30c0 5-3 10-8 13H20c-5-3-8-8-8-13z" />
              <path d="M40 25c0-8 5-12 12-12s12 4 12 25c0 4-2 8-5 10H45c-3-2-5-6-5-10z" />
              <path d="M70 20c0-6 4-10 10-10s10 4 10 20c0 3-1 6-4 8H74c-3-2-4-5-4-8z" />
            </svg>
          </div>

          <div className="absolute top-60 right-16 opacity-7">
            <svg width="120" height="45" viewBox="0 0 120 45" fill="none" stroke="#FDD663" strokeWidth="0.3">
              <path d="M15 27c0-9 5.5-14.5 14.5-14.5s14.5 5.5 14.5 27c0 4.5-2.25 9-7.25 11.25H22.25c-5-2.25-7.25-6.75-7.25-11.25z" />
              <path d="M45 22c0-7 4.5-10.5 10.5-10.5s10.5 3.5 10.5 22c0 3.5-1.75 7-5.25 8.75H50.25c-3.5-1.75-5.25-5.25-5.25-8.75z" />
            </svg>
          </div>

          <div className="absolute bottom-32 left-8 opacity-9">
            <svg width="90" height="35" viewBox="0 0 90 35" fill="none" stroke="#8AB4F8" strokeWidth="0.4">
              <path d="M10 21c0-8.5 5-13.5 13.5-13.5s13.5 5 13.5 21c0 4.25-2.5 8.5-6.75 11H16.75c-4.25-2.5-6.75-6.75-6.75-11z" />
            </svg>
          </div>

          <Heart
            className="absolute top-1/5 left-1/8 w-4 h-4 animate-bounce opacity-12"
            style={{ color: "#8AB4F8", animationDelay: "0.3s", animationDuration: "4s" }}
          />
          <Heart
            className="absolute top-2/3 right-1/6 w-3 h-3 animate-bounce opacity-15"
            style={{ color: "#FDD663", animationDelay: "2s", animationDuration: "3.5s" }}
          />
          <Heart
            className="absolute bottom-1/4 right-3/4 w-5 h-5 animate-bounce opacity-13"
            style={{ color: "#8AB4F8", animationDelay: "1.2s", animationDuration: "3.8s" }}
          />

          <Star
            className="absolute top-1/8 right-1/4 w-3 h-3 animate-pulse opacity-18"
            style={{ color: "#FDD663", animationDelay: "0.8s", animationDuration: "2.8s" }}
          />
          <Star
            className="absolute bottom-1/3 left-1/5 w-4 h-4 animate-pulse opacity-14"
            style={{ color: "#8AB4F8", animationDelay: "2.5s", animationDuration: "3.2s" }}
          />
          <Star
            className="absolute top-3/4 left-2/3 w-3 h-3 animate-pulse opacity-16"
            style={{ color: "#8AB4F8", animationDelay: "1.7s", animationDuration: "2.5s" }}
          />
        </div>

      <div className="flex flex-col items-center text-center space-y-8 relative z-10 max-w-md w-full">
        {/* Logo */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center relative overflow-hidden backdrop-blur-lg"
            style={{
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Brain className="w-10 h-10 relative z-10" style={{ color: "#8AB4F8" }} strokeWidth={1.5} />
          </div>
        </div>

        {/* Form Container */}
        <div
          className="w-full rounded-2xl p-8 border backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h1 className="text-2xl font-bold mb-6 text-white">Create Account</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: "#8AB4F8" }}
              />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 placeholder-gray-400 backdrop-blur-md text-white"
                style={{
                  backgroundColor: "rgba(42, 42, 45, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
              />
            </div>

            {/* Email Field */}
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: "#8AB4F8" }}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 placeholder-gray-400 backdrop-blur-md text-white"
                style={{
                  backgroundColor: "rgba(42, 42, 45, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: "#FDD663" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full pl-12 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 placeholder-gray-400 backdrop-blur-md text-white"
                style={{
                  backgroundColor: "rgba(42, 42, 45, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: "#FDD663" }}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                required
                className="w-full pl-12 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 placeholder-gray-400 backdrop-blur-md text-white"
                style={{
                  backgroundColor: "rgba(42, 42, 45, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 mt-6 backdrop-blur-lg relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.8)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                color: "#FFFFFF",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="font-medium underline cursor-pointer hover:opacity-80" 
                style={{ color: "#8AB4F8" }}
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
