import React, { useState, useCallback } from 'react';
import { runWebSearch } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const AGENT_TASKS = [
  { id: 'general-question', name: 'General Question', description: 'Ask any question to get web-grounded answers.', placeholder: 'e.g., Latest advancements in AI-powered drug discovery' },
  { id: 'summarize-url', name: 'Summarize URL', description: 'Get a concise summary of a webpage\'s content.', placeholder: 'https://example.com/article' },
  { id: 'company-funding', name: 'Company Funding', description: 'Find the latest funding info for a company.', placeholder: 'e.g., OpenAI' },
  { id: 'find-research', name: 'Find Research', description: 'Identify relevant academic papers on a topic.', placeholder: 'e.g., Large Language Models in healthcare' },
  { id: 'generate-report', name: 'Generate Report', description: 'Synthesize web info into a brief report.', placeholder: 'e.g., A market analysis of the EV industry' },
];

const ResearchTool: React.FC = () => {
    const [activeTaskId, setActiveTaskId] = useState(AGENT_TASKS[0].id);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [response, setResponse] = useState('');
    const [sources, setSources] = useState<any[]>([]);
    
    const activeTask = AGENT_TASKS.find(t => t.id === activeTaskId);

    const handleSubmit = useCallback(async () => {
        if (!query.trim()) {
            setError('Please enter a query.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResponse('');
        setSources([]);

        let finalPrompt = '';
        switch(activeTaskId) {
            case 'general-question':
                finalPrompt = query;
                break;
            case 'summarize-url':
                finalPrompt = `Summarize the content of the webpage at this URL: ${query}`;
                break;
            case 'company-funding':
                finalPrompt = `Find the latest funding round information for the company "${query}". Include the amount, date, and lead investors if available.`;
                break;
            case 'find-research':
                finalPrompt = `Find and list up to 5 recent and relevant research articles or academic papers on the topic: "${query}". Provide titles, authors, and links if possible.`;
                break;
            case 'generate-report':
                finalPrompt = `Generate a brief report on the following topic by synthesizing information from the web: "${query}". The report should include an introduction, key findings, and a conclusion.`;
                break;
            default:
                finalPrompt = query;
        }

        try {
            const result = await runWebSearch(finalPrompt);
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
    }, [query, activeTaskId]);

    return (
        <div className="p-3 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">AI Web Agent</h3>
            <div className='mb-4'>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Choose a Task</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {AGENT_TASKS.map(task => (
                        <button key={task.id} onClick={() => { setActiveTaskId(task.id); setQuery(''); }} className={`p-2 text-left rounded-md transition-colors text-xs ${activeTaskId === task.id ? 'bg-brand-primary/20 ring-2 ring-brand-primary' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <p className="font-semibold">{task.name}</p>
                            <p className="text-slate-600 dark:text-slate-400">{task.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder={activeTask?.placeholder || 'Enter your query...'}
                    className="flex-grow bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !query.trim()}
                    className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner/> : 'Run Agent'}
                </button>
            </div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex-grow bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
                {isLoading && <div className="flex justify-center"><Spinner /></div>}
                {!isLoading && !response && <p className="text-slate-500">Your research results will appear here.</p>}
                {response && (
                    <div className="prose dark:prose-invert prose-sm max-w-none">
                        <p>{response}</p>
                        {sources && sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sources:</h4>
                                <ul className="text-xs space-y-1 list-none p-0">
                                    {sources.map((source, i) => source.web && (
                                        <li key={i} className="p-0">
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all no-underline">
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