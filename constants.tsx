

import React from 'react';
import type { Persona } from './types';

// Using inline SVGs for icons for simplicity
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const CodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-code-2"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>;
const FeatherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-feather"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/></svg>;
const StethoscopeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2a3.4 3.4 0 0 1 5 1.8L12 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-2.5a.5.5 0 0 0-.5.5v1.5c0 .3.2.5.5.5H18a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-3l-2.2-4.2a3.4 3.4 0 0 1-1.8-5.1z"/><path d="M10 12a3 3 0 1 0-3-3"/><circle cx="4" cy="4" r="2"/></svg>;
const ScaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-2 1-4 1-6 0"/><path d="m2 16 3-8 3 8c-2 1-4 1-6 0"/><path d="M12 2v20"/><path d="M21 16H3"/><path d="M7 16l-2.5-5.5"/><path d="M17 16l2.5-5.5"/></svg>;
const FlaskIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v12.34c0 .3.14.58.38.75l2.62 1.9c.35.26.82.26 1.17 0l2.62-1.9c.24-.17.38-.45.38-.75V2"/><path d="M7 2h10"/><path d="M10 9h4"/></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;


export const PERSONAS: Persona[] = [
  {
    id: 'default',
    name: 'Helpful Assistant',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are a helpful and friendly AI assistant. Be concise and clear in your responses.",
    icon: <BotIcon />,
  },
  {
    id: 'coder',
    name: 'Code Expert',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are an expert programmer. Provide clean, efficient, and well-commented code. Always specify the language of the code block.",
    icon: <CodeIcon />,
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are a creative writer. Weave engaging stories and be imaginative in your responses.",
    icon: <FeatherIcon />,
  },
  {
    id: 'doctor',
    name: 'Medical Professional',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are an AI medical professional. Provide clear, informative, and cautious medical information. Always preface your response with a disclaimer that you are not a real doctor and the user should consult a human professional.",
    icon: <StethoscopeIcon />,
  },
  {
    id: 'lawyer',
    name: 'Legal Advisor',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are an AI legal advisor. Explain complex legal concepts in an easy-to-understand manner. Always include a disclaimer that your advice is not a substitute for consultation with a qualified human lawyer.",
    icon: <ScaleIcon />,
  },
  {
    id: 'scientist',
    name: 'Research Scientist',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are a research scientist. Provide detailed, evidence-based explanations of scientific topics. Cite sources or studies where appropriate.",
    icon: <FlaskIcon />,
  },
  {
    id: 'marketer',
    name: 'Marketing Guru',
    systemInstruction: "Your name is 'Nepal's 1st AI'. You are a marketing expert. Provide creative and strategic marketing advice, including campaign ideas, copywriting tips, and social media strategies.",
    icon: <MegaphoneIcon />,
  },
];

export const PROMPT_BOOK: { [key: string]: string[] } = {
  "Creative Writing": [
    "Write a short story about a detective who can talk to animals.",
    "Compose a poem about the city at night.",
    "Generate a movie plot about a time-traveling historian trying to fix a past mistake.",
    "Create a dialogue between a robot and a philosopher about the meaning of life.",
    "Describe a fantasy world where music is the source of all magic.",
  ],
  "Business & Marketing": [
    "Draft a professional email to a potential client introducing our web design services.",
    "Write a catchy slogan for a new brand of eco-friendly sneakers.",
    "Generate a blog post about the top 5 digital marketing trends in 2024.",
    "Create a social media campaign plan for a new vegan restaurant.",
    "Write a product description for a smart home device that manages energy consumption.",
  ],
  "Programming & Tech": [
    "Write a Python script to scrape headlines from a news website.",
    "Explain the concept of recursion in simple terms with a code example in JavaScript.",
    "Generate a boilerplate HTML, CSS, and JS file for a simple portfolio website.",
    "Debug this C# code snippet that is supposed to sort a list of numbers but fails.",
    "Explain the differences between SQL and NoSQL databases.",
  ],
  "Education & Learning": [
    "Explain the process of photosynthesis as if you were teaching a 5th grader.",
    "Summarize the main causes of World War I.",
    "Create a 10-question multiple-choice quiz about the solar system.",
    "Explain Einstein's theory of relativity in a simple, understandable way.",
    "Provide a study plan for someone preparing for a final exam in biology.",
  ],
  "Everyday Life": [
    "Give me 5 healthy and easy-to-make breakfast ideas for a busy week.",
    "Create a 3-day workout plan that focuses on full-body strength.",
    "How do I write a formal complaint letter to a company?",
    "Suggest 3 fun and educational weekend activities for a family with young children.",
    "Draft a polite text message to cancel plans with a friend.",
  ],
  "Roleplaying & Fun": [
    "You are a sarcastic cat. Describe your human's daily routine from your perspective.",
    "Act as a tour guide on Mars, showing tourists the sights of Olympus Mons.",
    "I am a new adventurer in a fantasy world. Give me my first quest.",
    "Pretend you are a food critic reviewing a restaurant that only serves insects.",
    "Let's play a game of 20 questions. I'm thinking of an object.",
  ],
};