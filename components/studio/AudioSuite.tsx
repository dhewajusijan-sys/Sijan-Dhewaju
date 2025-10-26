import React, { useState, useCallback } from 'react';
import TextToVoice from './TextToVoice';
import VideoCaptioner from './VideoCaptioner';
import Spinner from '../common/Spinner';
import { generateLyrics, transcribeAudio, enhanceSpeech } from '../../services/geminiService';

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
});

const MusicGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateLyrics = useCallback(async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        try {
            const response = await generateLyrics(prompt);
            setLyrics(response.text);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);

    return (
        <div className="p-3 h-full flex flex-col">
            <div className="grid md:grid-cols-3 gap-6 flex-grow overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-4">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Song Generation</h4>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Describe your song..." className="w-full bg-slate-100 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-cyan" />
                    <button onClick={handleGenerateLyrics} disabled={isLoading} className="w-full py-2 bg-brand-blue rounded-md font-semibold flex justify-center text-white hover:bg-sky-400 disabled:bg-slate-300 dark:disabled:bg-charcoal-700 transition-colors">{isLoading ? <Spinner /> : 'Generate Lyrics'}</button>
                    <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={10} placeholder="Lyrics will appear here..." className="w-full bg-slate-100 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 p-2 rounded-md flex-grow focus:outline-none focus:ring-2 focus:ring-brand-cyan" />
                </div>
                <div className="md:col-span-2 flex flex-col">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Studio Timeline</h4>
                    <div className="flex-grow bg-slate-200 dark:bg-charcoal-900/50 rounded-lg p-4 space-y-3 overflow-y-auto border border-slate-300 dark:border-brand-cyan/20">
                        {['Vocals', 'Drums', 'Synth', 'Bass', 'Guitar'].map((track, i) => (
                             <div key={track} className={`p-2 rounded-md ${i === 0 ? 'bg-brand-purple/20 border border-brand-purple/30' : 'bg-slate-300 dark:bg-charcoal-800/50 border-slate-400 dark:border-blue-500/10 opacity-60'}`}>
                                <p className="text-sm font-semibold">{track}</p>
                                <div className="h-10 bg-slate-400/50 dark:bg-charcoal-900/70 rounded-sm mt-1"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PodcastStudio: React.FC = () => {
    const [transcript, setTranscript] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFile(file);
        setIsLoading(true);
        try {
            const base64 = await fileToBase64(file);
            const response = await transcribeAudio(base64, file.type);
            setTranscript(response.text);
        } catch (error) { console.error(error); } 
        finally { setIsLoading(false); }
    };

    const handleCleanup = async () => {
        if (!audioFile) return;
        setIsLoading(true);
        try {
            const base64 = await fileToBase64(audioFile);
            await enhanceSpeech(base64, audioFile.type); // Placeholder for handling result
            alert("Audio cleanup process simulated.");
        } catch(e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="p-3 h-full flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <label className="py-2 px-4 bg-brand-blue text-white rounded-md font-semibold text-sm cursor-pointer hover:bg-sky-400 transition-colors">
                        {isLoading ? 'Processing...' : 'Upload Audio'}
                        <input type="file" className="hidden" onChange={handleFileChange} accept="audio/*,video/*" />
                    </label>
                    <button onClick={handleCleanup} disabled={!audioFile || isLoading} className="py-2 px-4 bg-brand-purple text-white rounded-md font-semibold text-sm disabled:opacity-50 hover:bg-violet-400 transition-colors">Clean Up Audio</button>
                    <button disabled className="py-2 px-4 bg-slate-300 text-slate-500 dark:bg-charcoal-700 dark:text-slate-400 rounded-md font-semibold text-sm disabled:opacity-50">Mic Check</button>
                </div>
             </div>
             <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
                <div className="md:col-span-2 bg-slate-100 dark:bg-charcoal-900/30 rounded-lg border border-slate-300 dark:border-brand-cyan/20 p-4">
                    <textarea value={transcript} onChange={e => setTranscript(e.target.value)} className="w-full h-full bg-transparent resize-none focus:outline-none" placeholder="Transcript will appear here... Edit the text to edit the audio (concept)." />
                </div>
                <div className="md:col-span-1 flex flex-col gap-3">
                    <div className="p-3 bg-slate-200 dark:bg-charcoal-800/50 rounded-lg border border-slate-300 dark:border-blue-500/20">
                        <p className="font-semibold">Host</p>
                    </div>
                    <div className="p-3 bg-slate-200 dark:bg-charcoal-800/50 rounded-lg border border-slate-300 dark:border-blue-500/20 opacity-60">
                        <p className="font-semibold">Guest (Coming Soon)</p>
                    </div>
                </div>
             </div>
        </div>
    );
};

const AudioSuite: React.FC = () => {
    const [activeTool, setActiveTool] = useState('tts');

    const renderTool = () => {
        switch (activeTool) {
            case 'tts': return <TextToVoice />;
            case 'music': return <MusicGenerator />;
            case 'podcast': return <PodcastStudio />;
            case 'captioner': return <VideoCaptioner />;
            default: return null;
        }
    };

    const TABS = [
        { id: 'tts', name: 'Text to Speech' },
        { id: 'music', name: 'Music Generator' },
        { id: 'podcast', name: 'Podcast Studio' },
        { id: 'captioner', name: 'Video Captioner & Tools' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-brand-cyan/20 px-4 sm:px-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTool(tab.id)}
                            className={`${
                                activeTool === tab.id
                                ? 'border-brand-cyan text-brand-cyan'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-400 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-500'
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

export default AudioSuite;