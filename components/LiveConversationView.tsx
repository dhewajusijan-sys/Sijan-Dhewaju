import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Blob as GenAI_Blob,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import type { TranscriptEntry, Sentiment } from '../types';
import { summarizeText, runWebSearch, analyzeImage } from '../services/geminiService';
import Spinner from './common/Spinner';

// Helper functions from guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
};

function createBlob(inputData: Float32Array): GenAI_Blob {
    const l = inputData.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = inputData[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


const VOICES = [ { id: 'Zephyr', name: 'Zephyr (Male)' }, { id: 'Puck', name: 'Puck (Male)' }, { id: 'Charon', name: 'Charon (Male)' }, { id: 'Kore', name: 'Kore (Female)' }, { id: 'Fenrir', name: 'Fenrir (Female)' }, ];
const LANGUAGES = ['English', 'Nepali', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'];

// --- Function Declarations for AI Tools ---
const takeSnapshotFunctionDeclaration: FunctionDeclaration = { name: 'takeSnapshot', parameters: { type: Type.OBJECT, description: 'Takes a snapshot of the current camera view for later reference.', properties: {}, required: [] } };
const searchTheWebFunctionDeclaration: FunctionDeclaration = { name: 'searchTheWeb', parameters: { type: Type.OBJECT, description: 'Searches the web for information about a given query.', properties: { query: { type: Type.STRING } }, required: ['query'] } };
const analyzeCameraForTextFunctionDeclaration: FunctionDeclaration = { name: 'analyzeCameraViewForText', description: "Uses Computer Vision and OCR to read and extract all text from the current camera view.", parameters: { type: Type.OBJECT, properties: {}, required: [] } };
const changeSettingsFunctionDeclaration: FunctionDeclaration = {
  name: 'change_settings',
  description: "Changes the AI assistant's settings for the next session, such as its voice, language, or camera.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      voice: {
        type: Type.STRING,
        description: 'The desired voice for the AI. Available voices are: Zephyr, Puck, Charon, Kore, Fenrir.',
        enum: ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir']
      },
      language: {
        type: Type.STRING,
        description: "The desired language for the AI's responses.",
        enum: ['English', 'Nepali', 'Hindi', 'Spanish', 'French', 'German', 'Japanese']
      },
      camera: {
        type: Type.STRING,
        description: 'Switch the camera view between front-facing ("user") and back-facing ("environment").',
        enum: ['user', 'environment']
      }
    },
  },
};


const PulsingAvatar: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => (
    <div className="relative w-24 h-24 flex items-center justify-center">
        <div className={`absolute w-full h-full rounded-full bg-brand-purple/20 ${isSpeaking ? 'animate-purple-glow-pulse' : 'animate-subtle-pulse'}`}></div>
        <div className="absolute w-full h-full rounded-full border border-brand-purple/30 animate-spin" style={{ animationDuration: '30s' }}></div>
        <div className="absolute w-2/3 h-2/3 rounded-full border border-brand-blue/30 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }}></div>
        <div className="w-1/2 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple" style={{ boxShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}></div>
    </div>
);


const LiveConversationView: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [sentimentHistory, setSentimentHistory] = useState<Sentiment[]>([]);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [conversationSummary, setConversationSummary] = useState('');
    const [snapshots, setSnapshots] = useState<string[]>([]);
    const [isProcessingTool, setIsProcessingTool] = useState<string | null>(null);

    const [selectedVoice, setSelectedVoice] = useState('Zephyr');
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isFacingModeSupported, setIsFacingModeSupported] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [error, setError] = useState('');
    
    // Snapshot analysis modal state
    const [modalState, setModalState] = useState<{ isOpen: boolean, snapshotUrl: string | null }>({ isOpen: false, snapshotUrl: null });
    const [isAnalyzingModal, setIsAnalyzingModal] = useState(false);
    const [modalPrompt, setModalPrompt] = useState('');
    const [modalResult, setModalResult] = useState('');

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array>();
    const animationFrameRef = useRef<number | undefined>();
    const aiSpeakingCounter = useRef(0);

    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
            const supported = navigator.mediaDevices.getSupportedConstraints().facingMode;
            setIsFacingModeSupported(!!supported);
        }
    }, []);
    
     const drawWaveform = useCallback(() => {
        if (!analyserRef.current || !waveformCanvasRef.current || !dataArrayRef.current || !isConnected) {
            return;
        }

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        
        const canvas = waveformCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#a78bfa'); // purple
        gradient.addColorStop(0.5, '#22d3ee'); // cyan
        gradient.addColorStop(1, '#a78bfa'); // purple
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;

        ctx.beginPath();
        const sliceWidth = width * 1.0 / analyserRef.current.frequencyBinCount;
        let x = 0;

        for (let i = 0; i < analyserRef.current.frequencyBinCount; i++) {
            const v = dataArrayRef.current[i] / 128.0;
            const y = v * height / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }, [isConnected]);
    
    const stopConversation = useCallback(async () => {
        setIsConnected(false);
        setIsConnecting(false);
        setIsAiSpeaking(false);
        aiSpeakingCounter.current = 0;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }

        for (const source of sourcesRef.current.values()) {
            try { 
                source.stop(0); 
            } catch (e) {}
        }
        sourcesRef.current.clear();

        if (scriptProcessorRef.current) {
            try {
                scriptProcessorRef.current.disconnect(0);
            } catch(e) {}
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;

        if (frameIntervalRef.current) {
            window.clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }

        try {
            if (sessionPromiseRef.current) {
                const session = await sessionPromiseRef.current;
                session?.close();
            }
        } catch (error) { console.error("Error closing session:", error); }
        sessionPromiseRef.current = null;

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close().catch((err) => console.error("Error closing input audio context:", err));
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close().catch((err) => console.error("Error closing output audio context:", err));
        }
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;

        nextStartTimeRef.current = 0;
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';
    }, []);

    const startConversation = useCallback(async () => {
        setIsConnecting(true);
        setTranscript([]);
        setSentimentHistory([]);
        setConversationSummary('');
        setSnapshots([]);
        setError('');
        
        if (!aiRef.current) {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        }
        const ai = aiRef.current;
        
        const systemInstruction = `Your name is 'Nepal's 1st AI'. You are a 'Perception Agent', a highly advanced multi-modal AI. You can see the user's camera, hear their microphone, and help them with what you perceive. Your "Seeing" capability allows you to use Computer Vision and OCR to read text or identify objects in your camera view. Your spoken responses must be in ${selectedLanguage}. Analyze the user's sentiment and append it to your text transcript in this format: [Sentiment: Positive/Neutral/Negative]. Do not speak this part.`;

        try {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContextRef.current!.createGain();
            outputNode.connect(outputAudioContextRef.current.destination);
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode } });
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener('loadedmetadata', () => {
                    videoRef.current?.play().catch(err => {
                        console.error("Video play failed:", err);
                        setError("Could not start camera playback.");
                    });
                }, { once: true });
            }
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnected(true); setIsConnecting(false);
                        const inputCtx = inputAudioContextRef.current; if (!inputCtx) return;
                        const source = inputCtx.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const analyser = inputCtx.createAnalyser();
                        analyser.fftSize = 2048; analyserRef.current = analyser;
                        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: createBlob(inputData) }));
                        };
                        source.connect(analyser); analyser.connect(scriptProcessor); scriptProcessor.connect(inputCtx.destination);
                        drawWaveform();
                        const videoEl = videoRef.current, canvasEl = canvasRef.current;
                        if (videoEl && canvasEl) {
                            const ctx = canvasEl.getContext('2d');
                            if (ctx) {
                                frameIntervalRef.current = window.setInterval(() => {
                                    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
                                        canvasEl.width = videoEl.videoWidth; canvasEl.height = videoEl.videoHeight;
                                        ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                                        canvasEl.toBlob( async (blob) => {
                                            if (blob) {
                                                const base64Data = await blobToBase64(blob);
                                                sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                                            }
                                        }, 'image/jpeg', 0.8 );
                                    }
                                }, 1000 / 15); // 15 FPS
                            }
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const handleToolCall = async (fc: any) => {
                            setIsProcessingTool(fc.name);
                            let result = "OK";
                            try {
                                switch (fc.name) {
                                    case 'takeSnapshot':
                                        if (videoRef.current && canvasRef.current) {
                                            const video = videoRef.current;
                                            const canvas = canvasRef.current;
                                            canvas.width = video.videoWidth;
                                            canvas.height = video.videoHeight;
                                            const ctx = canvas.getContext('2d');
                                            if (ctx) {
                                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                                const dataUrl = canvas.toDataURL('image/jpeg');
                                                setSnapshots(prev => [...prev.slice(-4), dataUrl]); // keep last 5
                                                result = "Snapshot taken successfully.";
                                            } else {
                                                result = "Could not get canvas context to take snapshot.";
                                            }
                                        } else {
                                            result = "Camera view is not available to take a snapshot.";
                                        }
                                        break;
                                    case 'searchTheWeb':
                                        const searchResult = await runWebSearch(fc.args.query);
                                        result = searchResult.text;
                                        break;
                                    case 'analyzeCameraViewForText':
                                        if (videoRef.current && canvasRef.current) {
                                            const video = videoRef.current;
                                            const canvas = canvasRef.current;
                                            canvas.width = video.videoWidth;
                                            canvas.height = video.videoHeight;
                                            const ctx = canvas.getContext('2d');
                                            if (ctx) {
                                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                                const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
                                                const ocrResult = await analyzeImage("Read all text in this image.", base64, 'image/jpeg');
                                                result = `I see the following text: ${ocrResult.text}`;
                                            } else {
                                                result = "Could not get canvas context for analysis.";
                                            }
                                        } else {
                                            result = "Camera view not available for analysis.";
                                        }
                                        break;
                                    case 'change_settings':
                                       let changes = [];
                                       if (fc.args.voice && VOICES.map(v => v.id).includes(fc.args.voice)) {
                                           setSelectedVoice(fc.args.voice);
                                           changes.push(`voice to ${fc.args.voice}`);
                                       }
                                       if (fc.args.language && LANGUAGES.includes(fc.args.language)) {
                                           setSelectedLanguage(fc.args.language);
                                           changes.push(`language to ${fc.args.language}`);
                                       }
                                       if (fc.args.camera && ['user', 'environment'].includes(fc.args.camera)) {
                                           setFacingMode(fc.args.camera);
                                           changes.push(`camera to ${fc.args.camera}`);
                                       }
                                       if (changes.length > 0) {
                                           result = `OK, I've updated my settings. I will use the new ${changes.join(' and ')} the next time we start a conversation.`;
                                       } else {
                                           result = "No valid settings were provided to change.";
                                       }
                                       break;
                                }
                            } catch (e: any) {
                                result = `Error executing tool: ${e.message}`;
                            } finally {
                                sessionPromiseRef.current?.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
                                setIsProcessingTool(null);
                            }
                        };
                
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                await handleToolCall(fc);
                            }
                        }
                
                        const sentimentRegex = /\[Sentiment: (Positive|Neutral|Negative)\]/;
                        if (message.serverContent?.outputTranscription) {
                            let text = message.serverContent.outputTranscription.text;
                            const match = text.match(sentimentRegex);
                            if (match) {
                                setSentimentHistory(prev => [...prev.slice(-9), match[1] as Sentiment]);
                                text = text.replace(sentimentRegex, '').trim();
                            }
                
                            if (text) {
                                currentOutputTranscription.current += text;
                            }
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }
                
                        if (message.serverContent?.turnComplete) {
                            if (currentInputTranscription.current.trim()) {
                                setTranscript(prev => [...prev, { speaker: 'user', text: currentInputTranscription.current.trim(), isFinal: true }]);
                            }
                            if (currentOutputTranscription.current.trim()) {
                                setTranscript(prev => [...prev, { speaker: 'ai', text: currentOutputTranscription.current.trim(), isFinal: true }]);
                            }
                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }
                
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        const outputCtx = outputAudioContextRef.current;
                        if (base64Audio && outputCtx) {
                            setIsAiSpeaking(true);
                            aiSpeakingCounter.current++;
                
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                aiSpeakingCounter.current--;
                                if (aiSpeakingCounter.current === 0) {
                                    setIsAiSpeaking(false);
                                }
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop(0);
                                sourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                            setIsAiSpeaking(false);
                            aiSpeakingCounter.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setError("A connection error occurred.");
                        stopConversation();
                    },
                    onclose: (e: CloseEvent) => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                    systemInstruction,
                    tools: [{ functionDeclarations: [takeSnapshotFunctionDeclaration, searchTheWebFunctionDeclaration, analyzeCameraForTextFunctionDeclaration, changeSettingsFunctionDeclaration] }],
                },
            });
        } catch (error) {
            const err = error as Error;
            console.error("Failed to start conversation:", err);
            setError(`Failed to start: ${err.message}`);
            stopConversation();
        }
    }, [stopConversation, selectedLanguage, selectedVoice, facingMode, drawWaveform]);

    const handleAnalyzeSnapshot = async () => {
        if (!modalState.snapshotUrl || !modalPrompt) return;
        setIsAnalyzingModal(true);
        setModalResult('');
        try {
            const base64Image = modalState.snapshotUrl.split(',')[1];
            const result = await analyzeImage(modalPrompt, base64Image, 'image/jpeg'); 
            setModalResult(result.text);
        } catch (err) {
            setModalResult("Failed to analyze snapshot.");
        } finally {
            setIsAnalyzingModal(false);
        }
    };
    
    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-50 dark:bg-black text-slate-900 dark:text-white relative">
            {/* Main view with video and overlays */}
            <div className="flex-grow relative flex items-center justify-center overflow-hidden">
                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover transform -scale-x-100" />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                    <PulsingAvatar isSpeaking={isAiSpeaking} />
                    
                    {!isConnected && !isConnecting && (
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold text-white">Live Conversation</h2>
                            <p className="text-slate-200">Talk with a multimodal AI assistant.</p>
                        </div>
                    )}

                    {error && <p className="mt-4 text-red-400">{error}</p>}
                </div>
                
                {isConnected && (
                     <div className="absolute bottom-4 left-4 right-4 h-20 pointer-events-none">
                        <canvas ref={waveformCanvasRef} className="w-full h-full" />
                    </div>
                )}
            </div>

            {/* Side Panel: Transcript & Snapshots */}
            <div className="flex-shrink-0 w-full md:w-96 bg-slate-100/80 dark:bg-charcoal-900/50 backdrop-blur-md border-t md:border-t-0 md:border-l border-slate-200 dark:border-brand-cyan/20 p-4 flex flex-col max-h-full">
                <h3 className="font-bold mb-2 flex-shrink-0">Transcript</h3>
                <div className="flex-grow overflow-y-auto space-y-2 text-sm pr-2">
                    {transcript.map((entry, index) => (
                        <div key={index}>
                            <p className={entry.speaker === 'user' ? 'text-brand-cyan' : 'text-brand-purple'}>
                                <strong>{entry.speaker === 'user' ? 'You: ' : 'AI: '}</strong>{entry.text}
                            </p>
                        </div>
                    ))}
                    {transcript.length === 0 && <p className="text-slate-500 dark:text-slate-400">Conversation will appear here...</p>}
                </div>
                {snapshots.length > 0 && (
                    <div className="mt-4 flex-shrink-0">
                        <h3 className="font-bold mb-2">Snapshots</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {snapshots.map((snap, i) => <img key={i} src={snap} alt={`Snapshot ${i+1}`} className="w-20 h-20 object-cover rounded-md cursor-pointer" onClick={() => setModalState({ isOpen: true, snapshotUrl: snap })} />)}
                        </div>
                    </div>
                )}
            </div>

            {/* Global Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
                 <div className="flex items-center gap-2 flex-wrap bg-white/30 dark:bg-black/30 p-2 rounded-lg pointer-events-auto">
                    <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} disabled={isConnected || isConnecting} className="bg-white/80 dark:bg-charcoal-800/80 text-slate-900 dark:text-white text-xs p-2 rounded-md border border-slate-300 dark:border-0 focus:ring-2 focus:ring-brand-cyan">
                        {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} disabled={isConnected || isConnecting} className="bg-white/80 dark:bg-charcoal-800/80 text-slate-900 dark:text-white text-xs p-2 rounded-md border border-slate-300 dark:border-0 focus:ring-2 focus:ring-brand-cyan">
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    {isFacingModeSupported && <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} disabled={isConnected || isConnecting} className="p-2 bg-white/80 dark:bg-charcoal-800/80 rounded-md text-xs text-slate-900 dark:text-white">Flip Camera</button>}
                </div>
                <button onClick={isConnected ? stopConversation : startConversation} disabled={isConnecting} className={`px-6 py-2 rounded-full font-semibold text-lg pointer-events-auto ${isConnected ? 'bg-red-600' : 'bg-green-600'} text-white`}>
                    {isConnecting ? 'Starting...' : isConnected ? 'End' : 'Start'}
                </button>
            </div>
            
             {/* Snapshot Modal */}
             {modalState.isOpen && ReactDOM.createPortal(
                 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalState({ isOpen: false, snapshotUrl: null })}>
                     <div className="bg-white dark:bg-charcoal-800 p-4 rounded-lg max-w-lg w-full" onClick={e => e.stopPropagation()}>
                         <img src={modalState.snapshotUrl!} alt="Snapshot analysis" className="w-full max-h-[60vh] object-contain rounded-md mb-4"/>
                         <textarea value={modalPrompt} onChange={e => setModalPrompt(e.target.value)} placeholder="Ask about this image..." className="w-full bg-slate-100 dark:bg-charcoal-700 text-slate-900 dark:text-white p-2 rounded-md mb-2 border border-slate-300 dark:border-0 focus:ring-2 focus:ring-brand-cyan" rows={2}/>
                         <button onClick={handleAnalyzeSnapshot} disabled={isAnalyzingModal} className="w-full py-2 bg-brand-primary text-white rounded-md flex justify-center items-center">{isAnalyzingModal ? <Spinner/> : 'Analyze'}</button>
                         {modalResult && <div className="mt-4 p-3 bg-slate-100 dark:bg-charcoal-900 rounded-md text-sm text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto">{modalResult}</div>}
                     </div>
                 </div>,
                document.body
             )}
        </div>
    );
};

export default LiveConversationView;