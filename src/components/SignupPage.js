import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser } from '../services/authService';

import { Brain, Heart, Star, Mail, Lock, User, Eye, EyeOff, Shield, TrendingUp, BookOpen, Users } from 'lucide-react';

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
      className="min-h-screen flex flex-col relative overflow-hidden"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center text-center space-y-8">
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

          <h1 className="text-3xl font-bold text-white mb-8">Create your deite account</h1>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <div
              className="rounded-xl p-6 border backdrop-blur-lg relative overflow-hidden hover:shadow-md transition-all duration-300"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.6)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(129, 201, 149, 0.8)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Private and Secure</h3>
              <p className="text-sm text-gray-300">Your emotional journey is protected with end-to-end encryption</p>
            </div>

            <div
              className="rounded-xl p-6 border backdrop-blur-lg relative overflow-hidden hover:shadow-md transition-all duration-300"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.6)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(253, 214, 99, 0.8)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <TrendingUp className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Track emotional growth</h3>
              <p className="text-sm text-gray-300">Monitor your progress and celebrate your emotional milestones</p>
            </div>

            <div
              className="rounded-xl p-6 border backdrop-blur-lg relative overflow-hidden hover:shadow-md transition-all duration-300"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.6)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(138, 180, 248, 0.8)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <BookOpen className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Journaling</h3>
              <p className="text-sm text-gray-300">Express your thoughts and feelings in a safe, private space</p>
            </div>

            <div
              className="rounded-xl p-6 border backdrop-blur-lg relative overflow-hidden hover:shadow-md transition-all duration-300"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.6)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(242, 139, 130, 0.8)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Users className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Mental Support</h3>
              <p className="text-sm text-gray-300">Access resources and guidance for your mental wellness journey</p>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8 border backdrop-blur-lg relative overflow-hidden"
            style={{
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <h2 className="text-2xl font-bold mb-6 text-white">Create Account</h2>

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

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <button className="w-full py-3 px-4 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
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

            <button className="w-full py-3 px-4 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300"
              style={{
                backgroundColor: "rgba(42, 42, 45, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              Sign up
            </button>

            <button className="w-full py-3 px-4 rounded-xl font-semibold text-gray-300 border border-gray-600 hover:bg-gray-700/20 transition-all duration-300"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
