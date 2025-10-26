import React, { useState, useCallback } from 'react';
import { runFacialAnalysis } from '../../services/geminiService';
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

const TASKS = [
    { id: 'detect-faces', name: 'Detect Faces', description: 'Draw bounding boxes around faces.' },
    { id: 'analyze-attributes', name: 'Analyze Attributes', description: 'Estimate age, gender, and emotion.' },
    { id: 'extract-features', name: 'Extract Features', description: 'Describe facial features in text.' },
    { id: 'identify-person', name: 'Identify Public Figure', description: 'Identify a celebrity or public figure.' },
    { id: 'reverse-face-search', name: 'Reverse Face Search', description: 'Find similar images on the web.' },
];

const FaceAnalyzer: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [activeTaskId, setActiveTaskId] = useState(TASKS[0].id);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<any | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError('');
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!imageFile) {
            setError('Please upload an image to analyze.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const base64Image = await fileToBase64(imageFile);
            const analysisResult = await runFacialAnalysis(base64Image, imageFile.type, activeTaskId);
            setResult(analysisResult);
        } catch (err: any) {
            console.error('Facial analysis failed:', err);
            setError(`Analysis failed: ${err.message || "Please try again."}`);
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, activeTaskId]);

    const renderResult = () => {
        if (!result) return <p className="text-slate-600 dark:text-slate-500">Analysis results will appear here.</p>;
        switch (result.type) {
            case 'image':
                return <img src={`data:${result.mimeType};base64,${result.data}`} alt="Analysis result" className="max-w-full max-h-full object-contain rounded-md" />;
            case 'json':
            case 'reverse-search':
                return <CodeBlock language="json" code={JSON.stringify(result.data, null, 2)} />;
            case 'text':
                return <pre className="whitespace-pre-wrap font-sans text-sm">{result.data}</pre>;
            case 'text-with-sources':
                return (
                    <div>
                        <pre className="whitespace-pre-wrap font-sans text-sm">{result.data.text}</pre>
                        {result.data.sources && result.data.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-sm font-bold mb-2">Sources:</h4>
                                <ul className="text-xs space-y-1">
                                    {result.data.sources.map((source: any, i: number) => source.web && (
                                        <li key={i}>
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline break-all">
                                                {i + 1}. {source.web.title || source.web.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            default:
                return <p className="text-red-500">Unknown result format.</p>;
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Face Analyzer</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Upload Image</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {previewUrl ? 
                                    <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-auto object-contain rounded-md" /> :
                                    <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>
                                }
                                <label htmlFor="face-analyzer-input" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary"><span>{imageFile ? "Change image" : "Upload an image"}</span><input id="face-analyzer-input" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} /></label>
                            </div>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Choose Analysis Task</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TASKS.map(task => (
                                <button key={task.id} onClick={() => setActiveTaskId(task.id)} className={`p-3 text-left rounded-md transition-colors text-sm ${activeTaskId === task.id ? 'bg-brand-primary/20 ring-2 ring-brand-primary' : 'bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                                    <p className="font-semibold">{task.name}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{task.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={isLoading || !imageFile} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
                        {isLoading ? <Spinner /> : 'Analyze Image'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col overflow-hidden">
                    <h3 className="font-semibold mb-2 flex-shrink-0">Analysis Result</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none flex-grow overflow-y-auto">
                        {isLoading ? <div className="flex justify-center"><Spinner /></div> : renderResult()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceAnalyzer;
