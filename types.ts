import React from 'react';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  sources?: any[]; 
}

export interface Persona {
  id: string;
  name: string;
  systemInstruction: string;
  icon: React.ReactNode;
}

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  isFinal: boolean;
}

export interface StudioTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.FC;
  comingSoon?: boolean;
}
