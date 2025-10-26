import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="p-2 sm:p-4 w-full max-w-7xl mx-auto flex items-center justify-between bg-transparent">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                  <radialGradient id="aura-gradient" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a78bfa" stopOpacity="0.5" />
                      <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="khukuri-gradient" x1="20" y1="85" x2="80" y2="85" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#E5E7EB" />
                      <stop offset="1" stopColor="#9CA3AF" />
                  </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#aura-gradient)" className="animate-subtle-pulse" />
              <circle cx="50" cy="50" r="40" stroke="#a78bfa" strokeOpacity="0.3" strokeWidth="0.5" />
              <g>
                  <path d="M20 85 C 35 92, 65 92, 80 85 C 70 82, 30 82, 20 85 Z" fill="url(#khukuri-gradient)" />
                  <path d="M50 40 L 78 85 H 22 Z" fill="#991B1B" stroke="#0ea5e9" strokeWidth="3" strokeLinejoin="round" />
                  <path d="M50 15 L 70 55 H 30 Z" fill="#B91C1C" stroke="#0ea5e9" strokeWidth="3" strokeLinejoin="round" />
                  <path d="M48 43 A 4.5 4.5 0 1 1 48 35 A 6 6 0 1 0 48 43 Z" fill="white" />
                  <g>
                      <circle cx="50" cy="70" r="4.5" fill="white"/>
                      <g stroke="white" strokeWidth="1.2" strokeLinecap="round">
                          <path d="M50 63.5 V 76.5"/><path d="M43.5 70 H 56.5"/><path d="M45.5 64.5 l 9 11"/><path d="M45.5 75.5 l 9 -11"/>
                      </g>
                  </g>
                  <path d="M50 15 L 56 28 L 44 28 Z" fill="white" />
              </g>
          </svg>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}>
            Nepal's 1st AI
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">By Sijan Dhewaju</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
         <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200/50 text-slate-600 hover:bg-slate-300/70 hover:text-brand-cyan dark:bg-charcoal-800/50 dark:text-slate-300 dark:hover:bg-charcoal-700/70 transition-colors">
            {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            )}
         </button>
         <div className="flex items-center gap-3">
            <a href="https://www.facebook.com/sijandhewaju" target="_blank" rel="noopener noreferrer" title="Facebook" className="text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.instagram.com/otaku_sensei_0_0/" target="_blank" rel="noopener noreferrer" title="Instagram" className="text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
         </div>
      </div>
    </header>
  );
};

export default Header;