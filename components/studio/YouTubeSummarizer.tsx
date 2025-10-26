
import React, { useState, useCallback } from 'react';
import { summarizeYouTubeVideo } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const TASKS = [
    { id: 'summary', name: 'Key Ideas' },
    { id: 'timestamps', name: 'Timestamps' },
    { id: 'comments', name: 'Comment Insights' },
    { id: 'transcript', name: 'Full Transcript' },
];

const LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Japanese', 'Mandarin Chinese', 'Hindi'
];

const YouTubeSummarizer: React.FC = () => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState('');
    const [sources, setSources] = useState<any[]>([]);
    const [activeTask, setActiveTask] = useState(TASKS[0].id);
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [copied, setCopied] = useState(false);

    const handleSubmit = useCallback(async () => {
        if (!url.trim() || !url.includes('youtube.com') && !url.includes('youtu.be')) {
            setError('Please enter a valid YouTube URL.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResult('');
        setSources([]);
        try {
            const response = await summarizeYouTubeVideo(url, activeTask, language);
            setResult(response.text);
            if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                setSources(response.candidates[0].groundingMetadata.groundingChunks);
            }
        } catch (err) {
            console.error('YouTube summarization failed:', err);
            setError('Failed to get insights for this video. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [url, activeTask, language]);

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">YouTube Video Insights</h3>
            <div className="flex-grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-300 mb-1">1. YouTube URL</label>
                        <input
                            id="youtube-url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste a YouTube video link here..."
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">2. Select Task</label>
                        <div className="flex bg-slate-700/50 rounded-md p-1 flex-wrap">
                            {TASKS.map(task => (
                                <button key={task.id} onClick={() => setActiveTask(task.id)} className={`flex-1 text-xs sm:text-sm p-2 rounded ${activeTask === task.id ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>
                                    {task.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-1">3. Output Language</label>
                        <select
                            id="language-select"
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !url.trim()}
                        className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-auto"
                    >
                        {isLoading ? <Spinner/> : 'Get Insights'}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 flex-shrink-0 flex justify-between items-center border-b border-slate-700">
                        <h4 className="font-semibold">{TASKS.find(t => t.id === activeTask)?.name || 'Result'}</h4>
                        <button onClick={handleCopy} disabled={!result} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-50">
                            {copied ? (
                                <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {isLoading && <div className="flex justify-center"><Spinner /></div>}
                        {!isLoading && !result && <p className="text-slate-500">The video insights will appear here.</p>}
                        {result && (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <pre className="font-sans whitespace-pre-wrap">{result}</pre>
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
            </div>
        </div>
    );
};

export default YouTubeSummarizer;