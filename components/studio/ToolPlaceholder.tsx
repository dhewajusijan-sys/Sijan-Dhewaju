
import React from 'react';

const ToolPlaceholder: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="p-4 bg-slate-200 dark:bg-slate-800 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-construct text-brand-primary"><path d="M15.5 22l-5-5"/><path d="M17 3l5 5"/><path d="M2 22l5-5"/><path d="M2 17l5 5"/><path d="M20.5 8.5c-1.2-1.2-3.1-1.2-4.2 0l-7.1 7.1c-1.2 1.2-1.2 3.1 0 4.2 1.2 1.2 3.1 1.2 4.2 0l7.1-7.1c1.2-1.2 1.2-3.1 0-4.2zM8.5 15.5l.5-.5c1.2-1.2 3.1-1.2 4.2 0l.5.5c1.2 1.2 1.2 3.1 0 4.2l-.5.5c-1.2 1.2-3.1 1.2-4.2 0l-.5-.5c-1.2-1.2-1.2-3.1 0-4.2z"/></svg>
      </div>
      <h3 className="text-xl font-bold">Coming Soon!</h3>
      <p className="text-slate-600 dark:text-slate-400 max-w-sm mt-2">
        This tool is currently under construction. We're working hard to bring it to you. Stay tuned for updates!
      </p>
    </div>
  );
};

export default ToolPlaceholder;