import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, Send, ArrowLeft, User } from "lucide-react";
import { useTheme } from '../contexts/ThemeContext';
import chatService from '../services/chatService';
import reflectionService from '../services/reflectionService';
import emotionalAnalysisService from '../services/emotionalAnalysisService';
import { getCurrentUser } from '../services/authService';
import { getDateId } from '../utils/dateUtils';

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  
  const selectedDateString = location.state?.selectedDate || new Date().toDateString();
  const selectedDateId = getDateId(new Date(selectedDateString));
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load existing messages or set welcome message
    const loadMessages = () => {
      const storedMessages = localStorage.getItem(`chatMessages_${selectedDateId}`);
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages);
          const messagesWithDates = parsedMessages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } catch (error) {
          console.error('Error parsing stored messages:', error);
          setWelcomeMessage();
        }
      } else {
        setWelcomeMessage();
      }
    };

    const setWelcomeMessage = () => {
      const welcomeMessage = {
        id: 'welcome',
        text: "Hey there! I'm Deite, and I'm genuinely glad you're here. There's something beautiful about taking a moment to connect with yourself and your feelings. What's been on your heart lately?",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    };

    loadMessages();
  }, [selectedDateId]);

  const saveMessages = (newMessages) => {
    localStorage.setItem(`chatMessages_${selectedDateId}`, JSON.stringify(newMessages));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    console.log('🎯 CHAT PAGE DEBUG: handleSendMessage called');
    console.log('🎯 CHAT PAGE DEBUG: inputMessage:', inputMessage);
    console.log('🎯 CHAT PAGE DEBUG: isLoading:', isLoading);
    
    if (!inputMessage.trim() || isLoading) {
      console.log('🎯 CHAT PAGE DEBUG: Returning early - empty message or loading');
      return;
    }

    const userMessageText = inputMessage.trim();
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date()
    };

    console.log('🎯 CHAT PAGE DEBUG: Created user message:', userMessage);

    // Add user message immediately
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    console.log('🎯 CHAT PAGE DEBUG: About to call chatService.sendMessage...');

    try {
      console.log('🚀 CHAT PAGE DEBUG: Sending message to AI...');
      console.log('🚀 CHAT PAGE DEBUG: Message text:', userMessageText);
      console.log('🚀 CHAT PAGE DEBUG: Conversation history length:', messages.length);
      
      // Create AI message placeholder for streaming
      const aiMessage = {
        id: Date.now() + 1,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: true
      };

      let currentMessages = [...newMessages, aiMessage];
      setMessages(currentMessages);



      // Token callback for streaming - Direct appending like your example
      const onToken = (token) => {
        if (token === null) {
          // Stream finished
          console.log('📝 STREAM DEBUG: Stream finished (null token received)');
          setMessages(prevMessages => {
            const updated = [...prevMessages];
            const aiMsgIndex = updated.findIndex(msg => msg.id === aiMessage.id);
            if (aiMsgIndex !== -1) {
              updated[aiMsgIndex] = {
                ...updated[aiMsgIndex],
                isStreaming: false
              };
            }
            return updated;
          });
        } else {
          // Filter out any unwanted content before appending to UI
          const cleanToken = token.toString().trim();
          
          // Skip tokens that look like raw data, JSON, or metadata
          // Be more permissive - only filter out obvious non-text content
          const isValidToken = cleanToken && 
              cleanToken.length > 0 &&
              cleanToken.length < 1000 && // Very generous length limit
              !cleanToken.match(/^[0-9,]{20,}$/) && // Only filter very long number sequences
              !cleanToken.includes('prompt_eval_count') &&
              !cleanToken.includes('total_duration') &&
              !(cleanToken.startsWith('{') && cleanToken.endsWith('}') && cleanToken.includes('context'));
          
          if (isValidToken) {
            
            console.log('📝 STREAM DEBUG: Appending clean token:', cleanToken);
            setMessages(prevMessages => {
              const updated = [...prevMessages];
              const aiMsgIndex = updated.findIndex(msg => msg.id === aiMessage.id);
              if (aiMsgIndex !== -1) {
                updated[aiMsgIndex] = {
                  ...updated[aiMsgIndex],
                  text: updated[aiMsgIndex].text + cleanToken, // Append clean token directly!
                  isStreaming: true
                };
              }
              return updated;
            });
          } else {
            console.log('📝 STREAM DEBUG: Filtered out unwanted token:', cleanToken ? cleanToken.substring(0, Math.min(100, cleanToken.length)) + '...' : '[empty token]');
          }
        }
      };
      
      // Call the chat service with streaming enabled
      const aiResponse = await chatService.sendMessage(userMessageText, messages, onToken);
      
      console.log('✅ CHAT PAGE DEBUG: Received final AI response:', aiResponse);
      
      // Validate response
      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error('Invalid AI response format');
      }

      // No need to wait - streaming handles everything directly

      // Get final messages for reflection/analysis
      let finalMessages;
      setMessages(prevMessages => {
        finalMessages = prevMessages;
        saveMessages(finalMessages);
        return prevMessages;
      });

      // Generate and save reflection after the conversation
      try {
        console.log('📝 CHAT PAGE: Starting reflection generation...');
        console.log('📝 CHAT PAGE: Final messages count:', finalMessages.length);
        console.log('📝 CHAT PAGE: Selected date ID:', selectedDateId);
        
        // Test connection first
        const connectionTest = await reflectionService.testConnection();
        console.log('🔍 CHAT PAGE: Reflection service connection test:', connectionTest);
        
        const reflection = await reflectionService.generateReflection(finalMessages);
        console.log('✅ CHAT PAGE: Reflection generated successfully:', reflection);
        
        const user = getCurrentUser();
        if (user) {
          console.log('💾 CHAT PAGE: Saving reflection to Firestore for user:', user.uid);
          const saveResult = await reflectionService.saveReflection(user.uid, selectedDateId, reflection);
          console.log('💾 CHAT PAGE: Firestore save result:', saveResult);
        } else {
          console.log('💾 CHAT PAGE: No user logged in, saving to localStorage');
          localStorage.setItem(`reflection_${selectedDateId}`, reflection);
          console.log('💾 CHAT PAGE: Reflection saved to localStorage with key:', `reflection_${selectedDateId}`);
        }
        
        // Also save to localStorage as backup
        localStorage.setItem(`reflection_backup_${selectedDateId}`, reflection);
        console.log('💾 CHAT PAGE: Backup reflection saved to localStorage');
        
      } catch (reflectionError) {
        console.error('❌ CHAT PAGE: Error generating reflection:', reflectionError);
        console.error('❌ CHAT PAGE: Error stack:', reflectionError.stack);
        
        // Try to create a simple fallback reflection
        try {
          const userMessages = finalMessages.filter(msg => msg.sender === 'user').map(msg => msg.text);
          if (userMessages.length > 0) {
            const fallbackReflection = `Today I chatted with Deite about: ${userMessages.join('. ')}`;
            localStorage.setItem(`reflection_${selectedDateId}`, fallbackReflection);
            console.log('💾 CHAT PAGE: Saved fallback reflection to localStorage');
          }
        } catch (fallbackError) {
          console.error('❌ CHAT PAGE: Even fallback reflection failed:', fallbackError);
        }
      }

      // Generate and save emotional analysis after the conversation
      try {
        console.log('🧠 Generating emotional analysis...');
        const emotionalScores = await emotionalAnalysisService.analyzeEmotionalScores(finalMessages);
        console.log('✅ Emotional analysis generated:', emotionalScores);
        
        const user = getCurrentUser();
        const userId = user?.uid || 'anonymous';
        await emotionalAnalysisService.saveEmotionalData(userId, selectedDateId, emotionalScores);
        console.log('💾 Emotional data saved');
      } catch (emotionalError) {
        console.error('❌ Error generating emotional analysis:', emotionalError);
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
      <div
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{
          background: isDarkMode 
            ? "linear-gradient(to bottom, #0B0E14 0%, #1C1F2E 100%)"
            : "#FAFAF8",
        }}
      >
      {/* Header */}
      <div className={`sticky top-0 z-20 flex items-center justify-between p-6 border-b backdrop-blur-lg ${
        isDarkMode ? 'border-gray-700/30' : 'border-gray-200/50'
      }`}
        style={{
          backgroundColor: isDarkMode 
            ? "rgba(11, 14, 20, 0.9)" 
            : "rgba(250, 250, 248, 0.9)",
        }}
      >
        <button
          onClick={handleBack}
          className={`w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity ${
            isDarkMode ? 'backdrop-blur-md' : 'bg-white'
          }`}
          style={isDarkMode ? {
            backgroundColor: "rgba(28, 31, 46, 0.4)",
            boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.15), 0 8px 32px rgba(125, 211, 192, 0.1)",
            border: "1px solid rgba(125, 211, 192, 0.2)",
          } : {
            boxShadow: "0 2px 8px rgba(134, 169, 107, 0.15)",
          }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: isDarkMode ? "#7DD3C0" : "#87A96B" }} strokeWidth={1.5} />
        </button>

        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDarkMode ? 'backdrop-blur-md' : 'bg-white'
            }`}
            style={isDarkMode ? {
              backgroundColor: "rgba(28, 31, 46, 0.4)",
              boxShadow: "inset 0 0 20px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(212, 175, 55, 0.1)",
              border: "1px solid rgba(212, 175, 55, 0.2)",
            } : {
              boxShadow: "0 2px 8px rgba(134, 169, 107, 0.15)",
            }}
          >
            <Brain className="w-5 h-5" style={{ color: isDarkMode ? "#D4AF37" : "#87A96B" }} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Deite</h1>
              <div className="w-2 h-2 rounded-full bg-green-500" title="Connected and ready" />
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your emotional companion
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Chat for: {new Date(selectedDateString).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className={`w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity ${
            isDarkMode ? 'backdrop-blur-md' : 'bg-white'
          }`}
          style={isDarkMode ? {
            backgroundColor: "rgba(28, 31, 46, 0.4)",
            boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.15), 0 8px 32px rgba(125, 211, 192, 0.1)",
            border: "1px solid rgba(125, 211, 192, 0.2)",
          } : {
            boxShadow: "0 2px 8px rgba(177, 156, 217, 0.15)",
          }}
        >
          <User className="w-5 h-5" style={{ color: isDarkMode ? "#7DD3C0" : "#B19CD9" }} strokeWidth={1.5} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl backdrop-blur-lg relative overflow-hidden ${
                message.sender === 'user' ? 'ml-4' : 'mr-4'
              }`}
              style={{
                backgroundColor: message.sender === 'user' 
                  ? "rgba(125, 211, 192, 0.15)" 
                  : "rgba(28, 31, 46, 0.4)",
                boxShadow: message.sender === 'user'
                  ? "inset 0 0 20px rgba(125, 211, 192, 0.1), 0 8px 32px rgba(125, 211, 192, 0.05)"
                  : "inset 0 0 20px rgba(155, 181, 255, 0.1), 0 8px 32px rgba(155, 181, 255, 0.05)",
                border: `1px solid ${message.sender === 'user' ? 'rgba(125, 211, 192, 0.2)' : 'rgba(155, 181, 255, 0.2)'}`,
              }}
            >
              <p className="text-white text-sm leading-relaxed">
                {message.text}
                {message.isStreaming && (
                  <span className="inline-block ml-1 w-2 h-4 bg-gray-400 animate-pulse" style={{
                    animation: 'blink 1s infinite'
                  }}>|</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatTime(message.timestamp)}</p>
            </div>
          </div>
        ))}
        
        
        <div ref={messagesEndRef} />
      </div>


      {/* Input */}
      <div className="relative z-10 p-4 border-t border-gray-700/30">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Share what's on your mind..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 text-white placeholder-gray-400 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(11, 14, 20, 0.6)",
              border: "1px solid rgba(155, 181, 255, 0.15)",
              boxShadow: "inset 0 0 20px rgba(155, 181, 255, 0.08)",
            }}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: inputMessage.trim() && !isLoading
                ? "linear-gradient(135deg, rgba(125, 211, 192, 0.8) 0%, rgba(212, 175, 55, 0.8) 50%, rgba(155, 181, 255, 0.8) 100%)"
                : "rgba(28, 31, 46, 0.4)",
              boxShadow: "inset 0 0 20px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(125, 211, 192, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <Send 
              className="w-5 h-5" 
              style={{ color: inputMessage.trim() && !isLoading ? "#0B0E14" : "#7DD3C0" }} 
              strokeWidth={1.5} 
            />
          </button>
        </form>
      </div>
    </div>
    </>
  );
}