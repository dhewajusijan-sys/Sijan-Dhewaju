import React, { useState, useCallback, useRef } from 'react';
import { generateSpeech } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const TextToVoice: React.FC = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!text.trim()) {
            setError('Please enter some text to convert to speech.');
            return;
        }

        setIsLoading(true);
        setError('');
        if (audioRef.current) {
            audioRef.current.src = '';
        }

        try {
            const base64Audio = await generateSpeech(text);
            if (base64Audio) {
                 const audioUrl = `data:audio/webm;base64,${base64Audio}`;
                 if(audioRef.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play();
                 }
            } else {
                 setError('Could not generate audio from the provided text.');
            }
        } catch (err) {
            console.error('Text to speech failed:', err);
            setError('Failed to generate speech. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [text]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Text to Voice</h3>
            <div className="flex flex-col gap-4">
                <textarea
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type the text you want to hear..."
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !text.trim()}
                    className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner/> : 'Generate & Play'}
                </button>
            </div>
            {error && <p className="text-red-400 text-sm my-4">{error}</p>}
            <div className="mt-6 flex-grow flex items-center justify-center">
                 <audio ref={audioRef} controls className="w-full max-w-md">
                    Your browser does not support the audio element.
                 </audio>
            </div>
        </div>
    );
};

export default TextToVoice;
