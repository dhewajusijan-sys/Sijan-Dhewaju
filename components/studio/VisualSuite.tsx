
import React, { useState, useCallback, useEffect } from 'react';
import ResumeMaker from './ResumeMaker';
import ThumbnailMaker from './ThumbnailMaker';
import { generateVisualDesign } from '../../services/geminiService';
import Spinner from '../common/Spinner';

// DesignMaker component defined within VisualSuite.tsx
const DesignMaker: React.FC<{ initialData?: string }> = ({ initialData }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [designHtml, setDesignHtml] = useState('');

    useEffect(() => {
        if (initialData) {
            setDesignHtml(initialData);
        }
    }, [initialData]);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please describe the design you want to create.');
            return;
        }
        setIsLoading(true);
        setError('');
        setDesignHtml('');

        try {
            const response = await generateVisualDesign(prompt);
            const parsed = JSON.parse(response.text.trim());
            setDesignHtml(parsed.designHtml);
        } catch (err) {
            console.error('Design generation failed:', err);
            setError('Failed to generate design. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Describe your design</label>
                        <textarea
                            rows={5}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="e.g., A modern, minimalist webpage header with a logo on the left and navigation links on the right."
                            className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto"
                    >
                        {isLoading ? <Spinner /> : 'Generate Design'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                     <div className="flex-shrink-0 p-2 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Live Preview</h4>
                    </div>
                    {isLoading ? (
                        <div className="flex-grow flex items-center justify-center"><Spinner /></div>
                    ) : designHtml ? (
                        <iframe srcDoc={designHtml} title="Design Preview" className="w-full h-full bg-white" />
                    ) : (
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-slate-600 dark:text-slate-500">Your design will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


interface VisualSuiteProps {
  initialData?: {
    subToolId: string;
    data: any;
  } | null;
}

const VisualSuite: React.FC<VisualSuiteProps> = ({ initialData }) => {
    const [activeTool, setActiveTool] = useState('design');
    const [toolData, setToolData] = useState<any>(null);

    useEffect(() => {
        if (initialData) {
            setActiveTool(initialData.subToolId);
            setToolData(initialData.data);
        }
    }, [initialData]);

    const renderTool = () => {
        switch (activeTool) {
            case 'design': return <DesignMaker initialData={toolData} />;
            case 'resume': return <ResumeMaker initialData={toolData} />;
            case 'thumbnail': return <ThumbnailMaker initialData={toolData} />;
            default: return null;
        }
    };
    
    const TABS = [
        { id: 'design', name: 'Design Generator' },
        { id: 'resume', name: 'Resume Maker' },
        { id: 'thumbnail', name: 'Thumbnail Maker' },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTool(tabId);
        setToolData(null); // Clear data when switching tabs manually
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`${
                                activeTool === tab.id
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow overflow-hidden">
                {renderTool()}
            </div>
        </div>
    );
};

export default VisualSuite;
