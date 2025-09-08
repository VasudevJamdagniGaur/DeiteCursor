import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, signOutUser } from '../services/authService';
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Edit3,
  Save,
  X,
  Heart,
  Sparkles,
  Star,
  Trash2,
  AlertTriangle,
  LogOut,
  Shield,
  Settings
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    age: '',
    gender: '',
    bio: ''
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setEditData({
        displayName: currentUser.displayName || '',
        age: localStorage.getItem(`user_age_${currentUser.uid}`) || '',
        gender: localStorage.getItem(`user_gender_${currentUser.uid}`) || '',
        bio: localStorage.getItem(`user_bio_${currentUser.uid}`) || ''
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Since Firebase Auth doesn't store custom profile data, 
      // we'll use localStorage for this demo
      localStorage.setItem(`user_age_${user.uid}`, editData.age);
      localStorage.setItem(`user_gender_${user.uid}`, editData.gender);
      localStorage.setItem(`user_bio_${user.uid}`, editData.bio);

      setIsEditing(false);
      
      // Show success message
      setTimeout(() => {
        alert('Profile updated successfully! ✨');
      }, 100);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      displayName: user?.displayName || '',
      age: localStorage.getItem(`user_age_${user?.uid}`) || '',
      gender: localStorage.getItem(`user_gender_${user?.uid}`) || '',
      bio: localStorage.getItem(`user_bio_${user?.uid}`) || ''
    });
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/landing');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleteLoading(true);
    try {
      // Clear local storage data
      localStorage.removeItem(`user_age_${user.uid}`);
      localStorage.removeItem(`user_gender_${user.uid}`);
      localStorage.removeItem(`user_bio_${user.uid}`);
      
      // Sign out and redirect
      await signOutUser();
      alert('Account data cleared successfully.');
      navigate('/landing');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getGenderEmoji = (gender) => {
    switch (gender) {
      case 'female': return '👩';
      case 'male': return '👨';
      case 'other': return '🌈';
      default: return '👤';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!user) return null;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: isDarkMode 
          ? "linear-gradient(to bottom, #0B0E14 0%, #1C1F2E 100%)"
          : "#FAFAF8",
      }}
    >
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-8 opacity-10">
          <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
        </div>
        <div className="absolute top-16 right-12 opacity-12">
          <Sparkles className="w-7 h-7 text-purple-400 animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute bottom-24 left-16 opacity-11">
          <Star className="w-5 h-5 text-blue-400 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-8">
          <Star className="w-4 h-4 text-yellow-400 animate-bounce" style={{ animationDelay: '2s', animationDuration: '4s' }} />
        </div>
        <div className="absolute bottom-1/3 left-1/5 opacity-9">
          <Heart className="w-5 h-5 text-cyan-400 animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "rgba(28, 31, 46, 0.4)",
              boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.15), 0 8px 32px rgba(125, 211, 192, 0.1)",
              border: "1px solid rgba(125, 211, 192, 0.2)",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#7DD3C0" }} strokeWidth={1.5} />
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Your Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            boxShadow: "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 16px 48px rgba(125, 211, 192, 0.08)",
            border: "1px solid rgba(125, 211, 192, 0.18)",
          }}
        >
          {/* Profile Header */}
          <div className="text-center pb-6 border-b border-gray-700/30">
            <div className="flex justify-center mb-4">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(125, 211, 192, 0.8) 0%, rgba(212, 175, 55, 0.8) 50%, rgba(155, 181, 255, 0.8) 100%)",
                  boxShadow: "0 8px 32px rgba(125, 211, 192, 0.3)",
                }}
              >
                {getInitials(user.displayName)}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {user.displayName || 'User'}
            </h2>
            <p className="text-gray-300 text-sm">
              {user.email}
            </p>
          </div>

          {!isEditing ? (
            <>
              {/* Display Mode */}
              <div className="space-y-4 mt-6">
                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(11, 14, 20, 0.4)",
                    border: "1px solid rgba(155, 181, 255, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">Display Name</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {user.displayName || 'Not set'}
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(11, 14, 20, 0.4)",
                    border: "1px solid rgba(155, 181, 255, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">Age</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {editData.age ? `${editData.age} years old` : 'Not set'}
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(11, 14, 20, 0.4)",
                    border: "1px solid rgba(155, 181, 255, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">Gender</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getGenderEmoji(editData.gender)} {editData.gender || 'Not set'}
                    </span>
                  </div>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "rgba(11, 14, 20, 0.4)",
                    border: "1px solid rgba(155, 181, 255, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-300">About Me</span>
                  </div>
                  <p className="text-white">
                    {editData.bio || 'No bio added yet'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 py-3 px-4 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(125, 211, 192, 0.8) 0%, rgba(212, 175, 55, 0.8) 50%, rgba(155, 181, 255, 0.8) 100%)",
                  color: "#0B0E14",
                }}
              >
                <Edit3 className="w-4 h-4 inline mr-2" />
                Edit Profile
              </button>
            </>
          ) : (
            <>
              {/* Edit Mode */}
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block mb-2 font-medium text-gray-300">Age</label>
                  <input
                    type="number"
                    value={editData.age}
                    onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    style={{
                      backgroundColor: "rgba(11, 14, 20, 0.6)",
                      border: "1px solid rgba(155, 181, 255, 0.15)",
                    }}
                    placeholder="Enter your age"
                    min="13"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block mb-3 font-medium text-gray-300">Gender</label>
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
                          checked={editData.gender === option.value}
                          onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                          className="sr-only"
                        />
                        <div
                          className={`p-3 text-center rounded-xl border-2 transition-all duration-300 font-medium ${
                            editData.gender === option.value
                              ? 'border-purple-400 text-white'
                              : 'border-gray-600 text-gray-300 hover:border-gray-500'
                          }`}
                          style={{
                            backgroundColor: editData.gender === option.value 
                              ? "rgba(125, 211, 192, 0.2)" 
                              : "rgba(11, 14, 20, 0.4)",
                          }}
                        >
                          {option.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-2 font-medium text-gray-300">About Me</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 h-24 resize-none"
                    style={{
                      backgroundColor: "rgba(11, 14, 20, 0.6)",
                      border: "1px solid rgba(155, 181, 255, 0.15)",
                    }}
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(16, 185, 129, 0.8) 100%)",
                  }}
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-300 border border-gray-600 hover:bg-gray-700/20 transition-all duration-300"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Actions Card */}
        <div
          className="backdrop-blur-lg border rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            border: "1px solid rgba(155, 181, 255, 0.18)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Account Actions
          </h3>

          <button
            onClick={handleSignOut}
            className="w-full p-4 rounded-xl text-left hover:opacity-80 transition-all duration-300 border border-gray-600"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="font-medium text-white">Sign Out</p>
                <p className="text-sm text-gray-400">Sign out of your account</p>
              </div>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.1)",
          }}
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)",
                  boxShadow: "0 8px 32px rgba(239, 68, 68, 0.3)",
                }}
              >
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Danger Zone</h3>
            <p className="text-gray-300 mb-6">
              Delete your account permanently
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)",
                }}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-xl border-2 border-dashed border-red-500/50"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                  }}
                >
                  <p className="text-sm text-red-300 mb-4">
                    <strong>Warning:</strong> This will clear your profile data, but your account will remain active. You can always add new information later.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 py-2 px-4 rounded-xl font-medium text-white transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)",
                      }}
                    >
                      {deleteLoading ? 'Clearing...' : 'Yes, Clear Data'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-300 border border-gray-600 hover:bg-gray-700/20 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
