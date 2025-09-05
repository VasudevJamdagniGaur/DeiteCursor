import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import emotionalAnalysisService from '../services/emotionalAnalysisService';
import patternAnalysisService from '../services/patternAnalysisService';
import { getCurrentUser } from '../services/authService';
import chatService from '../services/chatService';
import firestoreService from '../services/firestoreService';
import { 
  Brain, 
  ArrowLeft, 
  Heart, 
  Star, 
  TrendingUp, 
  Calendar, 
  Smile, 
  Frown, 
  Meh,
  BarChart3,
  Target,
  Lightbulb,
  Award,
  AlertTriangle,
  Zap,
  Coffee,
  Music,
  Users,
  BookOpen,
  Moon,
  Sun,
  RefreshCw
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  Tooltip
} from 'recharts';

export default function EmotionalWellbeing() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [activeSection, setActiveSection] = useState('mood-survey');
  const [emotionalData, setEmotionalData] = useState([]);
  const [weeklyMoodData, setWeeklyMoodData] = useState([]);
  const [moodBalance, setMoodBalance] = useState([]);
  const [topEmotions, setTopEmotions] = useState([]);
  const [highlights, setHighlights] = useState({});
  const [triggers, setTriggers] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7 or 15 days
  const [balancePeriod, setBalancePeriod] = useState(7); // 1, 7, or 30 days for emotional balance
  const [patternPeriod, setPatternPeriod] = useState(7); // 7 or 30 days for pattern analysis
  const [highlightsPeriod, setHighlightsPeriod] = useState('week'); // 'week', 'month', or 'lifetime'
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [hasEnoughData, setHasEnoughData] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [balanceInsights, setBalanceInsights] = useState(null);

  useEffect(() => {
    loadRealEmotionalData();
  }, [selectedPeriod]);

  useEffect(() => {
    loadBalanceData();
  }, [balancePeriod]);

  useEffect(() => {
    loadRealEmotionalData();
    loadBalanceData();
    loadPatternAnalysis();
    loadHighlightsData();
  }, []);

  useEffect(() => {
    loadPatternAnalysis();
  }, [patternPeriod]);

  useEffect(() => {
    loadHighlightsData();
  }, [highlightsPeriod]);

  const loadRealEmotionalData = () => {
    console.log(`📊 Loading emotional data for ${selectedPeriod} days...`);
    
    const user = getCurrentUser();
    const userId = user?.uid || 'anonymous';
    
    // Get emotional data from the analysis service
    const emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, selectedPeriod);
    console.log('📈 Raw emotional data:', emotionalDataRaw);

    if (emotionalDataRaw.length === 0) {
      console.log('📝 No emotional data found, showing empty state');
      showEmptyState(selectedPeriod);
      return;
    }

    processRealEmotionalData(emotionalDataRaw);
  };

  const loadBalanceData = async () => {
    console.log(`⚖️ Loading AI-powered balance data for ${balancePeriod} days...`);
    
    const user = getCurrentUser();
    const userId = user?.uid || 'anonymous';
    
    try {
      // Get chat messages for the balance period
      let chatMessagesResult;
      if (balancePeriod === 1) {
        // Get today's messages
        const today = new Date().toISOString().split('T')[0];
        chatMessagesResult = await firestoreService.getMessages(userId, today);
      } else {
        // Get messages for the specified period
        chatMessagesResult = await firestoreService.getRecentChatMessages(userId, balancePeriod);
      }
      
      const chatMessages = chatMessagesResult.messages || [];
      console.log(`💬 Chat messages for balance analysis: ${chatMessages.length}`);

      if (chatMessages.length === 0) {
        console.log('📝 No chat data found, setting default balance');
        setMoodBalance([
          { name: 'Positive', value: 50, color: '#7DD3C0' },
          { name: 'Neutral', value: 30, color: '#D4AF37' },
          { name: 'Negative', value: 20, color: '#9BB5FF' }
        ]);
        return;
      }

      // Use AI to analyze emotional balance from conversations
      const periodText = balancePeriod === 1 ? 'today' : 
                        balancePeriod === 7 ? 'the last week' : 'the last 30 days';
      
      const aiBalance = await chatService.analyzeEmotionalBalance(chatMessages, periodText);
      console.log('🎭 AI Balance Analysis:', aiBalance);

      // Update mood balance with AI analysis
      setMoodBalance([
        { name: 'Positive', value: aiBalance.positive, color: '#7DD3C0' },
        { name: 'Neutral', value: aiBalance.neutral, color: '#D4AF37' },
        { name: 'Negative', value: aiBalance.negative, color: '#9BB5FF' }
      ]);

      // Store AI insights for display
      setBalanceInsights({
        insight: aiBalance.insight,
        dominantEmotion: aiBalance.dominantEmotion,
        balanceScore: aiBalance.balanceScore,
        keyObservations: aiBalance.keyObservations,
        period: periodText
      });

    } catch (error) {
      console.error('❌ Error loading AI balance data:', error);
      
      // Fallback to default balance
      setMoodBalance([
        { name: 'Positive', value: 60, color: '#7DD3C0' },
        { name: 'Neutral', value: 25, color: '#D4AF37' },
        { name: 'Negative', value: 15, color: '#9BB5FF' }
      ]);
    }
  };

  const loadHighlightsData = async () => {
    console.log(`🏆 Loading highlights data for ${highlightsPeriod}...`);
    
    const user = getCurrentUser();
    const userId = user?.uid || 'anonymous';
    
    // First, check if we have valid cached highlights
    try {
      console.log('🔍 Checking highlights cache...');
      const cacheResult = await firestoreService.getHighlightsCache(userId, highlightsPeriod);
      
      if (cacheResult.success && cacheResult.cache && cacheResult.cache.isValid) {
        console.log('✅ Using cached highlights from today');
        setHighlights(cacheResult.cache.highlights);
        return;
      }
      
      console.log('🔄 Cache invalid or missing, generating new highlights...');
    } catch (error) {
      console.error('❌ Error checking cache, proceeding with generation:', error);
    }
    
    // Get fresh emotional data
    let emotionalDataRaw;
    if (highlightsPeriod === 'week') {
      emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, 7);
    } else if (highlightsPeriod === 'month') {
      emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, 30);
    } else { // lifetime
      emotionalDataRaw = emotionalAnalysisService.getAllEmotionalData(userId);
    }
    
    console.log('📈 Raw highlights data:', emotionalDataRaw);

    if (emotionalDataRaw.length === 0) {
      console.log('📝 No emotional data found for highlights');
      setHighlights({});
      return;
    }

    await processHighlightsData(emotionalDataRaw, userId);
  };

  const processHighlightsData = async (data, userId) => {
    console.log(`🔄 Processing highlights data: ${data.length} entries for ${highlightsPeriod}`);
    
    // Filter valid data for highlights
    const validData = data.filter(item => item.happiness !== undefined);
    if (validData.length === 0) {
      setHighlights({});
      return;
    }

    // Generate highlights based on real data
    const bestDay = validData.reduce((best, current) => 
      (current.happiness + current.energy) > (best.happiness + best.energy) ? current : best
    );

    const worstDay = validData.reduce((worst, current) => 
      (current.anxiety + current.stress) > (worst.anxiety + worst.stress) ? current : worst
    );

    let highlightsData;

    try {
      // Get chat messages for the best and challenging days to analyze actual conversations
      console.log('🤖 Analyzing chat conversations for highlights...');
      
      // Convert timestamps to date IDs for Firebase
      const bestDayDateId = new Date(bestDay.timestamp).toISOString().split('T')[0];
      const worstDayDateId = new Date(worstDay.timestamp).toISOString().split('T')[0];
      
      console.log(`📅 Best day: ${bestDayDateId}, Challenging day: ${worstDayDateId}`);
      
      // Get chat messages for both days
      const [bestDayMessages, worstDayMessages] = await Promise.all([
        firestoreService.getMessages(userId, bestDayDateId),
        firestoreService.getMessages(userId, worstDayDateId)
      ]);
      
      console.log(`💬 Best day messages: ${bestDayMessages.messages?.length || 0}, Challenging day messages: ${worstDayMessages.messages?.length || 0}`);
      
      // Analyze chat context for both days
      const [bestDayDescription, worstDayDescription] = await Promise.all([
        chatService.analyzeChatContextForDay(
          bestDayMessages.messages || [], 
          'best', 
          new Date(bestDay.timestamp).toLocaleDateString()
        ),
        chatService.analyzeChatContextForDay(
          worstDayMessages.messages || [], 
          'challenging', 
          new Date(worstDay.timestamp).toLocaleDateString()
        )
      ]);

      highlightsData = {
        peak: {
          title: "Best Mood Day",
          description: bestDayDescription,
          date: new Date(bestDay.timestamp).toLocaleDateString(),
          score: Math.round((bestDay.happiness + bestDay.energy) / 2)
        },
        toughestDay: {
          title: "Challenging Day",
          description: worstDayDescription,
          date: new Date(worstDay.timestamp).toLocaleDateString(),
          score: Math.round((worstDay.anxiety + worstDay.stress) / 2)
        }
      };

      setHighlights(highlightsData);
      
      // Save to cache for future use
      try {
        console.log('💾 Saving highlights to cache...');
        await firestoreService.saveHighlightsCache(userId, highlightsPeriod, highlightsData);
        console.log('✅ Highlights cached successfully');
      } catch (cacheError) {
        console.error('❌ Error caching highlights (non-critical):', cacheError);
      }

    } catch (error) {
      console.error('❌ Error generating AI descriptions for highlights, using fallbacks:', error);
      
      // Fallback to original descriptions if AI generation fails
      highlightsData = {
        peak: {
          title: "Best Mood Day",
          description: "Highest happiness and energy levels",
          date: new Date(bestDay.timestamp).toLocaleDateString(),
          score: Math.round((bestDay.happiness + bestDay.energy) / 2)
        },
        toughestDay: {
          title: "Challenging Day",
          description: "Higher stress and anxiety levels",
          date: new Date(worstDay.timestamp).toLocaleDateString(),
          score: Math.round((worstDay.anxiety + worstDay.stress) / 2)
        }
      };

      setHighlights(highlightsData);
      
      // Still save fallback to cache
      try {
        await firestoreService.saveHighlightsCache(userId, highlightsPeriod, highlightsData);
      } catch (cacheError) {
        console.error('❌ Error caching fallback highlights:', cacheError);
      }
    }

    console.log('✅ Highlights data processed successfully');
  };


  const processRealEmotionalData = (data) => {
    console.log(`🔄 Processing real emotional data: ${data.length} entries for ${selectedPeriod} days`);
    
    // Create date range for the selected period
    const dateRange = [];
    for (let i = selectedPeriod - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // Map real data to date range
    const weeklyData = dateRange.map(dateStr => {
      const dayData = data.find(item => item.date === dateStr);
      const date = new Date(dateStr);
      
      return {
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: dateStr,
        happiness: dayData ? dayData.happiness : 50,
        anxiety: dayData ? dayData.anxiety : 25,
        energy: dayData ? dayData.energy : 50,
        stress: dayData ? dayData.stress : 25
      };
    });

    setWeeklyMoodData(weeklyData);

    // Calculate averages for highlights and other data processing
    const validData = data.filter(item => item.happiness !== undefined);
    if (validData.length > 0) {
      const avgHappiness = validData.reduce((sum, day) => sum + day.happiness, 0) / validData.length;
      const avgEnergy = validData.reduce((sum, day) => sum + day.energy, 0) / validData.length;
      const avgAnxiety = validData.reduce((sum, day) => sum + day.anxiety, 0) / validData.length;
      const avgStress = validData.reduce((sum, day) => sum + day.stress, 0) / validData.length;


      setTriggers({
        stress: avgStress > 50 ? ["High stress conversations", "Complex decisions"] : ["Minor uncertainties", "Daily pressures"],
        joy: ["Meaningful conversations", "Self-reflection", "Emotional support"],
        distraction: ["Overthinking patterns", "Worry cycles"]
      });
    }

    setEmotionalData(data);
    console.log('✅ Real emotional data processed successfully');
  };

  const showEmptyState = (days) => {
    console.log(`📭 Showing empty state for ${days} days - no chat data available`);
    
    // Create empty date range for display
    const dateRange = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date);
    }

    // Set empty data with just date labels
    const emptyWeeklyData = dateRange.map(date => ({
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: date.toISOString().split('T')[0],
      happiness: 0,
      anxiety: 0,
      energy: 0,
      stress: 0
    }));
    setWeeklyMoodData(emptyWeeklyData);

    // Set empty mood balance
    setMoodBalance([]);

    // Set empty top emotions
    setTopEmotions([]);

    // Set empty emotional timeline data
    setEmotionalData([]);

    // Set empty state highlights
    setHighlights({
      peak: {
        title: "No Data Yet",
        description: "Start chatting with Deite to track your emotional journey",
        date: "N/A",
        score: 0
      },
      toughestDay: {
        title: "No Data Yet", 
        description: "Your emotional patterns will appear after chatting",
        date: "N/A",
        score: 0
      },
      shift: {
        title: "Start Your Journey",
        description: "Chat with Deite to begin emotional tracking",
        change: "0 days tracked",
        trend: "neutral"
      }
    });

    // Set empty triggers
    setTriggers({
      stress: [],
      joy: [],
      distraction: []
    });

    console.log('✅ Empty state set successfully');
  };

  const loadPatternAnalysis = async () => {
    console.log(`🔍 Loading pattern analysis for ${patternPeriod} days...`);
    setPatternLoading(true);
    
    try {
      const user = getCurrentUser();
      const userId = user?.uid || 'anonymous';
      
      const analysis = await patternAnalysisService.getPatternAnalysis(userId, patternPeriod, true);
      console.log('📊 Pattern analysis result:', analysis);
      
      setPatternAnalysis(analysis);
      setHasEnoughData(analysis.hasEnoughData);
      
      if (analysis.success && analysis.hasEnoughData) {
        setTriggers(analysis.triggers);
      } else {
        // Set empty state or "not enough data" message
        setTriggers({
          stress: [],
          joy: [],
          distraction: []
        });
      }
    } catch (error) {
      console.error('❌ Error loading pattern analysis:', error);
      setTriggers({
        stress: [],
        joy: [],
        distraction: []
      });
      setHasEnoughData(false);
    } finally {
      setPatternLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Custom tooltip component for the line chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-4 rounded-2xl backdrop-blur-lg border shadow-lg ${
            isDarkMode 
              ? 'bg-gray-900/90 border-gray-700/50 text-white' 
              : 'bg-white/90 border-gray-200/50 text-gray-800'
          }`}
          style={{
            boxShadow: isDarkMode 
              ? "0 8px 32px rgba(0, 0, 0, 0.3)" 
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {label}
          </p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}
                  </span>
                </div>
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleAIUpdate = async () => {
    console.log('🤖 Starting AI comprehensive update...');
    setIsUpdating(true);

    try {
      const user = getCurrentUser();
      const userId = user?.uid || 'anonymous';

      // Get emotional data for analysis (using current selected period)
      let emotionalDataRaw;
      if (selectedPeriod === 7) {
        emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, 7);
      } else if (selectedPeriod === 15) {
        emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, 15);
      } else {
        emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, 30);
      }

      if (emotionalDataRaw.length === 0) {
        console.log('📝 No emotional data found for AI analysis');
        alert('No emotional data available for analysis. Please chat with Deite first to generate emotional data.');
        return;
      }

      console.log(`📊 Analyzing ${emotionalDataRaw.length} days of emotional data...`);

      // Generate comprehensive AI analysis
      const periodText = selectedPeriod === 7 ? 'last week' : 
                        selectedPeriod === 15 ? 'last 2 weeks' : 'last month';
      
      const aiAnalysis = await chatService.generateComprehensiveAnalysis(emotionalDataRaw, periodText);
      console.log('🎯 AI Analysis received:', aiAnalysis);

      // Update highlights with chat-based AI analysis
      const validData = emotionalDataRaw.filter(item => item.happiness !== undefined);
      if (validData.length > 0) {
        const bestDay = validData.reduce((best, current) => 
          (current.happiness + current.energy) > (best.happiness + best.energy) ? current : best
        );
        const worstDay = validData.reduce((worst, current) => 
          (current.anxiety + current.stress) > (worst.anxiety + worst.stress) ? current : worst
        );

        // Get chat messages for the best and challenging days
        const bestDayDateId = new Date(bestDay.timestamp).toISOString().split('T')[0];
        const worstDayDateId = new Date(worstDay.timestamp).toISOString().split('T')[0];
        
        const [bestDayMessages, worstDayMessages] = await Promise.all([
          firestoreService.getMessages(userId, bestDayDateId),
          firestoreService.getMessages(userId, worstDayDateId)
        ]);
        
        // Analyze chat context for both days
        const [bestDayDescription, worstDayDescription] = await Promise.all([
          chatService.analyzeChatContextForDay(
            bestDayMessages.messages || [], 
            'best', 
            new Date(bestDay.timestamp).toLocaleDateString()
          ),
          chatService.analyzeChatContextForDay(
            worstDayMessages.messages || [], 
            'challenging', 
            new Date(worstDay.timestamp).toLocaleDateString()
          )
        ]);

        const updatedHighlights = {
          peak: {
            title: "Best Mood Day",
            description: bestDayDescription,
            date: new Date(bestDay.timestamp).toLocaleDateString(),
            score: Math.round((bestDay.happiness + bestDay.energy) / 2)
          },
          toughestDay: {
            title: "Challenging Day",
            description: worstDayDescription,
            date: new Date(worstDay.timestamp).toLocaleDateString(),
            score: Math.round((worstDay.anxiety + worstDay.stress) / 2)
          }
        };

        setHighlights(updatedHighlights);

        // Cache the updated highlights
        try {
          await firestoreService.saveHighlightsCache(userId, highlightsPeriod, updatedHighlights);
        } catch (cacheError) {
          console.error('❌ Error caching updated highlights:', cacheError);
        }
      }

      // Update triggers with AI analysis
      setTriggers({
        stress: aiAnalysis.triggers.stressFactors || ["Work pressure", "Time constraints"],
        joy: aiAnalysis.triggers.joyFactors || ["Meaningful conversations", "Personal achievements"],
        distraction: aiAnalysis.triggers.energyDrains || ["Overthinking", "Worry cycles"]
      });

      // Update emotional balance based on AI analysis
      const avgHappiness = validData.reduce((sum, day) => sum + day.happiness, 0) / validData.length;
      const avgEnergy = validData.reduce((sum, day) => sum + day.energy, 0) / validData.length;
      const avgAnxiety = validData.reduce((sum, day) => sum + day.anxiety, 0) / validData.length;
      const avgStress = validData.reduce((sum, day) => sum + day.stress, 0) / validData.length;

      const positiveScore = Math.round((avgHappiness + avgEnergy) / 2);
      const negativeScore = Math.round((avgAnxiety + avgStress) / 2);
      const neutralScore = Math.max(0, 100 - positiveScore - negativeScore);

      setMoodBalance([
        { name: 'Positive', value: positiveScore, color: '#7DD3C0' },
        { name: 'Neutral', value: neutralScore, color: '#D4AF37' },
        { name: 'Negative', value: negativeScore, color: '#9BB5FF' }
      ]);

      // Generate comprehensive personalized guidance
      console.log('🎯 Generating comprehensive personalized guidance...');
      
      // Get lifetime and recent chat messages
      const [lifetimeMessagesResult, recentMessagesResult] = await Promise.all([
        firestoreService.getAllChatMessages(userId), // All messages
        firestoreService.getRecentChatMessages(userId, 30) // Last 30 days
      ]);
      
      const lifetimeMessages = lifetimeMessagesResult.messages || [];
      const recentMessages = recentMessagesResult.messages || [];
      
      console.log(`📚 Lifetime messages: ${lifetimeMessages.length}, Recent messages: ${recentMessages.length}`);
      
      // Generate personalized guidance using comprehensive analysis
      const personalizedGuidance = await chatService.generatePersonalizedGuidance(
        lifetimeMessages,
        recentMessages,
        validData, // emotional data
        {
          stress: aiAnalysis.triggers.stressFactors || ["Work pressure", "Time constraints"],
          joy: aiAnalysis.triggers.joyFactors || ["Meaningful conversations", "Personal achievements"],
          distraction: aiAnalysis.triggers.energyDrains || ["Overthinking", "Worry cycles"]
        }
      );

      // Update pattern analysis with AI insights and comprehensive guidance
      setPatternAnalysis({
        overallTrend: aiAnalysis.patterns.overallTrend,
        keyInsight: aiAnalysis.patterns.keyInsight,
        recommendation: aiAnalysis.patterns.recommendation,
        emotionalBalance: aiAnalysis.emotionalBalance,
        personalizedGuidance: personalizedGuidance
      });

      // Refresh mood chart data
      processRealEmotionalData(emotionalDataRaw);

      console.log('✅ AI comprehensive update completed successfully');
      alert('🤖 AI analysis complete! All sections have been updated with fresh insights.');

    } catch (error) {
      console.error('❌ Error during AI update:', error);
      alert('Failed to complete AI analysis. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderMoodSurvey = () => (
    <div className="space-y-6">
      {/* Period Toggle */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setSelectedPeriod(7)}
          className={`px-6 py-2 rounded-full transition-all duration-300 ${
            selectedPeriod === 7
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : isDarkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => setSelectedPeriod(15)}
          className={`px-6 py-2 rounded-full transition-all duration-300 ${
            selectedPeriod === 15
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : isDarkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          15 Days
        </button>
      </div>

      {/* Empty State Message */}
      {emotionalData.length === 0 && (
        <div className={`rounded-3xl p-8 backdrop-blur-lg transition-all duration-300 text-center ${
          isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
        }`}>
          <div className="flex flex-col items-center space-y-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(125, 211, 192, 0.2) 0%, rgba(212, 175, 55, 0.2) 100%)",
                border: "1px solid rgba(125, 211, 192, 0.3)",
              }}
            >
              <Heart className="w-8 h-8" style={{ color: "#7DD3C0" }} />
            </div>
            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              No Emotional Data Yet
            </h3>
            <p className={`text-center max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Start chatting with Deite to track your emotional journey. Your happiness, energy, anxiety, and stress levels will be analyzed from your conversations and displayed here.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
            >
              Start Chatting
            </button>
          </div>
        </div>
      )}

      {/* Show all sections only if we have data */}
      {emotionalData.length > 0 && (
        <>
          {/* 1. Mood Chart - Line Chart */}
          <div
            className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
            }`}
            style={{
              boxShadow: isDarkMode 
                ? "inset 0 0 20px rgba(125, 211, 192, 0.1), 0 8px 32px rgba(125, 211, 192, 0.05)"
                : "inset 0 0 20px rgba(134, 169, 107, 0.1), 0 8px 32px rgba(134, 169, 107, 0.05)",
            }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(125, 211, 192, 0.2) 0%, rgba(212, 175, 55, 0.2) 100%)",
                  border: "1px solid rgba(125, 211, 192, 0.3)",
                }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: "#7DD3C0" }} />
              </div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Mood Chart - {selectedPeriod} Day Summary
              </h3>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyMoodData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
                    label={{ value: '%', angle: 0, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: isDarkMode ? '#374151' : '#D1D5DB', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="happiness"
                    stroke="#7DD3C0"
                    strokeWidth={3}
                    dot={{ fill: '#7DD3C0', strokeWidth: 2, r: 4 }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#7DD3C0', 
                      strokeWidth: 3, 
                      fill: '#7DD3C0',
                      style: { filter: 'drop-shadow(0 0 8px rgba(125, 211, 192, 0.6))' }
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#D4AF37"
                    strokeWidth={3}
                    dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#D4AF37', 
                      strokeWidth: 3, 
                      fill: '#D4AF37',
                      style: { filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' }
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="anxiety"
                    stroke="#9BB5FF"
                    strokeWidth={3}
                    dot={{ fill: '#9BB5FF', strokeWidth: 2, r: 4 }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#9BB5FF', 
                      strokeWidth: 3, 
                      fill: '#9BB5FF',
                      style: { filter: 'drop-shadow(0 0 8px rgba(155, 181, 255, 0.6))' }
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stress"
                    stroke="#E6B3BA"
                    strokeWidth={3}
                    dot={{ fill: '#E6B3BA', strokeWidth: 2, r: 4 }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#E6B3BA', 
                      strokeWidth: 3, 
                      fill: '#E6B3BA',
                      style: { filter: 'drop-shadow(0 0 8px rgba(230, 179, 186, 0.6))' }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#7DD3C0]"></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Happiness</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#D4AF37]"></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Energy</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#9BB5FF]"></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Anxiety</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#E6B3BA]"></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Stress</span>
              </div>
            </div>
          </div>

          {/* 2. Emotional Balance - Pie Chart */}
          {moodBalance.length > 0 && (
            <div
              className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
                isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(177, 156, 217, 0.2) 100%)",
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                    }}
                  >
                    <Target className="w-5 h-5" style={{ color: "#D4AF37" }} />
                  </div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Emotional Balance
                  </h3>
                </div>

                {/* Balance Period Toggle */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setBalancePeriod(1)}
                    className={`px-3 py-1 rounded-full text-sm transition-all duration-300 ${
                      balancePeriod === 1
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    1 Day
                  </button>
                  <button
                    onClick={() => setBalancePeriod(7)}
                    className={`px-3 py-1 rounded-full text-sm transition-all duration-300 ${
                      balancePeriod === 7
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setBalancePeriod(30)}
                    className={`px-3 py-1 rounded-full text-sm transition-all duration-300 ${
                      balancePeriod === 30
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moodBalance}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {moodBalance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {moodBalance.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.name}
                      </span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              {balanceInsights && (
                <div className="mt-6 space-y-4">
                  <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'}`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <Brain className="w-5 h-5 text-indigo-500" />
                      <h4 className={`font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                        AI Analysis for {balanceInsights.period}
                      </h4>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      {balanceInsights.insight}
                    </p>
                  </div>

                  {balanceInsights.keyObservations && (
                    <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                      <div className="flex items-center space-x-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-purple-500" />
                        <h4 className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                          Key Observations
                        </h4>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                        {balanceInsights.keyObservations}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Target className="w-4 h-4" />
                      <span className="text-sm">Dominant Emotion:</span>
                      <span className={`text-sm font-medium capitalize ${
                        balanceInsights.dominantEmotion === 'positive' ? 'text-green-500' :
                        balanceInsights.dominantEmotion === 'negative' ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {balanceInsights.dominantEmotion}
                      </span>
                    </div>
                    <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Award className="w-4 h-4" />
                      <span className="text-sm">Balance Score:</span>
                      <span className={`text-sm font-medium ${
                        balanceInsights.balanceScore >= 80 ? 'text-green-500' :
                        balanceInsights.balanceScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {balanceInsights.balanceScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Highlights */}
          <div
            className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(230, 179, 186, 0.2) 0%, rgba(177, 156, 217, 0.2) 100%)",
                    border: "1px solid rgba(230, 179, 186, 0.3)",
                  }}
                >
                  <Award className="w-5 h-5" style={{ color: "#E6B3BA" }} />
                </div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Highlights
                </h3>
              </div>

              {/* Highlights Period Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setHighlightsPeriod('week')}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    highlightsPeriod === 'week'
                      ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Last Week
                </button>
                <button
                  onClick={() => setHighlightsPeriod('month')}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    highlightsPeriod === 'month'
                      ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setHighlightsPeriod('lifetime')}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    highlightsPeriod === 'lifetime'
                      ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Lifetime
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-100 border border-green-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Smile className="w-5 h-5 text-green-500" />
                  <h4 className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                    {highlights.peak?.title}
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {highlights.peak?.description}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`}>
                  {highlights.peak?.date}
                </p>
              </div>

              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-100 border border-red-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h4 className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                    {highlights.toughestDay?.title}
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {highlights.toughestDay?.description}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
                  {highlights.toughestDay?.date}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Triggers */}
          <div
            className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(177, 156, 217, 0.2) 0%, rgba(125, 211, 192, 0.2) 100%)",
                    border: "1px solid rgba(177, 156, 217, 0.3)",
                  }}
                >
                  <Lightbulb className="w-5 h-5" style={{ color: "#B19CD9" }} />
                </div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Triggers & Patterns
                </h3>
              </div>

              {/* Period Toggle for Pattern Analysis */}
              <div className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setPatternPeriod(7)}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    patternPeriod === 7
                      ? isDarkMode 
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-purple-500 text-white shadow-md'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setPatternPeriod(30)}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    patternPeriod === 30
                      ? isDarkMode 
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-purple-500 text-white shadow-md'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Loading State */}
            {patternLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Analyzing your {patternPeriod === 7 ? 'weekly' : 'monthly'} patterns...
                  </span>
                </div>
              </div>
            )}

            {/* Pattern Analysis Results */}
            {!patternLoading && (
              <>
                {/* Data Status Banner */}
                {!hasEnoughData && patternAnalysis && (
                  <div className={`mb-6 p-4 rounded-lg border ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                        {patternAnalysis.message || `Not enough data for ${patternPeriod === 7 ? 'weekly' : 'monthly'} analysis`}
                      </span>
                    </div>
                    {patternAnalysis.totalMessages !== undefined && (
                      <p className={`text-xs mt-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Current: {patternAnalysis.totalMessages} messages across {patternAnalysis.totalDays} days. Need at least 3 days of conversations.
                      </p>
                    )}
                  </div>
                )}

                {/* Analysis Summary */}
                {hasEnoughData && patternAnalysis && patternAnalysis.success && (
                  <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-5 h-5 text-green-500" />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                          {patternPeriod === 7 ? 'Weekly' : 'Monthly'} Analysis Complete
                        </span>
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {patternAnalysis.totalMessages} messages • {patternAnalysis.totalDays} active days
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Stress Triggers</span>
                    </h4>
                    <div className="space-y-2">
                      {triggers.stress && triggers.stress.length > 0 ? (
                        triggers.stress.map((trigger, index) => (
                          <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                            <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{trigger}</span>
                          </div>
                        ))
                      ) : (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No specific stress triggers found in conversations
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      <Heart className="w-4 h-4" />
                      <span>Joy Boosters</span>
                    </h4>
                    <div className="space-y-2">
                      {triggers.joy && triggers.joy.length > 0 ? (
                        triggers.joy.map((trigger, index) => (
                          <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                            <span className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>{trigger}</span>
                          </div>
                        ))
                      ) : (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No specific joy sources found in conversations
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      <Zap className="w-4 h-4" />
                      <span>Distractions</span>
                    </h4>
                    <div className="space-y-2">
                      {triggers.distraction && triggers.distraction.length > 0 ? (
                        triggers.distraction.map((trigger, index) => (
                          <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <span className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>{trigger}</span>
                          </div>
                        ))
                      ) : (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No specific distractions found in conversations
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Insights Section */}
                {hasEnoughData && patternAnalysis && patternAnalysis.insights && (
                  <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                    <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      <Target className="w-4 h-4" />
                      <span>Key Insights</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>Primary Stress Source</p>
                        <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                          {patternAnalysis.insights.primaryStressSource}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>Main Joy Source</p>
                        <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                          {patternAnalysis.insights.mainJoySource}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>Behavioral Pattern</p>
                        <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                          {patternAnalysis.insights.behavioralPattern}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 5. Guidance */}
          <div
            className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(125, 211, 192, 0.2) 0%, rgba(212, 175, 55, 0.2) 100%)",
                  border: "1px solid rgba(125, 211, 192, 0.3)",
                }}
              >
                <BookOpen className="w-5 h-5" style={{ color: "#7DD3C0" }} />
              </div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Personalized Guidance
              </h3>
            </div>

            {/* Comprehensive Personalized Guidance */}
            {patternAnalysis && patternAnalysis.personalizedGuidance ? (
              <div className="space-y-4">
                {/* Focus Area */}
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Target className="w-5 h-5 text-blue-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                      Focus Area
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    {patternAnalysis.personalizedGuidance.focus}
                  </p>
                </div>

                {/* Strength Recognition */}
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Award className="w-5 h-5 text-green-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                      Your Strength
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                    {patternAnalysis.personalizedGuidance.strength}
                  </p>
                </div>

                {/* Action Step */}
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="w-5 h-5 text-purple-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                      Action Step
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                    {patternAnalysis.personalizedGuidance.actionStep}
                  </p>
                </div>

                {/* Recent Observation */}
                {patternAnalysis.personalizedGuidance.recentObservation && (
                  <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <Sun className="w-5 h-5 text-orange-500" />
                      <h4 className={`font-medium ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                        Recent Observation
                      </h4>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                      {patternAnalysis.personalizedGuidance.recentObservation}
                    </p>
                  </div>
                )}

                {/* Lifetime Growth */}
                {patternAnalysis.personalizedGuidance.lifetimeGrowth && (
                  <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-200'}`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-teal-500" />
                      <h4 className={`font-medium ${isDarkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                        Your Growth Journey
                      </h4>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-teal-300' : 'text-teal-600'}`}>
                      {patternAnalysis.personalizedGuidance.lifetimeGrowth}
                    </p>
                  </div>
                )}

                {/* Deep Insight */}
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-indigo-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                      Deep Insight
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    {patternAnalysis.personalizedGuidance.insight}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Sun className="w-5 h-5 text-blue-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                      Continue Chatting
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Keep engaging with Deite to build comprehensive emotional insights. Click "AI Update" to generate personalized guidance.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Star className="w-5 h-5 text-purple-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                      Reflect Daily
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                    Regular conversations help create more accurate emotional tracking and better insights.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Brain className="w-5 h-5 text-teal-500" />
                    <h4 className={`font-medium ${isDarkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                      Build Patterns
                    </h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-teal-300' : 'text-teal-600'}`}>
                    Share more details about your experiences to unlock personalized insights.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Data Summary */}
          <div className="text-center py-4">
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing real emotional data from {emotionalData.length} conversation{emotionalData.length !== 1 ? 's' : ''} over {selectedPeriod} days
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
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
            <Heart className="w-5 h-5" style={{ color: isDarkMode ? "#D4AF37" : "#87A96B" }} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Emotional Wellbeing
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Track your emotional journey
            </p>
          </div>
        </div>

        <button
          onClick={handleAIUpdate}
          disabled={isUpdating}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
            isUpdating 
              ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {isUpdating ? 'Updating...' : 'AI Update'}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderMoodSurvey()}
      </div>
    </div>
  );
}
