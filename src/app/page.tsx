'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Typen für die Timer-Daten
interface TimerSession {
  date: string; // YYYY-MM-DD Format
  minutes: number;
}

interface ChartData {
  date: string;
  totalMinutes: number;
}

export default function Home() {
  const [minutes, setMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(120); // Default: 2 Stunden
  const [streak, setStreak] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // LocalStorage Funktionen
  const saveSessionsToStorage = (sessions: TimerSession[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deepWorkSessions', JSON.stringify(sessions));
    }
  };

  const loadSessionsFromStorage = (): TimerSession[] => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('deepWorkSessions');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  };

  // Tagesziel LocalStorage Funktionen
  const saveDailyGoalToStorage = (goal: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dailyGoal', goal.toString());
    }
  };

  const loadDailyGoalFromStorage = (): number => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dailyGoal');
      return stored ? parseInt(stored) : 120; // Default: 2 Stunden
    }
    return 120;
  };

  // Streak LocalStorage Funktionen
  const saveStreakToStorage = (streakCount: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('streak', streakCount.toString());
      localStorage.setItem('lastStreakDate', new Date().toISOString().split('T')[0]);
    }
  };

  const loadStreakFromStorage = (): number => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('streak');
      const lastDate = localStorage.getItem('lastStreakDate');
      const today = new Date().toISOString().split('T')[0];
      
      if (stored && lastDate) {
        // Prüfen ob Streak noch gültig ist
        const lastStreakDate = new Date(lastDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastStreakDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          return parseInt(stored);
        } else if (diffDays > 1) {
          // Streak unterbrochen, zurücksetzen
          return 0;
        }
      }
    }
    return 0;
  };

  // Sessions, Tagesziel und Streak beim ersten Laden aus LocalStorage laden
  useEffect(() => {
    const sessions = loadSessionsFromStorage();
    const goal = loadDailyGoalFromStorage();
    const currentStreak = loadStreakFromStorage();
    setTimerSessions(sessions);
    setDailyGoal(goal);
    setStreak(currentStreak);
  }, []);

  // Chart-Daten aktualisieren wenn sich Sessions ändern
  useEffect(() => {
    const groupedData = timerSessions.reduce((acc: Record<string, number>, session) => {
      acc[session.date] = (acc[session.date] || 0) + session.minutes;
      return acc;
    }, {});

    const chartData: ChartData[] = Object.entries(groupedData)
      .map(([date, totalMinutes]) => ({ date, totalMinutes }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Nur die letzten 14 Tage

    setChartData(chartData);
  }, [timerSessions]);

  // Kreisdiagramm-Daten berechnen
  const getPieChartData = () => {
    const totalSessions = timerSessions.length;
    const shortSessions = timerSessions.filter(s => s.minutes <= 30).length;
    const mediumSessions = timerSessions.filter(s => s.minutes > 30 && s.minutes <= 90).length;
    const longSessions = timerSessions.filter(s => s.minutes > 90).length;

    // Wenn keine Sessions vorhanden sind, zeige einen leeren Kreis
    if (totalSessions === 0) {
      return [
        { name: 'No Sessions', value: 0, color: '#E5E7EB', percentage: 100 }
      ];
    }

    return [
      { name: 'Short (≤30min)', value: shortSessions, color: '#3B82F6', percentage: Math.round((shortSessions / totalSessions) * 100) },
      { name: 'Medium (31-90min)', value: mediumSessions, color: '#8B5CF6', percentage: Math.round((mediumSessions / totalSessions) * 100) },
      { name: 'Long (>90min)', value: longSessions, color: '#10B981', percentage: Math.round((longSessions / totalSessions) * 100) }
    ];
  };

  // Session nach Timer-Ablauf speichern
  const saveCompletedSession = (completedMinutes: number) => {
    const today = new Date().toISOString().split('T')[0];
    const newSession: TimerSession = {
      date: today,
      minutes: completedMinutes
    };
    
    const updatedSessions = [...timerSessions, newSession];
    setTimerSessions(updatedSessions);
    saveSessionsToStorage(updatedSessions);
    
    // Streak aktualisieren
    updateStreak(updatedSessions, today);
  };

  // Streak basierend auf Sessions aktualisieren
  const updateStreak = (sessions: TimerSession[], currentDate: string) => {
    const lastStreakDate = localStorage.getItem('lastStreakDate');
    const hasSessionToday = sessions.some(session => session.date === currentDate);
    
    if (hasSessionToday) {
      if (!lastStreakDate || lastStreakDate !== currentDate) {
        // Erste Session heute
        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const hadSessionYesterday = sessions.some(session => session.date === yesterdayStr);
        
        if (hadSessionYesterday || streak === 0) {
          const newStreak = streak + 1;
          setStreak(newStreak);
          saveStreakToStorage(newStreak);
        } else {
          // Streak unterbrochen, neu starten
          setStreak(1);
          saveStreakToStorage(1);
        }
      }
    }
  };

  // Timer-Logik
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsPaused(false);
            playBellSound();
            saveCompletedSession(minutes);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeLeft, minutes]);

  // Klingelgeräusch mit Web Audio API
  const playBellSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Timer starten
  const startTimer = () => {
    if (minutes > 0 && !isRunning) {
      setTimeLeft(minutes * 60);
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
  };

  const resumeTimer = () => {
    setIsPaused(false);
  };

  // Timer stoppen
  const stopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
  };

  // Zeit in mm:ss Format umwandeln
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalMinutes = chartData.reduce((sum, day) => sum + day.totalMinutes, 0);

  // Wochendaten für die gewählte Woche generieren
  const getWeekData = () => {
    const today = new Date();
    const currentWeek = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7)); // Montag + Offset

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const sessionsForDay = timerSessions.filter(s => s.date === dateStr);
      const totalMinutes = sessionsForDay.reduce((sum, s) => sum + s.minutes, 0);
      
      // Kategorisiere Sessions nach Länge
      const shortSessions = sessionsForDay.filter(s => s.minutes <= 30);
      const mediumSessions = sessionsForDay.filter(s => s.minutes > 30 && s.minutes <= 60);
      const longSessions = sessionsForDay.filter(s => s.minutes > 60);
      
      currentWeek.push({
        day: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        date: dateStr,
        totalMinutes,
        sessionsCount: sessionsForDay.length,
        shortMinutes: shortSessions.reduce((sum, s) => sum + s.minutes, 0),
        mediumMinutes: mediumSessions.reduce((sum, s) => sum + s.minutes, 0),
        longMinutes: longSessions.reduce((sum, s) => sum + s.minutes, 0),
        // Ohne Daily Goal - Progress basiert auf Sessions
        hasActivity: totalMinutes > 0,
      });
    }
    
    return currentWeek;
  };

  const weekData = getWeekData();
  const maxMinutes = Math.max(...weekData.map(d => d.totalMinutes), 1);

  // Datum Range für gewählte Woche
  const getWeekRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    };
    
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? weekOffset - 1 : weekOffset + 1;
    setWeekOffset(newOffset);
  };

  const updateDailyGoal = (newGoal: number) => {
    setDailyGoal(newGoal);
    saveDailyGoalToStorage(newGoal);
  };

  const getDayName = (dayIndex: number): string => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayNames[dayIndex];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4 tracking-tight">
            Deep Work Tracker
          </h1>
          <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
            Track what matters.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          
          {/* Timer Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
            <div className="text-center">

              <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-900 transition-colors duration-200">Focus Session</h2>
              <p className="text-slate-600 mb-4 group-hover:text-slate-700 transition-colors duration-200">Start a concentrated work phase</p>
              
              {/* Streak Counter */}
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-full border border-orange-200 mb-6">
                <div className="text-orange-500 text-lg">🔥</div>
                <span className="text-sm font-semibold text-orange-700">
                  {streak} day{streak !== 1 ? 's' : ''} streak
                </span>
              </div>


              {!isRunning ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Session Duration
                    </label>
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={minutes}
                        onChange={(e) => setMinutes(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                        className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent tabular-nums min-w-[120px] text-center bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded-lg px-2 py-1 transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={startTimer}
                    className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:brightness-90 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
                  >
                    Start Session
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Circular Timer */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-48 h-48 mb-6">
                      {/* Background Circle */}
                      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgb(226 232 240)"
                          strokeWidth="8"
                        />
                        {/* Progress Circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgb(59 130 246)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 45}`}
                          strokeDashoffset={`${2 * Math.PI * 45 * (timeLeft / (minutes * 60))}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      
                      {/* Timer Text in Center */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-3xl font-bold tabular-nums text-slate-900 ${isPaused ? '' : 'animate-pulse'}`}>
                          {formatTime(timeLeft)}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {isPaused ? 'Paused' : 'Focus Time'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Control Buttons */}
                  <div className="flex gap-3">
                    {!isPaused ? (
                      <button
                        onClick={pauseTimer}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeTimer}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                      >
                        Resume
                      </button>
                    )}
                    
                    <button
                      onClick={stopTimer}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                    >
                      End Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent mb-6 group-hover:from-indigo-900 group-hover:to-blue-900 transition-all duration-300">Statistics</h2>
              </div>


              {/* Date Range with Navigation */}
              <div className="flex items-center justify-center space-x-4 text-sm text-slate-600">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-2 hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100 rounded-full transition-all duration-200 hover:text-indigo-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-50 to-blue-50 rounded-full border border-white/50 shadow-sm">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="min-w-[200px] text-center font-medium text-slate-700">{getWeekRange()}</span>
                </div>
                
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100 rounded-full transition-all duration-200 hover:text-indigo-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>


              {/* Week Chart */}
              <div className="space-y-4">
                {/* Chart */}
                <div className="flex items-end justify-between h-48 px-4">
                  {weekData.map((day, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2 flex-1 group/bar">
                      {/* Bar */}
                      <div className="w-8 bg-gradient-to-t from-slate-200 to-slate-100 rounded-full overflow-hidden relative shadow-inner hover:from-slate-300 hover:to-slate-200 transition-all duration-300 group/tooltip" 
                           style={{ height: '140px' }}>
                        
                        {/* Modern Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                          <div className="font-medium">{day.totalMinutes}min on {getDayName(index)}</div>
                          {day.sessionsCount > 0 && (
                            <div className="text-xs text-slate-300 mt-1">{day.sessionsCount} session{day.sessionsCount > 1 ? 's' : ''}</div>
                          )}
                          {/* Tooltip Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                        </div>
                        {day.totalMinutes > 0 && (
                          <>
                            {/* Long sessions (top) */}
                            {day.longMinutes > 0 && (
                              <div 
                                className="bg-gradient-to-t from-orange-400 to-amber-300 w-full absolute bottom-0 rounded-t-full transition-all duration-300 hover:brightness-90"
                                style={{ 
                                  height: `${(day.longMinutes / maxMinutes) * 100}%`,
                                  bottom: `${((day.shortMinutes + day.mediumMinutes) / maxMinutes) * 100}%`
                                }}
                              ></div>
                            )}
                            {/* Medium sessions (middle) */}
                            {day.mediumMinutes > 0 && (
                              <div 
                                className="bg-gradient-to-t from-emerald-400 to-green-300 w-full absolute bottom-0 transition-all duration-300 hover:brightness-90"
                                style={{ 
                                  height: `${(day.mediumMinutes / maxMinutes) * 100}%`,
                                  bottom: `${(day.shortMinutes / maxMinutes) * 100}%`
                                }}
                              ></div>
                            )}
                            {/* Short sessions (bottom) */}
                            {day.shortMinutes > 0 && (
                              <div 
                                className="bg-gradient-to-t from-blue-400 to-indigo-300 w-full absolute bottom-0 rounded-b-full transition-all duration-300 hover:brightness-90"
                                style={{ height: `${(day.shortMinutes / maxMinutes) * 100}%` }}
                              ></div>
                            )}
                          </>
                        )}
                      </div>
                      {/* Day label with goal indicator */}
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs text-slate-600 font-medium group-hover/bar:text-slate-800 transition-all duration-200">{day.day}</span>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                          day.sessionsCount >= 3
                            ? 'bg-green-100 text-green-700 group-hover/bar:bg-green-200' 
                            : day.sessionsCount >= 1 
                              ? 'bg-blue-100 text-blue-700 group-hover/bar:bg-blue-200'
                              : 'bg-slate-100 text-slate-500 group-hover/bar:bg-slate-200'
                        }`}>
                          {day.sessionsCount >= 3 ? '✓' : day.sessionsCount > 0 ? day.sessionsCount : '0'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Kreisdiagramm */}
              <div className="mt-8">
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                      {(() => {
                        const pieData = getPieChartData();
                        let cumulativePercentage = 0;
                        
                        return pieData.map((segment, index) => {
                          const startAngle = (cumulativePercentage / 100) * 360;
                          const endAngle = ((cumulativePercentage + segment.percentage) / 100) * 360;
                          const radius = 45;
                          const centerX = 50;
                          const centerY = 50;
                          
                          const startAngleRad = (startAngle * Math.PI) / 180;
                          const endAngleRad = (endAngle * Math.PI) / 180;
                          
                          const x1 = centerX + radius * Math.cos(startAngleRad);
                          const y1 = centerY + radius * Math.sin(startAngleRad);
                          const x2 = centerX + radius * Math.cos(endAngleRad);
                          const y2 = centerY + radius * Math.sin(endAngleRad);
                          
                          const largeArcFlag = segment.percentage > 50 ? 1 : 0;
                          
                          const pathData = [
                            `M ${centerX} ${centerY}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            'Z'
                          ].join(' ');
                          
                          cumulativePercentage += segment.percentage;
                          
                          return (
                            <path
                              key={index}
                              d={pathData}
                              fill={segment.color}
                              className="transition-all duration-300 hover:brightness-110 cursor-pointer"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                            />
                          );
                        });
                      })()}
                      
                      {/* Fallback: Leerer Kreis wenn keine Daten */}
                      {timerSessions.length === 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="8"
                          className="transition-all duration-300"
                        />
                      )}
                    </svg>
                    
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-slate-800">
                        {timerSessions.length}
                      </div>
                      <div className="text-sm text-slate-600">
                        Total Sessions
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}