import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const CalendarPopup = ({ isOpen, onClose, selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePreviousMonth = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
      setIsAnimating(false);
    }, 150);
  };

  const handleNextMonth = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
      setIsAnimating(false);
    }, 150);
  };

  const handleDateClick = (date) => {
    onDateSelect(date);
    onClose();
  };

  const isToday = (date) => {
    const today = new Date();
    return date && 
           date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return date && selectedDate &&
           date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const days = getDaysInMonth(currentMonth);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Calendar */}
      <div
        className="relative rounded-2xl p-6 max-w-sm w-full backdrop-blur-lg animate-in zoom-in-95 duration-300"
        style={{
          backgroundColor: "rgba(28, 31, 46, 0.95)",
          boxShadow: "inset 0 0 30px rgba(125, 211, 192, 0.12), 0 20px 60px rgba(125, 211, 192, 0.2)",
          border: "1px solid rgba(125, 211, 192, 0.18)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700/30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </button>
          
          <div className="text-center">
            <h3 className={`text-lg font-semibold text-white transition-opacity duration-150 ${
              isAnimating ? 'opacity-0' : 'opacity-100'
            }`}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
          </div>
          
          <button
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700/30 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-700/30 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center py-2">
              <span className="text-xs font-medium text-gray-400">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={`grid grid-cols-7 gap-1 transition-opacity duration-150 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}>
          {days.map((date, index) => (
            <div key={index} className="aspect-square">
              {date ? (
                <button
                  onClick={() => handleDateClick(date)}
                  className={`w-full h-full rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    isSelected(date)
                      ? 'text-black font-bold shadow-lg'
                      : isToday(date)
                      ? 'text-white bg-gray-700/50 border border-cyan-400/50'
                      : 'text-gray-300 hover:bg-gray-700/30 hover:text-white'
                  }`}
                  style={
                    isSelected(date)
                      ? {
                          background: "linear-gradient(135deg, rgba(125, 211, 192, 0.9) 0%, rgba(212, 175, 55, 0.9) 50%, rgba(155, 181, 255, 0.9) 100%)",
                          boxShadow: "0 4px 20px rgba(125, 211, 192, 0.4)",
                        }
                      : {}
                  }
                >
                  {date.getDate()}
                </button>
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          ))}
        </div>

        {/* Today button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => handleDateClick(new Date())}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-80 transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, rgba(125, 211, 192, 0.6) 0%, rgba(212, 175, 55, 0.6) 50%, rgba(155, 181, 255, 0.6) 100%)",
              border: "1px solid rgba(125, 211, 192, 0.3)",
            }}
          >
            Go to Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarPopup;
