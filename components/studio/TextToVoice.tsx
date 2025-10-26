import React, { useState, useCallback, useRef } from 'react';
import { generateSpeech } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const VOICES = [
    { id: 'Kore', name: 'Kore (Female)' },
    { id: 'Puck', name: 'Puck (Male)' },
    { id: 'Charon', name: 'Charon (Male)' },
    { id: 'Zephyr', name: 'Zephyr (Male)' },
    { id: 'Fenrir', name: 'Fenrir (Female)' },
];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese'];
const STYLES = ['Cheerful', 'Sad', 'Angry', 'Whispering', 'Formal', 'Casual'];

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createWavBlob(pcmData: Uint8Array): Blob {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    pcmData.forEach((byte, index) => {
        view.setUint8(44 + index, byte);
    });

    return new Blob([view], { type: 'audio/wav' });
}


const TextToVoice: React.FC = () => {
    const [text, setText] = useState('Hello, this is a test of the text-to-speech generation.');
    const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
    const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleGenerate = useCallback(async () => {
        if (!text.trim()) {
            setError('Please enter some text to generate audio.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAudioUrl('');

        try {
            const base64Audio = await generateSpeech(text, selectedVoice, selectedLanguage, selectedStyle);
            const pcmData = decode(base64Audio);
            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (err: any) {
            console.error('TTS generation failed:', err);
            setError(`Failed to generate speech: ${err.message || "Please try again."}`);
        } finally {
            setIsLoading(false);
        }
    }, [text, selectedVoice, selectedLanguage, selectedStyle]);

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="tts-text" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1. Enter Text</label>
                        <textarea id="tts-text" value={text} onChange={e => setText(e.target.value)} rows={6} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 p-2 rounded-md" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="tts-voice" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Voice</label>
                            <select id="tts-voice" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 p-2 rounded-md">
                                {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tts-style" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">3. Style</label>
                            <select id="tts-style" value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 p-2 rounded-md">
                                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !text.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
                        {isLoading ? <Spinner /> : 'Generate Speech'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
                    {isLoading && <Spinner />}
                    {!isLoading && !audioUrl && <p className="text-slate-600 dark:text-slate-500 text-center">Your generated audio will appear here.</p>}
                    {audioUrl && !isLoading && (
                        <div className="w-full flex flex-col items-center justify-center gap-4">
                           <audio ref={audioRef} src={audioUrl} controls autoPlay className="w-full max-w-sm" />
                           <a href={audioUrl} download="generated_speech.wav" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">Download .wav</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TextToVoice;
