import React, { useState, useCallback, useRef } from 'react';
import {
    queryGroundedContent,
    generateFlashcards,
    generateQuestionPaper,
    generateAudioSummary
} from '../../services/geminiService';
import type { Source } from '../../types';
import Spinner from '../common/Spinner';

type ActiveTab = 'notes' | 'flashcards' | 'quiz' | 'podcast' | 'qna';

// Audio helper from guidelines
function decode(base64: string): Uint8Array { const b = atob(base64); const l = b.length; const bytes = new Uint8Array(l); for (let i = 0; i < l; i++) { bytes[i] = b.charCodeAt(i); } return bytes; }
function createWavBlob(pcmData: Uint8Array): Blob { const sr = 24000, nc = 1, bps = 16, ba = (nc * bps) / 8, br = sr * ba, ds = pcmData.length; const buffer = new ArrayBuffer(44 + ds); const view = new DataView(buffer); const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); }; ws(0, 'RIFF'); view.setUint32(4, 36 + ds, true); ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, nc, true); view.setUint32(24, sr, true); view.setUint32(28, br, true); view.setUint16(32, ba, true); view.setUint16(34, bps, true); ws(36, 'data'); view.setUint32(40, ds, true); pcmData.forEach((byte, index) => view.setUint8(44 + index, byte)); return new Blob([view], { type: 'audio/wav' }); }


const KnowledgeStudio: React.FC = () => {
    const [sources, setSources] = useState<Source[]>([]);
    const [sourceInput, setSourceInput] = useState('');
    const [sourceType, setSourceType] = useState<'text' | 'url' | 'topic'>('text');
    const [activeTab, setActiveTab] = useState<ActiveTab>('notes');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultData, setResultData] = useState<any>(null);

    const [qnaMessages, setQnaMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [qnaInput, setQnaInput] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let type: Source['type'] = 'text';
        if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type === 'application/pdf') type = 'pdf';
        else { setError("Unsupported file type."); return; }
        
        // For simplicity, we'll represent the content as a placeholder message.
        // A real implementation would involve transcription or text extraction.
        const content = `[Content of ${type.toUpperCase()} file: ${file.name}]`;

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
    
    const handleGenerate = async () => {
        if (sources.length === 0) { setError('Please add at least one source.'); return; }
        setIsLoading(true); setError(''); setResultData(null);
        try {
            let response;
            switch(activeTab) {
                case 'notes':
                    response = await queryGroundedContent(sources, 'Generate a set of structured, detailed, and easy-to-read notes from the provided sources. Use Markdown for formatting, including headings, bold text for key terms, and bullet points.');
                    setResultData(response.text);
                    break;
                case 'flashcards':
                    response = await generateFlashcards(sources);
                    setResultData(JSON.parse(response.text).flashcards);
                    break;
                case 'quiz':
                    response = await generateQuestionPaper('syllabus', sources.map(s => s.content).join('\n\n'), 10, 'Medium');
                    setResultData(JSON.parse(response.text));
                    break;
                case 'podcast':
                    const base64Audio = await generateAudioSummary(sources);
                    const pcmData = decode(base64Audio);
                    const wavBlob = createWavBlob(pcmData);
                    setResultData(URL.createObjectURL(wavBlob));
                    break;
            }
        } catch (err) { setError(`Failed to generate ${activeTab}.`); }
        finally { setIsLoading(false); }
    };
    
    const handleQnASend = async () => {
        if (!qnaInput.trim()) return;
        const newUserMessage = { role: 'user' as const, content: qnaInput };
        setQnaMessages(prev => [...prev, newUserMessage]);
        setQnaInput('');
        setIsLoading(true);
        try {
            const response = await queryGroundedContent(sources, qnaInput);
            setQnaMessages(prev => [...prev, { role: 'model', content: response.text }]);
        } catch (err) { setError('Failed to get an answer.'); }
        finally { setIsLoading(false); }
    };

    const Flashcard: React.FC<{front: string, back: string}> = ({front, back}) => {
        const [isFlipped, setIsFlipped] = useState(false);
        return <div className="p-4 h-32 rounded-md bg-white dark:bg-slate-700 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>{isFlipped ? back : front}</div>
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">1. Content Sources</h4>
                    <div className="flex-grow p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-900/30 space-y-2 min-h-[150px]">{sources.map(s => <div key={s.id} className="p-2 bg-white dark:bg-slate-800 rounded-md flex items-center gap-2 text-sm"><span className="flex-grow truncate" title={s.name}>{s.name}</span><button onClick={() => removeSource(s.id)} className="text-slate-500 hover:text-red-500 flex-shrink-0">&times;</button></div>)}</div>
                    <div>
                        <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1"><button onClick={() => setSourceType('text')} className={`flex-1 text-sm p-1 rounded ${sourceType === 'text' ? 'bg-white dark:bg-slate-600' : ''}`}>Text</button><button onClick={() => setSourceType('url')} className={`flex-1 text-sm p-1 rounded ${sourceType === 'url' ? 'bg-white dark:bg-slate-600' : ''}`}>URL</button><button onClick={() => setSourceType('topic')} className={`flex-1 text-sm p-1 rounded ${sourceType === 'topic' ? 'bg-white dark:bg-slate-600' : ''}`}>Topic</button></div>
                        <textarea value={sourceInput} onChange={e => setSourceInput(e.target.value)} rows={2} placeholder={sourceType === 'text' ? 'Paste...' : sourceType === 'url' ? 'https://...' : 'Research...'} className="w-full mt-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 p-2 rounded-md" />
                        <button onClick={handleAddSource} className="w-full py-1.5 text-sm bg-brand-secondary text-white rounded-md">Add Source</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,audio/*,video/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold text-sm">Upload File (PDF, Audio, Video)</button>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700"><div className="-mb-px flex space-x-2 px-2 overflow-x-auto">{[{id:'notes', name:'Notes'}, {id:'flashcards', name:'Flashcards'}, {id:'quiz', name:'Quiz'}, {id:'podcast', name:'Podcast'}, {id:'qna', name:'Q&A'}].map(t => <button key={t.id} onClick={() => {setActiveTab(t.id as ActiveTab); setResultData(null);}} className={`${activeTab === t.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-600 dark:text-slate-400'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs sm:text-sm`}>{t.name}</button>)}</div></div>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {error && <p className="text-red-500 text-center">{error}</p>}
                        {isLoading ? <div className="h-full flex items-center justify-center"><Spinner /></div> : (
                            <>
                            {activeTab !== 'qna' && !resultData && <div className="h-full flex flex-col items-center justify-center text-center"><p className="text-slate-500 mb-4">Generate {activeTab} from your sources.</p><button onClick={handleGenerate} className="py-2 px-5 bg-brand-primary text-white rounded-md font-semibold">Generate</button></div>}
                            {activeTab === 'notes' && resultData && <pre className="font-sans whitespace-pre-wrap">{resultData}</pre>}
                            {activeTab === 'flashcards' && resultData && <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{resultData.map((card: any, i: number) => <Flashcard key={i} front={card.front} back={card.back} />)}</div>}
                            {activeTab === 'quiz' && resultData && <pre className="font-sans whitespace-pre-wrap">{resultData.questionPaper}</pre>}
                            {activeTab === 'podcast' && resultData && <audio src={resultData} controls autoPlay className="w-full" />}
                            {activeTab === 'qna' && <div className="flex flex-col h-full"><div className="flex-grow space-y-4 pr-2">{qnaMessages.map((msg, i) => <div key={i} className={`p-3 rounded-lg max-w-lg text-sm ${msg.role === 'user' ? 'bg-brand-primary text-white self-end ml-auto' : 'bg-slate-200 dark:bg-slate-700 self-start'}`}>{msg.content}</div>)}</div><div className="flex gap-2 mt-4 flex-shrink-0"><input value={qnaInput} onChange={e => setQnaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQnASend()} placeholder="Ask a question..." className="flex-grow bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md" /><button onClick={handleQnASend} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold">Send</button></div></div>}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeStudio;