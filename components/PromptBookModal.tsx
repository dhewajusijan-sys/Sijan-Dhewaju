import React, { useState, useMemo } from 'react';
import { PROMPT_BOOK } from '../constants';

interface PromptBookModalProps {
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const PromptBookModal: React.FC<PromptBookModalProps> = ({ onClose, onSelectPrompt }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(Object.keys(PROMPT_BOOK)[0]);

  const filteredPrompts = useMemo(() => {
    if (!searchTerm) {
      return PROMPT_BOOK[activeCategory];
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return PROMPT_BOOK[activeCategory].filter(prompt =>
      prompt.toLowerCase().includes(lowerCaseSearch)
    );
  }, [searchTerm, activeCategory]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="global-panel rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-200 dark:border-brand-cyan/20 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100" style={{ textShadow: '0 0 8px rgba(34, 211, 238, 0.5)' }}>The Ultimate Prompt Book</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-charcoal-700/50 dark:hover:text-white">&times;</button>
        </header>
        <div className="flex flex-grow overflow-hidden">
          <aside className="w-1/4 border-r border-slate-200 dark:border-brand-cyan/20 overflow-y-auto p-2">
            <nav className="flex flex-col gap-1">
              {Object.keys(PROMPT_BOOK).map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`text-left text-sm p-2 rounded-md transition-colors ${
                    activeCategory === category ? 'bg-brand-blue/20 text-brand-cyan font-semibold' : 'text-slate-700 hover:bg-slate-200/50 dark:text-white dark:hover:bg-charcoal-700/50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </nav>
          </aside>
          <main className="w-3/4 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-brand-cyan/20 flex-shrink-0">
              <input
                type="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={`Search in ${activeCategory}...`}
                className="w-full bg-slate-100 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
              />
            </div>
            <div className="overflow-y-auto p-4 flex-grow">
              <ul className="space-y-2">
                {filteredPrompts.map((prompt, index) => (
                  <li key={index}>
                    <button 
                      onClick={() => onSelectPrompt(prompt)}
                      className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 dark:bg-charcoal-800/50 dark:hover:bg-charcoal-700/80 rounded-md transition-colors border border-slate-200 dark:border-blue-500/10"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-300">{prompt}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PromptBookModal;