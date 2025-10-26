import React from 'react';

interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-brand-cyan/20">
        <nav className="-mb-px flex space-x-6 px-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                tab.id === activeTab
                  ? 'border-brand-cyan text-brand-cyan'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-400 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
              style={tab.id === activeTab ? { textShadow: '0 0 8px rgba(34, 211, 238, 0.7)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-grow overflow-hidden">
        {activeComponent}
      </div>
    </div>
  );
};

export default Tabs;