
import React from 'react';
import type { Persona } from './types';

// Using inline SVGs for icons for simplicity
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const CodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-code-2"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>;
const FeatherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-feather"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/></svg>;

export const PERSONAS: Persona[] = [
  {
    id: 'default',
    name: 'Helpful Assistant',
    systemInstruction: 'You are a helpful and friendly AI assistant. Be concise and clear in your responses.',
    icon: <BotIcon />,
  },
  {
    id: 'coder',
    name: 'Code Expert',
    systemInstruction: 'You are an expert programmer. Provide clean, efficient, and well-commented code. Always specify the language of the code block.',
    icon: <CodeIcon />,
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    systemInstruction: 'You are a creative writer. Weave engaging stories and be imaginative in your responses.',
    icon: <FeatherIcon />,
  },
];
