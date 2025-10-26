import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Blob as GenAI_Blob,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import { generateLogo, generateImage, generateVisualDesign, editText } from '../../services/geminiService';
import Spinner from './Spinner';

// --- Helper Functions (Audio & Blob) ---
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
};
function encode(bytes: Uint8Array) { let binary = ''; const len = bytes.byteLength; for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); } return btoa(binary); }
function decode(base64: string) { const binaryString = atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); } return bytes; }
function createBlob(inputData: Float32Array): GenAI_Blob { const l = inputData.length; const int16 = new Int16Array(l); for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; } return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }; }
async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> { const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length; const buffer = ctx.createBuffer(1, frameCount, 24000); const channelData = buffer.getChannelData(0); for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i] / 32768.0; } return buffer; }
const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);

// --- Function Declarations for AI Tools ---

// Creative & Personal Tools
const generateLogoFunctionDeclaration: FunctionDeclaration = { name: 'generate_logo', parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING, description: 'The user\'s description of the logo.'} }, required: ['prompt'] } };
const generateThumbnailFunctionDeclaration: FunctionDeclaration = { name: 'generate_thumbnail', parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: 'The title of the video.' }, style: { type: Type.STRING, description: 'The desired style.' } }, required: ['title'] } };
const generateResumeFunctionDeclaration: FunctionDeclaration = { name: 'generate_resume', parameters: { type: Type.OBJECT, properties: { professional_details: { type: Type.STRING, description: "The user's professional details (experience, education, etc.)." } }, required: ['professional_details'] } };
const generateDesignFunctionDeclaration: FunctionDeclaration = { name: 'generate_visual_design', parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING, description: 'A description of the visual design needed.' } }, required: ['prompt'] } };
const setReminderFunctionDeclaration: FunctionDeclaration = { name: 'set_reminder', parameters: { type: Type.OBJECT, properties: { task: { type: Type.STRING }, time: { type: Type.STRING } }, required: ['task', 'time'] } };
const addToScheduleFunctionDeclaration: FunctionDeclaration = { name: 'add_to_schedule', parameters: { type: Type.OBJECT, properties: { event: { type: Type.STRING }, date: { type: Type.STRING }, time: { type: Type.STRING } }, required: ['event', 'date', 'time'] } };
const controlSmartHomeFunctionDeclaration: FunctionDeclaration = { name: 'control_smart_home', parameters: { type: Type.OBJECT, properties: { device: { type: Type.STRING }, action: { type: Type.STRING }, value: { type: Type.STRING } }, required: ['device', 'action'] } };

// Business Automation Tools
const resolveCustomerIssueFunctionDeclaration: FunctionDeclaration = { name: 'resolveCustomerIssue', description: "Understands and autonomously resolves a customer's issue.", parameters: { type: Type.OBJECT, properties: { issueDescription: { type: Type.STRING }, customerID: { type: Type.STRING } }, required: ['issueDescription'] } };
const processInvoiceFunctionDeclaration: FunctionDeclaration = { name: 'processInvoice', description: "Extracts key data like vendor, amount, and due date from an invoice document.", parameters: { type: Type.OBJECT, properties: { documentSource: { type: Type.STRING } }, required: ['documentSource'] } };
const screenResumesFunctionDeclaration: FunctionDeclaration = { name: 'screenResumes', description: "Screens resumes for a job opening, scoring and ranking candidates.", parameters: { type: Type.OBJECT, properties: { jobDescription: { type: Type.STRING } }, required: ['jobDescription'] } };
const adjustProductPriceFunctionDeclaration: FunctionDeclaration = { name: 'adjustProductPrice', description: "Analyzes market factors and automatically adjusts the price for a given product.", parameters: { type: Type.OBJECT, properties: { productID: { type: Type.STRING } }, required: ['productID'] } };
const schedulePredictiveMaintenanceFunctionDeclaration: FunctionDeclaration = { name: 'schedulePredictiveMaintenance', description: "Analyzes sensor data to predict equipment failure and automatically schedules maintenance.", parameters: { type: Type.OBJECT, properties: { machineID: { type: Type.STRING } }, required: ['machineID'] } };
const optimizeDeliveryRoutesFunctionDeclaration: FunctionDeclaration = { name: 'optimizeDeliveryRoutes', description: "Calculates and adjusts the most efficient delivery routes for a fleet.", parameters: { type: Type.OBJECT, properties: { fleetID: { type: Type.STRING }, deliveryDate: { type: Type.STRING } }, required: ['fleetID'] } };
const respondToCyberThreatFunctionDeclaration: FunctionDeclaration = { name: 'respondToCyberThreat', description: "Identifies and isolates a suspicious network anomaly or malware.", parameters: { type: Type.OBJECT, properties: { threatType: { type: Type.STRING }, sourceIP: { type: Type.STRING } }, required: ['threatType'] } };
const draftMarketingCopyFunctionDeclaration: FunctionDeclaration = { name: 'draftMarketingCopy', description: "Automatically drafts personalized marketing copy for a specific product and customer segment.", parameters: { type: Type.OBJECT, properties: { productName: { type: Type.STRING }, targetSegment: { type: Type.STRING }, copyType: { type: Type.STRING } }, required: ['productName', 'targetSegment'] } };
const resolveITHelpDeskTicketFunctionDeclaration: FunctionDeclaration = { name: 'resolveITHelpDeskTicket', description: "Resolves internal IT support issues like password resets or software access requests.", parameters: { type: Type.OBJECT, properties: { employeeID: { type: Type.STRING }, issue: { type: Type.STRING } }, required: ['issue'] } };
const analyzeTransactionForFraudFunctionDeclaration: FunctionDeclaration = { name: 'analyzeTransactionForFraud', description: "Analyzes a financial transaction for patterns indicative of fraud and takes action.", parameters: { type: Type.OBJECT, properties: { transactionID: { type: Type.STRING } }, required: ['transactionID'] } };

// Desktop Automation Tools
const manageApplicationFunctionDeclaration: FunctionDeclaration = { name: 'manageApplication', description: "Launches, closes, maximizes, minimizes, or switches between applications on the user's computer.", parameters: { type: Type.OBJECT, properties: { appName: { type: Type.STRING }, action: { type: Type.STRING, enum: ['open', 'close', 'maximize', 'minimize', 'switch_to'] } }, required: ['appName', 'action'] } };
const autoTypeAndClickFunctionDeclaration: FunctionDeclaration = { name: 'autoTypeAndClick', description: "Automates typing text or clicking on UI elements by voice.", parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING, enum: ['type', 'click'] }, text_to_type: { type: Type.STRING }, click_target: { type: Type.STRING } }, required: ['action'] } };
const dictateAndFormatFunctionDeclaration: FunctionDeclaration = { name: 'dictateAndFormat', description: "Dictates text and applies formatting like bold or italics.", parameters: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, selection: { type: Type.STRING }, format_action: { type: Type.STRING, enum: ['bold', 'italic', 'underline'] } }, required: ['text'] } };
const manageFilesFunctionDeclaration: FunctionDeclaration = { name: 'manageFiles', description: "Searches for and opens files on the user's local system.", parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING, enum: ['search', 'open'] }, fileName: { type: Type.STRING } }, required: ['action', 'fileName'] } };
const manageEmailFunctionDeclaration: FunctionDeclaration = { name: 'manageEmail', description: "Composes and sends emails.", parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING, enum: ['compose', 'send'] }, recipient: { type: Type.STRING }, subject: { type: Type.STRING }, body: { type: Type.STRING } }, required: ['action'] } };
const executeCustomScriptFunctionDeclaration: FunctionDeclaration = { name: 'executeCustomScript', description: "Executes a pre-programmed custom script or workflow, such as 'morning routine' or 'meeting setup'.", parameters: { type: Type.OBJECT, properties: { scriptName: { type: Type.STRING } }, required: ['scriptName'] } };
const sendTextMessageFunctionDeclaration: FunctionDeclaration = { name: 'sendTextMessage', description: "Sends an SMS or text message to a contact.", parameters: { type: Type.OBJECT, properties: { recipient: { type: Type.STRING }, message: { type: Type.STRING } }, required: ['recipient', 'message'] } };
const startNavigationFunctionDeclaration: FunctionDeclaration = { name: 'startNavigation', description: "Starts turn-by-turn navigation using a map application.", parameters: { type: Type.OBJECT, properties: { destination: { type: Type.STRING }, options: { type: Type.STRING, description: 'e.g., "avoid tolls"' } }, required: ['destination'] } };
const controlSystemSettingFunctionDeclaration: FunctionDeclaration = { name: 'controlSystemSetting', description: "Controls device or operating system settings like 'Do Not Disturb' or 'flashlight'.", parameters: { type: Type.OBJECT, properties: { setting: { type: Type.STRING }, action: { type: Type.STRING, enum: ['on', 'off', 'set'] }, value: { type: Type.STRING } }, required: ['setting', 'action'] } };
const executeSecureTransactionFunctionDeclaration: FunctionDeclaration = { name: 'executeSecureTransaction', description: "Executes a secure financial transaction after voice biometric verification.", parameters: { type: Type.OBJECT, properties: { transactionType: { type: Type.STRING, description: "e.g., 'pay credit card bill'" } }, required: ['transactionType'] } };

// "Seeing" (Vision) Tool
const readTextFromScreenFunctionDeclaration: FunctionDeclaration = { name: 'readTextFromScreen', description: "Uses Computer Vision and OCR to read and extract all text visible on the user's screen or camera.", parameters: { type: Type.OBJECT, properties: {}, required: [] } };

// Session Control Tool
const endSessionFunctionDeclaration: FunctionDeclaration = { name: 'end_session', description: "Ends the current voice assistant session.", parameters: { type: Type.OBJECT, properties: {}, required: [] } };

interface AssistiveTouchProps {
  onNavigate: (tabId: string, data: any) => void;
}

const AssistiveTouch: React.FC<AssistiveTouchProps> = ({ onNavigate }) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorState, setErrorState] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
    
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    const dragInfo = useRef({ offsetX: 0, offsetY: 0, startX: 0, startY: 0, isClick: true });
    const buttonRef = useRef<HTMLDivElement>(null);
    const mainContainerRef = useRef<HTMLElement | null>(null);
    const timerIntervalRef = useRef<number | null>(null);

    // --- Refs for Headless Live Session ---
    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const micStreamRef = useRef<MediaStream | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const appMainContainer = document.querySelector('main > div');
        if(appMainContainer) mainContainerRef.current = appMainContainer as HTMLElement;
        if (mainContainerRef.current) {
            const rect = mainContainerRef.current.getBoundingClientRect();
             setPosition({ x: rect.width - 80, y: rect.height - 80 });
        }
    }, []);

    const stopSession = useCallback(async () => {
        setIsSessionActive(false);
        setIsConnecting(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setElapsedTime(0);

        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        for (const source of sourcesRef.current.values()) { try { source.stop(); } catch (e) {} }
        sourcesRef.current.clear();
        
        if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); scriptProcessorRef.current.onaudioprocess = null; scriptProcessorRef.current = null; }
        if (mediaStreamSourceRef.current) { mediaStreamSourceRef.current.disconnect(); mediaStreamSourceRef.current = null; }
        
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
        
        try { if (sessionPromiseRef.current) { const session = await sessionPromiseRef.current; session?.close(); } } 
        catch (error) { console.error("Error closing session:", error); }
        sessionPromiseRef.current = null;

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') { await inputAudioContextRef.current.close().catch(err => console.error("Error closing input audio context:", err)); inputAudioContextRef.current = null; }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') { await outputAudioContextRef.current.close().catch(err => console.error("Error closing output audio context:", err)); outputAudioContextRef.current = null; }
        
    }, []);

    const startSession = useCallback(async () => {
        setShowPermissionPrompt(false);
        setIsConnecting(true);
        if (!aiRef.current) aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const ai = aiRef.current;
        
        const systemInstruction = "Your name is 'Nepal's 1st AI', an advanced Intelligent Automation platform. You have four core capabilities: 1. Automation Engine (RPA): You execute rule-based tasks like clicking, typing, and data entry. 2. The Brain (ML): You learn from data to make predictions and improve. 3. Language (NLP): You understand and generate human language. 4. Seeing (Vision): You can 'read' visual data from the user's camera/screen to extract text or identify objects. Be concise and confirm the actions you take.";
        
        try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
            micStreamRef.current = micStream;
            if (videoRef.current) {
                videoRef.current.srcObject = micStream;
                videoRef.current.play().catch(console.error);
            }

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false); setIsSessionActive(true);
                        const sessionStartTime = Date.now();
                        timerIntervalRef.current = window.setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000)), 1000);

                        const inputCtx = inputAudioContextRef.current!;
                        const source = inputCtx.createMediaStreamSource(micStream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: createBlob(inputData) }));
                        };
                        source.connect(scriptProcessor); scriptProcessor.connect(inputCtx.destination);

                        const videoEl = videoRef.current;
                        const canvasEl = canvasRef.current;
                        if (videoEl && canvasEl) {
                            const ctx = canvasEl.getContext('2d');
                            if (ctx) {
                                frameIntervalRef.current = window.setInterval(() => {
                                    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
                                        canvasEl.width = videoEl.videoWidth;
                                        canvasEl.height = videoEl.videoHeight;
                                        ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                                        canvasEl.toBlob(async (blob) => {
                                            if (blob) {
                                                const base64Data = await blobToBase64(blob);
                                                sessionPromiseRef.current?.then((session) => {
                                                    session.sendRealtimeInput({
                                                        media: { data: base64Data, mimeType: 'image/jpeg' }
                                                    });
                                                });
                                            }
                                        }, 'image/jpeg', 0.8);
                                    }
                                }, 1000 / 15); // 15 FPS
                            }
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.toolCall) {
                             for (const fc of message.toolCall.functionCalls) {
                                let navData: any = null;
                                let result = "OK";
                                try {
                                    switch(fc.name) {
                                        // Creative & Personal
                                        case 'generate_logo': const logoRes = await generateImage(`A logo for "${String(fc.args.prompt)}". Style: Minimalist. Color Palette: Vibrant & Colorful. The logo should be professional, clean, modern, and suitable for branding. It must be on a solid white background, presented as a flat vector-style graphic.`, 4, '1:1'); navData = { toolId: 'visual-suite', data: { subToolId: 'logo', data: logoRes.generatedImages.map(img => ({ url: `data:image/jpeg;base64,${img.image.imageBytes}`, base64: img.image.imageBytes })) } }; break;
                                        case 'generate_thumbnail': const thumbRes = await generateImage( `Generate 4 YouTube thumbnails for a video titled "${String(fc.args.title)}" with a style of "${String(fc.args.style)}"`, 4, '16:9' ); navData = { toolId: 'visual-suite', data: { subToolId: 'thumbnail', data: thumbRes.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`) } }; break;
                                        case 'generate_resume': const resumeRes = await editText('Create a resume from these details.', String(fc.args.professional_details)); navData = { toolId: 'visual-suite', data: { subToolId: 'resume', data: resumeRes.text } }; break;
                                        case 'generate_visual_design': const designRes = await generateVisualDesign(String(fc.args.prompt)); navData = { toolId: 'visual-suite', data: { subToolId: 'design', data: JSON.parse(designRes.text).designHtml } }; break;
                                        case 'set_reminder': alert(`Reminder set: ${String(fc.args.task)} at ${String(fc.args.time)}`); break;
                                        case 'add_to_schedule': alert(`Scheduled: ${String(fc.args.event)} on ${String(fc.args.date)} at ${String(fc.args.time)}`); break;
                                        case 'control_smart_home': alert(`Device: ${String(fc.args.device)}, Action: ${String(fc.args.action)} ${fc.args.value ? String(fc.args.value) : ''}`); break;
                                        
                                        // Business Automation
                                        case 'resolveCustomerIssue': alert(`Customer Service Automation: Resolving issue for customer ${String(fc.args.customerID) || 'N/A'}: "${String(fc.args.issueDescription)}"`); result = "Customer issue resolution process initiated."; break;
                                        case 'processInvoice': alert(`Finance Automation: Processing invoice from source: ${String(fc.args.documentSource)}`); result = "Invoice processing started."; break;
                                        case 'screenResumes': alert(`HR Automation: Screening resumes for job: "${String(fc.args.jobDescription)}"`); result = "Resume screening has begun."; break;
                                        case 'adjustProductPrice': alert(`Marketing Automation: Adjusting price for product ID: ${String(fc.args.productID)}`); result = "Dynamic pricing algorithm is running."; break;
                                        case 'schedulePredictiveMaintenance': alert(`Manufacturing Automation: Scheduling maintenance for machine ID: ${String(fc.args.machineID)}`); result = "Maintenance ticket has been created."; break;
                                        case 'optimizeDeliveryRoutes': alert(`Logistics Automation: Optimizing routes for fleet ${String(fc.args.fleetID)} for date ${String(fc.args.deliveryDate)}`); result = "Route optimization is in progress."; break;
                                        case 'respondToCyberThreat': alert(`Cybersecurity Automation: Isolating threat ${String(fc.args.threatType)} from source ${String(fc.args.sourceIP)}`); result = "Threat neutralized and incident report generated."; break;
                                        case 'draftMarketingCopy': alert(`Marketing Automation: Drafting ${String(fc.args.copyType)} for ${String(fc.args.productName)} targeting ${String(fc.args.targetSegment)}`); result = "Marketing copy is being drafted."; break;
                                        case 'resolveITHelpDeskTicket': alert(`IT Automation: Resolving issue for employee ${String(fc.args.employeeID)}: "${String(fc.args.issue)}"`); result = "IT help desk ticket is being resolved."; break;
                                        case 'analyzeTransactionForFraud': alert(`Banking Automation: Analyzing transaction ${String(fc.args.transactionID)} for fraud.`); result = "Transaction analysis complete. No fraud detected."; break;
                                        
                                        // Desktop Automation
                                        case 'manageApplication': alert(`Desktop Automation: ${String(fc.args.action)} app: ${String(fc.args.appName)}`); result = `Simulating action '${String(fc.args.action)}' on application '${String(fc.args.appName)}'.`; break;
                                        case 'autoTypeAndClick': if (fc.args.text_to_type) { alert(`Desktop Automation: Typing "${String(fc.args.text_to_type)}"`); result = `Simulating typing of text.`; } else if (fc.args.click_target) { alert(`Desktop Automation: Clicking on "${String(fc.args.click_target)}"`); result = `Simulating a click on '${String(fc.args.click_target)}'.`; } break;
                                        case 'dictateAndFormat': alert(`Desktop Automation: Dictating text and applying format: ${String(fc.args.format_action)}`); result = `Simulating dictation and formatting.`; break;
                                        case 'manageFiles': alert(`Desktop Automation: ${String(fc.args.action)} file: ${String(fc.args.fileName)}`); result = `Simulating file operation.`; break;
                                        case 'manageEmail': 
                                            result = `Simulating email ${String(fc.args.action)} to ${String(fc.args.recipient)}.`;
                                            alert(`Simulating Email Action: ${String(fc.args.action)}\nFrom: dhewajusijan@gmail.com\nTo: ${String(fc.args.recipient || 'N/A')}\nSubject: ${String(fc.args.subject || 'N/A')}\nBody: ${String(fc.args.body || 'N/A')}`);
                                            break;
                                        case 'executeCustomScript': alert(`Desktop Automation: Executing script "${String(fc.args.scriptName)}"`); result = `Simulating script execution.`; break;
                                        case 'sendTextMessage': alert(`Device Automation: Sending text to ${String(fc.args.recipient)}: "${String(fc.args.message)}"`); result = `Simulating sending text message.`; break;
                                        case 'startNavigation': alert(`Device Automation: Navigating to ${String(fc.args.destination)}`); result = `Simulating navigation start.`; break;
                                        case 'controlSystemSetting': alert(`Device Automation: Setting ${String(fc.args.setting)} to ${String(fc.args.action)} ${String(fc.args.value || '')}`); result = `Simulating system setting change.`; break;
                                        case 'executeSecureTransaction': alert(`Device Automation: Executing secure transaction: ${String(fc.args.transactionType)}`); result = `Simulating secure transaction with voice biometrics.`; break;
                                        
                                        // Vision
                                        case 'readTextFromScreen': alert('Vision Automation: Reading text from screen/camera.'); result = "Simulating screen text extraction. Text has been read."; break;

                                        // Session Control
                                        case 'end_session':
                                            result = "OK, ending the session now.";
                                            sessionPromiseRef.current?.then(s => {
                                                s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
                                                setTimeout(() => stopSession(), 100);
                                            });
                                            break;
                                    }
                                    if (navData) { onNavigate('studio', navData); stopSession(); }
                                } catch (e) { console.error("Tool call failed", e); result = `Error executing tool: ${fc.name}`; }
                                finally {
                                    // Don't send a response if the session is already ending
                                    if (fc.name !== 'end_session') {
                                        sessionPromiseRef.current?.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
                                    }
                                }
                             }
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const outputCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx);
                            const sourceNode = outputCtx.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputCtx.destination);
                            sourceNode.addEventListener('ended', () => sourcesRef.current.delete(sourceNode));
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(sourceNode);
                        }
                    },
                    onerror: (e: ErrorEvent) => { console.error('Live session error:', e); stopSession(); },
                    onclose: () => { stopSession(); },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction,
                    tools: [{ functionDeclarations: [
                        // Creative & Personal
                        generateLogoFunctionDeclaration, generateThumbnailFunctionDeclaration, generateResumeFunctionDeclaration, generateDesignFunctionDeclaration, setReminderFunctionDeclaration, addToScheduleFunctionDeclaration, controlSmartHomeFunctionDeclaration,
                        // Business Automation
                        resolveCustomerIssueFunctionDeclaration, processInvoiceFunctionDeclaration, screenResumesFunctionDeclaration, adjustProductPriceFunctionDeclaration, schedulePredictiveMaintenanceFunctionDeclaration, optimizeDeliveryRoutesFunctionDeclaration, respondToCyberThreatFunctionDeclaration, draftMarketingCopyFunctionDeclaration, resolveITHelpDeskTicketFunctionDeclaration, analyzeTransactionForFraudFunctionDeclaration,
                        // Desktop & Device Automation
                        manageApplicationFunctionDeclaration, autoTypeAndClickFunctionDeclaration, dictateAndFormatFunctionDeclaration, manageFilesFunctionDeclaration, manageEmailFunctionDeclaration, executeCustomScriptFunctionDeclaration, sendTextMessageFunctionDeclaration, startNavigationFunctionDeclaration, controlSystemSettingFunctionDeclaration, executeSecureTransactionFunctionDeclaration,
                        // Vision
                        readTextFromScreenFunctionDeclaration,
                        // Session Control
                        endSessionFunctionDeclaration,
                    ] }],
                },
            });

        } catch (error) { 
            console.error('Failed to start conversation:', error); 
            if ((error as DOMException).name === 'NotAllowedError' || (error as DOMException).name === 'NotFoundError') {
                 setErrorState(true);
                 setTimeout(() => setErrorState(false), 2000);
            }
            stopSession();
        }
    }, [onNavigate, stopSession]);

    const toggleSession = () => {
        if (isSessionActive || isConnecting) {
            stopSession();
        } else {
            setShowPermissionPrompt(true);
        }
    };
    
    // --- Drag Logic ---
    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setIsDragging(true);
        dragInfo.current = {
            offsetX: clientX - position.x,
            offsetY: clientY - position.y,
            startX: clientX,
            startY: clientY,
            isClick: true,
        };
    };

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (dragInfo.current.isClick && (Math.abs(clientX - dragInfo.current.startX) > 5 || Math.abs(clientY - dragInfo.current.startY) > 5)) {
            dragInfo.current.isClick = false;
        }

        let newX = clientX - dragInfo.current.offsetX;
        let newY = clientY - dragInfo.current.offsetY;

        if (mainContainerRef.current && buttonRef.current) {
            const parentRect = mainContainerRef.current.getBoundingClientRect();
            const buttonRect = buttonRef.current.getBoundingClientRect();
            newX = Math.max(16, Math.min(parentRect.width - buttonRect.width - 16, newX));
            newY = Math.max(16, Math.min(parentRect.height - buttonRect.height - 16, newY));
        }
        
        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleDragEnd = () => {
        if (!isDragging) return;
        
        if (dragInfo.current.isClick) {
            toggleSession();
        }
        
        setIsDragging(false);

        if (mainContainerRef.current && buttonRef.current) {
            const parentRect = mainContainerRef.current.getBoundingClientRect();
            const buttonRect = buttonRef.current.getBoundingClientRect();
            
            const center = position.x + buttonRect.width / 2;
            const isLeft = center < parentRect.width / 2;
            const newX = isLeft ? 16 : parentRect.width - buttonRect.width - 16;
            
            setPosition(pos => ({ x: newX, y: pos.y }));
        }
    };
    
    useEffect(() => {
        const moveHandler = (e: MouseEvent | TouchEvent) => handleDragMove(e);
        const endHandler = () => handleDragEnd();
        
        if (isDragging) {
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('touchmove', moveHandler, { passive: false });
            document.addEventListener('mouseup', endHandler);
            document.addEventListener('touchend', endHandler);
        }
        return () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('mouseup', endHandler);
            document.removeEventListener('touchend', endHandler);
        };
    }, [isDragging, handleDragMove]);
    
    useEffect(() => {
        return () => {
            void stopSession();
        };
    }, [stopSession]);

    return (
        <>
            <video ref={videoRef} playsInline autoPlay muted className="hidden" />
            <canvas ref={canvasRef} className="hidden" />
            {showPermissionPrompt && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPermissionPrompt(false)}>
                    <div className="global-panel p-6 text-slate-800 dark:text-white text-center max-w-sm rounded-lg" onClick={e => e.stopPropagation()}>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-blue/20 mb-4">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-blue"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                        </div>
                        <h4 className="font-semibold text-lg">Allow Microphone & Camera?</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 mb-4">The AI assistant needs access to respond to commands and use its "Seeing" (Vision) capabilities.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowPermissionPrompt(false)} className="flex-1 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-charcoal-700 dark:hover:bg-charcoal-800 py-2 rounded-md font-semibold transition-colors">Cancel</button>
                            <button onClick={startSession} className="flex-1 text-sm bg-brand-blue hover:bg-sky-400 py-2 rounded-md font-semibold text-white transition-colors">Allow</button>
                        </div>
                    </div>
                </div>
            )}
            <div ref={buttonRef} className="absolute z-40 flex flex-col items-center" style={{ top: 0, left: 0, transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}>
                <div onMouseDown={handleDragStart} onTouchStart={handleDragStart}
                    className={`w-14 h-14 rounded-full bg-gray-900/40 dark:bg-gray-200/40 backdrop-blur-md flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing border border-white/20 transition-all duration-300 ${errorState ? 'ring-4 ring-red-500' : ''} ${isSessionActive || isConnecting ? 'animate-glow-pulse' : ''}`}
                >
                    <div className={`w-8 h-8 rounded-full bg-white/80 dark:bg-white/90 ${isSessionActive || isConnecting ? 'animate-pulse' : ''}`}></div>
                </div>
                {isSessionActive && (
                    <div className="mt-2 bg-white/50 text-black dark:bg-black/50 dark:text-white text-xs font-mono px-2 py-1 rounded-full">
                        {formatTime(elapsedTime)}
                    </div>
                )}
                {isConnecting && <div className="mt-2"><Spinner/></div>}
            </div>
        </>
    );
};

export default AssistiveTouch;