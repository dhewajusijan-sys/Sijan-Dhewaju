import React, { useState, useEffect } from 'react';
import { STUDIO_TOOLS } from '../constants/studioTools';
import type { StudioInitialData } from '../../App';

interface StudioViewProps {
  initialToolData: StudioInitialData | null;
  onDataConsumed: () => void;
  activeToolId: string;
  setActiveToolId: (toolId: string) => void;
}

const StudioView: React.FC<StudioViewProps> = ({ initialToolData, onDataConsumed, activeToolId, setActiveToolId }) => {
  const [internalData, setInternalData] = useState<any>(null);

  useEffect(() => {
    if (initialToolData) {
      const toolExists = STUDIO_TOOLS.find(tool => tool.id === initialToolData.toolId);
      if (toolExists) {
        setActiveToolId(initialToolData.toolId);
        setInternalData(initialToolData.data);
      }
      onDataConsumed();
    }
  }, [initialToolData, onDataConsumed, setActiveToolId]);

  const activeTool = STUDIO_TOOLS.find(tool => tool.id === activeToolId);
  const ActiveToolComponent = activeTool?.component || (() => <div>Tool not found</div>);
  
  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Mobile Dropdown */}
      <div className="px-2 py-3 border-b border-slate-200 dark:border-brand-cyan/20 md:hidden">
        <label htmlFor="studio-tool-select" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
          Select a Tool
        </label>
        <div className="relative">
            <select
              id="studio-tool-select"
              value={activeToolId}
              onChange={(e) => setActiveToolId(e.target.value)}
              className="block appearance-none w-full bg-slate-100 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 px-3 py-2 pr-8 rounded-md shadow-sm leading-tight focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              {STUDIO_TOOLS.map(tool => (
                <option key={tool.id} value={tool.id}>
                  {tool.name} {tool.comingSoon ? '(Soon)' : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-600 dark:text-slate-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-slate-100/50 dark:bg-charcoal-900/30 border-r border-slate-200 dark:border-brand-cyan/20 px-2 py-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100" style={{ textShadow: '0 0 8px rgba(34, 211, 238, 0.5)' }}>Studio Tools</h2>
        <nav className="flex flex-col gap-2">
          {STUDIO_TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveToolId(tool.id)}
              className={`flex items-center gap-3 p-2 rounded-md text-left transition-all duration-200 ${
                activeToolId === tool.id
                  ? 'bg-brand-blue/20 text-brand-cyan ring-1 ring-brand-cyan/50'
                  : 'hover:bg-slate-200/80 dark:hover:bg-charcoal-700/50'
              } ${tool.comingSoon ? 'opacity-60 hover:opacity-100' : ''}`}
            >
              <div className="flex-shrink-0 w-6 h-6 text-slate-600 dark:text-slate-300">{tool.icon}</div>
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{tool.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tool.description}</p>
              </div>
               {tool.comingSoon && <span className="ml-auto text-xs bg-slate-200 text-slate-600 dark:bg-charcoal-700 dark:text-slate-300 px-2 py-0.5 rounded-full">Soon</span>}
            </button>
          ))}
        </nav>
      </aside>
      
      <main className={`flex-grow bg-slate-50 dark:bg-transparent ${activeToolId === 'webcam-fx' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeTool && <ActiveToolComponent initialData={internalData} />}
      </main>
    </div>
  );
};

export default StudioView;
