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
  Settings,
  Phone,
  MessageCircle,
  Camera,
  Image
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
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
      // Load profile picture from localStorage
      const savedPicture = localStorage.getItem(`user_profile_picture_${currentUser.uid}`);
      if (savedPicture) {
        setProfilePicture(savedPicture);
      }
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
      
      // Save profile picture if it exists
      if (profilePicture) {
        localStorage.setItem(`user_profile_picture_${user.uid}`, profilePicture);
        console.log('✅ Profile picture saved to localStorage');
      } else {
        // If profile picture was removed, clear it from localStorage
        localStorage.removeItem(`user_profile_picture_${user.uid}`);
        console.log('✅ Profile picture removed from localStorage');
      }

      // Trigger a custom event to notify other components (like Dashboard) of the change
      window.dispatchEvent(new Event('profilePictureUpdated'));

      setIsEditing(false);
      alert('Profile saved successfully!');
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
    // Reset profile picture to saved version
    const savedPicture = localStorage.getItem(`user_profile_picture_${user?.uid}`);
    setProfilePicture(savedPicture || null);
    setIsEditing(false);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    if (user) {
      localStorage.removeItem(`user_profile_picture_${user.uid}`);
    }
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
      localStorage.removeItem(`user_profile_picture_${user.uid}`);
      
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
          ? "#202124"
          : "#FAFAF8",
      }}
    >
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-8 opacity-10">
          <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
        </div>
        <div className="absolute top-16 right-12 opacity-12">
          <Sparkles className="w-7 h-7 animate-bounce" style={{ color: "#8AB4F8", animationDuration: '3s' }} />
        </div>
        <div className="absolute bottom-24 left-16 opacity-11">
          <Star className="w-5 h-5 animate-pulse" style={{ color: "#81C995", animationDelay: '1s' }} />
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-8">
          <Star className="w-4 h-4 animate-bounce" style={{ color: "#FDD663", animationDelay: '2s', animationDuration: '4s' }} />
        </div>
        <div className="absolute bottom-1/3 left-1/5 opacity-9">
          <Heart className="w-5 h-5 animate-pulse" style={{ color: "#F28B82", animationDelay: '1.5s' }} />
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#8AB4F8" }} strokeWidth={1.5} />
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Your Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Profile Header */}
          <div className="text-center pb-6 border-b border-gray-700/30">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white relative overflow-hidden"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.8)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(user.displayName)
                  )}
                </div>
                {/* Change Picture Button - Only show in edit mode */}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                    style={{
                      backgroundColor: "rgba(138, 180, 248, 0.9)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                      border: "2px solid rgba(42, 42, 45, 0.8)",
                    }}
                    title="Change profile picture"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </label>
                )}
                {/* Remove Picture Button - Only show in edit mode and if picture exists */}
                {isEditing && profilePicture && (
                  <button
                    onClick={handleRemoveProfilePicture}
                    className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                    style={{
                      backgroundColor: "rgba(242, 139, 130, 0.9)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                    title="Remove picture"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
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
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
                    backgroundColor: "rgba(42, 42, 45, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
                  backgroundColor: "rgba(42, 42, 45, 0.8)",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
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
                      backgroundColor: "rgba(42, 42, 45, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
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
              </div>

              <div className="mt-6">
                <label className="block mb-2 font-medium text-gray-300">About Me</label>
                <p className="text-white">
                  {editData.bio || 'No bio added yet'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  This section is captured during onboarding and can be updated through support if needed.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50"
                  style={{
                    backgroundColor: "rgba(42, 42, 45, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
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
        </div>

        {/* Static About Me Section */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-gray-300">About Me</span>
          </div>
          <p className="text-white mb-2">
            {editData.bio || 'No bio added yet'}
          </p>
          <p className="text-xs text-gray-400">
            This section is captured during onboarding and can be updated through support if needed.
          </p>
        </div>

        {/* Actions Card */}
        <div
          )}
        </div>

        {/* Actions Card */}
        <div
          className="backdrop-blur-lg border rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: "#8AB4F8" }} />
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
              <LogOut className="w-5 h-5 text-white" />
              <div>
                <p className="font-medium text-white">Sign Out</p>
                <p className="text-sm text-gray-400">Sign out of your account</p>
              </div>
            </div>
          </button>
        </div>

        {/* Helpdesk Section */}
        <div
          className="backdrop-blur-lg border rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            border: "1px solid rgba(129, 201, 149, 0.15)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-white" />
            Helpdesk
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            Contact our founders for support and assistance
          </p>

          <button
            onClick={() => window.open('tel:9536138120', '_self')}
            className="w-full p-4 rounded-xl text-left hover:opacity-80 transition-all duration-300 border border-gray-600"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-white" />
              <div>
                <p className="font-medium text-white">Call Founders</p>
                <p className="text-sm text-gray-400">Call us at +91 9536138120</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.open('https://wa.me/919536138120', '_blank')}
            className="w-full p-4 rounded-xl text-left hover:opacity-80 transition-all duration-300 border border-gray-600"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.4)",
            }}
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-white" />
              <div>
                <p className="font-medium text-white">WhatsApp Message</p>
                <p className="text-sm text-gray-400">Send us a message on WhatsApp</p>
              </div>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div
          className="backdrop-blur-lg border-2 rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            border: "1px solid rgba(242, 139, 130, 0.15)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(242, 139, 130, 0.8)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Danger Zone</h3>
            <p className="text-gray-300 mb-6">
              Clear your account data permanently
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-all duration-300"
                style={{
                  backgroundColor: "rgba(242, 139, 130, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Clear Account Data
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-xl border-2 border-dashed border-red-500/50"
                  style={{
                    backgroundColor: "rgba(242, 139, 130, 0.08)",
                    border: "1px solid rgba(242, 139, 130, 0.15)",
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
                        backgroundColor: "rgba(242, 139, 130, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
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
