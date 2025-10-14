import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Brain, MessageCircle, Calendar, Heart, Sparkles, User, Sun, Moon } from "lucide-react";
import { useTheme } from '../contexts/ThemeContext';
import CalendarPopup from './CalendarPopup';
import reflectionService from '../services/reflectionService';
import firestoreService from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { getDateId } from '../utils/dateUtils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reflection, setReflection] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [chatDays, setChatDays] = useState([]);
  const [reflectionDays, setReflectionDays] = useState([]);

  // Load all chat days and reflection days for calendar indicators
  useEffect(() => {
    const loadCalendarData = async () => {
      const user = getCurrentUser();
      if (!user) {
        console.log('📅 DASHBOARD: No user logged in, cannot load calendar data');
        return;
      }

      try {
        console.log('📅 DASHBOARD: Loading calendar data...');
        
        // Load chat days
        const chatResult = await firestoreService.getAllChatDays(user.uid);
        if (chatResult.success) {
          console.log('📅 DASHBOARD: Loaded chat days:', chatResult.chatDays);
          console.log('📅 DASHBOARD: Chat days count:', chatResult.chatDays.length);
          console.log('📅 DASHBOARD: Sample chat day:', chatResult.chatDays[0]);
          setChatDays(chatResult.chatDays);
        } else {
          console.error('📅 DASHBOARD: Failed to load chat days:', chatResult.error);
        }

        // Load reflection days
        const reflectionResult = await firestoreService.getAllReflectionDays(user.uid);
        if (reflectionResult.success) {
          console.log('📅 DASHBOARD: Loaded reflection days:', reflectionResult.reflectionDays);
          console.log('📅 DASHBOARD: Reflection days count:', reflectionResult.reflectionDays.length);
          console.log('📅 DASHBOARD: Sample reflection day:', reflectionResult.reflectionDays[0]);
          setReflectionDays(reflectionResult.reflectionDays);
        } else {
          console.error('📅 DASHBOARD: Failed to load reflection days:', reflectionResult.error);
        }
      } catch (error) {
        console.error('📅 DASHBOARD: Error loading calendar data:', error);
      }
    };

    loadCalendarData();
  }, []); // Run once on mount

  useEffect(() => {
    // Load reflection for the current date from Firestore
    const loadReflection = async () => {
      console.log('📖 DASHBOARD: Loading reflection for date:', selectedDate);
      const dateId = getDateId(selectedDate);
      console.log('📖 DASHBOARD: Date ID:', dateId);
      
      const user = getCurrentUser();
      if (!user) {
        console.log('📖 DASHBOARD: No user logged in, checking localStorage');
        // If no user is logged in, try localStorage as fallback
        const storedReflection = localStorage.getItem(`reflection_${dateId}`);
        const backupReflection = localStorage.getItem(`reflection_backup_${dateId}`);
        const finalReflection = storedReflection || backupReflection || '';
        console.log('📖 DASHBOARD: Found reflection in localStorage:', finalReflection ? 'Yes' : 'No');
        console.log('📖 DASHBOARD: Reflection content:', finalReflection);
        setReflection(finalReflection);
        return;
      }

      setIsLoadingReflection(true);
      try {
        console.log('📖 DASHBOARD: User logged in, checking Firestore for user:', user.uid);
        const result = await reflectionService.getReflection(user.uid, dateId);
        console.log('📖 DASHBOARD: Firestore result:', result);
        
        if (result.success && result.reflection) {
          console.log('📖 DASHBOARD: Found reflection in Firestore:', result.reflection);
          setReflection(result.reflection);
        } else {
          console.log('📖 DASHBOARD: No reflection in Firestore, checking localStorage fallback');
          // Fallback to localStorage
          const storedReflection = localStorage.getItem(`reflection_${dateId}`);
          const backupReflection = localStorage.getItem(`reflection_backup_${dateId}`);
          const finalReflection = storedReflection || backupReflection || '';
          console.log('📖 DASHBOARD: Found reflection in localStorage fallback:', finalReflection ? 'Yes' : 'No');
          setReflection(finalReflection);
        }
      } catch (error) {
        console.error('📖 DASHBOARD: Error loading reflection from Firestore:', error);
        // Fallback to localStorage
        const storedReflection = localStorage.getItem(`reflection_${dateId}`);
        const backupReflection = localStorage.getItem(`reflection_backup_${dateId}`);
        const finalReflection = storedReflection || backupReflection || '';
        console.log('📖 DASHBOARD: Using localStorage fallback due to error:', finalReflection ? 'Yes' : 'No');
        setReflection(finalReflection);
      } finally {
        setIsLoadingReflection(false);
      }
    };

    // Load actual reflection only (no test injection)
    loadReflection();
  }, [selectedDate]);

  // Refresh reflection when component becomes visible (user returns from chat)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📖 DASHBOARD: Page became visible, refreshing reflection...');
        // Re-run the loadReflection logic
        const refreshReflection = async () => {
          const dateId = getDateId(selectedDate);
          const user = getCurrentUser();
          
          if (!user) {
            const storedReflection = localStorage.getItem(`reflection_${dateId}`);
            const backupReflection = localStorage.getItem(`reflection_backup_${dateId}`);
            const finalReflection = storedReflection || backupReflection || '';
            setReflection(finalReflection);
            return;
          }

          try {
            const result = await reflectionService.getReflection(user.uid, dateId);
            if (result.success && result.reflection) {
              setReflection(result.reflection);
            } else {
              const storedReflection = localStorage.getItem(`reflection_${dateId}`);
              const backupReflection = localStorage.getItem(`reflection_backup_${dateId}`);
              const finalReflection = storedReflection || backupReflection || '';
              setReflection(finalReflection);
            }
          } catch (error) {
            console.error('Error refreshing reflection:', error);
            const storedReflection = localStorage.getItem(`reflection_${dateId}`);
            const backupReflection = localStorage.getItem(`reflection_backup_${dateId}`);
            const finalReflection = storedReflection || backupReflection || '';
            setReflection(finalReflection);
          }
        };
        
        refreshReflection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedDate]);

  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleChatClick = () => {
    // Pass the selected date as state to the chat page (use ISO string for consistency)
    // This will load existing chat messages for the selected date
    console.log('📅 DASHBOARD: Navigating to chat with date:', selectedDate);
    console.log('📅 DASHBOARD: Date ID:', getDateId(selectedDate));
    navigate('/chat', { state: { selectedDate: selectedDate.toISOString(), isWhisperMode: false } });
  };

  const handleWhisperClick = () => {
    // Navigate to whisper session - always starts fresh, doesn't load previous messages
    console.log('📅 DASHBOARD: Navigating to whisper session (fresh chat)');
    console.log('📅 DASHBOARD: Whisper session will start with clean slate');
    navigate('/chat', { state: { selectedDate: new Date().toISOString(), isWhisperMode: true, isFreshSession: true } });
  };

  const handleWellbeingClick = () => {
    navigate('/wellbeing');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleCalendarClick = async () => {
    setIsCalendarOpen(true);
    
    // Refresh chat days when opening calendar
    const user = getCurrentUser();
    if (user) {
      try {
        console.log('📅 DASHBOARD: Refreshing chat days for calendar...');
        const result = await firestoreService.getAllChatDays(user.uid);
        if (result.success) {
          console.log('📅 DASHBOARD: Refreshed chat days:', result.chatDays);
          setChatDays(result.chatDays);
        }
      } catch (error) {
        console.error('📅 DASHBOARD: Error refreshing chat days:', error);
      }
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const handleGenerateReflection = async () => {
    const user = getCurrentUser();
    if (!user) {
      alert('Please sign in to generate reflections');
      return;
    }

    const dateId = getDateId(selectedDate);
    
    try {
      console.log('🔄 Manually generating reflection for date:', dateId);
      console.log('🔍 User ID:', user.uid);
      console.log('🔍 Date ID:', dateId);
      console.log('🔍 Selected Date:', selectedDate);
      setIsLoadingReflection(true);
      
      // Get messages for the selected date
      console.log('📥 Fetching messages from Firestore...');
      let messagesResult = await firestoreService.getChatMessagesNew(user.uid, dateId);
      
      console.log('📥 Messages result:', messagesResult);
      console.log('📥 Success:', messagesResult.success);
      console.log('📥 Messages count:', messagesResult.messages?.length);
      
      // If no messages found with dashes, try without dashes (e.g., "20251008" instead of "2025-10-08")
      if (messagesResult.success && messagesResult.messages.length === 0) {
        const dateIdNoDashes = dateId.replace(/-/g, '');
        console.log('📥 Trying alternate format:', dateIdNoDashes);
        messagesResult = await firestoreService.getChatMessagesNew(user.uid, dateIdNoDashes);
        console.log('📥 Alternate format result:', messagesResult);
        
        if (messagesResult.success && messagesResult.messages.length > 0) {
          console.log('✅ Found messages with alternate format!');
        }
      }
      
      console.log('📥 Final messages:', messagesResult.messages);
      
      if (!messagesResult.success) {
        alert('Error fetching messages: ' + messagesResult.error);
        setIsLoadingReflection(false);
        return;
      }
      
      if (messagesResult.messages.length === 0) {
        // Try to list all available dates for debugging
        console.log('🔍 Checking for any chat days...');
        const chatDaysResult = await firestoreService.getAllChatDays(user.uid);
        console.log('🔍 Available chat days:', chatDaysResult.chatDays);
        
        let availableDates = '';
        if (chatDaysResult.success && chatDaysResult.chatDays.length > 0) {
          availableDates = '\n\nAvailable dates:\n' + chatDaysResult.chatDays.map(d => d.date || d.id).join(', ');
        }
        
        alert('No messages found for this date. Please chat with Deite first!\n\nDate: ' + dateId + '\nPath: users/' + user.uid + '/days/' + dateId + '/messages' + availableDates);
        setIsLoadingReflection(false);
        return;
      }

      console.log('📝 Found', messagesResult.messages.length, 'messages to generate reflection from');
      console.log('📝 First message:', messagesResult.messages[0]);
      
      // Generate reflection
      console.log('🤖 Generating reflection via AI...');
      const generatedReflection = await reflectionService.generateReflection(messagesResult.messages);
      console.log('✅ Reflection generated:', generatedReflection);
      
      // Save reflection
      console.log('💾 Saving reflection to Firestore...');
      await firestoreService.saveReflectionNew(user.uid, dateId, {
        summary: generatedReflection,
        mood: 'neutral',
        score: 50,
        insights: []
      });
      
      // Update local state
      setReflection(generatedReflection);
      
      console.log('💾 Reflection saved and displayed!');
      alert('✅ Reflection generated successfully!');
    } catch (error) {
      console.error('❌ Error generating reflection:', error);
      alert('Failed to generate reflection: ' + error.message);
    } finally {
      setIsLoadingReflection(false);
    }
  };

  return (
    <div
      className="min-h-screen px-6 py-8 relative overflow-hidden slide-up"
      style={{
        background: isDarkMode
          ? "#202124"
          : "#FAFAF8"
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {isDarkMode ? (
          // Dark mode decorative elements
          <>
            {/* Flowing cloud outlines - barely visible */}
            <div className="absolute top-20 left-16 opacity-15">
              <svg width="60" height="30" viewBox="0 0 60 30" fill="none" stroke="#7DD3C0" strokeWidth="0.5">
                <path d="M8 18c0-6 4-10 10-10s10 4 10 10c0 3-2 6-5 8H13c-3-2-5-5-5-8z" />
                <path d="M25 15c0-4 3-7 7-7s7 3 7 7c0 2-1 4-3 5H28c-2-1-3-3-3-5z" />
                <path d="M40 12c0-3 2-5 5-5s5 2 5 5c0 1.5-0.5 3-2 4H42c-1.5-1-2-2.5-2-4z" />
              </svg>
            </div>

            <div className="absolute top-40 right-20 opacity-12">
              <svg width="80" height="25" viewBox="0 0 80 25" fill="none" stroke="#D4AF37" strokeWidth="0.4">
                <path d="M5 15c0-5 3-8 8-8s8 3 8 8c0 2.5-1.5 5-4 6.5H9c-2.5-1.5-4-4-4-6.5z" />
                <path d="M20 12c0-4 2.5-6 6-6s6 2 6 6c0 2-1 4-2.5 5H22.5c-1.5-1-2.5-3-2.5-5z" />
                <path d="M35 10c0-3 2-5 5-5s5 2 5 5c0 1.5-0.5 3-2 4H37c-1.5-1-2-2.5-2-4z" />
                <path d="M50 13c0-4 3-7 7-7s7 3 7 7c0 2-1 4-3 5H53c-2-1-3-3-3-5z" />
              </svg>
            </div>

            <div className="absolute bottom-32 left-12 opacity-14">
              <svg width="70" height="28" viewBox="0 0 70 28" fill="none" stroke="#9BB5FF" strokeWidth="0.5">
                <path d="M6 17c0-5.5 3.5-9 9-9s9 3.5 9 9c0 2.8-1.5 5.5-4 7H10c-2.5-1.5-4-4.2-4-7z" />
                <path d="M22 14c0-4 2.5-6.5 6.5-6.5s6.5 2.5 6.5 6.5c0 2-1 4-2.5 5H24.5c-1.5-1-2.5-3-2.5-5z" />
                <path d="M40 11c0-3 2-5 5-5s5 2 5 5c0 1.5-0.5 3-2 4H42c-1.5-1-2-2.5-2-4z" />
              </svg>
            </div>
          </>
        ) : (
          // Light mode decorative elements
          <>
            {/* Calm leaves */}
            <div className="absolute top-16 left-12 opacity-20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#87A96B" strokeWidth="1">
                <path d="M12 2c-4 0-8 4-8 8 0 2 1 4 3 5l5-5V2z" />
                <path d="M12 2c4 0 8 4 8 8 0 2-1 4-3 5l-5-5V2z" />
              </svg>
            </div>

            <div className="absolute top-32 right-16 opacity-15">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E6B3BA" strokeWidth="1">
                <ellipse cx="12" cy="8" rx="6" ry="4" />
                <path d="M12 12v8" />
              </svg>
            </div>

            {/* Calm waves */}
            <div className="absolute top-48 left-8 opacity-18">
              <svg width="32" height="12" viewBox="0 0 32 12" fill="none" stroke="#B19CD9" strokeWidth="1">
                <path d="M2 6c4-2 8 2 12-2s8 2 14 2" />
              </svg>
            </div>

            {/* Pebbles */}
            <div className="absolute top-64 right-12 opacity-20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#87A96B" strokeWidth="1">
                <ellipse cx="12" cy="12" rx="8" ry="6" />
              </svg>
            </div>

            <div className="absolute top-80 left-20 opacity-15">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E6B3BA" strokeWidth="1">
                <circle cx="12" cy="12" r="6" />
              </svg>
            </div>

            {/* More leaves */}
            <div className="absolute bottom-56 right-8 opacity-18">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B19CD9" strokeWidth="1">
                <path d="M12 2c-3 0-6 3-6 6 0 1.5 0.5 3 2 4l4-4V2z" />
                <path d="M12 2c3 0 6 3 6 6 0 1.5-0.5 3-2 4l-4-4V2z" />
              </svg>
            </div>

            {/* Gentle waves */}
            <div className="absolute bottom-40 left-12 opacity-20">
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none" stroke="#87A96B" strokeWidth="1">
                <path d="M2 5c3-1.5 6 1.5 9-1.5s6 1.5 12 1.5" />
              </svg>
            </div>

            <div className="absolute bottom-24 right-20 opacity-15">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E6B3BA" strokeWidth="1">
                <ellipse cx="12" cy="12" rx="7" ry="5" />
              </svg>
            </div>

            {/* Additional mindful elements around sections */}
            <div className="absolute" style={{ top: "65%", left: "8%" }}>
              <svg
                width="20"
                height="8"
                viewBox="0 0 20 8"
                fill="none"
                stroke="#B19CD9"
                strokeWidth="1"
                className="opacity-18"
              >
                <path d="M2 4c2-1 4 1 6-1s4 1 8 1" />
              </svg>
            </div>

            <div className="absolute" style={{ top: "68%", right: "12%" }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#87A96B"
                strokeWidth="1"
                className="opacity-20"
              >
                <path d="M12 2c-2.5 0-5 2.5-5 5 0 1.2 0.4 2.5 1.5 3.5l3.5-3.5V2z" />
              </svg>
            </div>

            <div className="absolute" style={{ top: "25%", left: "10%" }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E6B3BA"
                strokeWidth="1"
                className="opacity-15"
              >
                <ellipse cx="12" cy="12" rx="6" ry="4" />
              </svg>
            </div>

            <div className="absolute" style={{ top: "85%", left: "18%" }}>
              <svg
                width="24"
                height="10"
                viewBox="0 0 24 10"
                fill="none"
                stroke="#B19CD9"
                strokeWidth="1"
                className="opacity-18"
              >
                <path d="M2 5c3-1.5 6 1.5 9-1.5s6 1.5 8 1.5" />
              </svg>
            </div>
          </>
        )}
      </div>

      <div className="relative z-10 max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div
            onClick={handleWellbeingClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
              isDarkMode ? 'backdrop-blur-md' : 'bg-white'
            }`}
            style={isDarkMode ? {
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            } : {
              boxShadow: "0 2px 8px rgba(134, 169, 107, 0.15)",
            }}
          >
            <Heart className="w-5 h-5" style={{ color: isDarkMode ? "#FDD663" : "#87A96B" }} strokeWidth={1.5} />
          </div>

          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isDarkMode ? 'backdrop-blur-md' : 'bg-white'
            }`}
            style={isDarkMode ? {
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            } : {
              boxShadow: "0 0 0 1px #87A96B20, 0 4px 12px rgba(134, 169, 107, 0.2)",
            }}
          >
            <Brain className="w-7 h-7" style={{ color: isDarkMode ? "#8AB4F8" : "#87A96B" }} strokeWidth={1.5} />
          </div>

          <div className="flex space-x-2">
            <div
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
                isDarkMode ? 'backdrop-blur-md' : 'bg-white'
              }`}
              style={isDarkMode ? {
                backgroundColor: "rgba(42, 42, 45, 0.6)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              } : {
                boxShadow: "0 2px 8px rgba(230, 179, 186, 0.15)",
              }}
            >
              {isDarkMode ?
                <Sun className="w-5 h-5" style={{ color: "#8AB4F8" }} strokeWidth={1.5} /> :
                <Moon className="w-5 h-5" style={{ color: "#E6B3BA" }} strokeWidth={1.5} />
              }
            </div>
            <div
              onClick={handleProfileClick}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
                isDarkMode ? 'backdrop-blur-md' : 'bg-white'
              }`}
              style={isDarkMode ? {
                backgroundColor: "rgba(42, 42, 45, 0.6)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              } : {
                boxShadow: "0 2px 8px rgba(177, 156, 217, 0.15)",
              }}
            >
              <User className="w-5 h-5" style={{ color: isDarkMode ? "#81C995" : "#B19CD9" }} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 mb-6 relative overflow-hidden ${
            isDarkMode ? 'backdrop-blur-lg' : 'bg-white'
          }`}
          style={isDarkMode ? {
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          } : {
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            borderTop: "3px solid #87A96B30",
          }}
        >
          <div className={`flex items-center justify-between ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <button 
              onClick={handlePreviousDay}
              className={`p-1 rounded transition-colors ${
                isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-green-50'
              }`}
            >
              <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>‹</span>
            </button>
            <div 
              className={`text-center cursor-pointer rounded-xl p-2 transition-colors ${
                isDarkMode ? 'hover:bg-gray-800/20' : 'hover:bg-green-50'
              }`}
              onClick={handleCalendarClick}
            >
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Calendar className="w-4 h-4" style={{ color: isDarkMode ? "#7DD3C0" : "#87A96B" }} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Selected Date</span>
              </div>
              <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(selectedDate)}</div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Click to open calendar</div>
            </div>
            <button 
              onClick={handleNextDay}
              className={`p-1 rounded transition-colors ${
                isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-green-50'
              }`}
            >
              <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>›</span>
            </button>
          </div>
        </div>

        <div
          className={`rounded-2xl p-6 mb-6 relative overflow-hidden ${
            isDarkMode ? 'backdrop-blur-lg' : 'bg-white'
          }`}
          style={isDarkMode ? {
            backgroundColor: "rgba(42, 42, 45, 0.6)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          } : {
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            borderTop: "3px solid #E6B3BA30",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: isDarkMode ? "#FDD663" : "#E6B3BA",
                boxShadow: isDarkMode ? "0 4px 16px rgba(0, 0, 0, 0.15)" : "none",
              }}
            >
              <span className={isDarkMode ? "text-black" : "text-white"} style={{ fontSize: '14px' }}>⚡</span>
            </div>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Day's Reflect</h2>
          </div>
          <div
            className={`rounded-xl p-5 min-h-24 relative overflow-hidden ${
              isDarkMode ? 'backdrop-blur-lg' : ''
            }`}
            style={isDarkMode ? {
              backgroundColor: "rgba(42, 42, 45, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
            } : {
              backgroundColor: "#F9F9F7",
            }}
          >
            {isLoadingReflection ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="flex space-x-1 mb-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className={`text-sm text-center italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading reflection...</p>
              </div>
            ) : reflection ? (
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{reflection}</p>
            ) : (
              <button
                onClick={handleGenerateReflection}
                className="flex flex-col items-center justify-center h-full w-full hover:opacity-80 transition-all duration-300 cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                    isDarkMode ? 'backdrop-blur-md' : 'bg-white'
                  }`}
                  style={isDarkMode ? {
                    backgroundColor: "rgba(28, 31, 46, 0.5)",
                    boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.12), 0 8px 32px rgba(125, 211, 192, 0.08)",
                    border: "1px solid rgba(125, 211, 192, 0.18)",
                  } : {
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <span className="text-2xl">🌿</span>
                </div>
                <p className={`text-sm text-center italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Click to generate reflection 🧘‍♀️
                </p>
                <p className={`text-xs text-center mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  (Must have chat messages for this date)
                </p>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-3 justify-center">
          <button
            onClick={handleChatClick}
            className={`flex items-center space-x-3 font-medium rounded-2xl px-8 py-4 hover:opacity-90 transition-all duration-300 w-full justify-center relative overflow-hidden ${
              isDarkMode ? 'backdrop-blur-lg text-white' : 'text-white'
            }`}
            style={isDarkMode ? {
              backgroundColor: "rgba(42, 42, 45, 0.8)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#FFFFFF",
            } : {
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              boxShadow: "0 4px 12px rgba(134, 169, 107, 0.25)",
              color: "#0B0E14",
            }}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chat with Deite</span>
            <span className="text-lg">💬</span>
          </button>

          <button
            onClick={handleWhisperClick}
            className={`flex items-center space-x-3 font-medium rounded-2xl px-8 py-4 hover:opacity-90 transition-all duration-300 w-full justify-center relative overflow-hidden ${
              isDarkMode ? 'backdrop-blur-lg text-white' : 'text-white'
            }`}
            style={isDarkMode ? {
              backgroundColor: "rgba(42, 42, 45, 0.8)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#FFFFFF",
            } : {
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              boxShadow: "0 4px 12px rgba(134, 169, 107, 0.25)",
              color: "#0B0E14",
            }}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Whisper Session</span>
            <span className="text-lg">🤫</span>
          </button>
        </div>
      </div>

      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        chatDays={chatDays}
        reflectionDays={reflectionDays}
      />
    </div>
  );
}