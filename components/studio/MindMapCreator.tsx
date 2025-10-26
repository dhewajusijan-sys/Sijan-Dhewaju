
import React, { useState, useCallback } from 'react';
import { generateMindMap, getMindMapSuggestions } from '../../services/geminiService';
import Spinner from '../common/Spinner';

type GenerationMode = 'topic' | 'text';

const MindMapCreator: React.FC = () => {
    const [generationMode, setGenerationMode] = useState<GenerationMode>('topic');
    const [sourceInput, setSourceInput] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState('');

    const [mindMapContent, setMindMapContent] = useState('');
    const [copilotPrompt, setCopilotPrompt] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleGenerate = useCallback(async () => {
        if (!sourceInput.trim()) {
            setError(`Please enter a ${generationMode} to generate the mind map from.`);
            return;
        }

        setIsLoading(true);
        setError('');
        setMindMapContent('');
        setSuggestions([]);

        try {
            const response = await generateMindMap(sourceInput, generationMode);
            setMindMapContent(response.text);
        } catch (err) {
            console.error('Mind map generation failed:', err);
            setError('Failed to generate the mind map. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [sourceInput, generationMode]);

    const handleGetSuggestions = useCallback(async () => {
        if (!copilotPrompt.trim() || !mindMapContent.trim()) {
            return;
        }
        setIsSuggesting(true);
        setSuggestions([]);
        try {
            const response = await getMindMapSuggestions(mindMapContent, copilotPrompt);
            // Split suggestions by newline and filter out empty lines/numbers
            const suggestionLines = response.text.split('\n').filter(line => line.trim());
            setSuggestions(suggestionLines);
        } catch (err) {
            console.error('Failed to get suggestions:', err);
            setError('Failed to get suggestions.');
        } finally {
            setIsSuggesting(false);
        }
    }, [mindMapContent, copilotPrompt]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Mind Map Creator</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">1. Generation Mode</label>
                        <div className="flex bg-slate-700/50 rounded-md p-1">
                            <button onClick={() => setGenerationMode('topic')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'topic' ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>From Topic</button>
                            <button onClick={() => setGenerationMode('text')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'text' ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>From Text</button>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="source-input" className="block text-sm font-medium text-slate-300 mb-1">2. {generationMode === 'topic' ? 'Topic' : 'Source Text'}</label>
                        <textarea
                            id="source-input"
                            rows={generationMode === 'topic' ? 2 : 8}
                            value={sourceInput}
                            onChange={(e) => setSourceInput(e.target.value)}
                            placeholder={generationMode === 'topic' ? 'e.g., The Future of Artificial Intelligence' : 'Paste your text here...'}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2"
                        />
                    </div>
                    
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceInput.trim()}
                        className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 flex justify-center"
                    >
                        {isLoading ? <Spinner/> : 'Generate Mind Map'}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                    {mindMapContent && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="font-semibold text-slate-300 mb-2">3. Copilot: Expand Your Map</h4>
                            <textarea
                                rows={2}
                                value={copilotPrompt}
                                onChange={e => setCopilotPrompt(e.target.value)}
                                placeholder="e.g., Add a section about ethics"
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2"
                            />
                            <button
                                onClick={handleGetSuggestions}
                                disabled={isSuggesting || !copilotPrompt.trim()}
                                className="w-full mt-2 py-2 px-4 bg-brand-secondary text-white rounded-md font-semibold disabled:bg-slate-600 flex justify-center"
                            >
                                {isSuggesting ? <Spinner/> : 'Get Suggestions'}
                            </button>
                            {suggestions.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {suggestions.map((s, i) => <p key={i} className="text-xs p-1 bg-slate-700/50 rounded">{s}</p>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 overflow-y-auto">
                    <h3 className="font-semibold mb-2">Mind Map</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                        {isLoading ? <div className="flex justify-center"><Spinner /></div> : 
                        mindMapContent ? <pre className="whitespace-pre-wrap font-sans">{mindMapContent}</pre> : 
                        <p className="text-slate-500">Your mind map will appear here.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MindMapCreator;
