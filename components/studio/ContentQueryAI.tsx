import React, { useState, useCallback, useRef } from 'react';
import { queryGroundedContent } from '../../services/geminiService';
import type { Source } from '../../types';
import Spinner from '../common/Spinner';

const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

const ContentQueryAI: React.FC = () => {
    const [sources, setSources] = useState<Source[]>([]);
    const [sourceInput, setSourceInput] = useState('');
    const [sourceType, setSourceType] = useState<'text' | 'url' | 'topic'>('text');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [qnaMessages, setQnaMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [qnaInput, setQnaInput] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let type: Source['type'] = 'text';
        if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type === 'application/pdf') type = 'pdf';
        
        let content = `[Content of ${type.toUpperCase()} file: ${file.name}]`;
        if (file.type.startsWith('text/')) {
            content = await fileToText(file);
        }

        const newSource: Source = { id: `source-${Date.now()}`, type, content, name: file.name };
        setSources(prev => [...prev, newSource]);
    };

    const handleAddSource = () => {
        if (!sourceInput.trim()) return;
        let finalInput = sourceInput;
        if (sourceType === 'url' && !/^(https?:\/\/)/.test(finalInput)) finalInput = 'https://' + finalInput;
        const newSource: Source = {
            id: `source-${Date.now()}`, type: sourceType, content: finalInput,
            name: sourceType === 'text' ? `Text Snippet` : sourceType === 'url' ? new URL(finalInput).hostname : `Topic: ${finalInput}`
        };
        setSources(prev => [...prev, newSource]);
        setSourceInput('');
    };
    
    const removeSource = (id: string) => setSources(prev => prev.filter(s => s.id !== id));
    
    const handleQnASend = async () => {
        if (!qnaInput.trim() || sources.length === 0) return;
        const newUserMessage = { role: 'user' as const, content: qnaInput };
        setQnaMessages(prev => [...prev, newUserMessage]);
        setQnaInput('');
        setIsLoading(true);
        setError('');
        try {
            const response = await queryGroundedContent(sources, qnaInput);
            setQnaMessages(prev => [...prev, { role: 'model', content: response.text }]);
        } catch (err) { 
            setError('Failed to get an answer.'); 
            setQnaMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error.' }]);
        }
        finally { setIsLoading(false); }
    };

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [qnaMessages]);


    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Content Query AI</h3>
            <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">Content Sources</h4>
                    <div className="flex-grow p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-900/30 space-y-2 min-h-[150px]">{sources.map(s => <div key={s.id} className="p-2 bg-white dark:bg-slate-800 rounded-md flex items-center gap-2 text-sm"><span className="flex-grow truncate" title={s.name}>{s.name}</span><button onClick={() => removeSource(s.id)} className="text-slate-500 hover:text-red-500 flex-shrink-0">&times;</button></div>)}</div>
                    <div>
                        <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1"><button onClick={() => setSourceType('text')} className={`flex-1 text-sm p-1 rounded ${sourceType === 'text' ? 'bg-white dark:bg-slate-600' : ''}`}>Text</button><button onClick={() => setSourceType('url')} className={`flex-1 text-sm p-1 rounded ${sourceType === 'url' ? 'bg-white dark:bg-slate-600' : ''}`}>URL</button><button onClick={() => setSourceType('topic')} className={`flex-1 text-sm p-1 rounded ${sourceType === 'topic' ? 'bg-white dark:bg-slate-600' : ''}`}>Topic</button></div>
                        <textarea value={sourceInput} onChange={e => setSourceInput(e.target.value)} rows={2} placeholder={sourceType === 'text' ? 'Paste...' : sourceType === 'url' ? 'https://...' : 'Research...'} className="w-full mt-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 p-2 rounded-md" />
                        <button onClick={handleAddSource} className="w-full py-1.5 text-sm bg-brand-secondary text-white rounded-md">Add Source</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,audio/*,video/*,text/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold text-sm">Upload File</button>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <h4 className="flex-shrink-0 font-semibold p-4 border-b border-slate-200 dark:border-slate-700">Q&A</h4>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {sources.length === 0 ? 
                            <p className="text-center text-slate-500">Add a content source to begin asking questions.</p> :
                            <div className="flex flex-col h-full"><div className="flex-grow space-y-4 pr-2">{qnaMessages.map((msg, i) => <div key={i} className={`p-3 rounded-lg max-w-lg text-sm ${msg.role === 'user' ? 'bg-brand-primary text-white self-end ml-auto' : 'bg-slate-200 dark:bg-slate-700 self-start'}`}>{msg.content}</div>)} {isLoading && <Spinner/>} <div ref={messagesEndRef}/></div></div>
                        }
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <div className="flex gap-2">
                            <input value={qnaInput} onChange={e => setQnaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQnASend()} placeholder="Ask a question about your sources..." className="flex-grow bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" disabled={sources.length === 0 || isLoading} />
                            <button onClick={handleQnASend} disabled={sources.length === 0 || isLoading || !qnaInput.trim()} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400">Send</button>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentQueryAI;
