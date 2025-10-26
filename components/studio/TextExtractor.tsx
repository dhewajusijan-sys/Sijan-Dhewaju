import React, { useState, useCallback, useRef, useEffect } from 'react';
import { extractTextFromDocument, TextExtractorConfig } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import CodeBlock from '../common/CodeBlock';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const LANGUAGES = [ "English", "Nepali", "Hindi", "Spanish", "French", "German", "Japanese", "Chinese", "Arabic", "Russian"];

const TextExtractor: React.FC = () => {
    const [inputMode, setInputMode] = useState<'file' | 'camera'>('file');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('raw');

    // Camera state
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [isFacingModeSupported, setIsFacingModeSupported] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const [config, setConfig] = useState<TextExtractorConfig>({
        ocr: true,
        handwriting: false,
        multiLanguage: 'English',
        extractKeyValuePairs: true,
        identifyDocumentStructure: true,
        extractTables: true,
        contextualUnderstanding: true,
        performImagePreprocessing: true,
        includeConfidenceScore: true,
    });

    useEffect(() => {
        if (navigator.mediaDevices?.getSupportedConstraints) {
            setIsFacingModeSupported(!!navigator.mediaDevices.getSupportedConstraints().facingMode);
        }
    }, []);
    
    // --- Camera Logic ---
    const stopCamera = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsCameraOn(false);
    }, []);

    const startCamera = useCallback(async (mode: 'user' | 'environment') => {
        // Stop any existing stream before starting a new one
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                 videoRef.current.style.transform = mode === 'user' ? 'scaleX(-1)' : 'none';
            }
            setIsCameraOn(true);
            setError('');
        } catch (err) {
            setError("Could not access camera. Please check permissions.");
            setIsCameraOn(false);
        }
    }, []);
    
    const handleToggleCamera = useCallback(() => {
        if (isCameraOn) {
            stopCamera();
        } else {
            startCamera(facingMode);
        }
    }, [isCameraOn, startCamera, stopCamera, facingMode]);

    const handleSwitchCamera = useCallback(() => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        if (isCameraOn) {
            startCamera(newMode);
        }
    }, [facingMode, isCameraOn, startCamera]);

    // Cleanup effects
    useEffect(() => {
        if (inputMode !== 'camera' && isCameraOn) {
            stopCamera();
        }
    }, [inputMode, isCameraOn, stopCamera]);

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError('');
        }
    };

    const handleConfigChange = (key: keyof TextExtractorConfig, value: boolean | string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = useCallback(async () => {
        setIsLoading(true);
        setResult(null);
        setError('');

        let base64Image: string;
        let mimeType: string = 'image/jpeg';

        try {
            if (inputMode === 'file') {
                if (!imageFile) {
                    setError('Please upload an image of the document.');
                    setIsLoading(false);
                    return;
                }
                base64Image = await fileToBase64(imageFile);
                mimeType = imageFile.type;
            } else { // camera mode
                if (!videoRef.current || !canvasRef.current || !isCameraOn) {
                    setError('Camera is not active.');
                    setIsLoading(false);
                    return;
                }
                const video = videoRef.current;
                const canvas = canvasRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Canvas context is not available.");
                
                // Flip context if camera is user-facing to capture un-mirrored image
                if (facingMode === 'user') {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }
                
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
            }
            
            const response = await extractTextFromDocument(base64Image, mimeType, config);
            const parsedResult = JSON.parse(response.text);
            setResult(parsedResult);
            setActiveTab('raw');
        } catch (err: any) {
            console.error('Text extraction failed:', err);
            setError(`Extraction failed: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, config, inputMode, isCameraOn, facingMode]);

    const FeatureToggle: React.FC<{ label: string; description: string; configKey: keyof TextExtractorConfig; comingSoon?: boolean;}> = ({ label, description, configKey, comingSoon }) => (
        <label className={`p-2 bg-slate-100 dark:bg-slate-800/50 rounded-md flex items-start gap-3 ${comingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={!!config[configKey]} onChange={e => handleConfigChange(configKey, e.target.checked)} disabled={comingSoon} className="mt-1 h-4 w-4 text-brand-primary bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-primary" />
            <div>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{label} {comingSoon && <span className="text-xs">(Soon)</span>}</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
            </div>
        </label>
    );

    const renderResult = () => {
        if (!result) return null;
        switch (activeTab) {
            case 'raw': return <pre className="whitespace-pre-wrap font-sans text-sm">{result.rawText || 'No raw text extracted.'}</pre>;
            // Fix: Complete the `renderResult` function which was truncated, causing a syntax error.
            case 'kvp': return <CodeBlock language="json" code={JSON.stringify(result.keyValuePairs || [], null, 2)} />;
            case 'tables': return <CodeBlock language="json" code={JSON.stringify(result.tables || [], null, 2)} />;
            case 'structure': return <CodeBlock language="json" code={JSON.stringify(result.documentStructure || {}, null, 2)} />;
            default: return null;
        }
    };

    return (
        <div className="p-3 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Text Extractor AI</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                {/* Left Panel: Controls */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Input Source</label>
                        <div className="flex bg-slate-200 dark:bg-slate-800 rounded-md p-1">
                            <button onClick={() => setInputMode('file')} className={`flex-1 text-sm p-2 rounded ${inputMode === 'file' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>File Upload</button>
                            <button onClick={() => setInputMode('camera')} className={`flex-1 text-sm p-2 rounded ${inputMode === 'camera' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Live Camera</button>
                        </div>
                    </div>

                    {inputMode === 'file' ? (
                        <div>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {previewUrl ? <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-auto object-contain rounded-md" /> : <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>}
                                    <label htmlFor="extractor-input" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary"><span>{imageFile ? "Change file" : "Upload an image"}</span><input id="extractor-input" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} /></label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                                <button onClick={handleToggleCamera} className="py-2 px-4 bg-black/50 text-white rounded-md font-semibold text-sm">{isCameraOn ? 'Stop Camera' : 'Start Camera'}</button>
                                {isCameraOn && isFacingModeSupported && <button onClick={handleSwitchCamera} className="py-2 px-4 bg-black/50 text-white rounded-md font-semibold text-sm">Switch</button>}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Extraction Config</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <FeatureToggle label="Printed Text (OCR)" description="Recognize standard printed characters." configKey="ocr" />
                            <FeatureToggle label="Handwriting (ICR)" description="Recognize handwritten text." configKey="handwriting" />
                            <FeatureToggle label="Key-Value Pairs" description="Extract form fields and values." configKey="extractKeyValuePairs" />
                            <FeatureToggle label="Tables" description="Extract structured table data." configKey="extractTables" />
                            <FeatureToggle label="Document Structure" description="Identify headers, footers, etc." configKey="identifyDocumentStructure" />
                            <FeatureToggle label="Contextual Understanding" description="Interpret data, don't just extract." configKey="contextualUnderstanding" />
                            <FeatureToggle label="Image Pre-processing" description="Correct for skew and orientation." configKey="performImagePreprocessing" />
                            <FeatureToggle label="Confidence Score" description="Include confidence for extractions." configKey="includeConfidenceScore" />
                        </div>
                        <div className="mt-2">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-400">Language Hint</label>
                            <select value={config.multiLanguage} onChange={e => handleConfigChange('multiLanguage', e.target.value)} className="w-full text-sm mt-1 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600">
                                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={handleSubmit} disabled={isLoading || (inputMode === 'file' && !imageFile) || (inputMode === 'camera' && !isCameraOn)} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
                        {isLoading ? <Spinner /> : 'Extract Data'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>

                {/* Right Panel: Results */}
                <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex space-x-2 p-2 overflow-x-auto">
                            <button onClick={() => setActiveTab('raw')} className={`text-xs px-3 py-1 rounded-md ${activeTab === 'raw' ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Raw Text</button>
                            <button onClick={() => setActiveTab('kvp')} className={`text-xs px-3 py-1 rounded-md ${activeTab === 'kvp' ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Key-Value</button>
                            <button onClick={() => setActiveTab('tables')} className={`text-xs px-3 py-1 rounded-md ${activeTab === 'tables' ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Tables</button>
                            <button onClick={() => setActiveTab('structure')} className={`text-xs px-3 py-1 rounded-md ${activeTab === 'structure' ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Structure</button>
                        </div>
                    </div>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {isLoading ? <div className="h-full flex items-center justify-center"><Spinner /></div> : result ? renderResult() : <p className="text-slate-600 dark:text-slate-500">Extraction results will appear here.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TextExtractor;
