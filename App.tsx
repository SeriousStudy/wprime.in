
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DayProgress, UserProgress, UserRank, VitalityStats } from './types';
import { generateDefaultSessions, RANKS, MOTIVATIONAL_QUOTES, START_DATE } from './constants';
import Dashboard from './components/Dashboard';
import DayDetails from './components/DayDetails';
import Header from './components/Header';
import Confetti from './components/Confetti';
import Login from './components/Login';
import SupportChat from './components/SupportChat';
import CasualChat from './components/CasualChat';
import LiveConsultant from './components/LiveConsultant';
import About from './components/About';

const DEFAULT_VITALS: VitalityStats = {
  energy: 85,
  focus: 90,
  hydration: 0,
  sleep: 8
};

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('is_logged_in') === 'true');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [currentView, setCurrentView] = useState<{ type: 'dashboard' | 'day' | 'support' | 'live'; dayNum?: number; initialContext?: string }>({ type: 'dashboard' });
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme_preference') === 'dark' || localStorage.getItem('theme_preference') === null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [bypassOffline, setBypassOffline] = useState(() => localStorage.getItem('api_bypass') === 'true');

  const isApiReady = useMemo(() => {
    try {
      // Check multiple possible locations for the API key in a bundled browser environment
      const env = (window as any).process?.env || (typeof process !== 'undefined' ? process.env : {});
      const key = env.API_KEY || (window as any).VITE_API_KEY;
      return !!key && key.length > 5;
    } catch (e) {
      return false;
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme_preference', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const storageKey = 'accountancy_bootcamp_2026';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setProgress(JSON.parse(saved));
    } else {
      const initialDays: DayProgress[] = Array.from({ length: 15 }, (_, i) => {
        const d = new Date(START_DATE);
        d.setDate(START_DATE.getDate() + i);
        return {
          dayNumber: i + 1,
          dateString: d.toISOString(),
          sessions: generateDefaultSessions(i + 1, d),
          mistakes: "",
        };
      });
      const newProgress: UserProgress = {
        startDate: START_DATE.toISOString(),
        days: initialDays,
        points: 0,
        streak: 0,
        rank: UserRank.BEGINNER,
        lastVisitDate: new Date().toISOString(),
        vitals: DEFAULT_VITALS
      };
      setProgress(newProgress);
    }
  }, []);

  useEffect(() => {
    if (progress) localStorage.setItem('accountancy_bootcamp_2026', JSON.stringify(progress));
  }, [progress]);

  const updateVitals = useCallback((v: Partial<VitalityStats>) => {
    setProgress(p => p ? ({ ...p, vitals: { ...p.vitals, ...v } }) : null);
  }, []);

  const unlockedDay = useMemo(() => {
    const today = new Date();
    const start = new Date(START_DATE);
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diff, 0), 15);
  }, []);

  const handleBypass = () => {
    localStorage.setItem('api_bypass', 'true');
    setBypassOffline(true);
  };

  if (!isLoggedIn) return <Login onLogin={(p) => { setUserProfile(p); localStorage.setItem('user_profile', JSON.stringify(p)); localStorage.setItem('is_logged_in', 'true'); setIsLoggedIn(true); }} isDarkMode={isDarkMode} />;
  if (!progress) return null;

  // Show system offline ONLY if not ready AND not bypassed
  if (!isApiReady && !bypassOffline) {
    return (
      <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="max-w-xl w-full space-y-8 animate-pop text-center">
           <div className="flex flex-col items-center space-y-6 mb-12">
              <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-red-600/30">!</div>
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">System Offline</h2>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.4em] mt-2">API Connection Handshake Failed</p>
              </div>
           </div>

           <div className="bg-red-600/5 border border-red-600/20 p-10 rounded-[3rem] space-y-6 text-left">
              <p className="text-sm font-bold leading-relaxed opacity-70">
                You've configured your key, but the browser is having trouble seeing it due to <span className="text-red-600 font-black underline">Vercel Environment Policies</span>.
              </p>
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Verification Steps:</p>
                 <ul className="space-y-3 text-[11px] font-bold opacity-60">
                    <li>1. In Vercel, check that the key name is <code className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded">API_KEY</code></li>
                    <li>2. Ensure you have clicked "REDEPLOY" after adding the key.</li>
                 </ul>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={() => window.location.reload()} className="flex-1 py-6 bg-red-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all">
                Force Sync & Refresh
              </button>
              <button 
                onClick={handleBypass}
                className="flex-1 py-6 border border-current rounded-full font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
              >
                I have the key, Proceed
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isDarkMode ? 'bg-black text-white' : 'bg-[#fbfbfd] text-zinc-950'}`}>
      <Header 
        points={progress.points} 
        rank={progress.rank} 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
        resetProgress={() => { if(confirm("Purge all protocol data?")) { localStorage.clear(); window.location.reload(); } }}
        quote={MOTIVATIONAL_QUOTES[0]}
        userProfile={userProfile}
        onSearchClick={() => setSearchOpen(true)}
        onLiveClick={() => setCurrentView({ type: 'live' })}
        onAboutClick={() => setAboutOpen(true)}
        isApiReady={isApiReady || bypassOffline}
      />
      
      <main className="w-full mx-auto relative">
        {currentView.type === 'dashboard' ? (
          <Dashboard progress={progress} unlockedDay={unlockedDay} onSelectDay={(n) => setCurrentView({ type: 'day', dayNum: n })} onOpenSupport={() => setCurrentView({ type: 'support' })} onUpdateVitals={updateVitals} onAboutClick={() => setAboutOpen(true)} />
        ) : currentView.type === 'day' ? (
          <DayDetails day={progress.days.find(d => d.dayNumber === currentView.dayNum)!} onBack={() => setCurrentView({ type: 'dashboard' })} onToggleTask={() => {}} onUpdateMistakes={() => {}} onAnalyzeMistakes={() => {}} onDayComplete={() => setShowCelebration(true)} />
        ) : currentView.type === 'live' ? (
          <LiveConsultant onBack={() => setCurrentView({ type: 'dashboard' })} />
        ) : (
          <SupportChat onBack={() => setCurrentView({ type: 'dashboard' })} initialMessage={currentView.initialContext} />
        )}
      </main>

      {searchOpen && (
        <div className="fixed inset-0 z-[200] backdrop-blur-xl bg-black/40 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
           <div className={`w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-pop ${isDarkMode ? 'bg-zinc-950 border border-white/10' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <input autoFocus placeholder="Protocol Command (e.g. 'Day 5')..." className="w-full bg-transparent border-none outline-none text-4xl font-black placeholder:opacity-10" />
           </div>
        </div>
      )}

      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
      <CasualChat />
      {showCelebration && <Confetti />}
    </div>
  );
};

export default App;
