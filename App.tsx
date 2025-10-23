import React, { useState } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import ChatView from './components/ChatView';
import VoiceAssistantView from './components/VoiceAssistantView';
import MultimodalView from './components/MultimodalView';
import LiveConversationView from './components/LiveConversationView';
import StudioView from './components/StudioView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');

  const tabs = [
    { id: 'chat', label: 'Chat', component: <ChatView /> },
    { id: 'assistant', label: 'Voice Assistant', component: <VoiceAssistantView /> },
    { id: 'multimodal', label: 'Multimodal', component: <MultimodalView /> },
    { id: 'live', label: 'Live Conversation', component: <LiveConversationView /> },
    { id: 'studio', label: 'Studio', component: <StudioView /> },
  ];

  return (
    <div className="bg-slate-800 text-slate-200 h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto flex flex-col overflow-hidden px-4 pb-4">
        <div className="bg-slate-900/50 rounded-lg border border-slate-700 flex-grow overflow-hidden">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </main>
    </div>
  );
};

export default App;
