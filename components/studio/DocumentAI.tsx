import React, { useState, useCallback } from 'react';
import { extractTextFromImage, classifyDocument, summarizeText } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

type AnalysisResult = {
    title: string;
    content: string;
};

const DocumentAI: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setExtractedText(null);
            setAnalysisResult(null);
            setError('');
        }
    };

    const handleAction = useCallback(async (action: 'extract' | 'classify' | 'summarize') => {
        if (!imageFile) {
            setError('Please upload a document image first.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);

        try {
            let textToProcess = extractedText;

            // Step 1: Extract text if not already done
            if (!textToProcess) {
                const base64Image = await fileToBase64(imageFile);
                const textResponse = await extractTextFromImage(base64Image, imageFile.type);
                textToProcess = textResponse.text;
                setExtractedText(textToProcess);
                if (action === 'extract') {
                    setAnalysisResult({ title: 'Extracted Text', content: textToProcess });
                    setIsLoading(false);
                    return;
                }
            }
            if (!textToProcess) throw new Error("Could not extract text from the document.");

            // Step 2: Perform the requested action
            let response;
            if (action === 'classify') {
                response = await classifyDocument(textToProcess);
                setAnalysisResult({ title: 'Document Classification', content: response.text });
            } else if (action === 'summarize') {
                response = await summarizeText(textToProcess);
                setAnalysisResult({ title: 'Summary', content: response.text });
            }

        } catch (err: any) {
            setError(`Action failed: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, extractedText]);

    return (
        <div className="p-3 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Document AI</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Upload Document</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {previewUrl ? 
                                    <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-auto object-contain rounded-md" /> :
                                    <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>
                                }
                                <label htmlFor="doc-ai-input" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary">
                                    <span>{imageFile ? "Change document" : "Upload a document image"}</span>
                                    <input id="doc-ai-input" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Choose Action</label>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button onClick={() => handleAction('extract')} disabled={isLoading || !imageFile} className="py-3 px-2 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold text-sm disabled:opacity-50 hover:bg-slate-300 dark:hover:bg-slate-600">Extract Text</button>
                            <button onClick={() => handleAction('classify')} disabled={isLoading || !imageFile} className="py-3 px-2 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold text-sm disabled:opacity-50 hover:bg-slate-300 dark:hover:bg-slate-600">Classify</button>
                            <button onClick={() => handleAction('summarize')} disabled={isLoading || !imageFile} className="py-3 px-2 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold text-sm disabled:opacity-50 hover:bg-slate-300 dark:hover:bg-slate-600">Summarize</button>
                         </div>
                    </div>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <h4 className="flex-shrink-0 font-semibold p-4 border-b border-slate-200 dark:border-slate-700">
                        {analysisResult ? analysisResult.title : 'Result'}
                    </h4>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center"><Spinner /></div>
                        ) : analysisResult ? (
                            <pre className="text-sm whitespace-pre-wrap font-sans">{analysisResult.content}</pre>
                        ) : (
                            <p className="text-slate-600 dark:text-slate-500">Analysis results will appear here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentAI;