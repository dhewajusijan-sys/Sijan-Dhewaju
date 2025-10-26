

import React, { useState } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import ChatView from './components/ChatView';
import MultimodalView from './components/MultimodalView';
import LiveConversationView from './components/LiveConversationView';
import StudioView from './components/StudioView';
import AssistiveTouch from './components/common/AssistiveTouch';
import AgenticView from './components/AgenticView';
import { STUDIO_TOOLS } from './constants/studioTools';

export interface StudioInitialData {
  toolId: string;
  data: any;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agent');
  const [activeStudioToolId, setActiveStudioToolId] = useState(STUDIO_TOOLS[0].id);
  const [studioInitialData, setStudioInitialData] = useState<StudioInitialData | null>(null);

  const handleNavigationCommand = (tabId: string, data: any) => {
    if (tabId === 'studio') {
      setStudioInitialData(data);
      // Also update the active tool ID if provided in the navigation data
      if (data && data.toolId) {
        setActiveStudioToolId(data.toolId);
      }
    }
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'agent', label: 'Agentic AI', component: <AgenticView /> },
    { id: 'chat', label: 'Chat', component: <ChatView /> },
    { id: 'multimodal', label: 'Multimodal Understanding', component: <MultimodalView /> },
    { id: 'live', label: 'Live Conversation (Standalone)', component: <LiveConversationView /> },
    { id: 'studio', label: 'Studio', component: <StudioView 
        initialToolData={studioInitialData} 
        onDataConsumed={() => setStudioInitialData(null)}
        activeToolId={activeStudioToolId}
        setActiveToolId={setActiveStudioToolId}
      /> 
    },
  ];

  const showAssistiveTouch = !(activeTab === 'studio' && activeStudioToolId === 'camera-fx');

  return (
    <div className="text-slate-800 dark:text-slate-200 min-h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto flex flex-col overflow-hidden px-2 sm:px-4 pb-4">
        <div className="global-panel rounded-lg flex-grow overflow-hidden relative">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
          {showAssistiveTouch && <AssistiveTouch onNavigate={handleNavigationCommand} />}
        </div>
      </main>
    </div>
  );
};

export default App;