
import React, { useState, useCallback } from 'react';
import { transcribeAudio, generateTranslation, suggestVideoClips } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const LANGUAGES = [
    'Spanish', 'French', 'German', 'Japanese', 'Mandarin Chinese', 'Hindi', 'Russian', 'Arabic'
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const VideoCaptioner: React.FC = () => {
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [transcript, setTranscript] = useState('');
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState('');
    const [captions, setCaptions] = useState('');
    const [clipSuggestions, setClipSuggestions] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
            setMediaFile(file);
            setError('');
        } else {
            setMediaFile(null);
            setError('Please upload a valid audio or video file.');
        }
    };

    const handleGenerateTranscript = useCallback(async () => {
        if (!mediaFile) {
            setError('Please upload an audio/video file first.');
            return;
        }

        setIsLoading(true);
        setError('');
        setTranscript('');
        setCaptions('');
        setClipSuggestions([]);

        try {
            const base64Audio = await fileToBase64(mediaFile);
            const response = await transcribeAudio(base64Audio, mediaFile.type);
            setTranscript(response.text);
        } catch (err) {
            console.error('Transcription failed:', err);
            setError('Failed to generate transcript. The file format might be unsupported. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [mediaFile]);

    const handleTranslate = useCallback(async () => {
        if (!transcript.trim()) {
            setError('A transcript is required for translation.');
            return;
        }
        setIsTranslating(true);
        setError('');
        setCaptions('');
        
        try {
            const response = await generateTranslation(transcript, language);
            setCaptions(response.text);
        } catch (err) {
            console.error('Translation failed:', err);
            setError('Failed to translate captions. Please try again.');
        } finally {
            setIsTranslating(false);
        }

    }, [transcript, language]);

    const handleSuggestClips = useCallback(async () => {
        if (!transcript.trim()) {
            setError('A transcript is required to suggest clips.');
            return;
        }
        setIsSuggesting(true);
        setClipSuggestions([]);
        try {
            const response = await suggestVideoClips(transcript);
            const parsed = JSON.parse(response.text);
            setClipSuggestions(parsed.clips);
        } catch (err) {
            console.error('Clip suggestion failed:', err);
            setError('Failed to suggest clips from the transcript.');
        } finally {
            setIsSuggesting(false);
        }
    }, [transcript]);

    const handleCopy = () => {
        if (!captions) return;
        navigator.clipboard.writeText(captions);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Video Content Studio</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    {/* Step 1 & 2: Transcript */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-300">1. Generate & Edit Transcript</h4>
                        <div className="bg-slate-200 dark:bg-slate-700/50 p-3 rounded-md mt-2">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Audio/Video File</label>
                             <input
                                type="file"
                                accept="audio/*,video/*"
                                onChange={handleFileChange}
                                className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/20 file:text-brand-primary hover:file:bg-brand-primary/30"
                            />
                            {mediaFile && <p className="text-xs text-slate-500 mt-1">Loaded: {mediaFile.name}</p>}
                            <button onClick={handleGenerateTranscript} disabled={isLoading || !mediaFile} className="w-full mt-2 py-2 px-4 bg-brand-primary/80 hover:bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center text-sm">
                                {isLoading ? <Spinner/> : 'Generate Transcript'}
                            </button>
                        </div>
                         <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            rows={6}
                            className="w-full text-sm bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary resize-y mt-2"
                            placeholder="Your transcript will appear here. You can also paste it manually and edit it."
                        />
                    </div>

                    {/* Step 3: Tools */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-300">2. Apply AI Tools</h4>
                        <div className="space-y-3 mt-2">
                            {/* Translator */}
                            <div>
                                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Translate Captions</h5>
                                <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isTranslating} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 mb-2 text-sm">
                                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                </select>
                                <button onClick={handleTranslate} disabled={isTranslating || !transcript.trim()} className="w-full py-2 px-4 bg-brand-secondary hover:bg-brand-secondary/80 text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center text-sm">
                                    {isTranslating ? <Spinner/> : 'Translate to ' + language}
                                </button>
                            </div>
                            {/* Clip Suggester */}
                            <div>
                                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content Studio: Short Clips</h5>
                                <button onClick={handleSuggestClips} disabled={isSuggesting || !transcript.trim()} className="w-full py-2 px-4 bg-brand-secondary hover:bg-brand-secondary/80 text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center text-sm">
                                    {isSuggesting ? <Spinner/> : 'Suggest Engaging Clips'}
                                </button>
                            </div>
                        </div>
                    </div>
                     {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                {/* Right Panel: Output */}
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                     <div className="p-4 flex-shrink-0 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                        <h4 className="font-semibold">AI Output</h4>
                        <button onClick={handleCopy} disabled={!captions} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 disabled:opacity-50">
                            {copied ? 'Copied!' : 'Copy Captions'}
                        </button>
                    </div>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {(isLoading || isTranslating || isSuggesting) && <div className="flex justify-center"><Spinner /></div>}
                        
                        {!isTranslating && captions && (
                             <div className="prose dark:prose-invert prose-sm max-w-none">
                                <h5 className="font-bold">Translated Captions ({language})</h5>
                                <pre className="font-sans whitespace-pre-wrap">{captions}</pre>
                            </div>
                        )}

                        {!isSuggesting && clipSuggestions.length > 0 && (
                            <div className={`prose dark:prose-invert prose-sm max-w-none ${captions ? 'mt-4 pt-4 border-t border-slate-200 dark:border-slate-700' : ''}`}>
                                <h5 className="font-bold">Short Clip Suggestions</h5>
                                 <div className="space-y-2">
                                    {clipSuggestions.map((clip, index) => (
                                        <div key={index} className="p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md text-xs not-prose">
                                            <p className="font-bold text-brand-primary">{clip.title}</p>
                                            <p className="text-slate-600 dark:text-slate-400">Timestamp: {clip.timestamp}</p>
                                            <p className="text-slate-700 dark:text-slate-300 mt-1">{clip.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {!isLoading && !isTranslating && !isSuggesting && !captions && clipSuggestions.length === 0 &&
                           <p className="text-slate-500">The AI-generated output will appear here.</p>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCaptioner;