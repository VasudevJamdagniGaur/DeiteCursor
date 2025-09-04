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

  useEffect(() => {
    loadRealEmotionalData();
  }, [selectedPeriod]);

  useEffect(() => {
    loadBalanceData();
  }, [balancePeriod]);

  useEffect(() => {
    loadRealEmotionalData();
    loadBalanceData();
  }, []);

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

  const loadBalanceData = () => {
    console.log(`⚖️ Loading balance data for ${balancePeriod} days...`);
    
    const user = getCurrentUser();
    const userId = user?.uid || 'anonymous';
    
    // Get emotional data for the balance period
    const balanceDataRaw = emotionalAnalysisService.getEmotionalData(userId, balancePeriod);
    console.log('📊 Balance data:', balanceDataRaw);

    if (balanceDataRaw.length === 0) {
      console.log('📝 No balance data found, setting empty balance');
      setMoodBalance([]);
      return;
    }

    processBalanceData(balanceDataRaw);
  };

  const processBalanceData = (data) => {
    console.log(`🔄 Processing balance data: ${data.length} entries for ${balancePeriod} days`);
    
    // Calculate averages for the selected period
    const validData = data.filter(item => item.happiness !== undefined);
    
    if (validData.length > 0) {
      const avgHappiness = validData.reduce((sum, day) => sum + day.happiness, 0) / validData.length;
      const avgEnergy = validData.reduce((sum, day) => sum + day.energy, 0) / validData.length;
      const avgAnxiety = validData.reduce((sum, day) => sum + day.anxiety, 0) / validData.length;
      const avgStress = validData.reduce((sum, day) => sum + day.stress, 0) / validData.length;

      // Calculate balance based on averages
      const positiveScore = Math.round((avgHappiness + avgEnergy) / 2);
      const negativeScore = Math.round((avgAnxiety + avgStress) / 2);
      const neutralScore = Math.max(0, 100 - positiveScore - negativeScore);

      setMoodBalance([
        { name: 'Positive', value: positiveScore, color: '#7DD3C0' },
        { name: 'Neutral', value: neutralScore, color: '#D4AF37' },
        { name: 'Negative', value: negativeScore, color: '#9BB5FF' }
      ]);

      console.log('✅ Balance data processed successfully');
    } else {
      setMoodBalance([]);
    }
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
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Highlights
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-100 border border-blue-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h4 className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {highlights.shift?.title}
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {highlights.shift?.description}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>
                  {highlights.shift?.change}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Stress Triggers</span>
                </h4>
                <div className="space-y-2">
                  {triggers.stress?.map((trigger, index) => (
                    <div key={index} className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                      <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{trigger}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  <Heart className="w-4 h-4" />
                  <span>Joy Boosters</span>
                </h4>
                <div className="space-y-2">
                  {triggers.joy?.map((trigger, index) => (
                    <div key={index} className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                      <span className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>{trigger}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`font-medium mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  <Zap className="w-4 h-4" />
                  <span>Distractions</span>
                </h4>
                <div className="space-y-2">
                  {triggers.distraction?.map((trigger, index) => (
                    <div key={index} className={`p-2 rounded-lg ${isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
                      <span className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>{trigger}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center space-x-2 mb-3">
                  <Sun className="w-5 h-5 text-blue-500" />
                  <h4 className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    Continue Chatting
                  </h4>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  Keep engaging with Deite to build more comprehensive emotional insights and patterns.
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
