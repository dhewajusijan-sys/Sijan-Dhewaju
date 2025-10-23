
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-4 w-full max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.9 4.8-4.8 1.9 4.8 1.9 1.9 4.8 1.9-4.8 4.8-1.9-4.8-1.9Z"/><path d="M5 21v-4"/><path d="M19 21v-4"/><path d="M21 5h-4"/><path d="M7 5H3"/></svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
          Super AI Platform <span className="text-slate-500 text-sm hidden sm:inline">Codename: AI</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;
