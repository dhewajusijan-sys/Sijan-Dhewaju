import React, { useState, useCallback, useRef } from 'react';
import { generateSpeech } from '../../services/geminiService';
import Spinner from '../common/Spinner';

// Helper functions for audio playback
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
    const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) { view.setUint8(offset + i, str.charCodeAt(i)); } };
    writeString(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(8, 'WAVE');
    writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true); writeString(36, 'data'); view.setUint32(40, dataSize, true);
    pcmData.forEach((byte, index) => { view.setUint8(44 + index, byte); });
    return new Blob([view], { type: 'audio/wav' });
}

const VoiceCloner: React.FC = () => {
    const [voiceSample, setVoiceSample] = useState<File | null>(null);
    const [script, setScript] = useState('This is a test of the cloned voice.');
    const [pace, setPace] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioUrl, setAudioUrl] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('audio/')) {
            setVoiceSample(file);
            setError('');
        } else {
            setError('Please upload a valid audio file.');
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!voiceSample) {
            setError('Please upload a voice sample first.');
            return;
        }
        if (!script.trim()) {
            setError('Please enter a script to generate.');
            return;
        }

        setIsLoading(true);
        setError('');
        setAudioUrl('');

        try {
            // NOTE: This is a simulation. It uses a standard prebuilt voice ('Kore').
            // A real implementation would require a dedicated voice cloning API.
            const base64Audio = await generateSpeech(script, 'Kore', 'English', '');
            const pcmData = decode(base64Audio);
            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (err: any) {
            setError(`Failed to generate speech: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [voiceSample, script]);

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">AI Voice Cloner</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Upload Voice Sample</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M12 19.5v-15"/><path d="M8.5 16.5v-9"/><path d="M5 14v-4"/><path d="M15.5 16.5v-9"/><path d="M19 14v-4"/></svg>
                                <label htmlFor="voice-upload" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary">
                                    <span>{voiceSample ? voiceSample.name : 'Upload a clean voice sample'}</span>
                                    <input id="voice-upload" type="file" className="sr-only" accept="audio/*" onChange={handleFileChange} />
                                </label>
                                <p className="text-xs text-slate-500">WAV, MP3, up to 10MB</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="script-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Enter Script</label>
                        <textarea id="script-input" value={script} onChange={e => setScript(e.target.value)} rows={5} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">3. Fine-Tune (Simulated)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs">Pace:</span>
                            <input type="range" min="0.5" max="2" step="0.1" value={pace} onChange={e => setPace(parseFloat(e.target.value))} className="w-full" />
                            <span className="text-xs font-mono">{pace.toFixed(1)}x</span>
                        </div>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !voiceSample} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
                        {isLoading ? <Spinner /> : 'Generate Cloned Voice'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
                    {isLoading && <Spinner />}
                    {!isLoading && !audioUrl && <p className="text-slate-600 dark:text-slate-500 text-center">Your generated audio will appear here.</p>}
                    {audioUrl && !isLoading && (
                        <div className="w-full flex flex-col items-center justify-center gap-4">
                           <audio src={audioUrl} controls autoPlay className="w-full max-w-sm" />
                           <a href={audioUrl} download="cloned_voice.wav" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">Download .wav</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceCloner;
