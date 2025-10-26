import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { generateLessonPlan } from '../../services/geminiService';
import Spinner from '../common/Spinner';

// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) { let binary = ''; const len = bytes.byteLength; for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); } return btoa(binary); }
function decode(base64: string) { const binaryString = atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); } return bytes; }
async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> { const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length; const buffer = ctx.createBuffer(1, frameCount, 24000); const channelData = buffer.getChannelData(0); for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i] / 32768.0; } return buffer; }

interface LessonStep {
    step: number;
    title: string;
    description: string;
}

const AITutor: React.FC = () => {
    const [view, setView] = useState<'idle' | 'planning' | 'lesson'>('idle');
    const [topic, setTopic] = useState('');
    const [lessonPlan, setLessonPlan] = useState<LessonStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
    const [mode, setMode] = useState<'learn' | 'practice'>('learn');

    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcript, setTranscript] = useState<{ speaker: 'user' | 'ai', text: string }[]>([]);
    const [error, setError] = useState('');

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    
    const stopSession = useCallback(async () => {
        setIsSessionActive(false);
        setIsConnecting(false);
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        try { if (sessionPromiseRef.current) { const session = await sessionPromiseRef.current; session?.close(); } } catch (e) { console.error("Error closing session:", e); }
    }, []);

    const startVoiceLesson = useCallback(async (stepIndex: number) => {
        setCurrentStepIndex(stepIndex);
        setIsConnecting(true);
        setTranscript([]);
        setError('');
        
        const lessonTopic = lessonPlan[stepIndex];
        if (!lessonTopic) {
            setError("Selected lesson step is invalid.");
            setIsConnecting(false);
            return;
        }

        let systemInstruction = `Your name is 'Nepal's 1st AI'. You are an AI Tutor agent. `;
        if (mode === 'learn') {
            systemInstruction += `You are teaching the user about "${lessonTopic.title}", which is part of a larger lesson on "${topic}". Explain the concepts clearly and ask engaging questions.`;
        } else {
            systemInstruction += `You are in Practice Mode for the topic "${lessonTopic.title}". Ask the user questions to test their understanding and provide helpful feedback.`;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            let currentInput = '', currentOutput = '';

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false); setIsSessionActive(true);
                        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = audioContext.createMediaStreamSource(stream);
                        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = e => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) { int16[i] = inputData[i] * 32768; }
                            const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor); scriptProcessor.connect(audioContext.destination);
                    },
                    onmessage: async (message) => {
                        if (message.serverContent?.inputTranscription) { currentInput += message.serverContent.inputTranscription.text; }
                        if (message.serverContent?.outputTranscription) { currentOutput += message.serverContent.outputTranscription.text; }
                        if (message.serverContent?.turnComplete) { setTranscript(prev => [...prev, { speaker: 'user', text: currentInput }, { speaker: 'ai', text: currentOutput }]); currentInput = ''; currentOutput = ''; }
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext);
                            const sourceNode = audioContext.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(audioContext.destination);
                            sourceNode.start();
                        }
                    },
                    onerror: () => { setError('Session error.'); stopSession(); },
                    onclose: () => stopSession(),
                },
                config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {}, systemInstruction },
            });
        } catch (err) {
            setError(`Failed to start: ${(err as Error).message}`); setIsConnecting(false); stopSession();
        }
    }, [stopSession, topic, lessonPlan, mode]);

    const handlePlanGeneration = async () => {
        if (!topic.trim()) return;
        setView('planning');
        setError('');
        try {
            const response = await generateLessonPlan(topic);
            const data = JSON.parse(response.text);
            setLessonPlan(data.lessonPlan);
            setView('lesson');
        } catch (err) {
            setError("Failed to generate a lesson plan. Please try another topic.");
            setView('idle');
        }
    };
    
    if (view === 'idle' || view === 'planning') {
        return (
            <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                <h3 className="text-xl font-bold mb-2">Agent-Based Learning</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">This is AI Prep 1.0. Start a lesson on any topic to begin.</p>
                {view === 'planning' ? <Spinner /> : (
                    <div className="w-full max-w-lg flex gap-2">
                        <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePlanGeneration()} placeholder="e.g., Photosynthesis in Higher Plants" className="flex-grow bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md border border-slate-300 dark:border-slate-600"/>
                        <button onClick={handlePlanGeneration} className="py-3 px-6 bg-brand-primary text-white font-semibold rounded-md">Start Lesson</button>
                    </div>
                )}
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                 <p className="text-sm text-slate-500 mt-8">Try asking: "Explain the British colonial expansion in South Asia."</p>
            </div>
        );
    }
    
    return (
        <div className="h-full grid md:grid-cols-3 gap-4 p-3 overflow-hidden">
            <div className="md:col-span-1 flex flex-col gap-3 overflow-y-auto pr-2">
                <button onClick={() => setView('idle')} className="text-sm text-brand-primary hover:underline self-start">{'<'} Change Topic</button>
                <h4 className="font-bold text-lg">Lesson Plan: {topic}</h4>
                <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1"><button onClick={() => setMode('learn')} className={`flex-1 text-sm p-2 rounded ${mode === 'learn' ? 'bg-brand-primary text-white' : ''}`}>Learn a Lesson</button><button onClick={() => setMode('practice')} className={`flex-1 text-sm p-2 rounded ${mode === 'practice' ? 'bg-brand-primary text-white' : ''}`}>Practice Mode</button></div>
                <div className="space-y-2">
                    {lessonPlan.map((step, index) => (
                        <button key={step.step} onClick={() => startVoiceLesson(index)} disabled={isConnecting} className={`w-full p-3 text-left rounded-md border ${currentStepIndex === index ? 'bg-brand-blue/20 border-brand-blue' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                            <p className="font-semibold text-sm">Step {step.step}: {step.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{step.description}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="md:col-span-2 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-3 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-sm">{currentStepIndex !== null ? lessonPlan[currentStepIndex].title : "Select a step to begin"}</h4>
                    <button onClick={isSessionActive ? stopSession : () => startVoiceLesson(currentStepIndex!)} disabled={isConnecting || currentStepIndex === null} className={`px-4 py-1 text-sm rounded-full font-semibold ${isSessionActive ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>{isConnecting ? 'Starting...' : isSessionActive ? 'End Session' : 'Start Session'}</button>
                </div>
                 <div className="flex-grow p-3 overflow-y-auto space-y-2 text-sm">
                    {transcript.map((t, i) => <p key={i}><strong className={t.speaker === 'user' ? 'text-brand-cyan' : 'text-brand-purple'}>{t.speaker === 'user' ? 'You' : 'Tutor'}:</strong> {t.text}</p>)}
                    {transcript.length === 0 && <p className="text-slate-500 text-center pt-8">The conversation will appear here.</p>}
                </div>
            </div>
        </div>
    );
};

export default AITutor;