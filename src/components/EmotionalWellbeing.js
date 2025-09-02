import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
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

  useEffect(() => {
    generateWellbeingData();
  }, []);

  const generateWellbeingData = () => {
    // Generate weekly mood survey data
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData = weekDays.map((day, index) => ({
      day,
      happiness: Math.floor(Math.random() * 40) + 60, // 60-100%
      anxiety: Math.floor(Math.random() * 30) + 10,   // 10-40%
      energy: Math.floor(Math.random() * 35) + 65,    // 65-100%
      stress: Math.floor(Math.random() * 25) + 5,     // 5-30%
    }));
    setWeeklyMoodData(weeklyData);

    // Generate mood balance data
    const moodBalanceData = [
      { name: 'Positive', value: 65, color: '#7DD3C0' },
      { name: 'Neutral', value: 25, color: '#D4AF37' },
      { name: 'Negative', value: 10, color: '#9BB5FF' }
    ];
    setMoodBalance(moodBalanceData);

    // Generate top emotions data
    const topEmotionsData = [
      { emotion: 'Happy', percentage: 30, color: '#7DD3C0' },
      { emotion: 'Calm', percentage: 25, color: '#a78bfa' },
      { emotion: 'Excited', percentage: 20, color: '#D4AF37' },
      { emotion: 'Anxious', percentage: 15, color: '#9BB5FF' },
      { emotion: 'Stressed', percentage: 10, color: '#fb7185' }
    ];
    setTopEmotions(topEmotionsData);

    // Generate highlights
    setHighlights({
      happiestMoment: {
        title: "Morning Meditation Success",
        description: "Completed 20-minute meditation session",
        date: "Yesterday",
        score: 95
      },
      toughestDay: {
        title: "Work Deadline Pressure",
        description: "High stress levels during project completion",
        date: "3 days ago",
        score: 25
      },
      shift: {
        title: "Improved Sleep Pattern",
        description: "Better sleep quality this week",
        change: "+15%",
        trend: "up"
      }
    });

    // Generate triggers
    setTriggers({
      stress: ["Work deadlines", "Social situations", "Financial concerns"],
      joy: ["Morning walks", "Music", "Time with friends"],
      distraction: ["Social media", "News", "Overthinking"]
    });
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const renderMoodSurvey = () => (
    <div className="space-y-6">
      {/* Weekly Emotion Summary Line Chart */}
      <div
        className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
        style={{
          backgroundColor: isDarkMode 
            ? "rgba(28, 31, 46, 0.3)" 
            : "rgba(255, 255, 255, 0.9)",
          boxShadow: isDarkMode 
            ? "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 16px 48px rgba(125, 211, 192, 0.08)"
            : "0 8px 32px rgba(0, 0, 0, 0.1)",
          border: isDarkMode 
            ? "1px solid rgba(125, 211, 192, 0.18)"
            : "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 
            className="w-5 h-5" 
            style={{ color: isDarkMode ? "#7DD3C0" : "#059669" }} 
          />
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Weekly Emotion Summary
          </h3>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyMoodData}>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                label={{ 
                  value: '%', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: isDarkMode ? '#9ca3af' : '#6b7280' }
                }}
              />
              <Line 
                type="monotone" 
                dataKey="happiness" 
                stroke="#7DD3C0"
                strokeWidth={3}
                dot={{ fill: '#7DD3C0', strokeWidth: 2, r: 4 }}
                name="Happiness"
              />
              <Line 
                type="monotone" 
                dataKey="energy" 
                stroke="#D4AF37"
                strokeWidth={3}
                dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                name="Energy"
              />
              <Line 
                type="monotone" 
                dataKey="anxiety" 
                stroke="#9BB5FF"
                strokeWidth={3}
                dot={{ fill: '#9BB5FF', strokeWidth: 2, r: 4 }}
                name="Anxiety"
              />
              <Line 
                type="monotone" 
                dataKey="stress" 
                stroke="#fb7185"
                strokeWidth={3}
                dot={{ fill: '#fb7185', strokeWidth: 2, r: 4 }}
                name="Stress"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { name: 'Happiness', color: '#7DD3C0' },
            { name: 'Energy', color: '#D4AF37' },
            { name: 'Anxiety', color: '#9BB5FF' },
            { name: 'Stress', color: '#fb7185' }
          ].map((item) => (
            <div key={item.name} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEmotionalSummary = () => (
    <div className="space-y-6">
      {/* Horizontal Progress Bars - Like the image you shared */}
      <div
        className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
        style={{
          backgroundColor: isDarkMode 
            ? "rgba(28, 31, 46, 0.3)" 
            : "rgba(255, 255, 255, 0.9)",
          boxShadow: isDarkMode 
            ? "inset 0 0 30px rgba(212, 175, 55, 0.12), 0 16px 48px rgba(212, 175, 55, 0.08)"
            : "0 8px 32px rgba(0, 0, 0, 0.1)",
          border: isDarkMode 
            ? "1px solid rgba(212, 175, 55, 0.18)"
            : "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <Target 
            className="w-5 h-5" 
            style={{ color: isDarkMode ? "#D4AF37" : "#d97706" }} 
          />
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Emotional Summary
          </h3>
        </div>

        {/* Horizontal Progress Bar like in your image */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Overall Wellbeing Distribution
            </span>
          </div>
          <div className="w-full h-8 rounded-full overflow-hidden flex" style={{ backgroundColor: isDarkMode ? 'rgba(11, 14, 20, 0.4)' : 'rgba(0, 0, 0, 0.1)' }}>
            <div className="h-full flex items-center justify-center text-xs font-semibold text-white" style={{ width: '10%', backgroundColor: '#3b82f6' }}>
              10%
            </div>
            <div className="h-full flex items-center justify-center text-xs font-semibold text-white" style={{ width: '15%', backgroundColor: '#06b6d4' }}>
              15%
            </div>
            <div className="h-full flex items-center justify-center text-xs font-semibold text-white" style={{ width: '20%', backgroundColor: '#eab308' }}>
              20%
            </div>
            <div className="h-full flex items-center justify-center text-xs font-semibold text-white" style={{ width: '30%', backgroundColor: '#22c55e' }}>
              30%
            </div>
            <div className="h-full flex items-center justify-center text-xs font-semibold text-white" style={{ width: '25%', backgroundColor: '#f97316' }}>
              25%
            </div>
          </div>
        </div>

        {/* Two Graphs Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mood Balance */}
          <div>
            <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mood Balance
            </h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodBalance}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {moodBalance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Emotions */}
          <div>
            <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Top Emotions
            </h4>
            <div className="space-y-3">
              {topEmotions.map((emotion, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className={`text-sm w-16 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {emotion.emotion}
                  </span>
                  <div className="flex-1 h-4 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(11, 14, 20, 0.4)' : 'rgba(0, 0, 0, 0.1)' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${emotion.percentage}%`,
                        backgroundColor: emotion.color 
                      }}
                    />
                  </div>
                  <span className={`text-sm w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {emotion.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHighlights = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Happiest Moment */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: isDarkMode 
              ? "rgba(28, 31, 46, 0.3)" 
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: isDarkMode 
              ? "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 16px 48px rgba(125, 211, 192, 0.08)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: isDarkMode 
              ? "1px solid rgba(125, 211, 192, 0.18)"
              : "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "rgba(125, 211, 192, 0.8)",
                boxShadow: "0 0 20px rgba(125, 211, 192, 0.4)",
              }}
            >
              <Award className="w-5 h-5" style={{ color: "#0B0E14" }} />
            </div>
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Happiest Moment
            </h4>
          </div>
          <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {highlights.happiestMoment?.title}
          </h5>
          <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {highlights.happiestMoment?.description}
          </p>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {highlights.happiestMoment?.date}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-2 rounded-full bg-gray-700">
                <div 
                  className="h-full rounded-full bg-green-400"
                  style={{ width: `${highlights.happiestMoment?.score}%` }}
                />
              </div>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {highlights.happiestMoment?.score}%
              </span>
            </div>
          </div>
        </div>

        {/* Toughest Day */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: isDarkMode 
              ? "rgba(28, 31, 46, 0.3)" 
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: isDarkMode 
              ? "inset 0 0 30px rgba(155, 181, 255, 0.12), 0 16px 48px rgba(155, 181, 255, 0.08)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: isDarkMode 
              ? "1px solid rgba(155, 181, 255, 0.18)"
              : "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "rgba(155, 181, 255, 0.8)",
                boxShadow: "0 0 20px rgba(155, 181, 255, 0.4)",
              }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: "#0B0E14" }} />
            </div>
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Toughest Day
            </h4>
          </div>
          <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {highlights.toughestDay?.title}
          </h5>
          <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {highlights.toughestDay?.description}
          </p>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {highlights.toughestDay?.date}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-2 rounded-full bg-gray-700">
                <div 
                  className="h-full rounded-full bg-red-400"
                  style={{ width: `${highlights.toughestDay?.score}%` }}
                />
              </div>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {highlights.toughestDay?.score}%
              </span>
            </div>
          </div>
        </div>

        {/* Shift */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: isDarkMode 
              ? "rgba(28, 31, 46, 0.3)" 
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: isDarkMode 
              ? "inset 0 0 30px rgba(212, 175, 55, 0.12), 0 16px 48px rgba(212, 175, 55, 0.08)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: isDarkMode 
              ? "1px solid rgba(212, 175, 55, 0.18)"
              : "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "rgba(212, 175, 55, 0.8)",
                boxShadow: "0 0 20px rgba(212, 175, 55, 0.4)",
              }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: "#0B0E14" }} />
            </div>
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Shift
            </h4>
          </div>
          <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {highlights.shift?.title}
          </h5>
          <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {highlights.shift?.description}
          </p>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-semibold ${highlights.shift?.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {highlights.shift?.change}
            </span>
            <div className="flex items-center space-x-1">
              {highlights.shift?.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-400 transform rotate-180" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTriggers = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stress Triggers */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: isDarkMode 
              ? "rgba(28, 31, 46, 0.3)" 
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: isDarkMode 
              ? "inset 0 0 30px rgba(251, 113, 133, 0.12), 0 16px 48px rgba(251, 113, 133, 0.08)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: isDarkMode 
              ? "1px solid rgba(251, 113, 133, 0.18)"
              : "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="w-5 h-5" style={{ color: "#fb7185" }} />
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Stress Triggers
            </h4>
          </div>
          <div className="space-y-3">
            {triggers.stress?.map((trigger, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? "rgba(11, 14, 20, 0.4)" : "rgba(0, 0, 0, 0.05)",
                  border: isDarkMode ? "1px solid rgba(251, 113, 133, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                }}
              >
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {trigger}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sources of Joy */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: isDarkMode 
              ? "rgba(28, 31, 46, 0.3)" 
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: isDarkMode 
              ? "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 16px 48px rgba(125, 211, 192, 0.08)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: isDarkMode 
              ? "1px solid rgba(125, 211, 192, 0.18)"
              : "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <Heart className="w-5 h-5" style={{ color: "#7DD3C0" }} />
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Sources of Joy
            </h4>
          </div>
          <div className="space-y-3">
            {triggers.joy?.map((joy, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? "rgba(11, 14, 20, 0.4)" : "rgba(0, 0, 0, 0.05)",
                  border: isDarkMode ? "1px solid rgba(125, 211, 192, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                }}
              >
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {joy}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sources of Distraction */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: isDarkMode 
              ? "rgba(28, 31, 46, 0.3)" 
              : "rgba(255, 255, 255, 0.9)",
            boxShadow: isDarkMode 
              ? "inset 0 0 30px rgba(212, 175, 55, 0.12), 0 16px 48px rgba(212, 175, 55, 0.08)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: isDarkMode 
              ? "1px solid rgba(212, 175, 55, 0.18)"
              : "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: "#D4AF37" }} />
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Common Distractions
            </h4>
          </div>
          <div className="space-y-3">
            {triggers.distraction?.map((distraction, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? "rgba(11, 14, 20, 0.4)" : "rgba(0, 0, 0, 0.05)",
                  border: isDarkMode ? "1px solid rgba(212, 175, 55, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                }}
              >
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {distraction}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGuidance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personalized Suggestions */}
        {[
          {
            icon: <Moon className="w-5 h-5" />,
            title: "Evening Routine",
            description: "Try a 10-minute wind-down routine before bed",
            color: "#7DD3C0"
          },
          {
            icon: <BookOpen className="w-5 h-5" />,
            title: "Mindful Reading",
            description: "Spend 15 minutes reading something inspiring",
            color: "#D4AF37"
          },
          {
            icon: <Users className="w-5 h-5" />,
            title: "Social Connection",
            description: "Reach out to a friend you haven't spoken to recently",
            color: "#9BB5FF"
          },
          {
            icon: <Music className="w-5 h-5" />,
            title: "Music Therapy",
            description: "Create a playlist that matches your current mood",
            color: "#a78bfa"
          },
          {
            icon: <Coffee className="w-5 h-5" />,
            title: "Mindful Moments",
            description: "Take 5 conscious breaths during your coffee break",
            color: "#fb7185"
          },
          {
            icon: <Sun className="w-5 h-5" />,
            title: "Morning Light",
            description: "Get 10 minutes of natural sunlight in the morning",
            color: "#fbbf24"
          }
        ].map((suggestion, index) => (
          <div
            key={index}
            className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
            style={{
              backgroundColor: isDarkMode 
                ? "rgba(28, 31, 46, 0.3)" 
                : "rgba(255, 255, 255, 0.9)",
              boxShadow: isDarkMode 
                ? "inset 0 0 30px rgba(125, 211, 192, 0.08), 0 16px 48px rgba(125, 211, 192, 0.06)"
                : "0 8px 32px rgba(0, 0, 0, 0.1)",
              border: isDarkMode 
                ? "1px solid rgba(125, 211, 192, 0.15)"
                : "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${suggestion.color}20`,
                  border: `1px solid ${suggestion.color}40`,
                }}
              >
                <div style={{ color: suggestion.color }}>
                  {suggestion.icon}
                </div>
              </div>
              <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {suggestion.title}
              </h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {suggestion.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const sections = [
    { id: 'mood-survey', label: 'Mood Survey', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'emotional-summary', label: 'Emotional Summary', icon: <Target className="w-4 h-4" /> },
    { id: 'highlights', label: 'Highlights', icon: <Award className="w-4 h-4" /> },
    { id: 'triggers', label: 'Triggers', icon: <Zap className="w-4 h-4" /> },
    { id: 'guidance', label: 'Guidance', icon: <Lightbulb className="w-4 h-4" /> }
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: isDarkMode 
          ? "linear-gradient(to bottom, #0B0E14 0%, #1C1F2E 100%)"
          : "linear-gradient(to bottom, #FAFAF8 0%, #F3F4F6 100%)",
      }}
    >
      {/* Background decorations */}
      {isDarkMode && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-16 opacity-8">
            <svg width="80" height="40" viewBox="0 0 80 40" fill="none" stroke="#7DD3C0" strokeWidth="0.4">
              <path d="M10 24c0-8 5-13 13-13s13 5 13 13c0 4-2.5 8-6.5 10.5H16.5c-4-2.5-6.5-6.5-6.5-10.5z" />
              <path d="M35 20c0-6 4-10 10-10s10 4 10 10c0 3-1.5 6-4 7.5H39c-2.5-1.5-4-4.5-4-7.5z" />
            </svg>
          </div>

          <div className="absolute bottom-40 right-20 opacity-7">
            <svg width="100" height="35" viewBox="0 0 100 35" fill="none" stroke="#D4AF37" strokeWidth="0.3">
              <path d="M12 21c0-7 4-11 11-11s11 4 11 21c0 3.5-2 7-5.5 8.75H17.5c-3.5-1.75-5.5-5.25-5.5-8.75z" />
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
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: isDarkMode ? "rgba(28, 31, 46, 0.4)" : "rgba(255, 255, 255, 0.8)",
              boxShadow: isDarkMode 
                ? "inset 0 0 20px rgba(125, 211, 192, 0.15), 0 8px 32px rgba(125, 211, 192, 0.1)"
                : "0 4px 16px rgba(0, 0, 0, 0.1)",
              border: isDarkMode 
                ? "1px solid rgba(125, 211, 192, 0.2)"
                : "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <ArrowLeft 
              className="w-5 h-5" 
              style={{ color: isDarkMode ? "#7DD3C0" : "#059669" }} 
              strokeWidth={1.5} 
            />
          </button>

          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{
                backgroundColor: isDarkMode ? "rgba(28, 31, 46, 0.4)" : "rgba(255, 255, 255, 0.8)",
                boxShadow: isDarkMode 
                  ? "inset 0 0 20px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(212, 175, 55, 0.1)"
                  : "0 4px 16px rgba(0, 0, 0, 0.1)",
                border: isDarkMode 
                  ? "1px solid rgba(212, 175, 55, 0.2)"
                  : "1px solid rgba(0, 0, 0, 0.1)",
              }}
            >
              <Brain 
                className="w-6 h-6" 
                style={{ color: isDarkMode ? "#D4AF37" : "#d97706" }} 
                strokeWidth={1.5} 
              />
            </div>
            <div>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Emotional Wellbeing
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Comprehensive wellness insights
              </p>
            </div>
          </div>

          <div className="w-10 h-10"></div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-full flex items-center space-x-2 text-sm font-medium transition-all duration-200 ${
                activeSection === section.id
                  ? isDarkMode
                    ? 'bg-gradient-to-r from-teal-500/20 to-blue-500/20 text-white border border-teal-500/30'
                    : 'bg-gradient-to-r from-teal-500 to-blue-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-800/50 text-gray-400 hover:text-gray-300 border border-gray-700/50'
                    : 'bg-white/50 text-gray-600 hover:text-gray-800 border border-gray-200'
              }`}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="slide-up">
          {activeSection === 'mood-survey' && renderMoodSurvey()}
          {activeSection === 'emotional-summary' && renderEmotionalSummary()}
          {activeSection === 'highlights' && renderHighlights()}
          {activeSection === 'triggers' && renderTriggers()}
          {activeSection === 'guidance' && renderGuidance()}
        </div>
      </div>
    </div>
  );
}
