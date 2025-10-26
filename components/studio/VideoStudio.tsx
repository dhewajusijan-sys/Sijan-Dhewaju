import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateProVideo, extendVideo, pollVideoOperation, getVideoObjectUrlFromOperation } from '../../services/geminiService';
import Spinner from '../common/Spinner';

// --- Helper & Type Definitions ---
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = reject; });
const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().slice(11, 19);

// --- Effect Definitions ---
const EFFECT_CATEGORIES = {
    "Color & Tone": ["Brightness", "Contrast", "Saturation", "Hue Shift", "Temperature", "Tint", "Black and White", "Sepia", "Vignette", "Posterize", "Negative", "Two-Tone", "Three-Way Color Corrector", "RGB Curves", "Levels", "Color Balance", "Exposure", "HDR Effect", "LUT (Lookup Table)", "Channel Mixer", "Color Invert", "Spot Color", "Color Replace", "False Color"],
    "Filter & Stylize": ["Film Grain", "Noise Reduction", "Sharpen", "Diffuse Glow", "Warm Glow", "Old Movie", "Film Look", "Teal and Orange", "Cinematic Gold", "Dreamy Blur", "Prism Effect", "Halation", "Diffusion Filter", "Glitch Distortion", "Split Screen"],
    "Blur & Distort": ["Gaussian Blur", "Directional Blur", "Radial Blur", "Zoom Blur", "Motion Blur", "Mosaic", "Pixelate", "Warp Stabilizer", "Corner Pin", "Bezier Warp", "Lens Correction", "Fisheye", "Wave Warp", "Magnify", "Earthquake (Shake)", "Rolling Shutter Repair", "Turbulence"],
    "Motion & Time": ["Transform", "Anchor Point Adjust", "Pan and Zoom", "Time Remapping", "Speed Ramp", "Slow Motion", "Fast Motion", "Reverse Clip", "Strobe Light", "Echo", "Posterize Time", "Motion Tile", "Offset"],
    "Compositing": ["Blending Mode", "Masking", "Alpha Channel", "Reflection", "Lens Flare", "Light Leak", "Rain", "Snow", "Luma Key", "Chroma Key", "Garbage Matte"]
};
const TRANSITIONS = ["Cut", "Fade In/Out", "Cross Dissolve", "Dip to White/Black", "Wipe", "Push", "Slide", "Zoom", "Spin", "Morph Cut"];
const IMPLEMENTED_EFFECTS = ["Brightness", "Contrast", "Saturation", "Hue Shift", "Black and White", "Sepia", "Negative", "Gaussian Blur", "Transform"];


interface ReferenceImage { file: File; base64: string; previewUrl: string; }
interface Clip { id: string; file: File; url: string; duration: number; trim: { start: number; end: number; }; effects: Record<string, number | boolean>; }

const DEFAULT_EFFECTS_STATE: Record<string, number | boolean> = { Brightness: 100, Contrast: 100, Saturation: 100, "Hue Shift": 0, Sepia: 0, "Black and White": 0, Negative: 0, "Gaussian Blur": 0, Rotation: 0, Flip: false };

const LOADING_MESSAGES = ["Generating your video...", "Rendering pixels into motion...", "Almost there, adding the final touches..."];

// --- Main Component ---
const VideoStudio: React.FC = () => {
    const [activeSuiteTab, setActiveSuiteTab] = useState<'generate' | 'edit'>('generate');
    
    // Shared State
    const [clips, setClips] = useState<Clip[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
    
    // AI Generation State
    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [extensionPrompt, setExtensionPrompt] = useState('');
    const [operations, setOperations] = useState<any[]>([]);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    
    const intervalRef = useRef<number | null>(null);
    
    const selectedClip = clips.find(c => c.id === selectedClipId) || null;

    // --- API Key & Loading Message Hooks ---
    useEffect(() => {
        const checkApiKey = async () => {
            try {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            } catch (e) { setApiKeySelected(false); } 
            finally { setIsCheckingApiKey(false); }
        };
        checkApiKey();
    }, []);

    useEffect(() => {
        if (isLoading) {
            intervalRef.current = window.setInterval(() => setLoadingMessage(prev => LOADING_MESSAGES[(LOADING_MESSAGES.indexOf(prev) + 1) % LOADING_MESSAGES.length]), 5000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) };
    }, [isLoading]);
    
    const handleSelectKey = async () => {
        try { await (window as any).aistudio.openSelectKey(); setApiKeySelected(true); } 
        catch (e) { setError("Failed to open API key selection."); }
    };

    // --- AI Generation Logic ---
    const runPolling = async (initialOperation: any) => {
        let op = initialOperation;
        while (!op.done) {
            await new Promise(r => setTimeout(r, 10000));
            op = await pollVideoOperation(op);
        }
        return op;
    };
    
    const handleApiError = (err: any) => {
        const msg = err.message || 'An unknown error occurred.';
        if (msg.includes('Requested entity was not found')) {
            setError('API Key is invalid. Please select a valid key.');
            setApiKeySelected(false);
        } else {
            setError(`Failed to process video: ${msg}`);
        }
    };
    
    const addVideoUrlToClips = async (videoUrl: string, name: string) => {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const file = new File([blob], name, { type: blob.type });
        
        const duration = await new Promise<number>(resolve => {
            const tempVideo = document.createElement('video');
            tempVideo.src = videoUrl;
            tempVideo.onloadedmetadata = () => resolve(tempVideo.duration);
        });
        
        const newClip: Clip = { id: `${Date.now()}-${file.name}`, file, url: videoUrl, duration, trim: { start: 0, end: duration }, effects: { ...DEFAULT_EFFECTS_STATE } };
        setClips(prev => [...prev, newClip]);
        setSelectedClipId(newClip.id);
        setActiveSuiteTab('edit');
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() || referenceImages.length === 0) { setError('Prompt and at least one image are required.'); return; }
        setIsLoading(true); setError(''); setOperations([]);
        try {
            const imagePayloads = referenceImages.map(img => ({ base64: img.base64, mimeType: img.file.type }));
            const initialOp = await generateProVideo(prompt, imagePayloads);
            const finalOp = await runPolling(initialOp);
            const url = await getVideoObjectUrlFromOperation(finalOp);
            setOperations([finalOp]);
            await addVideoUrlToClips(url, 'generated_video.mp4');
        } catch (err: any) { handleApiError(err); } 
        finally { setIsLoading(false); }
    }, [prompt, referenceImages]);

    const handleExtend = useCallback(async () => {
        if (!extensionPrompt.trim() || operations.length === 0) return;
        setIsLoading(true); setError('');
        try {
            const lastOp = operations[operations.length - 1];
            const prevVideo = lastOp.response?.generatedVideos?.[0]?.video;
            const aspectRatio = lastOp.response?.generatedVideos?.[0]?.aspectRatio;
            if (!prevVideo) throw new Error("Could not find previous video data.");

            const initialOp = await extendVideo(extensionPrompt, prevVideo, aspectRatio);
            const finalOp = await runPolling(initialOp);
            const url = await getVideoObjectUrlFromOperation(finalOp);
            setOperations(prev => [...prev, finalOp]);
            await addVideoUrlToClips(url, `extension_${operations.length}.mp4`);
            setExtensionPrompt('');
        } catch (err: any) { handleApiError(err); } 
        finally { setIsLoading(false); }
    }, [extensionPrompt, operations]);
    
     const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isRef: boolean) => {
        const files = e.target.files;
        if (!files) return;
        if (isRef) {
             const newImages: ReferenceImage[] = [];
             for (let i = 0; i < Math.min(files.length, 3 - referenceImages.length); i++) {
                 const file = files[i];
                 const base64 = await fileToBase64(file);
                 newImages.push({ file, base64, previewUrl: URL.createObjectURL(file) });
             }
             if (newImages.length > 0) setReferenceImages(prev => [...prev, ...newImages]);
        } else {
             for (let i = 0; i < files.length; i++) {
                 const file = files[i];
                 if (file.type.startsWith('video/')) {
                     const url = URL.createObjectURL(file);
                     const duration = await new Promise<number>(r => { const v=document.createElement('video'); v.src=url; v.onloadedmetadata=()=>r(v.duration); });
                     const newClip: Clip = { id: `${Date.now()}-${file.name}`, file, url, duration, trim: { start: 0, end: duration }, effects: { ...DEFAULT_EFFECTS_STATE } };
                     setClips(prev => [...prev, newClip]);
                     if (!selectedClipId) setSelectedClipId(newClip.id);
                 }
             }
        }
        if (e.target) e.target.value = '';
    };

    const updateSelectedClipEffect = (key: string, value: number | boolean) => {
        if (!selectedClip) return;
        const newEffects = { ...selectedClip.effects, [key]: value };
        setClips(prev => prev.map(c => c.id === selectedClipId ? { ...c, effects: newEffects } : c));
    };
    
    const renderEffectControl = (effectName: string) => {
        if (!IMPLEMENTED_EFFECTS.includes(effectName)) {
            return <button key={effectName} disabled className="p-2 text-left bg-slate-100 dark:bg-slate-800 rounded-md cursor-not-allowed opacity-50 w-full"><p className="font-semibold text-xs text-slate-500">{effectName}</p><p className="text-xs text-slate-400">Coming Soon</p></button>;
        }
        
        let control;
        switch(effectName) {
            case 'Brightness':
            case 'Contrast':
            case 'Saturation':
                control = <input type="range" min="0" max="200" value={selectedClip?.effects[effectName] as number} onChange={e => updateSelectedClipEffect(effectName, Number(e.target.value))} />;
                break;
            case 'Hue Shift':
                control = <input type="range" min="0" max="360" value={selectedClip?.effects[effectName] as number} onChange={e => updateSelectedClipEffect(effectName, Number(e.target.value))} />;
                break;
            case 'Sepia':
            case 'Black and White':
            case 'Negative':
                 control = <input type="range" min="0" max="100" value={selectedClip?.effects[effectName] as number} onChange={e => updateSelectedClipEffect(effectName, Number(e.target.value))} />;
                 break;
            case 'Gaussian Blur':
                 control = <input type="range" min="0" max="20" value={selectedClip?.effects[effectName] as number} onChange={e => updateSelectedClipEffect(effectName, Number(e.target.value))} />;
                 break;
            case 'Transform':
                return (
                    <div key={effectName} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                        <p className="font-semibold text-xs mb-1">Transform</p>
                        <label className="text-xs">Rotation</label><input type="range" min="-180" max="180" value={selectedClip?.effects['Rotation'] as number} onChange={e => updateSelectedClipEffect('Rotation', Number(e.target.value))} />
                        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedClip?.effects['Flip'] as boolean} onChange={e => updateSelectedClipEffect('Flip', e.target.checked)} /> Flip Horizontal</label>
                    </div>
                )
            default: return null;
        }
        return <div key={effectName} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md"><label className="text-xs block font-semibold">{effectName}</label>{control}</div>
    };
    
    // --- Render Logic ---
    if (isCheckingApiKey) return <div className="p-6 h-full flex items-center justify-center"><Spinner /></div>;
    if (!apiKeySelected) return (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold mb-2">API Key Required</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md">Video generation requires your own API key. Billing is associated with your Google Cloud project.</p>
            <p className="text-sm text-slate-500 mb-4"><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Billing documentation</a>.</p>
            <button onClick={handleSelectKey} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold hover:bg-brand-secondary transition-colors">Select API Key</button>
            {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>}
        </div>
    );

    return (
    <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold">Video Studio</h3>
             <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1">
                <button onClick={() => setActiveSuiteTab('generate')} className={`flex-1 text-sm p-2 rounded ${activeSuiteTab === 'generate' ? 'bg-brand-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>AI Generation</button>
                <button onClick={() => setActiveSuiteTab('edit')} className={`flex-1 text-sm p-2 rounded ${activeSuiteTab === 'edit' ? 'bg-brand-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Client-Side Editor</button>
            </div>
        </div>
        
        {error && <p className="text-red-500 dark:text-red-400 text-sm mb-2 text-center">{error}</p>}

        {activeSuiteTab === 'generate' ? (
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <h4 className="font-semibold text-lg">1. Generate Base Video</h4>
                    <div>
                        <label className="block text-sm font-medium mb-2">Reference Images (up to 3)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {referenceImages.map((img, i) => <div key={i} className="relative"><img src={img.previewUrl} className="w-full h-24 object-cover rounded-md" /><button onClick={() => setReferenceImages(p => p.filter((_, idx) => i !== idx))} className="absolute top-1 right-1 bg-black/50 rounded-full text-white text-xs w-5 h-5">&times;</button></div>)}
                            {referenceImages.length < 3 && <label htmlFor="ref-img-upload" className="w-full h-24 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-brand-primary"><div>+ Add</div></label>}
                        </div>
                        <input id="ref-img-upload" type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(e, true)} />
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Prompt</label><textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A video of this character in this environment." className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" /></div>
                    <button onClick={handleGenerate} disabled={isLoading || referenceImages.length === 0} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 flex justify-center">{isLoading && operations.length === 0 ? <Spinner/> : 'Generate Video'}</button>
                    
                    {operations.length > 0 && <div className="pt-4 border-t"><h4 className="font-semibold text-lg">2. Extend Video</h4><div><label className="block text-sm font-medium mb-1">Extension Prompt</label><textarea rows={2} value={extensionPrompt} onChange={e => setExtensionPrompt(e.target.value)} placeholder="e.g., ...then something unexpected happens." className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" /></div><button onClick={handleExtend} disabled={isLoading} className="w-full mt-2 py-2 px-4 bg-brand-secondary text-white rounded-md font-semibold disabled:bg-slate-400 flex justify-center">{isLoading ? <Spinner/> : 'Extend'}</button></div>}
                </div>
                 <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border flex flex-col items-center justify-center p-4">
                    {isLoading && <div className="text-center"><Spinner /><p className="mt-4">{loadingMessage}</p></div>}
                    {!isLoading && clips.length === 0 && <p>Your generated videos will appear here.</p>}
                    {clips.length > 0 && !isLoading && <p>Video generated and added to the Client-Side Editor tab.</p>}
                 </div>
            </div>
        ) : ( // Client-Side Editor UI
             <div className="flex-grow grid md:grid-cols-5 gap-6 overflow-hidden">
                <div className="md:col-span-2 flex flex-col gap-2 overflow-y-auto pr-2">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">Media Bin & Timeline</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">{clips.map((c, i) => <div key={c.id} onClick={()=>setSelectedClipId(c.id)} className={`p-2 rounded-md flex items-center gap-2 cursor-pointer ${selectedClipId === c.id ? 'bg-brand-primary/20' : ''}`}><span className="font-mono text-xs">{i+1}.</span><p className="text-xs truncate">{c.file.name}</p></div>)}</div>
                        <label htmlFor="client-vid-upload" className="w-full text-center mt-2 py-2 text-sm bg-slate-200 dark:bg-slate-700 rounded-md cursor-pointer">+ Add Videos</label>
                        <input id="client-vid-upload" type="file" multiple className="hidden" accept="video/*" onChange={e => handleFileChange(e, false)} />
                    </div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">Effects Library</h4>
                        <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                            {Object.entries(EFFECT_CATEGORIES).map(([category, effects]) => (
                                <details key={category} open={category === 'Color & Tone'}>
                                    <summary className="font-semibold text-xs cursor-pointer">{category}</summary>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">{effects.map(renderEffectControl)}</div>
                                </details>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="md:col-span-3 bg-slate-200 dark:bg-slate-900/50 rounded-lg border flex items-center justify-center p-2">
                    {!selectedClip ? <p>Select or upload a video to begin editing.</p> :
                        <video key={selectedClip.id} src={selectedClip.url} controls autoPlay loop className="max-w-full max-h-full" style={{
                            filter: `brightness(${selectedClip.effects.Brightness}%) contrast(${selectedClip.effects.Contrast}%) saturate(${selectedClip.effects.Saturation}%) sepia(${selectedClip.effects.Sepia}%) grayscale(${selectedClip.effects['Black and White']}%) invert(${selectedClip.effects.Negative}%) hue-rotate(${selectedClip.effects['Hue Shift']}deg) blur(${selectedClip.effects['Gaussian Blur']}px)`,
                            transform: `rotate(${selectedClip.effects.Rotation}deg) scaleX(${selectedClip.effects.Flip ? -1 : 1})`
                        }}/>
                    }
                 </div>
            </div>
        )}
    </div>
    );
};

export default VideoStudio;