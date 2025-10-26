
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateProVideo, extendVideo, pollVideoOperation, getVideoObjectUrlFromOperation } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const LOADING_MESSAGES = [
    "Generating your video, this can take a few minutes...",
    "Warming up the digital director's chair...",
    "Rendering pixels into motion...",
    "Almost there, adding the final touches...",
];

interface ReferenceImage {
    file: File;
    base64: string;
    previewUrl: string;
}

const VideoEditor: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [extensionPrompt, setExtensionPrompt] = useState('');
    
    const [operations, setOperations] = useState<any[]>([]);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        const checkApiKey = async () => {
            try {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            } catch (e) {
                setApiKeySelected(false);
            } finally {
                setIsCheckingApiKey(false);
            }
        };
        checkApiKey();
    }, []);

    useEffect(() => {
        if (isLoading) {
            intervalRef.current = window.setInterval(() => {
                setLoadingMessage(prev => LOADING_MESSAGES[(LOADING_MESSAGES.indexOf(prev) + 1) % LOADING_MESSAGES.length]);
            }, 5000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLoading]);

    const handleSelectKey = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            setApiKeySelected(true);
        } catch (e) {
            setError("Failed to open API key selection.");
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages: ReferenceImage[] = [];
            const limit = Math.min(files.length, 3 - referenceImages.length);
            for (let i = 0; i < limit; i++) {
                const file = files[i];
                if (file) {
                    const base64 = await fileToBase64(file);
                    newImages.push({ file, base64, previewUrl: URL.createObjectURL(file) });
                }
            }
            if (newImages.length > 0) {
                setReferenceImages(prev => [...prev, ...newImages]);
            }
        }
    };

    const removeImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    const runPolling = async (initialOperation: any) => {
        let operation = initialOperation;
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await pollVideoOperation(operation);
        }
        return operation;
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) { setError('Please provide a prompt.'); return; }
        if (referenceImages.length === 0) { setError('Please provide at least one reference image.'); return; }

        setIsLoading(true);
        setError('');
        setOperations([]);
        setVideoUrls([]);

        try {
            const imagePayloads = referenceImages.map(img => ({ base64: img.base64, mimeType: img.file.type }));
            const initialOp = await generateProVideo(prompt, imagePayloads);
            const finalOp = await runPolling(initialOp);
            
            const url = await getVideoObjectUrlFromOperation(finalOp);
            setOperations([finalOp]);
            setVideoUrls([url]);
        } catch (err: any) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, referenceImages]);

    const handleExtend = useCallback(async () => {
        if (!extensionPrompt.trim() || operations.length === 0) return;
        
        setIsLoading(true);
        setError('');

        try {
            const lastOp = operations[operations.length - 1];
            const previousVideo = lastOp.response?.generatedVideos?.[0]?.video;
            const aspectRatio = lastOp.response?.generatedVideos?.[0]?.aspectRatio;
            if (!previousVideo) throw new Error("Could not find video data in previous operation.");

            const initialOp = await extendVideo(extensionPrompt, previousVideo, aspectRatio);
            const finalOp = await runPolling(initialOp);
            
            const url = await getVideoObjectUrlFromOperation(finalOp);
            setOperations(prev => [...prev, finalOp]);
            setVideoUrls(prev => [...prev, url]);
            setExtensionPrompt('');
        } catch (err: any) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [extensionPrompt, operations]);

    const handleApiError = (err: any) => {
        const errorMessage = err.message || 'An unknown error occurred.';
        if (errorMessage.includes('Requested entity was not found')) {
            setError('API Key is invalid or not found. Please select a valid API key.');
            setApiKeySelected(false);
        } else {
            setError(`Failed to process video: ${errorMessage}`);
        }
    };

    if (isCheckingApiKey) return <div className="p-6 h-full flex items-center justify-center"><Spinner /></div>;
    if (!apiKeySelected) return (
        <div className="p-6 h-full flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold mb-2">API Key Required</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md">Pro video editing requires your own API key. Billing is associated with your Google Cloud project.</p>
            <p className="text-sm text-slate-500 mb-4"><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Billing documentation</a>.</p>
            <button onClick={handleSelectKey} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold hover:bg-brand-secondary transition-colors">Select API Key</button>
            {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>}
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Pro Video Editor</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <h4 className="font-semibold text-lg">1. Generate Base Video</h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reference Images (up to 3)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {referenceImages.map((img, i) => (
                                <div key={i} className="relative"><img src={img.previewUrl} className="w-full h-24 object-cover rounded-md" /><button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 rounded-full text-white">&times;</button></div>
                            ))}
                            {referenceImages.length < 3 && <label htmlFor="ref-img-upload" className="w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md flex items-center justify-center cursor-pointer hover:border-brand-primary"><div>+ Add</div></label>}
                        </div>
                        <input id="ref-img-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prompt</label><textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A video of this character in this environment." className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" /></div>
                    <button onClick={handleGenerate} disabled={isLoading || referenceImages.length === 0} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isLoading && operations.length === 0 ? <Spinner/> : 'Generate Video'}</button>
                    
                    {operations.length > 0 && (
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold text-lg">2. Extend Video</h4>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Extension Prompt</label><textarea rows={2} value={extensionPrompt} onChange={e => setExtensionPrompt(e.target.value)} placeholder="e.g., ...then something unexpected happens." className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" /></div>
                            <button onClick={handleExtend} disabled={isLoading} className="w-full mt-2 py-2 px-4 bg-brand-secondary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isLoading ? <Spinner/> : 'Extend'}</button>
                        </div>
                    )}
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
                    {isLoading && <div className="text-center"><Spinner /><p className="mt-4 text-slate-600 dark:text-slate-400">{loadingMessage}</p></div>}
                    {error && !isLoading && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
                    {!isLoading && videoUrls.length === 0 && !error && <p className="text-slate-600 dark:text-slate-500 text-center">Your generated video will appear here.</p>}
                    {videoUrls.length > 0 && !isLoading && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <video key={videoUrls[videoUrls.length - 1]} src={videoUrls[videoUrls.length - 1]} controls autoPlay loop className="max-w-full max-h-[70%] object-contain rounded-md" />
                            <div className="text-sm">Sequence: {videoUrls.map((_, i) => <span key={i} className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md mr-1">Part {i+1}</span>)}</div>
                            <a href={videoUrls[videoUrls.length - 1]} download={`video_part_${videoUrls.length}.mp4`} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">Download Last Part</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoEditor;
