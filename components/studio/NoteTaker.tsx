import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { summarizeLectureChunk } from '../../services/geminiService';
import Spinner from '../common/Spinner';

// Helper functions from guidelines
function encode(bytes: Uint8Array) { let binary = ''; const len = bytes.byteLength; for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); } return btoa(binary); }

const NoteTaker: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const lastSummarizedIndexRef = useRef(0);
    const summaryTimeoutRef = useRef<number | null>(null);
    const transcriptRef = useRef(''); // Use ref for timeout closure

    const stopRecording = useCallback(async () => {
        setIsRecording(false);
        setIsConnecting(false);
        if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        try { if (sessionPromiseRef.current) { const session = await sessionPromiseRef.current; session?.close(); } } 
        catch (e) { console.error("Error closing session:", e); }
        sessionPromiseRef.current = null;
    }, []);

    useEffect(() => {
        return () => { stopRecording(); };
    }, [stopRecording]);

    const handleSummarization = useCallback(async () => {
        const currentTranscript = transcriptRef.current;
        const textToSummarize = currentTranscript.substring(lastSummarizedIndexRef.current);

        if (textToSummarize.trim().length > 100) { // Only summarize if there's enough new text
            try {
                const response = await summarizeLectureChunk(textToSummarize);
                setNotes(prev => prev + '\n\n' + response.text);
                lastSummarizedIndexRef.current = currentTranscript.length;
            } catch (err) {
                console.error("Summarization failed:", err);
            }
        }
        // Schedule the next check
        if(isRecording) {
            summaryTimeoutRef.current = window.setTimeout(handleSummarization, 15000); // every 15 seconds
        }
    }, [isRecording]);

    const startRecording = useCallback(async () => {
        setIsConnecting(true);
        setTranscript('');
        setNotes('');
        setError('');
        lastSummarizedIndexRef.current = 0;
        transcriptRef.current = '';

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsRecording(true);
                        
                        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = audioContext.createMediaStreamSource(stream);
                        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) { int16[i] = inputData[i] * 32768; }
                            const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContext.destination);
                        
                        summaryTimeoutRef.current = window.setTimeout(handleSummarization, 15000); // Start the summarization loop
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const newText = message.serverContent.inputTranscription.text;
                            setTranscript(prev => prev + newText);
                            transcriptRef.current += newText;
                        }
                    },
                    onerror: (e: ErrorEvent) => { setError('Session error.'); stopRecording(); },
                    onclose: () => stopRecording(),
                },
                config: { inputAudioTranscription: {} },
            });
        } catch (err: any) {
            setError(`Failed to start: ${err.message}`);
            setIsConnecting(false);
            stopRecording();
        }
    }, [stopRecording, handleSummarization]);

    return (
        <div className="p-3 h-full flex flex-col bg-slate-100 dark:bg-slate-900/50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Live Note Taker</h3>
                <button onClick={isRecording ? stopRecording : startRecording} disabled={isConnecting} className={`px-6 py-2 rounded-full font-semibold text-lg text-white transition-colors disabled:opacity-50 ${isRecording ? 'bg-red-600' : 'bg-green-600'}`}>
                    {isConnecting ? 'Starting...' : isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm my-2 text-center">{error}</p>}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                    <h4 className="p-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-sm">Live Transcript</h4>
                    <div className="flex-grow p-3 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-sans">{transcript || '...'}</pre>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                    <h4 className="p-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-sm">AI Generated Notes</h4>
                    <div className="flex-grow p-3 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                        <pre className="text-sm whitespace-pre-wrap font-sans">{notes || 'Notes will appear here...'}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteTaker;