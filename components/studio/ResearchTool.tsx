import React, { useState, useCallback } from 'react';
import { runWebSearch } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const ResearchTool: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [response, setResponse] = useState('');
    const [sources, setSources] = useState<any[]>([]);

    const handleSubmit = useCallback(async () => {
        if (!query.trim()) {
            setError('Please enter a research query.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResponse('');
        setSources([]);
        try {
            const result = await runWebSearch(query);
            setResponse(result.text);
            if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                setSources(result.candidates[0].groundingMetadata.groundingChunks);
            }
        } catch (err) {
            console.error('Web search failed:', err);
            setError('Failed to perform web search. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Web Researcher</h3>
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="e.g., Latest advancements in AI-powered drug discovery"
                    className="flex-grow bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !query.trim()}
                    className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner/> : 'Search'}
                </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex-grow bg-slate-900/50 rounded-lg border border-slate-700 p-4 overflow-y-auto">
                {isLoading && <div className="flex justify-center"><Spinner /></div>}
                {!isLoading && !response && <p className="text-slate-500">Your research results will appear here.</p>}
                {response && (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p>{response}</p>
                        {sources && sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-600">
                                <h4 className="text-sm font-bold text-slate-300 mb-2">Sources:</h4>
                                <ul className="text-xs space-y-1 list-none p-0">
                                    {sources.map((source, i) => source.web && (
                                        <li key={i} className="p-0">
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all no-underline">
                                                {i + 1}. {source.web.title || source.web.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchTool;
