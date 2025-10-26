import React, { useState, useCallback } from 'react';
import { runDataAnalysis } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const DataLab: React.FC = () => {
    const [dataFile, setDataFile] = useState<File | null>(null);
    const [code, setCode] = useState("import pandas as pd\n\n# The CSV is loaded into a DataFrame named 'df'.\n# You can perform any pandas operations.\n\ndf.head()");
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setDataFile(file);
            setError('');
        } else {
            setDataFile(null);
            setError('Please upload a valid .csv file.');
        }
    };

    const handleRunAnalysis = useCallback(async () => {
        if (!dataFile) {
            setError('Please upload a CSV file first.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult('');

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const csvContent = event.target?.result as string;
                    // Send only a snippet to avoid large payloads
                    const csvSnippet = csvContent.split('\n').slice(0, 20).join('\n');
                    
                    const response = await runDataAnalysis(csvSnippet, code);
                    setResult(response.text);
                } catch (err: any) {
                    setError(`Analysis failed: ${err.message || 'An unknown error occurred.'}`);
                } finally {
                    setIsLoading(false);
                }
            };
            reader.onerror = () => {
                setError('Failed to read the file.');
                setIsLoading(false);
            };
            reader.readAsText(dataFile);
        } catch (err) {
            setError('An error occurred while preparing the analysis.');
            setIsLoading(false);
        }
    }, [dataFile, code]);

    return (
        <div className="p-3 h-full flex flex-col bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-200">
            <h3 className="text-xl font-bold mb-4">Data Lab</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Upload Data</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {dataFile ? (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Loaded: {dataFile.name}</p>
                                ) : (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Upload a CSV file</p>
                                )}
                                <label htmlFor="csv-upload" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary">
                                    <span>{dataFile ? "Change file" : "Select file"}</span>
                                    <input id="csv-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Write Python (pandas)</label>
                        <div className="font-mono text-sm border border-slate-300 dark:border-slate-700 rounded-md h-64">
                            <textarea
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full h-full bg-slate-100 dark:bg-slate-800/50 p-2 rounded-md resize-none"
                                placeholder="Write your pandas code here..."
                                spellCheck="false"
                            />
                        </div>
                    </div>
                    <button onClick={handleRunAnalysis} disabled={isLoading || !dataFile} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
                        {isLoading ? <Spinner /> : 'Run Analysis'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <h4 className="flex-shrink-0 font-semibold p-4 border-b border-slate-200 dark:border-slate-700">Output</h4>
                    <div className="flex-grow p-4 overflow-auto">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center"><Spinner /></div>
                        ) : result ? (
                            <pre className="text-sm">{result}</pre>
                        ) : (
                            <p className="text-slate-600 dark:text-slate-500">Analysis output will appear here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataLab;