import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Brain, ArrowLeft, Heart, Star, TrendingUp, Calendar, Smile, Frown, Meh } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function EmotionalHistory() {
  const navigate = useNavigate();
  const [emotionalData, setEmotionalData] = useState([]);
  const [moodDistribution, setMoodDistribution] = useState([]);
  const [weeklyTrends, setWeeklyTrends] = useState([]);

  useEffect(() => {
    // Generate sample emotional data based on chat history
    generateEmotionalData();
  }, []);

  const generateEmotionalData = () => {
    // In a real app, this would analyze chat messages and sentiment
    // For demo purposes, we'll generate sample data
    const sampleData = [];
    const moods = ['Happy', 'Sad', 'Anxious', 'Calm', 'Excited', 'Stressed'];
    const colors = ['#7DD3C0', '#9BB5FF', '#D4AF37', '#a78bfa', '#fb7185', '#fbbf24'];
    
    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const moodIndex = Math.floor(Math.random() * moods.length);
      const intensity = Math.floor(Math.random() * 10) + 1; // 1-10 scale
      
      sampleData.push({
        date: date.toISOString().split('T')[0],
        mood: moods[moodIndex],
        intensity: intensity,
        color: colors[moodIndex],
        day: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    
    setEmotionalData(sampleData);

    // Calculate mood distribution
    const distribution = moods.map((mood, index) => ({
      name: mood,
      value: sampleData.filter(d => d.mood === mood).length,
      color: colors[index]
    }));
    setMoodDistribution(distribution);

    // Calculate weekly trends
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayData = sampleData.filter(d => 
        new Date(d.date).toDateString() === date.toDateString()
      );
      
      weekly.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        avgMood: dayData.length > 0 ? dayData.reduce((sum, d) => sum + d.intensity, 0) / dayData.length : 5,
        count: dayData.length
      });
    }
    setWeeklyTrends(weekly);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getMoodIcon = (mood) => {
    switch (mood.toLowerCase()) {
      case 'happy':
      case 'excited':
      case 'calm':
        return <Smile className="w-4 h-4" style={{ color: "#7DD3C0" }} />;
      case 'sad':
      case 'stressed':
        return <Frown className="w-4 h-4" style={{ color: "#9BB5FF" }} />;
      case 'anxious':
        return <Meh className="w-4 h-4" style={{ color: "#D4AF37" }} />;
      default:
        return <Heart className="w-4 h-4" style={{ color: "#7DD3C0" }} />;
    }
  };

  const getInsightText = () => {
    const recentMoods = emotionalData.slice(-7);
    const avgRecent = recentMoods.reduce((sum, d) => sum + d.intensity, 0) / recentMoods.length;
    
    if (avgRecent >= 7) {
      return "You've been feeling quite positive lately! Keep up the good self-care practices.";
    } else if (avgRecent >= 5) {
      return "Your emotional state has been relatively balanced this week. Consider what factors contribute to your wellbeing.";
    } else {
      return "It looks like you've been going through some challenges. Remember that reaching out for support is a sign of strength.";
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, #0B0E14 0%, #1C1F2E 100%)",
      }}
    >
      {/* Background decorations */}
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

      <div className="relative z-10 max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "rgba(28, 31, 46, 0.4)",
              boxShadow: "inset 0 0 20px rgba(125, 211, 192, 0.15), 0 8px 32px rgba(125, 211, 192, 0.1)",
              border: "1px solid rgba(125, 211, 192, 0.2)",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#7DD3C0" }} strokeWidth={1.5} />
          </button>

          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{
                backgroundColor: "rgba(28, 31, 46, 0.4)",
                boxShadow: "inset 0 0 20px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(212, 175, 55, 0.1)",
                border: "1px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <TrendingUp className="w-6 h-6" style={{ color: "#D4AF37" }} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Emotional Journey</h1>
              <p className="text-xs text-gray-400">Your wellness insights</p>
            </div>
          </div>

          <div className="w-10 h-10"></div>
        </div>

        {/* Insights Summary */}
        <div
          className="rounded-2xl p-6 mb-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            boxShadow: "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 16px 48px rgba(125, 211, 192, 0.08)",
            border: "1px solid rgba(125, 211, 192, 0.18)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(125, 211, 192, 0.8)",
                boxShadow: "0 0 20px rgba(125, 211, 192, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.2)",
              }}
            >
              <Brain className="w-5 h-5" style={{ color: "#0B0E14" }} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-white">Weekly Insight</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{getInsightText()}</p>
        </div>

        {/* Weekly Mood Trend */}
        <div
          className="rounded-2xl p-6 mb-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            boxShadow: "inset 0 0 30px rgba(212, 175, 55, 0.12), 0 16px 48px rgba(212, 175, 55, 0.08)",
            border: "1px solid rgba(212, 175, 55, 0.18)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-5 h-5" style={{ color: "#D4AF37" }} />
            <h3 className="text-md font-semibold text-white">7-Day Mood Trend</h3>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrends}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="avgMood" 
                  stroke="#D4AF37"
                  strokeWidth={3}
                  dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#D4AF37', strokeWidth: 2, fill: '#1C1F2E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution */}
        <div
          className="rounded-2xl p-6 mb-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            boxShadow: "inset 0 0 30px rgba(155, 181, 255, 0.12), 0 16px 48px rgba(155, 181, 255, 0.08)",
            border: "1px solid rgba(155, 181, 255, 0.18)",
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <Heart className="w-5 h-5" style={{ color: "#9BB5FF" }} />
            <h3 className="text-md font-semibold text-white">Mood Distribution</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {moodDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {moodDistribution.map((mood, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: mood.color }}
                  ></div>
                  <span className="text-xs text-gray-300">{mood.name}</span>
                  <span className="text-xs text-gray-400">({mood.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div
          className="rounded-2xl p-6 backdrop-blur-lg relative overflow-hidden"
          style={{
            backgroundColor: "rgba(28, 31, 46, 0.3)",
            boxShadow: "inset 0 0 30px rgba(125, 211, 192, 0.08), 0 16px 48px rgba(125, 211, 192, 0.06)",
            border: "1px solid rgba(125, 211, 192, 0.15)",
          }}
        >
          <h3 className="text-md font-semibold text-white mb-4">Recent Emotional Check-ins</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {emotionalData.slice(-5).reverse().map((entry, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(11, 14, 20, 0.4)",
                  border: "1px solid rgba(155, 181, 255, 0.1)",
                }}
              >
                <div className="flex items-center space-x-3">
                  {getMoodIcon(entry.mood)}
                  <div>
                    <p className="text-sm text-white font-medium">{entry.mood}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-2 rounded-full bg-gray-700">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${entry.intensity * 10}%`,
                        backgroundColor: entry.color 
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400">{entry.intensity}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


