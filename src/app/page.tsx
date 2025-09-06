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
  const [seconds, setSeconds] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(120); // Default: 2 Stunden
  const [goalSeconds, setGoalSeconds] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  
  // Pause Timer States
  const [isPauseTimer, setIsPauseTimer] = useState<boolean>(false);
  const [pauseMinutes, setPauseMinutes] = useState<number>(5);
  const [pauseSeconds, setPauseSeconds] = useState<number>(0);
  const [pauseTimeLeft, setPauseTimeLeft] = useState<number>(0);
  const [isPausePaused, setIsPausePaused] = useState<boolean>(false);
  
  
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

  // Pause Timer LocalStorage Funktionen
  const savePauseSettingsToStorage = (pauseMin: number, pauseSec: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pauseMinutes', pauseMin.toString());
      localStorage.setItem('pauseSeconds', pauseSec.toString());
    }
  };

  const loadPauseSettingsFromStorage = (): { minutes: number; seconds: number } => {
    if (typeof window !== 'undefined') {
      const storedMinutes = localStorage.getItem('pauseMinutes');
      const storedSeconds = localStorage.getItem('pauseSeconds');
      return {
        minutes: storedMinutes ? parseInt(storedMinutes) : 5,
        seconds: storedSeconds ? parseInt(storedSeconds) : 0
      };
    }
    return { minutes: 5, seconds: 0 };
  };

  // Sessions, Tagesziel, Streak und Pause Settings beim ersten Laden aus LocalStorage laden
  useEffect(() => {
    const sessions = loadSessionsFromStorage();
    const goal = loadDailyGoalFromStorage();
    const currentStreak = loadStreakFromStorage();
    const pauseSettings = loadPauseSettingsFromStorage();
    const goalSecs = typeof window !== 'undefined' ? parseInt(localStorage.getItem('goalSeconds') || '0') : 0;
    setTimerSessions(sessions);
    setDailyGoal(goal);
    setGoalSeconds(goalSecs);
    setStreak(currentStreak);
    setPauseMinutes(pauseSettings.minutes);
    setPauseSeconds(pauseSettings.seconds);
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

  // Deep Work Timer-Logik
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsPaused(false);
            playBellSound();
            // Calculate actual completed time in minutes
            const totalSessionSeconds = minutes * 60 + seconds;
            const completedSeconds = totalSessionSeconds - timeLeft;
            const completedMinutes = Math.round(completedSeconds / 60);
            saveCompletedSession(completedMinutes);
            // Starte Pause Timer automatisch
            startPauseTimer();
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

  // Pause Timer-Logik
  useEffect(() => {
    if (isPauseTimer && !isPausePaused && pauseTimeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setPauseTimeLeft((prev) => {
          if (prev <= 1) {
            setIsPauseTimer(false);
            setIsPausePaused(false);
            playBellSound();
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
  }, [isPauseTimer, isPausePaused, pauseTimeLeft]);

  // Apple-style "Ding" Sound mit Web Audio API
  const playBellSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Erstelle zwei Oszillatoren für einen reicheren Klang
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Verbinde die Oszillatoren
    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Höhere Apple-ähnliche Frequenzen (E5 und G#5)
    oscillator1.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
    oscillator2.frequency.setValueAtTime(830.61, audioContext.currentTime); // G#5

    // Filter für weicheren Klang
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, audioContext.currentTime);

    // Sanfter Anstieg und Abfall
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.6);
    oscillator2.stop(audioContext.currentTime + 0.6);
  };

  // Deep Work Timer Funktionen
  const startTimer = () => {
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds > 0 && !isRunning) {
      setTimeLeft(totalSeconds);
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

  const stopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
  };

  // Pause Timer Funktionen
  const startPauseTimer = () => {
    const totalPauseSeconds = pauseMinutes * 60 + pauseSeconds;
    if (totalPauseSeconds > 0) {
      setPauseTimeLeft(totalPauseSeconds);
      setIsPauseTimer(true);
      setIsPausePaused(false);
    }
  };

  const pausePauseTimer = () => {
    setIsPausePaused(true);
  };

  const resumePauseTimer = () => {
    setIsPausePaused(false);
  };

  const stopPauseTimer = () => {
    setIsPauseTimer(false);
    setIsPausePaused(false);
    setPauseTimeLeft(0);
  };

  const updatePauseSettings = (newMinutes: number, newSeconds: number) => {
    setPauseMinutes(newMinutes);
    setPauseSeconds(newSeconds);
    savePauseSettingsToStorage(newMinutes, newSeconds);
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
  const maxMinutes = Math.max(...weekData.map(d => d.totalMinutes), dailyGoal, 1);

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

  const updateGoalSettings = (newMinutes: number, newSeconds: number) => {
    setDailyGoal(newMinutes);
    setGoalSeconds(newSeconds);
    saveDailyGoalToStorage(newMinutes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goalSeconds', newSeconds.toString());
    }
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

        {/* Main Grid - Three Columns */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          
          {/* Settings Card - Left */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
            <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-900 transition-colors duration-200">Settings</h2>
              </div>

              {/* Deep Work Duration Settings */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30 shadow-sm">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-slate-700">Deep Work Duration</div>
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={minutes}
                          onChange={(e) => setMinutes(Math.max(0, Math.min(999, Number(e.target.value) || 0)))}
                          className="text-lg font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent tabular-nums w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 ml-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="text-lg text-slate-400 font-bold">:</span>
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={seconds}
                          onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                          className="text-lg font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent tabular-nums w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 ml-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                  
              {/* Break Duration Settings */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30 shadow-sm">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-slate-700">Break Duration</div>
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={pauseMinutes}
                          onChange={(e) => updatePauseSettings(Math.max(0, Math.min(60, Number(e.target.value) || 0)), pauseSeconds)}
                          className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent tabular-nums w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1 py-0.5 ml-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="text-lg text-slate-400 font-bold">:</span>
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={pauseSeconds}
                          onChange={(e) => updatePauseSettings(pauseMinutes, Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                          className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent tabular-nums w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1 py-0.5 ml-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day Streak Goal Settings */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-700">Day Streak</div>
                    <div className="text-sm font-medium text-slate-700">Goal</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="0"
                        max="480"
                        value={dailyGoal}
                        onChange={(e) => updateGoalSettings(Math.max(0, Math.min(480, Number(e.target.value) || 0)), goalSeconds)}
                        className="text-lg font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent tabular-nums w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 ml-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className="text-lg text-slate-400 font-bold">:</span>
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={goalSeconds}
                        onChange={(e) => updateGoalSettings(dailyGoal, Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                        className="text-lg font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent tabular-nums w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 ml-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Card - Middle */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-900 transition-colors duration-200">Timer</h2>
              </div>

                  {/* Circular Timer */}
                  <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-4">
                      {/* Background Circle */}
                      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
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
                      stroke={isPauseTimer ? "rgb(34 197 94)" : "url(#timerGradient)"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * ((isPauseTimer ? pauseTimeLeft : timeLeft) / (isPauseTimer ? (pauseMinutes * 60 + pauseSeconds) : (minutes * 60 + seconds)))}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      
                  {/* Timer Content in Center */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {!isRunning && !isPauseTimer ? (
                      /* Ready Mode */
                      <div className="space-y-2">
                        <div className="text-xl font-bold text-slate-900">Ready</div>
                      </div>
                    ) : isPauseTimer ? (
                      /* Pause Timer Mode */
                      <div className="space-y-2">
                        <div className={`text-3xl font-bold tabular-nums text-green-600 ${!isPausePaused ? 'animate-pulse' : ''}`}>
                          {formatTime(pauseTimeLeft)}
                        </div>
                        <div className="text-sm text-green-600">
                          {isPausePaused ? 'Paused' : 'Break Time'}
                        </div>
                      </div>
                    ) : (
                      /* Focus Timer Running Mode */
                      <div className="space-y-2">
                        <div className={`text-3xl font-bold tabular-nums text-slate-900 ${!isPaused ? 'animate-pulse' : ''}`}>
                          {formatTime(timeLeft)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {isPaused ? 'Paused' : 'Deep Work Time'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              {!isRunning && !isPauseTimer ? (
                <button
                  onClick={startTimer}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:brightness-90 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Start Session
                </button>
              ) : isPauseTimer ? (
                <div className="flex gap-3">
                  {!isPausePaused ? (
                    <button
                      onClick={pausePauseTimer}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumePauseTimer}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                    >
                      Resume
                    </button>
                  )}
                  
                  <button
                    onClick={stopPauseTimer}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                  >
                    End Break
                  </button>
                </div>
              ) : (
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
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
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
              )}
            </div>
          </div>

          {/* Stats Card - Right */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-900 transition-colors duration-200">Calendar</h2>
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
                    <div key={index} className="flex flex-col items-center space-y-2 flex-1 relative group/bar">
                      {/* Bar */}
                      <div className="w-8 bg-gradient-to-t from-slate-200 to-slate-100 rounded-full overflow-hidden relative shadow-inner hover:from-slate-300 hover:to-slate-200 transition-all duration-300" 
                           style={{ height: '140px' }}>
                        
                        {/* Goal Line */}
                        <div 
                          className="absolute w-full border-t-2 border-dashed border-indigo-300 opacity-60"
                                style={{ 
                            bottom: `${(dailyGoal / maxMinutes) * 100}%`,
                            height: '2px'
                                }}
                              ></div>
                        
                        {day.totalMinutes > 0 && (
                          <div 
                            className="bg-indigo-500 w-full absolute bottom-0 transition-all duration-300 hover:brightness-90"
                            style={{ height: `${(day.totalMinutes / maxMinutes) * 100}%` }}
                              ></div>
                        )}
                      </div>
                      
                      {/* Individual Bar Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                        <div className="font-medium">{day.totalMinutes}min</div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                      </div>
                      
                      {/* Day label */}
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-600 font-medium group-hover/bar:text-slate-800 transition-all duration-200">{day.day}</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>


                      </div>
                      </div>
                    </div>

        {/* Statistics Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-indigo-900 transition-colors duration-200">Statistics</h2>
            </div>


            {/* Statistics Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Total Deep Work Time */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">
                  {(() => {
                    const totalMinutes = timerSessions.reduce((sum, session) => sum + session.minutes, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  })()}
                </div>
                <div className="text-sm text-slate-600">Total Deep Work Time</div>
              </div>

              {/* Longest Streak */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">{streak}</div>
                <div className="text-sm text-slate-600">Longest Streak</div>
              </div>

              {/* Current Streak */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">{streak}</div>
                <div className="text-sm text-slate-600">Current Streak</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}