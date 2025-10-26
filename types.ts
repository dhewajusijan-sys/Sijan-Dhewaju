import React from 'react';

export type Sentiment = 'Positive' | 'Neutral' | 'Negative' | null;

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  attachment?: {
    type: 'image';
    url: string;
  };
  sources?: any[]; 
  sentiment?: Sentiment;
  model?: string;
  status?: 'streaming_flash' | 'complete_flash' | 'complete_pro';
  isUpgraded?: boolean;
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
  name:string;
  description: string;
  icon: React.ReactNode;
  component: React.FC<any>; // Allow initialData prop
  comingSoon?: boolean;
}

export interface Source {
  id: string;
  type: 'text' | 'url' | 'youtube' | 'topic' | 'pdf' | 'audio' | 'video';
  content: string;
  name: string;
}

export interface AgenticStep {
    step: number;
    description: string;
    tool: 'web_search' | 'none';
    query?: string;
    status: 'pending' | 'running' | 'complete' | 'error';
    result?: string;
    error?: string;
}