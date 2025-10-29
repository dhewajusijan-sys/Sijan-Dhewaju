import React from 'react';
import type { StudioTool } from '../types';

// Tool Components
import AudioSuite from '../components/studio/AudioSuite';
import CyberSecurityAI from '../components/studio/CyberSecurityAI';
import DataLab from '../components/studio/DataLab';
import FaceAnalyzer from '../components/studio/FaceAnalyzer';
import LearningHub from '../components/studio/LearningHub';
import PhotoEditor from '../components/studio/PhotoEditor';
import ResearchTool from '../components/studio/ResearchTool';
import TextExtractor from '../components/studio/TextExtractor';
import ThreeDCreator from '../components/studio/MapBuilder';
import VisualSuite from '../components/studio/VisualSuite';
import WatermarkStudio from '../components/studio/WatermarkStudio';
import WebBuilder from '../components/studio/WebBuilder';
import WebcamFxView from '../components/studio/WebcamFxView';
import YouTubeSummarizer from '../components/studio/YouTubeSummarizer';
import VRTraining from '../components/studio/VRTraining';
import VoiceCloner from '../components/studio/VoiceCloner';
import DocumentAI from '../components/studio/DocumentAI';
import ContentQueryAI from '../components/studio/ContentQueryAI';
import ARMaker from '../components/studio/ARMaker';

// Icons
const AudioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19.5v-15"/><path d="M8.5 16.5v-9"/><path d="M5 14v-4"/><path d="M15.5 16.5v-9"/><path d="M19 14v-4"/></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const DatabaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const FaceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 14s1.5 2 5 2 5-2 5-2"/></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;
const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.21 15.89-1.21-7 1.21-7-7-1.21-7 1.21 1.21 7-1.21 7 7 1.21 7-1.21z"/><path d="M12 22V12"/><path d="M2.79 7.11 12 12"/><path d="M21.21 7.11 12 12"/><path d="M12 12 6.8 15.8"/><path d="M12 12l5.2 3.8"/></svg>;
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
const WaterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-5-7-10c0-3.9 3.1-7 7-7 3.9 0 7 3.1 7 7 0 5-7 10-7 10z"/><path d="M12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>;
const CodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
const YoutubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10C2.5 6 7.5 4 12 4s9.5 2 9.5 3a24.12 24.12 0 0 1 0 10c0 1-5 3-9.5 3s-9.5-2-9.5-3z"/><path d="m10 9 5 3-5 3Z"/></svg>;
const VrIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12.55V12a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v.55a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><path d="M8 18h8"/><path d="M12 14.5v3.5"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
const QrCodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7h-7z"/></svg>;


export const STUDIO_TOOLS: StudioTool[] = [
    { id: 'web-builder', name: 'AI Web Builder', description: 'Generate and refine websites.', icon: <CodeIcon />, component: WebBuilder },
    { id: 'visual-suite', name: 'Visual Suite', description: 'Resume, thumbnail & design tools.', icon: <LayersIcon />, component: VisualSuite },
    { id: 'learning-hub', name: 'Learning Hub', description: 'AI Tutor, notes & test prep.', icon: <BookIcon />, component: LearningHub },
    { id: 'audio-suite', name: 'Audio Suite', description: 'TTS, music, podcast & captions.', icon: <AudioIcon />, component: AudioSuite },
    { id: 'photo-editor', name: 'Photo Editor', description: 'Generate, edit, and upscale images.', icon: <ImageIcon />, component: PhotoEditor },
    { id: 'research-tool', name: 'AI Web Agent', description: 'Get web-grounded answers.', icon: <GlobeIcon />, component: ResearchTool },
    { id: 'text-extractor', name: 'Text Extractor AI', description: 'Extract text and data from docs.', icon: <ScanIcon />, component: TextExtractor },
    { id: 'data-lab', name: 'Data Lab', description: 'Analyze CSV data with Python.', icon: <DatabaseIcon />, component: DataLab },
    { id: 'cyber-security', name: 'Security AI Analyst', description: 'Analyze code, URLs for threats.', icon: <ShieldIcon />, component: CyberSecurityAI },
    { id: 'face-analyzer', name: 'Face Analyzer', description: 'Detect faces and analyze attributes.', icon: <FaceIcon />, component: FaceAnalyzer },
    { id: 'youtube-summarizer', name: 'YouTube Insights', description: 'Summarize videos from a URL.', icon: <YoutubeIcon />, component: YouTubeSummarizer },
    { id: '3d-creator', name: '3D Creator', description: 'Generate 3D models from text/image.', icon: <CubeIcon />, component: ThreeDCreator },
    { id: 'ar-maker', name: 'AR Maker', description: 'Create AR via text, image or video.', icon: <QrCodeIcon />, component: ARMaker },
    { id: 'watermark-studio', name: 'Watermark Studio', description: 'Add or remove image watermarks.', icon: <WaterIcon />, component: WatermarkStudio },
    { id: 'webcam-fx', name: 'Camera FX', description: 'Apply live AI effects to your webcam.', icon: <CameraIcon />, component: WebcamFxView },
    { id: 'vr-training', name: 'VR Training', description: 'Simulate scenarios in virtual reality.', icon: <VrIcon />, component: VRTraining },
    { id: 'voice-cloner', name: 'Voice Cloner', description: 'Create a digital clone of your voice.', icon: <MicIcon />, component: VoiceCloner },
    { id: 'content-query', name: 'Content Query AI', description: 'Ask questions about your documents.', icon: <SearchIcon />, component: ContentQueryAI },
    { id: 'document-ai', name: 'Document AI', description: 'Automate document workflows.', icon: <FileIcon />, component: DocumentAI },
];