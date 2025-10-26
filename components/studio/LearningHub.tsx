import React, { useState } from 'react';
import KnowledgeStudio from './KnowledgeStudio';
import MathPlayground from './MathPlayground';
import AITutor from './AITutor';
import NoteTaker from './NoteTaker';

const LearningHub: React.FC = () => {
    const [activeTool, setActiveTool] = useState('tutor');

    const renderTool = () => {
        switch (activeTool) {
            case 'tutor': return <AITutor />;
            case 'content-studio': return <KnowledgeStudio />;
            case 'notes': return <NoteTaker />;
            case 'math-playground': return <MathPlayground />;
            default: return null;
        }
    };
    
    const TABS = [
        { id: 'tutor', name: 'AI Tutor' },
        { id: 'content-studio', name: 'Content Studio' },
        { id: 'notes', name: 'Note Taker' },
        { id: 'math-playground', name: 'Math Playground' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTool(tab.id)}
                            className={`${
                                activeTool === tab.id
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow p-3 overflow-hidden bg-slate-50 dark:bg-transparent">
                {renderTool()}
            </div>
        </div>
    );
};

export default LearningHub;