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
  const [pendingPicture, setPendingPicture] = useState(null);
  const [showPicturePreview, setShowPicturePreview] = useState(false);
  const [bioLastUpdated, setBioLastUpdated] = useState(null);
  const [isBioUpdating, setIsBioUpdating] = useState(false);
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

      const savedBioUpdated = localStorage.getItem(`user_bio_updated_${currentUser.uid}`);
      if (savedBioUpdated) {
        setBioLastUpdated(savedBioUpdated);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      ensureDailyBioSummary();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const nextWindow = getNext2AM();
    const delay = nextWindow.getTime() - now.getTime();
    const timer = setTimeout(() => {
      const summary = generateAutoBioSummary();
      persistBioSummary(summary);
    }, delay);
    return () => clearTimeout(timer);
  }, [user, editData.age, editData.gender]);

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
    if (user) {
      const savedUpdated = localStorage.getItem(`user_bio_updated_${user.uid}`);
      setBioLastUpdated(savedUpdated || null);
    }
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
        setPendingPicture(reader.result);
        setShowPicturePreview(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    if (user) {
      localStorage.removeItem(`user_profile_picture_${user.uid}`);
    }
    window.dispatchEvent(new Event('profilePictureUpdated'));
  };

  const getLast2AM = () => {
    const now = new Date();
    const last2AM = new Date(now);
    last2AM.setHours(2, 0, 0, 0);
    if (now < last2AM) {
      last2AM.setDate(last2AM.getDate() - 1);
    }
    return last2AM;
  };

  const getNext2AM = () => {
    const base = getLast2AM();
    base.setDate(base.getDate() + 1);
    return base;
  };

  const canUpdateBioSummary = () => {
    if (!bioLastUpdated) return true;
    return new Date(bioLastUpdated) < getLast2AM();
  };

  const generateAutoBioSummary = () => {
    const firstName = user?.displayName?.split(' ')[0] || 'You';
    const age = editData.age || localStorage.getItem(`user_age_${user?.uid}`) || '';
    const gender = editData.gender || localStorage.getItem(`user_gender_${user?.uid}`) || '';
    const moods = [
      'feel calm and reflective today',
      'are focused on steady growth',
      'are hopeful and optimistic',
      'are taking things one step at a time',
      'are balancing ambition with self-care',
      'are thoughtful and kind in your interactions',
      'bring grounded energy into conversations',
      'are ready to explore new ideas gently',
    ];
    const toneIndex = new Date().getDate() % moods.length;
    const tone = moods[toneIndex];
    const agePart = age ? `At ${age}, ` : '';
    const genderPart = gender ? `${gender} ` : '';
    return `${agePart}${firstName} (${genderPart.trim() || 'they'}) ${tone}.`;
  };

  const persistBioSummary = (summary) => {
    if (!user) return;
    const timestamp = new Date().toISOString();
    localStorage.setItem(`user_bio_${user.uid}`, summary);
    localStorage.setItem(`user_bio_updated_${user.uid}`, timestamp);
    setBioLastUpdated(timestamp);
    setEditData((prev) => ({ ...prev, bio: summary }));
  };

  const ensureDailyBioSummary = () => {
    if (!user) return;
    const updatedKey = `user_bio_updated_${user.uid}`;
    const lastUpdatedISO = localStorage.getItem(updatedKey);
    if (lastUpdatedISO) {
      setBioLastUpdated(lastUpdatedISO);
    }
    const needsRefresh =
      lastUpdatedISO ? new Date(lastUpdatedISO) < getLast2AM() : false;
    if (needsRefresh) {
      const summary = generateAutoBioSummary();
      persistBioSummary(summary);
    }
  };

  const handleManualBioUpdate = () => {
    if (!canUpdateBioSummary()) {
      const nextWindow = getNext2AM();
      alert(`You can refresh this summary after ${nextWindow.toLocaleString()}.`);
      return;
    }
    setIsBioUpdating(true);
    const summary = generateAutoBioSummary();
    persistBioSummary(summary);
    setIsBioUpdating(false);
  };

  const handleConfirmPicture = () => {
    if (!pendingPicture) return;
    setProfilePicture(pendingPicture);
    if (user) {
      localStorage.setItem(`user_profile_picture_${user.uid}`, pendingPicture);
      window.dispatchEvent(new Event('profilePictureUpdated'));
    }
    setPendingPicture(null);
    setShowPicturePreview(false);
  };

  const handleCancelPictureSelection = () => {
    setPendingPicture(null);
    setShowPicturePreview(false);
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
    <>
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
                {/* Change Picture Button - Always available */}
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
          <p className="text-xs text-gray-400 mb-4">
            Automatically refreshed daily at 02:00 AM to reflect your latest overall vibe.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span className="text-xs text-gray-500">
              Last updated:{' '}
              {bioLastUpdated
                ? new Date(bioLastUpdated).toLocaleString()
                : 'Never'}
            </span>
            <button
              onClick={handleManualBioUpdate}
              disabled={isBioUpdating || !canUpdateBioSummary()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                backgroundColor: canUpdateBioSummary()
                  ? "rgba(129, 201, 149, 0.3)"
                  : "rgba(99, 102, 241, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {isBioUpdating
                ? 'Updating...'
                : canUpdateBioSummary()
                ? 'Refresh summary now'
                : 'Summary locked until 02:00 AM'}
            </button>
          </div>
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

    {showPicturePreview && pendingPicture && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70"
          onClick={handleCancelPictureSelection}
        />
        <div
          className="relative z-10 w-full max-w-md rounded-3xl p-6 space-y-6"
          style={{
            backgroundColor: "rgba(18, 18, 18, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
          }}
        >
          <h3 className="text-xl font-semibold text-white text-center">Preview your photo</h3>
          <p className="text-center text-gray-400 text-sm">
            Everything inside the circle will appear on your profile.
          </p>
          <div className="flex justify-center">
            <div
              className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl"
              style={{
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <img
                src={pendingPicture}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleCancelPictureSelection}
              className="flex-1 py-3 rounded-2xl font-semibold text-white border border-gray-600 hover:bg-gray-700/40 transition-all duration-200"
            >
              Retake
            </button>
            <button
              onClick={handleConfirmPicture}
              className="flex-1 py-3 rounded-2xl font-semibold text-black"
              style={{
                backgroundColor: "#8AB4F8",
                boxShadow: "0 10px 20px rgba(138, 180, 248, 0.35)",
              }}
            >
              Use Photo
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
