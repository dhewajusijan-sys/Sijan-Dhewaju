import React from 'react';
import type { StudioTool } from '../types';

// Component Imports
import MediaGenerator from '../components/studio/MediaGenerator';
import ResumeMaker from '../components/studio/ResumeMaker';
import LogoMaker from '../components/studio/LogoMaker';
import TextToVoice from '../components/studio/TextToVoice';
import WebsiteMaker from '../components/studio/WebsiteMaker';
import ResearchTool from '../components/studio/ResearchTool';
import PhotoEditor from '../components/studio/PhotoEditor';

// Icon Components
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2 18.12V22h3.88l14.76-14.76a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const CodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>;
const GemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M12 22V9"/><path d="m3.29 9 8.71 13 8.71-13"/></svg>;

export const STUDIO_TOOLS: StudioTool[] = [
  {
    id: 'media-generator',
    name: 'Media Generator',
    description: 'Create images from text.',
    icon: <ImageIcon />,
    component: MediaGenerator,
  },
  {
    id: 'photo-editor',
    name: 'Photo Editor',
    description: 'Edit photos with text prompts.',
    icon: <WandIcon />,
    component: PhotoEditor,
  },
  {
    id: 'resume-maker',
    name: 'Resume Improver',
    description: 'Enhance your resume.',
    icon: <FileTextIcon />,
    component: ResumeMaker,
  },
  {
    id: 'research-tool',
    name: 'Web Researcher',
    description: 'Get web-grounded answers.',
    icon: <GlobeIcon />,
    component: ResearchTool,
  },
  {
    id: 'text-to-voice',
    name: 'Text to Voice',
    description: 'Convert text to speech.',
    icon: <MicIcon />,
    component: TextToVoice,
  },
  {
    id: 'website-maker',
    name: 'Website Maker',
    description: 'Generate code for a website.',
    icon: <CodeIcon />,
    component: WebsiteMaker,
  },
  {
    id: 'logo-maker',
    name: 'Logo Maker',
    description: 'Design a custom logo.',
    icon: <GemIcon />,
    component: LogoMaker,
    comingSoon: true,
  },
];
