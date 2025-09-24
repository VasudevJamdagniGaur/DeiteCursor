import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import emotionalAnalysisService from '../services/emotionalAnalysisService';
import patternAnalysisService from '../services/patternAnalysisService';
import habitAnalysisService from '../services/habitAnalysisService';
import { getCurrentUser } from '../services/authService';
import chatService from '../services/chatService';
import firestoreService from '../services/firestoreService';
import { 
  Brain, 
  ArrowLeft, 
  Heart, 
  Star, 
  Smile,
  BarChart3,
  Target,
  Lightbulb,
  Award,
  AlertTriangle,
  Zap,
  BookOpen,
  Sun,
  RefreshCw
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export default function EmotionalWellbeing() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Add CSS animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const [emotionalData, setEmotionalData] = useState([]);
  const [weeklyMoodData, setWeeklyMoodData] = useState([]);
  const [moodBalance, setMoodBalance] = useState([]);
  const [highlights, setHighlights] = useState({});
  const [triggers, setTriggers] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7, 15 days, or 365 (lifetime)
  const [balancePeriod, setBalancePeriod] = useState(7); // 1, 7, or 30 days for emotional balance
  const [patternPeriod] = useState(90); // Fixed to 90 days (3 months) for pattern analysis
  const [highlightsPeriod] = useState('3months'); // Always show last 3 months
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [habitAnalysis, setHabitAnalysis] = useState(null);
  const [hasEnoughData, setHasEnoughData] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [emotionExplanations, setEmotionExplanations] = useState(null);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);

  // Cache keys for different data types
  const getCacheKey = (type, period, userId) => `emotional_wellbeing_${type}_${period}_${userId}`;

  // Load cached data instantly, then fetch fresh data
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      // Load cached data instantly
      loadCachedData(user.uid);
      // Then fetch fresh data in background
      loadFreshData();
    }
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadCachedEmotionalData(user.uid, selectedPeriod);
      loadFreshEmotionalData();
    }
  }, [selectedPeriod]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadCachedBalanceData(user.uid, balancePeriod);
      loadFreshBalanceData();
    }
  }, [balancePeriod]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadCachedPatternData(user.uid, patternPeriod);
      loadFreshPatternAnalysis();
      loadHabitAnalysis();
    }
  }, [patternPeriod]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadCachedHighlightsData(user.uid, highlightsPeriod);
      loadFreshHighlightsData();
    }
  }, [highlightsPeriod]);

  // Cache management functions
  const saveToCache = (key, data) => {
    try {
      const cacheData = {
        data,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 Cached data for key: ${key}`);
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
    }
  };

  const loadFromCache = (key, maxAgeMinutes = 60) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const cacheAge = new Date() - new Date(cacheData.timestamp);
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds

      if (cacheAge > maxAge) {
        console.log(`⏰ Cache expired for key: ${key} (${Math.round(cacheAge / 60000)} minutes old)`);
        return null;
      }

      console.log(`✅ Using cached data for key: ${key} (${Math.round(cacheAge / 60000)} minutes old)`);
      return cacheData.data;
    } catch (error) {
      console.error('❌ Error loading from cache:', error);
      return null;
    }
  };

  // Instant cache loading functions
  const loadCachedData = (userId) => {
    console.log('⚡ Loading all cached data instantly...');
    
    // Load cached emotional data
    loadCachedEmotionalData(userId, selectedPeriod);
    
    // Load cached balance data
    loadCachedBalanceData(userId, balancePeriod);
    
    // Load cached pattern data
    loadCachedPatternData(userId, patternPeriod);
    
    // Load cached highlights data
    loadCachedHighlightsData(userId, highlightsPeriod);
  };

  const loadCachedEmotionalData = (userId, period) => {
    const cacheKey = getCacheKey('emotional', period, userId);
    const cachedData = loadFromCache(cacheKey, 30); // 30 minutes cache
    
    if (cachedData) {
      console.log('⚡ Setting cached emotional data instantly');
      setWeeklyMoodData(cachedData.weeklyMoodData || []);
      setEmotionalData(cachedData.emotionalData || []);
      setLastCacheUpdate(cachedData.timestamp);
    }
  };

  const loadCachedBalanceData = (userId, period) => {
    const cacheKey = getCacheKey('balance', period, userId);
    const cachedData = loadFromCache(cacheKey, 30); // 30 minutes cache
    
    if (cachedData) {
      console.log('⚡ Setting cached balance data instantly');
      setMoodBalance(cachedData.moodBalance || []);
      setTopEmotions(cachedData.topEmotions || []);
    } else {
      // If no cached data, trigger fresh data load
      console.log('⚡ No cached balance data, will load fresh data');
    }
  };

  const loadCachedPatternData = (userId, period) => {
    const cacheKey = getCacheKey('pattern', period, userId);
    const cachedData = loadFromCache(cacheKey, 60); // 60 minutes cache
    
    if (cachedData) {
      console.log('⚡ Setting cached pattern data instantly');
      setPatternAnalysis(cachedData.patternAnalysis);
      setTriggers(cachedData.triggers || {});
      setHasEnoughData(cachedData.hasEnoughData !== false);
    }
  };

  const loadCachedHighlightsData = (userId, period) => {
    const cacheKey = getCacheKey('highlights', '3months', userId);
    const cachedData = loadFromCache(cacheKey, 45); // 45 minutes cache
    
    if (cachedData) {
      console.log('⚡ Setting cached highlights data instantly');
      setHighlights(cachedData.highlights || {});
    }
  };

  // Fresh data loading functions (background)
  const loadFreshData = async () => {
    console.log('🔄 Loading fresh data in background...');
    setIsLoadingFresh(true);
    
    try {
      await Promise.all([
        loadFreshEmotionalData(),
        loadFreshBalanceData(),
        loadFreshPatternAnalysis(),
        loadFreshHighlightsData()
      ]);
    } catch (error) {
      console.error('❌ Error loading fresh data:', error);
    } finally {
      setIsLoadingFresh(false);
    }
  };

  const loadFreshEmotionalData = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const freshData = await loadRealEmotionalDataInternal();
    if (freshData) {
      const cacheKey = getCacheKey('emotional', selectedPeriod, user.uid);
      saveToCache(cacheKey, {
        weeklyMoodData: freshData.weeklyMoodData,
        emotionalData: freshData.emotionalData,
        timestamp: new Date().toISOString()
      });
    }
  };

  const loadFreshBalanceData = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const freshData = await loadBalanceDataInternal();
    if (freshData) {
      const cacheKey = getCacheKey('balance', balancePeriod, user.uid);
      saveToCache(cacheKey, {
        moodBalance: freshData.moodBalance,
        topEmotions: freshData.topEmotions,
        timestamp: new Date().toISOString()
      });
    }
  };

  const loadFreshPatternAnalysis = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const freshData = await loadPatternAnalysisInternal();
    if (freshData) {
      const cacheKey = getCacheKey('pattern', patternPeriod, user.uid);
      saveToCache(cacheKey, {
        patternAnalysis: freshData.patternAnalysis,
        triggers: freshData.triggers,
        hasEnoughData: freshData.hasEnoughData,
        timestamp: new Date().toISOString()
      });
    }
  };

  const loadHabitAnalysis = async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const analysis = await habitAnalysisService.getHabitAnalysis(user.uid, true);
      setHabitAnalysis(analysis);
    } catch (error) {
      console.error('Error loading habit analysis:', error);
    }
  };

  const loadFreshHighlightsData = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const freshData = await loadHighlightsDataInternal();
    if (freshData) {
      const cacheKey = getCacheKey('highlights', '3months', user.uid);
      saveToCache(cacheKey, {
        highlights: freshData.highlights,
        timestamp: new Date().toISOString()
      });
    }
  };

  const loadRealEmotionalDataInternal = async () => {
    console.log(`📊 UNIFIED: Loading AI emotional data for ${selectedPeriod === 365 ? 'lifetime' : selectedPeriod + ' days'} from NEW Firebase structure...`);
    
    const user = getCurrentUser();
    if (!user) {
      console.log('📊 UNIFIED: No user logged in, showing empty state');
      showEmptyState(selectedPeriod);
      return;
    }

    try {
      // Get AI-generated mood data from new Firebase structure
      let result;
      if (selectedPeriod === 365) {
        // For lifetime, we need to get all available mood data
        // First get all emotional data to find the date range
        const emotionalDataRaw = emotionalAnalysisService.getAllEmotionalData(user.uid);
        if (emotionalDataRaw.length > 0) {
          // Find the earliest date with data
          const sortedData = [...emotionalDataRaw].sort((a, b) => new Date(a.date) - new Date(b.date));
          const startDate = new Date(sortedData[0].date);
          const endDate = new Date();
          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          
          console.log(`📊 LIFETIME: Getting ${daysDiff} days of data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
          result = await firestoreService.getMoodChartDataNew(user.uid, daysDiff);
        } else {
          // No data available, use default period
          result = await firestoreService.getMoodChartDataNew(user.uid, 30);
        }
      } else {
        result = await firestoreService.getMoodChartDataNew(user.uid, selectedPeriod);
      }
      console.log('📊 UNIFIED: Mood chart data result:', result);

      if (result.success && result.moodData && result.moodData.length > 0) {
        console.log('📊 UNIFIED: Processing AI-generated mood data:', result.moodData.length, 'days');
        
        // Apply emotion rules and 200% cap to ALL loaded data
        const processedMoodData = result.moodData.map(day => {
          let { happiness, energy, anxiety, stress } = day;
          
          // Apply 200% cap
          const total = happiness + energy + anxiety + stress;
          if (total > 200) {
            const scaleFactor = 200 / total;
            happiness = Math.round(happiness * scaleFactor);
            energy = Math.round(energy * scaleFactor);
            anxiety = Math.round(anxiety * scaleFactor);
            stress = Math.round(stress * scaleFactor);
            console.log(`🔧 CHART: Applied 200% cap to ${day.day}, total was ${total}, scaled to ${happiness + energy + anxiety + stress}`);
          }
          
          // Apply emotion rules
          // Rule: Happiness decreases if stress/anxiety are high
          if ((stress >= 60 || anxiety >= 60) && happiness > 40) {
            happiness = Math.min(40, happiness);
            console.log(`🔧 CHART: Reduced happiness for ${day.day} due to high stress/anxiety`);
          }
          
          return {
            ...day,
            happiness,
            energy,
            anxiety,
            stress
          };
        });
        
        // Filter for display (show all data, even defaults, but with rules applied)
        const validMoodData = processedMoodData;
        
        if (validMoodData.length > 0) {
          console.log('📊 UNIFIED: Found', validMoodData.length, 'days with rule-compliant scores');
          setWeeklyMoodData(processedMoodData); // Use processed data with rules applied
          setEmotionalData(processedMoodData);
          
          // Calculate averages for display using processed data
          const avgHappiness = processedMoodData.reduce((sum, item) => sum + item.happiness, 0) / processedMoodData.length;
          const avgEnergy = processedMoodData.reduce((sum, item) => sum + item.energy, 0) / processedMoodData.length;
          const avgAnxiety = processedMoodData.reduce((sum, item) => sum + item.anxiety, 0) / processedMoodData.length;
          const avgStress = processedMoodData.reduce((sum, item) => sum + item.stress, 0) / processedMoodData.length;
          const avgTotal = avgHappiness + avgEnergy + avgAnxiety + avgStress;
          
          console.log('📊 UNIFIED: Rule-Applied Averages - H:', Math.round(avgHappiness), 'E:', Math.round(avgEnergy), 'A:', Math.round(avgAnxiety), 'S:', Math.round(avgStress));
          console.log('📊 UNIFIED: Average total:', Math.round(avgTotal), '/ 200 (cap)');
          
          // Return data for caching
          return {
            weeklyMoodData: processedMoodData,
            emotionalData: processedMoodData
          };
        } else {
          console.log('📊 UNIFIED: No real AI scores found, showing empty state');
          showEmptyState(selectedPeriod);
        }
      } else {
        console.log('📊 UNIFIED: No AI mood data found, showing empty state');
        showEmptyState(selectedPeriod);
      }
    } catch (error) {
      console.error('❌ UNIFIED: Error loading AI mood data:', error);
      showEmptyState(selectedPeriod);
    }
    
    return null;
  };

  const loadBalanceDataInternal = async () => {
    console.log(`⚖️ Loading balance data for ${balancePeriod === 365 ? 'lifetime' : balancePeriod + ' days'}...`);
    
    const user = getCurrentUser();
    if (!user) {
      console.log('⚖️ No user logged in for balance data');
      return { moodBalance: [], topEmotions: [] };
    }

    try {
      // Use the same data source as the mood chart for consistency
      let result;
      if (balancePeriod === 365) {
        // For lifetime, get all available mood data
        const emotionalDataRaw = emotionalAnalysisService.getAllEmotionalData(user.uid);
        if (emotionalDataRaw.length > 0) {
          const sortedData = [...emotionalDataRaw].sort((a, b) => new Date(a.date) - new Date(b.date));
          const startDate = new Date(sortedData[0].date);
          const endDate = new Date();
          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          
          console.log(`⚖️ LIFETIME: Getting ${daysDiff} days of balance data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
          result = await firestoreService.getMoodChartDataNew(user.uid, daysDiff);
        } else {
          result = await firestoreService.getMoodChartDataNew(user.uid, 30);
        }
      } else {
        result = await firestoreService.getMoodChartDataNew(user.uid, balancePeriod);
      }

      console.log('⚖️ Balance chart data result:', result);

      let balanceData;
      if (result.success && result.moodData && result.moodData.length > 0) {
        console.log('⚖️ Processing balance data from Firebase:', result.moodData.length, 'days');
        
        // Apply emotion rules and 200% cap to balance data
        const processedMoodData = result.moodData.map(day => {
          let { happiness, energy, anxiety, stress } = day;
          
          // Apply 200% cap
          const total = happiness + energy + anxiety + stress;
          if (total > 200) {
            const scaleFactor = 200 / total;
            happiness = Math.round(happiness * scaleFactor);
            energy = Math.round(energy * scaleFactor);
            anxiety = Math.round(anxiety * scaleFactor);
            stress = Math.round(stress * scaleFactor);
          }
          
          // Apply emotion rules
          if ((stress >= 60 || anxiety >= 60) && happiness > 40) {
            happiness = Math.min(40, happiness);
          }
          
          return {
            ...day,
            happiness,
            energy,
            anxiety,
            stress
          };
        });
        
        balanceData = processBalanceDataInternal(processedMoodData);
      } else {
        console.log('⚖️ No balance data found, creating empty time series');
        balanceData = processBalanceDataInternal([]);
      }
      
      // Set state and return data for caching
      setMoodBalance(balanceData.moodBalance);
      setTopEmotions(balanceData.topEmotions);
      
      return balanceData;
    } catch (error) {
      console.error('❌ Error loading balance data:', error);
      const emptyBalanceData = processBalanceDataInternal([]);
      setMoodBalance(emptyBalanceData.moodBalance);
      setTopEmotions(emptyBalanceData.topEmotions);
      return emptyBalanceData;
    }
  };

  const loadHighlightsDataInternal = async () => {
    console.log(`🏆 Loading highlights data for last 3 months...`);
    
    const user = getCurrentUser();
    if (!user) {
      console.log('🏆 No user logged in for highlights');
      setHighlights({});
      return { highlights: {} };
    }

    try {
      // Use the same Firebase data source as other charts for consistency
      console.log('🔄 Loading highlights data from Firebase...');
      const result = await firestoreService.getMoodChartDataNew(user.uid, 90);
      console.log('🏆 Highlights Firebase data result:', result);

      if (result.success && result.moodData && result.moodData.length > 0) {
        console.log('🏆 Processing highlights data from Firebase:', result.moodData.length, 'days');
        
        // Apply emotion rules and 200% cap to highlights data
        const processedMoodData = result.moodData.map(day => {
          let { happiness, energy, anxiety, stress } = day;
          
          // Apply 200% cap
          const total = happiness + energy + anxiety + stress;
          if (total > 200) {
            const scaleFactor = 200 / total;
            happiness = Math.round(happiness * scaleFactor);
            energy = Math.round(energy * scaleFactor);
            anxiety = Math.round(anxiety * scaleFactor);
            stress = Math.round(stress * scaleFactor);
          }
          
          // Apply emotion rules
          if ((stress >= 60 || anxiety >= 60) && happiness > 40) {
            happiness = Math.min(40, happiness);
          }
          
          return {
            ...day,
            happiness,
            energy,
            anxiety,
            stress
          };
        });
        
        const highlightsData = await processHighlightsDataInternal(processedMoodData, user.uid);
        setHighlights(highlightsData);
        return { highlights: highlightsData };
      } else {
        console.log('📝 No highlights data found in Firebase');
        setHighlights({});
        return { highlights: {} };
      }
    } catch (error) {
      console.error('❌ Error loading highlights data:', error);
      setHighlights({});
      return { highlights: {} };
    }
  };

  const processHighlightsDataInternal = async (data, userId) => {
    console.log(`🔄 Processing highlights data: ${data.length} entries for last 3 months`);
    
    // Filter valid data for highlights (must have actual emotional scores, not defaults)
    const validData = data.filter(item => 
      item.happiness !== undefined && 
      item.happiness > 0 && 
      item.energy > 0 && 
      item.anxiety > 0 && 
      item.stress > 0
    );
    
    console.log(`🔄 Valid highlights data: ${validData.length} entries (filtered from ${data.length})`);
    
    if (validData.length === 0) {
      console.log('📝 No valid emotional data found for highlights');
      // Return empty highlights but with a message
      return {
        peak: {
          title: "Best Mood Day",
          description: "No emotional data available for the last 3 months. Start chatting with Deite to track your emotional journey!",
          date: "No data",
          score: 0
        },
        toughestDay: {
          title: "Challenging Day", 
          description: "No emotional data available for the last 3 months. Your emotional patterns will appear after chatting.",
          date: "No data",
          score: 0
        }
      };
    }

    // Generate highlights based on real data
    const bestDay = validData.reduce((best, current) => {
      const currentScore = (current.happiness + current.energy) / 2;
      const bestScore = (best.happiness + best.energy) / 2;
      return currentScore > bestScore ? current : best;
    });

    const worstDay = validData.reduce((worst, current) => {
      const currentScore = (current.anxiety + current.stress) / 2;
      const worstScore = (worst.anxiety + worst.stress) / 2;
      return currentScore > worstScore ? current : worst;
    });

    console.log('🏆 Best day found:', bestDay);
    console.log('🏆 Worst day found:', worstDay);

    let highlightsData;

    try {
      // Generate AI descriptions for best and challenging days
      console.log('🤖 Generating AI mini-story descriptions for highlights...');
      console.log('🤖 Best day data:', bestDay);
      console.log('🤖 Worst day data:', worstDay);
      
      const periodText = 'the last 3 months';
      
      console.log('🚀 Calling RunPod AI for mini-stories...');
      const [bestDayDescription, worstDayDescription] = await Promise.all([
        chatService.generateDayDescription(bestDay, 'best', periodText),
        chatService.generateDayDescription(worstDay, 'challenging', periodText)
      ]);
      
      console.log('✅ AI Best day description:', bestDayDescription);
      console.log('✅ AI Challenging day description:', worstDayDescription);

      highlightsData = {
        peak: {
          title: "Best Mood Day",
          description: bestDayDescription,
          date: bestDay.date ? new Date(bestDay.date).toLocaleDateString() : 'Unknown Date',
          score: Math.round((bestDay.happiness + bestDay.energy) / 2)
        },
        toughestDay: {
          title: "Challenging Day",
          description: worstDayDescription,
          date: worstDay.date ? new Date(worstDay.date).toLocaleDateString() : 'Unknown Date',
          score: Math.round((worstDay.anxiety + worstDay.stress) / 2)
        }
      };

      // Save to cache for future use
      try {
        console.log('💾 Saving highlights to cache...');
        await firestoreService.saveHighlightsCache(userId, '3months', highlightsData);
        console.log('✅ Highlights cached successfully');
      } catch (cacheError) {
        console.error('❌ Error caching highlights (non-critical):', cacheError);
      }

    } catch (error) {
      console.error('❌ Error generating AI descriptions for highlights, using fallbacks:', error);
      
      // Fallback to original descriptions if AI generation fails
      const bestScore = Math.round((bestDay.happiness + bestDay.energy) / 2);
      const worstScore = Math.round((worstDay.anxiety + worstDay.stress) / 2);
      
      highlightsData = {
        peak: {
          title: "Best Mood Day",
          description: `You had your highest emotional peak with ${bestScore}% positive energy. This was likely due to meaningful progress, positive interactions, or achieving something important to you.`,
          date: bestDay.date ? new Date(bestDay.date).toLocaleDateString() : 'Unknown Date',
          score: bestScore
        },
        toughestDay: {
          title: "Challenging Day",
          description: `You experienced your most challenging day with ${worstScore}% stress and anxiety. This was likely due to multiple pressures, difficult decisions, or overwhelming circumstances.`,
          date: worstDay.date ? new Date(worstDay.date).toLocaleDateString() : 'Unknown Date',
          score: worstScore
        }
      };
      
      // Still save fallback to cache
      try {
        await firestoreService.saveHighlightsCache(userId, '3months', highlightsData);
      } catch (cacheError) {
        console.error('❌ Error caching fallback highlights:', cacheError);
      }
    }

    console.log('✅ Highlights data processed successfully');
    console.log('🏆 Final highlights data:', highlightsData);
    return highlightsData;
  };

  const processBalanceDataInternal = (data) => {
    console.log(`🔄 Processing balance data: ${data.length} entries for ${balancePeriod === 365 ? 'lifetime' : balancePeriod + ' days'}`);
    
    // If we have data, use it directly (it's already from Firebase with proper date range)
    if (data.length > 0) {
      console.log('🔄 Using Firebase data directly for balance chart');
      
      const moodBalance = data.map(dayData => {
        const date = new Date(dayData.date);
        
        // Calculate balance for this specific day
        const positiveScore = Math.round((dayData.happiness + dayData.energy) / 2);
        const negativeScore = Math.round((dayData.anxiety + dayData.stress) / 2);
        const neutralScore = Math.max(0, 100 - positiveScore - negativeScore);
        
        return {
          day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: dayData.date,
          positive: positiveScore,
          neutral: neutralScore,
          negative: negativeScore
        };
      });
      
      // Calculate top emotions from available data
      const avgHappiness = data.reduce((sum, item) => sum + item.happiness, 0) / data.length;
      const avgEnergy = data.reduce((sum, item) => sum + item.energy, 0) / data.length;
      const avgAnxiety = data.reduce((sum, item) => sum + item.anxiety, 0) / data.length;
      const avgStress = data.reduce((sum, item) => sum + item.stress, 0) / data.length;

      const topEmotions = [
        { name: 'Happiness', value: Math.round(avgHappiness), color: '#10B981' },
        { name: 'Energy', value: Math.round(avgEnergy), color: '#F59E0B' },
        { name: 'Anxiety', value: Math.round(avgAnxiety), color: '#EF4444' },
        { name: 'Stress', value: Math.round(avgStress), color: '#8B5CF6' }
      ].sort((a, b) => b.value - a.value);

      console.log('✅ Balance data processed successfully from Firebase data');
      return { moodBalance, topEmotions };
    }
    
    // Fallback: Create date range for the balance period when no data
    const dateRange = [];
    if (balancePeriod === 365) {
      // For lifetime with no data, show last 30 days as fallback
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dateRange.push(date.toISOString().split('T')[0]);
      }
    } else {
      // For specific day periods
      for (let i = balancePeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dateRange.push(date.toISOString().split('T')[0]);
      }
    }

    // Map balance data to date range with default values
    const moodBalance = dateRange.map(dateStr => {
      const date = new Date(dateStr);
      
      // Default balanced state for days with no data
      return {
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: dateStr,
        positive: 40,
        neutral: 35,
        negative: 25
      };
    });

    // Default emotions when no data
    const topEmotions = [
      { name: 'Happiness', value: 50, color: '#10B981' },
      { name: 'Energy', value: 50, color: '#F59E0B' },
      { name: 'Anxiety', value: 25, color: '#EF4444' },
      { name: 'Stress', value: 25, color: '#8B5CF6' }
    ];

    console.log('✅ Balance data processed successfully with default values');
    return { moodBalance, topEmotions };
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
    const displayPeriod = days === 365 ? 'lifetime' : `${days} days`;
    console.log(`📭 Showing empty state for ${displayPeriod} - no chat data available`);
    
    // Create empty date range for display
    const dateRange = [];
    const actualDays = days === 365 ? 30 : days; // For lifetime with no data, show 30 days
    for (let i = actualDays - 1; i >= 0; i--) {
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

    // Set empty mood balance with default time series
    const emptyBalanceData = dateRange.map(date => ({
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: date.toISOString().split('T')[0],
      positive: 0,
      neutral: 0,
      negative: 0
    }));
    setMoodBalance(emptyBalanceData);

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

  const loadPatternAnalysisInternal = async () => {
    console.log(`🔍 Loading pattern analysis for ${patternPeriod} days...`);
    setPatternLoading(true);
    
    try {
      const user = getCurrentUser();
      const userId = user?.uid || 'anonymous';
      
      const analysis = await patternAnalysisService.getPatternAnalysis(userId, patternPeriod, true);
      console.log('📊 Pattern analysis result:', analysis);
      
      setPatternAnalysis(analysis);
      setHasEnoughData(analysis.hasEnoughData);
      
      let triggers;
      if (analysis.success && analysis.hasEnoughData) {
        triggers = analysis.triggers;
        setTriggers(analysis.triggers);
      } else {
        // Set empty state or "not enough data" message
        triggers = {
          stress: [],
          joy: [],
          distraction: []
        };
        setTriggers(triggers);
      }
      
      return {
        patternAnalysis: analysis,
        triggers: triggers,
        hasEnoughData: analysis.hasEnoughData
      };
    } catch (error) {
      console.error('❌ Error loading pattern analysis:', error);
      const defaultTriggers = {
        stress: [],
        joy: [],
        distraction: []
      };
      setTriggers(defaultTriggers);
      setHasEnoughData(false);
      
      return {
        patternAnalysis: null,
        triggers: defaultTriggers,
        hasEnoughData: false
      };
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

  const handleDateClick = async (dateData) => {
    console.log('📊 Date clicked for detailed analysis:', dateData);
    setSelectedDateDetails(dateData);
    
    try {
      // Generate AI explanations for why each emotion has its score
      const explanations = await generateEmotionExplanations(dateData);
      setEmotionExplanations(explanations);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('❌ Error generating emotion explanations:', error);
      // Show modal with basic info even if AI fails
      setEmotionExplanations({
        happiness: `You felt happy because of positive interactions and topics discussed.`,
        energy: `Your energy was steady since you were engaged in meaningful conversation.`,
        anxiety: `You had some concerns about various topics that came up.`,
        stress: `You felt mild stress due to daily responsibilities mentioned.`
      });
      setShowDetailsModal(true);
    }
  };

  const generateEmotionExplanations = async (dateData) => {
    console.log('🤖 Generating AI explanations for emotion scores...');
    
    const user = getCurrentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    // Get chat messages for that specific date
    const chatResult = await firestoreService.getChatMessagesNew(user.uid, dateData.date);
    
    if (!chatResult.success || !chatResult.messages || chatResult.messages.length === 0) {
      throw new Error('No chat data found for this date');
    }

    // Create conversation transcript for that day
    const transcript = chatResult.messages.map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Deite'}: ${msg.text}`
    ).join('\n\n');

    const explanationPrompt = `Based on this conversation, explain why the user felt each emotion at that specific level. Give one concise, contextual reason per emotion.

CONVERSATION:
${transcript}

EMOTION SCORES:
- Happiness: ${dateData.happiness}%
- Energy: ${dateData.energy}%
- Anxiety: ${dateData.anxiety}%
- Stress: ${dateData.stress}%

For each emotion, provide ONE short sentence explaining WHY the user felt that way based on what they discussed. Be specific and contextual, not generic.

Examples:
- "You felt happy because you achieved a goal you were working towards."
- "Your energy was steady since you were motivated but dealing with challenges."
- "You had some worries about upcoming deadlines that were mentioned."
- "You felt mild stress due to work responsibilities you discussed."

Return in this JSON format:
{
  "happiness": "You felt happy because [specific reason from conversation]",
  "energy": "Your energy was [level description] since [specific reason from conversation]",
  "anxiety": "You had [anxiety level description] about [specific concern from conversation]",
  "stress": "You felt [stress level description] due to [specific stressor from conversation]"
}`;

    try {
      const response = await fetch(`https://uku63xhk0nopot-11434.proxy.runpod.net/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:70b',
          prompt: explanationPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 300
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          const jsonMatch = data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const explanations = JSON.parse(jsonMatch[0]);
            console.log('✅ AI explanations generated:', explanations);
            return explanations;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error generating AI explanations:', error);
    }

    // Fallback explanations
    return {
      happiness: `You felt happy because of the positive topics and achievements discussed in your conversation.`,
      energy: `Your energy was moderate since you were engaged but dealing with various challenges.`,
      anxiety: `You had some concerns about topics that came up during the chat.`,
      stress: `You felt mild stress due to responsibilities and pressures mentioned.`
    };
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

      // Update highlights with AI-generated descriptions
      const validData = emotionalDataRaw.filter(item => item.happiness !== undefined);
      if (validData.length > 0) {
        const bestDay = validData.reduce((best, current) => 
          (current.happiness + current.energy) > (best.happiness + best.energy) ? current : best
        );
        const worstDay = validData.reduce((worst, current) => 
          (current.anxiety + current.stress) > (worst.anxiety + worst.stress) ? current : worst
        );

        const updatedHighlights = {
          peak: {
            title: "Best Mood Day",
            description: aiAnalysis.highlights.bestDayReason,
            date: new Date(bestDay.timestamp).toLocaleDateString(),
            score: Math.round((bestDay.happiness + bestDay.energy) / 2)
          },
          toughestDay: {
            title: "Challenging Day",
            description: aiAnalysis.highlights.challengingDayReason,
            date: new Date(worstDay.timestamp).toLocaleDateString(),
            score: Math.round((worstDay.anxiety + worstDay.stress) / 2)
          }
        };

        setHighlights(updatedHighlights);

        // Cache the updated highlights
        try {
          await firestoreService.saveHighlightsCache(userId, '3months', updatedHighlights);
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

      // Update pattern analysis with AI insights
      setPatternAnalysis({
        overallTrend: aiAnalysis.patterns.overallTrend,
        keyInsight: aiAnalysis.patterns.keyInsight,
        recommendation: aiAnalysis.patterns.recommendation,
        emotionalBalance: aiAnalysis.emotionalBalance,
        personalizedGuidance: aiAnalysis.personalizedGuidance
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
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
                  Mood Chart - {selectedPeriod === 365 ? 'Lifetime' : `${selectedPeriod} Day`} Summary
                </h3>
              </div>
              
              {/* Period Toggle - moved inside line graph container */}
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  onClick={() => setSelectedPeriod(7)}
                  className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-300 ${
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
                  className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-300 ${
                    selectedPeriod === 15
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  15 Days
                </button>
                <button
                  onClick={() => setSelectedPeriod(365)}
                  className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-300 ${
                    selectedPeriod === 365
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Lifetime
                </button>
              </div>
            </div>

            <div className="h-48 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={weeklyMoodData}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const clickedData = data.activePayload[0].payload;
                      console.log('📊 CHART CLICK: Date clicked:', clickedData);
                      handleDateClick(clickedData);
                    }
                  }}
                >
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

          {/* 2. Emotional Balance - Line Chart */}
          {moodBalance.length > 0 && (
            <div
              className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
                isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
              }`}
              style={{
                boxShadow: isDarkMode 
                  ? "inset 0 0 20px rgba(212, 175, 55, 0.1), 0 8px 32px rgba(212, 175, 55, 0.05)"
                  : "inset 0 0 20px rgba(134, 169, 107, 0.1), 0 8px 32px rgba(134, 169, 107, 0.05)",
              }}
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
                    Emotional Balance - {balancePeriod === 365 ? 'Lifetime' : `${balancePeriod} Day${balancePeriod > 1 ? 's' : ''}`} Overview
                  </h3>
                </div>

                {/* Balance Period Toggle */}
                <div className="flex space-x-1 sm:space-x-2">
                  <button
                    onClick={() => setBalancePeriod(7)}
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-all duration-300 ${
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
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-all duration-300 ${
                      balancePeriod === 30
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => setBalancePeriod(365)}
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-all duration-300 ${
                      balancePeriod === 365
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Lifetime
                  </button>
                </div>
              </div>

              <div className="h-48 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodBalance}>
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
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ stroke: isDarkMode ? '#374151' : '#D1D5DB', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="positive"
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
                      dataKey="neutral"
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
                      dataKey="negative"
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
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#7DD3C0]"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Positive</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#D4AF37]"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Neutral</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#9BB5FF]"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Negative</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Highlights */}
          <div
            className={`rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(230, 179, 186, 0.2) 0%, rgba(177, 156, 217, 0.2) 100%)",
                  border: "1px solid rgba(230, 179, 186, 0.3)",
                }}
              >
                <Award className="w-5 h-5" style={{ color: "#E6B3BA" }} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Highlights
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Last 3 months emotional journey
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Best Mood Day - Unified UI with Green Title */}
              <div 
                className="group p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                style={{
                  backgroundColor: "rgba(30, 35, 50, 0.8)",
                  border: "1px solid rgba(125, 211, 192, 0.2)",
                  boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "inset 0 0 25px rgba(125, 211, 192, 0.15), 0 12px 40px rgba(125, 211, 192, 0.2)";
                  e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)";
                  e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.2)";
                }}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    style={{
                      backgroundColor: "rgba(125, 211, 192, 0.2)",
                      boxShadow: "0 0 15px rgba(125, 211, 192, 0.3)",
                    }}
                  >
                    <Smile className="w-4 h-4" style={{ color: "#E8F4F1" }} />
                  </div>
                  <h4 className="font-semibold text-green-400 group-hover:text-green-300 transition-colors duration-300">
                    {highlights.peak?.title || 'Best Mood Day'}
                  </h4>
                </div>
                <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed mb-2">
                  {highlights.peak?.description || 'Your highest emotional peak this period.'}
                </p>
                <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                  {highlights.peak?.date || 'No data available'}
                </p>
              </div>

              {/* Challenging Day - Unified UI with Red Title */}
              <div 
                className="group p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                style={{
                  backgroundColor: "rgba(30, 35, 50, 0.8)",
                  border: "1px solid rgba(125, 211, 192, 0.2)",
                  boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "inset 0 0 25px rgba(125, 211, 192, 0.15), 0 12px 40px rgba(125, 211, 192, 0.2)";
                  e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)";
                  e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.2)";
                }}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    style={{
                      backgroundColor: "rgba(125, 211, 192, 0.2)",
                      boxShadow: "0 0 15px rgba(125, 211, 192, 0.3)",
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: "#E8F4F1" }} />
                  </div>
                  <h4 className="font-semibold text-red-400 group-hover:text-red-300 transition-colors duration-300">
                    {highlights.toughestDay?.title || 'Challenging Day'}
                  </h4>
                </div>
                <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed mb-2">
                  {highlights.toughestDay?.description || 'Your most challenging emotional period.'}
                </p>
                <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                  {highlights.toughestDay?.date || 'No data available'}
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
            <div className="flex items-center space-x-3 mb-6">
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

            {/* Loading State */}
            {patternLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Analyzing your patterns...
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Success State - Requirements Met */}
              {habitAnalysis && habitAnalysis.success && habitAnalysis.habits && habitAnalysis.habits.length > 0 ? (
                <>
                  {/* Success Banner */}
                  <div className="col-span-full mb-4">
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                          <span className="text-white text-lg">🎉</span>
                        </div>
                        <div>
                          <h5 className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                            Unlocked Habits! 🎯
                          </h5>
                          <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                            Great job staying consistent — here are your personalized habits!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
              
              {/* AI-Generated Habits */}
              {habitAnalysis && habitAnalysis.success && habitAnalysis.habits && habitAnalysis.habits.length > 0 ? (
                habitAnalysis.habits.map((habit, index) => (
                  <div 
                    key={index} 
                    className={`group p-4 sm:p-6 rounded-2xl transition-all duration-300 hover:scale-105 cursor-pointer transform hover:shadow-lg ${
                      isDarkMode 
                        ? 'bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 hover:shadow-green-500/20' 
                        : 'bg-green-50 border border-green-200 hover:bg-green-100 hover:shadow-green-200'
                    }`}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      animation: 'fadeInUp 0.6s ease-out forwards'
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                        isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                      }`}>
                        <Target className="w-5 h-5 text-green-500" />
                      </div>
                      <h4 className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                        {habit.title}
                      </h4>
                    </div>
                    <p className={`text-sm mb-4 leading-relaxed ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                      {habit.description}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-xs px-3 py-1 rounded-full font-medium ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        {habit.frequency}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {habit.category?.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div className={`text-xs p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30 text-green-300' : 'bg-gray-50 text-green-600'}`}>
                      <strong>Why this helps:</strong> {habit.why}
                    </div>
                  </div>
                ))
              ) : habitAnalysis && !habitAnalysis.success ? (
                <div 
                  className={`col-span-full p-8 rounded-2xl backdrop-blur-lg transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-800/40 border border-gray-700/30' : 'bg-white/40 border border-gray-200/30'
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
                      style={{
                        background: "linear-gradient(135deg, rgba(125, 211, 192, 0.2) 0%, rgba(212, 175, 55, 0.2) 100%)",
                        border: "1px solid rgba(125, 211, 192, 0.3)",
                        boxShadow: "0 0 20px rgba(125, 211, 192, 0.1)",
                      }}
                    >
                      <Brain className="w-6 h-6" style={{ color: "#7DD3C0" }} />
                    </div>
                    <div>
                      <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        Building Your Personalized Habits 🎯
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Almost there! Just a few more conversations to unlock your insights
                      </p>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Progress to Unlock Habits
                      </h5>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {habitAnalysis.totalMessages || 0} / 50 messages
                      </div>
                    </div>
                    
                    {/* Circular Progress Ring */}
                    <div className="flex items-center space-x-6">
                      <div className={`relative w-20 h-20 ${((habitAnalysis.totalMessages || 0) / 50) >= 0.8 ? 'animate-pulse' : ''}`}>
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className={`${isDarkMode ? 'text-gray-700' : 'text-gray-200'}`}
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={`text-green-500 ${((habitAnalysis.totalMessages || 0) / 50) >= 0.8 ? 'drop-shadow-lg' : ''}`}
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${((habitAnalysis.totalMessages || 0) / 50) * 100}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{
                              filter: ((habitAnalysis.totalMessages || 0) / 50) >= 0.8 ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))' : 'none'
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {Math.round(((habitAnalysis.totalMessages || 0) / 50) * 100)}%
                          </span>
                        </div>
                        {((habitAnalysis.totalMessages || 0) / 50) >= 0.9 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-green-500 animate-ping opacity-75"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {habitAnalysis.totalMessages || 0} / 50 messages
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {50 - (habitAnalysis.totalMessages || 0)} more to go!
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Checklist */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <h6 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Requirements Checklist
                    </h6>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          (habitAnalysis.totalMessages || 0) >= 50 ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {(habitAnalysis.totalMessages || 0) >= 50 ? (
                            <span className="text-white text-xs">✓</span>
                          ) : (
                            <span className="text-white text-xs">○</span>
                          )}
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          50 messages {habitAnalysis.totalMessages >= 50 ? '(Complete!)' : `(${habitAnalysis.totalMessages || 0}/50)`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          (habitAnalysis.totalDays || 0) >= 30 ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {(habitAnalysis.totalDays || 0) >= 30 ? (
                            <span className="text-white text-xs">✓</span>
                          ) : (
                            <span className="text-white text-xs">○</span>
                          )}
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          30 days of conversations {habitAnalysis.totalDays >= 30 ? '(Complete!)' : `(${habitAnalysis.totalDays || 0}/30)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Encouragement Message */}
                  <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`text-sm text-center ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      💬 Keep chatting with Deite to unlock your personalized habits and insights!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Continue Chatting */}
                  <div 
                    className="group p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                    style={{
                      backgroundColor: "rgba(30, 35, 50, 0.8)",
                      border: "1px solid rgba(125, 211, 192, 0.2)",
                      boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "inset 0 0 25px rgba(125, 211, 192, 0.15), 0 12px 40px rgba(125, 211, 192, 0.2)";
                      e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)";
                      e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.2)";
                    }}
                    onClick={() => navigate('/chat')}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          backgroundColor: "rgba(125, 211, 192, 0.2)",
                          boxShadow: "0 0 15px rgba(125, 211, 192, 0.3)",
                        }}
                      >
                        <Sun className="w-4 h-4" style={{ color: "#E8F4F1" }} />
                      </div>
                      <h4 className="font-semibold text-gray-100 group-hover:text-white transition-colors duration-300">
                        Continue Chatting
                      </h4>
                    </div>
                    <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed">
                      Keep engaging with Deite to build more comprehensive emotional insights and patterns.
                    </p>
                  </div>

                  {/* Reflect Daily */}
                  <div 
                    className="group p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                    style={{
                      backgroundColor: "rgba(30, 35, 50, 0.8)",
                      border: "1px solid rgba(125, 211, 192, 0.2)",
                      boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "inset 0 0 25px rgba(125, 211, 192, 0.15), 0 12px 40px rgba(125, 211, 192, 0.2)";
                      e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)";
                      e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.2)";
                    }}
                    onClick={() => navigate('/chat')}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          backgroundColor: "rgba(125, 211, 192, 0.2)",
                          boxShadow: "0 0 15px rgba(125, 211, 192, 0.3)",
                        }}
                      >
                        <Star className="w-4 h-4" style={{ color: "#E8F4F1" }} />
                      </div>
                      <h4 className="font-semibold text-gray-100 group-hover:text-white transition-colors duration-300">
                        Reflect Daily
                      </h4>
                    </div>
                    <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed">
                      Regular conversations help create more accurate emotional tracking and better insights.
                    </p>
                  </div>

                  {/* Build Patterns */}
                  <div 
                    className="group p-4 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                    style={{
                      backgroundColor: "rgba(30, 35, 50, 0.8)",
                      border: "1px solid rgba(125, 211, 192, 0.2)",
                      boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "inset 0 0 25px rgba(125, 211, 192, 0.15), 0 12px 40px rgba(125, 211, 192, 0.2)";
                      e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(125, 211, 192, 0.05), 0 8px 32px rgba(125, 211, 192, 0.08)";
                      e.currentTarget.style.border = "1px solid rgba(125, 211, 192, 0.2)";
                    }}
                    onClick={() => navigate('/chat')}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          backgroundColor: "rgba(125, 211, 192, 0.2)",
                          boxShadow: "0 0 15px rgba(125, 211, 192, 0.3)",
                        }}
                      >
                        <Brain className="w-4 h-4" style={{ color: "#E8F4F1" }} />
                      </div>
                      <h4 className="font-semibold text-gray-100 group-hover:text-white transition-colors duration-300">
                        Build Patterns
                      </h4>
                    </div>
                    <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed">
                      Share more details about your experiences to unlock personalized insights.
                    </p>
                  </div>
                </>
              )}
            </div>
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
      <div className={`sticky top-0 z-20 flex items-center justify-between p-3 sm:p-6 border-b backdrop-blur-lg ${
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
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity ${
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
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: isDarkMode ? "#7DD3C0" : "#87A96B" }} strokeWidth={1.5} />
        </button>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
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
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: isDarkMode ? "#D4AF37" : "#87A96B" }} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Emotional Wellbeing
            </h1>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Track your emotional journey
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAIUpdate}
          disabled={isUpdating}
          className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-200 ${
            isUpdating 
              ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
        >
          <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${(isUpdating || isLoadingFresh) ? 'animate-spin' : ''}`} />
          <span className="text-xs sm:text-sm font-medium">
            {isUpdating ? 'Updating...' : isLoadingFresh ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {renderMoodSurvey()}
      </div>

      {/* Emotion Details Modal */}
      {showDetailsModal && selectedDateDetails && emotionExplanations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div
            className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            style={{
              boxShadow: isDarkMode 
                ? "0 20px 60px rgba(0, 0, 0, 0.5)"
                : "0 20px 60px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Emotion Details - {selectedDateDetails.day}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className={`text-lg sm:text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>×</span>
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Happiness */}
              <div className="p-3 sm:p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Smile className="w-4 h-4 text-white" />
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                    Happiness: {selectedDateDetails.happiness}%
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {emotionExplanations.happiness}
                </p>
              </div>

              {/* Energy */}
              <div className="p-3 sm:p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                    Energy: {selectedDateDetails.energy}%
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                  {emotionExplanations.energy}
                </p>
              </div>

              {/* Anxiety */}
              <div className="p-3 sm:p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    Anxiety: {selectedDateDetails.anxiety}%
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {emotionExplanations.anxiety}
                </p>
              </div>

              {/* Stress */}
              <div className="p-3 sm:p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                    Stress: {selectedDateDetails.stress}%
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {emotionExplanations.stress}
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
