import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideo } from '../../services/geminiService';
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
    "Generating your animation, this can take a few minutes...",
    "Animating pixels frame by frame...",
    "Bringing your creative prompt to life...",
    "Almost there, adding the final loop...",
];

const GifMaker: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
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
                console.error("Error checking for API key:", e);
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
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) };
    }, [isLoading]);

    const handleSelectKey = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            setApiKeySelected(true);
        } catch (e) {
            setError("Failed to open the API key selection dialog.");
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setVideoUrl('');
            setError('');
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please provide a prompt to generate the animation.');
            return;
        }

        setIsLoading(true);
        setVideoUrl('');
        setError('');

        try {
            let imagePayload;
            if (imageFile) {
                const base64Image = await fileToBase64(imageFile);
                imagePayload = { base64: base64Image, mimeType: imageFile.type };
            }

            const animationPrompt = `Create a short, looping, animated GIF-style video of: ${prompt}`;
            const generatedUrl = await generateVideo(animationPrompt, imagePayload);
            setVideoUrl(generatedUrl);
        } catch (err: any) {
            const errorMessage = err.message || 'An unknown error occurred.';
            if (errorMessage.includes('Requested entity was not found')) {
                setError('API Key is invalid or not found. Please select a valid API key.');
                setApiKeySelected(false);
            } else {
                setError(`Failed to generate animation: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, prompt]);

    if (isCheckingApiKey) {
        return <div className="p-6 h-full flex items-center justify-center"><Spinner /></div>;
    }

    if (!apiKeySelected) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold mb-2">API Key Required</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md">Video generation with Veo requires you to select your own API key. Billing is associated with your Google Cloud project.</p>
                <p className="text-sm text-slate-500 mb-4">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">billing documentation</a>.</p>
                <button
                    onClick={handleSelectKey}
                    className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold hover:bg-brand-secondary transition-colors"
                >
                    Select API Key
                </button>
                 {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>}
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">GIF Maker</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                 <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Starting Image (Optional)</label>
                        <div className="mt-1 flex justify-center px-6 py-4 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {previewUrl ? <img src={previewUrl} alt="Preview" className="mx-auto h-24 w-auto object-contain rounded-md" /> : <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>}
                                <label htmlFor="gif-maker-input" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary"><span>{imageFile ? "Change image" : "Upload an image"}</span><input id="gif-maker-input" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} /></label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prompt</label>
                        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" placeholder="e.g., A cat DJing at a party, looping animation." />
                    </div>
                    <button onClick={handleSubmit} disabled={isLoading || !prompt.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">{isLoading ? 'Generating...' : 'Generate Animation'}</button>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
                    {isLoading && <div className="text-center"><Spinner /><p className="mt-4 text-slate-600 dark:text-slate-400">{loadingMessage}</p></div>}
                    {error && !isLoading && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
                    {!isLoading && !videoUrl && !error && <p className="text-slate-600 dark:text-slate-500 text-center">Your animation will appear here.</p>}
                    {videoUrl && !isLoading && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                            <video src={videoUrl} controls autoPlay loop muted playsInline className="max-w-full max-h-[85%] object-contain rounded-md" />
                            <a href={videoUrl} download={`generated_animation.mp4`} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">Download</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GifMaker;