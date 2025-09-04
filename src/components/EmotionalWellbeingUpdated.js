import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import emotionalAnalysisService from '../services/emotionalAnalysisService';
import { getCurrentUser } from '../services/authService';
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
  Sun
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
  Bar 
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

  useEffect(() => {
    loadRealEmotionalData();
  }, [selectedPeriod]);

  useEffect(() => {
    loadRealEmotionalData();
  }, []);

  const loadRealEmotionalData = () => {
    console.log(`📊 Loading emotional data for ${selectedPeriod} days...`);
    
    const user = getCurrentUser();
    const userId = user?.uid || 'anonymous';
    
    // Get emotional data from the analysis service
    const emotionalDataRaw = emotionalAnalysisService.getEmotionalData(userId, selectedPeriod);
    console.log('📈 Raw emotional data:', emotionalDataRaw);

    if (emotionalDataRaw.length === 0) {
      console.log('📝 No emotional data found, generating mock data for visualization');
      generateMockDataForPeriod(selectedPeriod);
      return;
    }

    processRealEmotionalData(emotionalDataRaw);
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

    // Calculate averages for mood balance
    const validData = data.filter(item => item.happiness !== undefined);
    if (validData.length > 0) {
      const avgHappiness = validData.reduce((sum, day) => sum + day.happiness, 0) / validData.length;
      const avgEnergy = validData.reduce((sum, day) => sum + day.energy, 0) / validData.length;
      const avgAnxiety = validData.reduce((sum, day) => sum + day.anxiety, 0) / validData.length;
      const avgStress = validData.reduce((sum, day) => sum + day.stress, 0) / validData.length;

      // Mood balance based on averages
      const positiveScore = Math.round((avgHappiness + avgEnergy) / 2);
      const negativeScore = Math.round((avgAnxiety + avgStress) / 2);
      const neutralScore = Math.max(0, 100 - positiveScore - negativeScore);

      setMoodBalance([
        { name: 'Positive', value: positiveScore, color: '#7DD3C0' },
        { name: 'Neutral', value: neutralScore, color: '#D4AF37' },
        { name: 'Negative', value: negativeScore, color: '#9BB5FF' }
      ]);

      // Top emotions based on scores
      const topEmotionsData = [
        { emotion: 'Happy', percentage: Math.round(avgHappiness), color: '#7DD3C0' },
        { emotion: 'Energetic', percentage: Math.round(avgEnergy), color: '#D4AF37' },
        { emotion: 'Calm', percentage: Math.round(100 - avgAnxiety), color: '#9BB5FF' },
        { emotion: 'Relaxed', percentage: Math.round(100 - avgStress), color: '#E6B3BA' }
      ].sort((a, b) => b.percentage - a.percentage);

      setTopEmotions(topEmotionsData);

      // Generate highlights based on real data
      const bestDay = validData.reduce((best, current) => 
        (current.happiness + current.energy) > (best.happiness + best.energy) ? current : best
      );

      const worstDay = validData.reduce((worst, current) => 
        (current.anxiety + current.stress) > (worst.anxiety + worst.stress) ? current : worst
      );

      setHighlights({
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
        },
        shift: {
          title: `${selectedPeriod}-Day Average`,
          description: `Happiness: ${Math.round(avgHappiness)}%, Energy: ${Math.round(avgEnergy)}%`,
          change: `Tracked ${validData.length} days`,
          trend: avgHappiness > 60 ? "up" : "neutral"
        }
      });

      setTriggers({
        stress: avgStress > 50 ? ["High stress conversations", "Complex decisions"] : ["Minor uncertainties", "Daily pressures"],
        joy: ["Meaningful conversations", "Self-reflection", "Emotional support"],
        distraction: ["Overthinking patterns", "Worry cycles"]
      });
    }

    setEmotionalData(data);
    console.log('✅ Real emotional data processed successfully');
  };

  const generateMockDataForPeriod = (days) => {
    console.log(`🎭 Generating mock data for ${days} days`);
    
    // Create date range
    const dateRange = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date);
    }

    // Generate mock weekly mood data with actual dates
    const weeklyData = dateRange.map(date => ({
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: date.toISOString().split('T')[0],
      happiness: Math.floor(Math.random() * 40) + 60,
      anxiety: Math.floor(Math.random() * 30) + 10,
      energy: Math.floor(Math.random() * 35) + 65,
      stress: Math.floor(Math.random() * 25) + 5,
    }));
    setWeeklyMoodData(weeklyData);

    // Generate mood balance data
    setMoodBalance([
      { name: 'Positive', value: 65, color: '#7DD3C0' },
      { name: 'Neutral', value: 25, color: '#D4AF37' },
      { name: 'Negative', value: 10, color: '#9BB5FF' }
    ]);

    // Generate top emotions data
    setTopEmotions([
      { emotion: 'Happy', percentage: 75, color: '#7DD3C0' },
      { emotion: 'Energetic', percentage: 68, color: '#D4AF37' },
      { emotion: 'Calm', percentage: 62, color: '#9BB5FF' },
      { emotion: 'Relaxed', percentage: 58, color: '#E6B3BA' }
    ]);

    // Generate emotional timeline data
    const timelineData = weeklyData.map(item => ({
      date: item.date,
      happiness: item.happiness,
      anxiety: item.anxiety,
      energy: item.energy,
      stress: item.stress,
    }));
    setEmotionalData(timelineData);

    // Generate highlights
    setHighlights({
      peak: {
        title: "Start Chatting",
        description: "Chat with Deite to see your best days",
        date: "Soon",
        score: 0
      },
      toughestDay: {
        title: "Track Your Journey",
        description: "Emotional patterns will appear here",
        date: "Soon",
        score: 0
      },
      shift: {
        title: `Mock Data (${days} days)`,
        description: "Real insights coming after you chat",
        change: "Chat to see trends",
        trend: "neutral"
      }
    });

    // Generate triggers
    setTriggers({
      stress: ["Start chatting to discover patterns"],
      joy: ["Meaningful conversations", "Self-reflection", "Emotional support"],
      distraction: ["Chat with Deite to identify triggers"]
    });

    console.log('✅ Mock data generated successfully');
  };

  const handleBack = () => {
    navigate('/dashboard');
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

      {/* Weekly Emotion Summary Line Chart */}
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
            {selectedPeriod} Day Emotion Summary
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
              <Line
                type="monotone"
                dataKey="happiness"
                stroke="#7DD3C0"
                strokeWidth={3}
                dot={{ fill: '#7DD3C0', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#7DD3C0', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#D4AF37"
                strokeWidth={3}
                dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#D4AF37', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="anxiety"
                stroke="#9BB5FF"
                strokeWidth={3}
                dot={{ fill: '#9BB5FF', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#9BB5FF', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="stress"
                stroke="#E6B3BA"
                strokeWidth={3}
                dot={{ fill: '#E6B3BA', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#E6B3BA', strokeWidth: 2 }}
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

      {/* Rest of the component remains the same but will be displayed with real data */}
      <div className="text-center py-8">
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {emotionalData.length > 0 ? 
            `Showing real emotional data from your conversations` : 
            `Start chatting with Deite to see your emotional insights here`
          }
        </p>
      </div>
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

        <div className="w-10 h-10" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderMoodSurvey()}
      </div>
    </div>
  );
}
