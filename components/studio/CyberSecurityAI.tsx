import React, { useState, useCallback } from 'react';
import { analyzeForThreats } from '../../services/geminiService';
import Spinner from '../common/Spinner';

type AnalysisType = 'Code' | 'URL' | 'Text' | 'File';

const CyberSecurityAI: React.FC = () => {
    const [analysisType, setAnalysisType] = useState<AnalysisType>('Code');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [report, setReport] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setContent('');
            setError('');
        }
    };
    
    const resetInputs = (type: AnalysisType) => {
        setAnalysisType(type);
        setContent('');
        setFile(null);
        setError('');
        setReport('');
    };

    const handleSubmit = useCallback(async () => {
        if (analysisType === 'File') {
            if (!file) {
                setError('Please select a file to analyze.');
                return;
            }
        } else {
            if (!content.trim()) {
                setError('Please provide content to analyze.');
                return;
            }
        }

        setIsLoading(true);
        setError('');
        setReport('');

        try {
            let analysisContent = content;
            let analysisFilename: string | undefined;

            if (analysisType === 'File' && file) {
                analysisContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsText(file);
                });
                analysisFilename = file.name;
            }
            
            const response = await analyzeForThreats(analysisContent, analysisType, analysisFilename);
            setReport(response.text);
        } catch (err) {
            console.error('Security analysis failed:', err);
            setError('Failed to perform security analysis. The file might be unreadable or another error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [content, analysisType, file]);
    
    const getPlaceholder = () => {
        switch (analysisType) {
            case 'Code': return 'Paste a code snippet here...';
            case 'URL': return 'Enter a full URL (e.g., https://example.com)...';
            case 'Text': return 'Paste any text, like an email body or a document...';
            case 'File': return '';
        }
    }

    const isSubmitDisabled = isLoading || (analysisType === 'File' ? !file : !content.trim());

    return (
        <div className="p-3 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Cyber Security AI Analyst</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Analysis Type</label>
                        <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1">
                            <button onClick={() => resetInputs('Code')} className={`flex-1 text-sm p-2 rounded ${analysisType === 'Code' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Code</button>
                            <button onClick={() => resetInputs('URL')} className={`flex-1 text-sm p-2 rounded ${analysisType === 'URL' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>URL</button>
                            <button onClick={() => resetInputs('Text')} className={`flex-1 text-sm p-2 rounded ${analysisType === 'Text' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Text</button>
                            <button onClick={() => resetInputs('File')} className={`flex-1 text-sm p-2 rounded ${analysisType === 'File' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>File</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Content to Analyze</label>
                        {analysisType !== 'File' ? (
                            <textarea
                                id="content"
                                rows={12}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary font-mono text-sm"
                                placeholder={getPlaceholder()}
                            />
                        ) : (
                             <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {file ? (
                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                            <p className="font-semibold">{file.name}</p>
                                            <p className="text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                                            <button onClick={() => setFile(null)} className="mt-2 text-xs text-red-500 hover:underline">Remove file</button>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            <div className="flex text-sm text-slate-600 dark:text-slate-400">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-primary px-1">
                                                    <span>Upload a file</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-slate-500">Program files, scripts, documents, etc.</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                     <button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-auto"
                    >
                        {isLoading ? <Spinner/> : 'Analyze for Threats'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col overflow-hidden">
                    <h3 className="font-semibold mb-2 flex-shrink-0">Analysis Report</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none flex-grow overflow-y-auto">
                        {isLoading && <div className="flex justify-center"><Spinner /></div>}
                        {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
                        {report ? (
                            <pre className="whitespace-pre-wrap font-sans">{report}</pre>
                        ) : !isLoading && <p className="text-slate-600 dark:text-slate-500">The security analysis report will appear here.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CyberSecurityAI;