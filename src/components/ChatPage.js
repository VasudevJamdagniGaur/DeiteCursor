import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, Send, ArrowLeft, Heart, Star, User } from "lucide-react";
import { useTheme } from '../contexts/ThemeContext';
import chatService from '../services/chatService';
import reflectionService from '../services/reflectionService';
import firestoreService from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { getDateId } from '../utils/dateUtils';

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  
  // Get the selected date from navigation state, or default to today
  const selectedDateString = location.state?.selectedDate || new Date().toDateString();
  const selectedDateId = getDateId(new Date(selectedDateString));
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, error
  const [streamingMessage, setStreamingMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    // Load conversation history from Firestore based on selected date
    const loadMessages = async () => {
      const user = getCurrentUser();
      if (!user) {
        // If no user is logged in, try localStorage as fallback
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
            localStorage.removeItem(`chatMessages_${selectedDateId}`);
            setWelcomeMessage();
          }
        } else {
          setWelcomeMessage();
        }
        return;
      }

      try {
        // Ensure user document exists
        await firestoreService.ensureUser(user.uid, {
          displayName: user.displayName,
          email: user.email
        });

        // Load messages from Firestore
        const result = await firestoreService.getMessages(user.uid, selectedDateId);
        if (result.success && result.messages.length > 0) {
          // Convert Firestore messages to our format
          const formattedMessages = result.messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            sender: msg.role === 'user' ? 'user' : 'ai',
            timestamp: msg.timestamp
          }));
          setMessages(formattedMessages);
        } else {
          // No messages for this date, start with welcome message
          setWelcomeMessage();
        }
      } catch (error) {
        console.error('Error loading messages from Firestore:', error);
        // Fallback to localStorage
        const storedMessages = localStorage.getItem(`chatMessages_${selectedDateId}`);
        if (storedMessages) {
          try {
            const parsedMessages = JSON.parse(storedMessages);
            const messagesWithDates = parsedMessages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            setMessages(messagesWithDates);
          } catch (parseError) {
            console.error('Error parsing stored messages:', parseError);
            setWelcomeMessage();
          }
        } else {
          setWelcomeMessage();
        }
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

    // Test connection to the chat service and warm up model
    const testConnection = async () => {
      try {
        const isConnected = await chatService.testConnection();
        if (isConnected) {
          setConnectionStatus('connected');
          
          // Test the chat API directly
          console.log('🧪 Testing chat API functionality...');
          const chatWorks = await chatService.testChatAPI();
          if (chatWorks) {
            console.log('✅ Chat API is working properly!');
          } else {
            console.log('⚠️ Chat API test failed, but connection is available');
          }
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, [selectedDateId]); // Reload when selectedDateId changes

  const saveMessagesToStorage = (newMessages) => {
    localStorage.setItem(`chatMessages_${selectedDateId}`, JSON.stringify(newMessages));
  };

  const generateAndSaveReflection = async (conversationMessages) => {
    console.log('🔄 Starting reflection generation...');
    console.log('💬 Total messages for reflection:', conversationMessages.length);
    
    try {
      // Generate the new reflection using the AI-powered service
      console.log('🤖 Calling AI reflection service...');
      const reflection = await reflectionService.generateReflection(conversationMessages);
      console.log('✅ Generated reflection:', reflection);
      
      // Get current user
      const user = getCurrentUser();
      
      if (user) {
        console.log('💾 Saving reflection to Firestore for user:', user.uid);
        // Save to Firestore
        await reflectionService.saveReflection(user.uid, selectedDateId, reflection);
      } else {
        console.log('💾 Saving reflection to localStorage (no user logged in)');
        // Fallback to localStorage if no user logged in
        localStorage.setItem(`reflection_${selectedDateId}`, reflection);
      }
      
      return reflection;
    } catch (error) {
      console.error('❌ Error generating and saving reflection:', error);
      // Fallback to localStorage with basic reflection
      try {
        console.log('🔄 Attempting fallback reflection generation...');
        const reflection = await reflectionService.generateReflection(conversationMessages);
        console.log('✅ Fallback reflection generated:', reflection);
        localStorage.setItem(`reflection_${selectedDateId}`, reflection);
        return reflection;
      } catch (fallbackError) {
        console.error('❌ Fallback reflection generation failed:', fallbackError);
        const basicReflection = "Had a conversation with Deite today about various topics.";
        console.log('📝 Using basic reflection:', basicReflection);
        localStorage.setItem(`reflection_${selectedDateId}`, basicReflection);
        return basicReflection;
      }
    }
  };

  const sendMessageToAI = async (userMessage, conversationHistory, onStreamChunk) => {
    try {
      const response = await chatService.sendMessage(userMessage, conversationHistory, onStreamChunk);
      
      // If we get a warmup-related response, try warming up the model
      if (response && response.includes('warm up')) {
        console.log('🔥 Attempting to warm up model due to timeout...');
        const warmupSuccess = await chatService.warmupModel();
        
        if (warmupSuccess) {
          // Try the original request again after warmup
          console.log('🔄 Retrying original request after warmup...');
          return await chatService.sendMessage(userMessage, conversationHistory, onStreamChunk);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error getting AI response:', error);
      // This fallback should rarely be hit since chatService handles its own errors
      return "I'm having a moment of technical difficulty, but I'm still here for you. Let's try that again in a bit.";
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessageText = inputMessage.trim();
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    // Save user message to Firestore
    const user = getCurrentUser();
    if (user) {
      try {
        await firestoreService.addMessage(user.uid, selectedDateId, {
          role: 'user',
          text: userMessageText,
          model: 'user-input'
        });
      } catch (error) {
        console.error('Error saving user message to Firestore:', error);
        // Continue with localStorage fallback
        saveMessagesToStorage(newMessages);
      }
    } else {
      saveMessagesToStorage(newMessages);
    }

    // Create a streaming message placeholder
    const streamingMessageId = Date.now() + Math.random();
    const initialStreamingMessage = {
      id: streamingMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: true
    };

    setStreamingMessage(initialStreamingMessage);

    try {
      let accumulatedText = '';
      
      const aiResponse = await sendMessageToAI(
        userMessageText, 
        messages, 
        (chunk) => {
          // Handle each streaming chunk
          accumulatedText += chunk;
          setStreamingMessage(prev => prev ? {
            ...prev,
            text: accumulatedText
          } : null);
        }
      );
      
      // Final message when streaming is complete
      const aiMessage = {
        id: streamingMessageId,
        text: aiResponse || accumulatedText,
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      setStreamingMessage(null); // Clear streaming state
      
      // Save AI message to Firestore
      if (user) {
        try {
          await firestoreService.addMessage(user.uid, selectedDateId, {
            role: 'assistant',
            text: aiResponse || accumulatedText,
            model: 'llama3:70b'
          });
        } catch (error) {
          console.error('Error saving AI message to Firestore:', error);
          // Continue with localStorage fallback
          saveMessagesToStorage(finalMessages);
        }
      } else {
        saveMessagesToStorage(finalMessages);
      }
      
      // Generate and save reflection after the conversation
      generateAndSaveReflection(finalMessages);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + Math.random(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date()
      };
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      setStreamingMessage(null); // Clear streaming state
      
      // Save error message to Firestore
      if (user) {
        try {
          await firestoreService.addMessage(user.uid, selectedDateId, {
            role: 'assistant',
            text: errorMessage.text,
            model: 'error'
          });
        } catch (firestoreError) {
          console.error('Error saving error message to Firestore:', firestoreError);
          saveMessagesToStorage(finalMessages);
        }
      } else {
        saveMessagesToStorage(finalMessages);
      }
      
      // Generate reflection even in error case (user message was still sent)
      generateAndSaveReflection(finalMessages);
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
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: isDarkMode 
          ? "linear-gradient(to bottom, #0B0E14 0%, #1C1F2E 100%)"
          : "#FAFAF8",
      }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        {isDarkMode ? (
          <>
            <div className="absolute top-20 left-16 opacity-8">
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none" stroke="#7DD3C0" strokeWidth="0.4">
                <path d="M10 24c0-8 5-13 13-13s13 5 13 13c0 4-2.5 8-6.5 10.5H16.5c-4-2.5-6.5-6.5-6.5-10.5z" />
                <path d="M35 20c0-6 4-10 10-10s10 4 10 10c0 3-1.5 6-4 7.5H39c-2.5-1.5-4-4.5-4-7.5z" />
                <path d="M55 16c0-4 3-7 7-7s7 3 7 7c0 2-0.5 4-2.5 5H57.5c-2-1-2.5-3-2.5-5z" />
              </svg>
            </div>

            <div className="absolute bottom-40 right-20 opacity-7">
              <svg width="100" height="35" viewBox="0 0 100 35" fill="none" stroke="#D4AF37" strokeWidth="0.3">
                <path d="M12 21c0-7 4-11 11-11s11 4 11 21c0 3.5-2 7-5.5 8.75H17.5c-3.5-1.75-5.5-5.25-5.5-8.75z" />
                <path d="M35 17c0-5.5 3.5-9 9-9s9 3.5 9 17c0 2.75-1.25 5.5-4 6.75H39c-2.75-1.25-4-4-4-6.75z" />
                <path d="M60 14c0-4 2.5-6.5 6.5-6.5s6.5 2.5 6.5 14c0 2-0.75 4-3 5H63c-2.25-1-3-3-3-5z" />
              </svg>
            </div>

            <Heart
              className="absolute top-1/4 left-1/8 w-4 h-4 animate-bounce opacity-12"
              style={{ color: "#7DD3C0", animationDelay: "0.5s", animationDuration: "4s" }}
            />
            <Star
              className="absolute bottom-1/3 right-1/6 w-3 h-3 animate-pulse opacity-15"
              style={{ color: "#9BB5FF", animationDelay: "1.2s", animationDuration: "3s" }}
            />
            <Heart
              className="absolute top-2/3 right-3/4 w-3 h-3 animate-bounce opacity-14"
              style={{ color: "#D4AF37", animationDelay: "2.1s", animationDuration: "3.5s" }}
            />
          </>
        ) : (
          <>
            {/* Light mode decorations */}
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

            <div className="absolute bottom-32 left-8 opacity-18">
              <svg width="32" height="12" viewBox="0 0 32 12" fill="none" stroke="#B19CD9" strokeWidth="1">
                <path d="M2 6c4-2 8 2 12-2s8 2 14 2" />
              </svg>
            </div>

            <div className="absolute bottom-48 right-12 opacity-20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#87A96B" strokeWidth="1">
                <ellipse cx="12" cy="12" rx="8" ry="6" />
              </svg>
            </div>
          </>
        )}
      </div>

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
              <div 
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`}
                title={
                  connectionStatus === 'connected' ? 'Connected and ready' :
                  connectionStatus === 'connecting' ? 'Connecting...' :
                  'Connection issue - messages may take longer'
                }
              />
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {connectionStatus === 'connected' ? 'Your emotional companion' :
               connectionStatus === 'connecting' ? 'Getting ready to chat...' :
               'Having connection issues'}
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
              <p className="text-white text-sm leading-relaxed">{message.text}</p>
              <p className="text-xs text-gray-400 mt-1">{formatTime(message.timestamp)}</p>
            </div>
          </div>
        ))}
        
        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div
              className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl backdrop-blur-lg relative overflow-hidden mr-4"
              style={{
                backgroundColor: "rgba(28, 31, 46, 0.4)",
                boxShadow: "inset 0 0 20px rgba(155, 181, 255, 0.1), 0 8px 32px rgba(155, 181, 255, 0.05)",
                border: "1px solid rgba(155, 181, 255, 0.2)",
              }}
            >
              <p className="text-white text-sm leading-relaxed">
                {streamingMessage.text}
                <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse"></span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatTime(streamingMessage.timestamp)}</p>
            </div>
          </div>
        )}
        
        {isLoading && !streamingMessage && (
          <div className="flex justify-start">
            <div
              className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl backdrop-blur-lg relative overflow-hidden mr-4"
              style={{
                backgroundColor: "rgba(28, 31, 46, 0.4)",
                boxShadow: "inset 0 0 20px rgba(155, 181, 255, 0.1), 0 8px 32px rgba(155, 181, 255, 0.05)",
                border: "1px solid rgba(155, 181, 255, 0.2)",
              }}
            >
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
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
  );
}


