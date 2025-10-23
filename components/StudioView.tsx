import React, { useState } from 'react';
import { STUDIO_TOOLS } from '../constants/studioTools';

const StudioView: React.FC = () => {
  const [activeToolId, setActiveToolId] = useState(STUDIO_TOOLS[0].id);

  const activeTool = STUDIO_TOOLS.find(tool => tool.id === activeToolId);
  const ActiveToolComponent = activeTool?.component || (() => <div>Tool not found</div>);

  return (
    <div className="flex h-full">
      <aside className="w-64 flex-shrink-0 bg-slate-900/70 border-r border-slate-700 p-4">
        <h2 className="text-lg font-bold mb-4">Studio Tools</h2>
        <nav className="flex flex-col gap-2">
          {STUDIO_TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveToolId(tool.id)}
              disabled={tool.comingSoon}
              className={`flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                activeToolId === tool.id
                  ? 'bg-brand-primary/20 text-brand-primary'
                  : 'hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex-shrink-0 w-6 h-6">{tool.icon}</div>
              <div>
                <p className="font-semibold text-sm">{tool.name}</p>
                <p className="text-xs text-slate-400">{tool.description}</p>
              </div>
               {tool.comingSoon && <span className="ml-auto text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Soon</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-grow overflow-y-auto">
        {activeTool && <ActiveToolComponent />}
      </main>
    </div>
  );
};

export default StudioView;
