import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSpeech, generateImage } from '../../services/geminiService';
import Spinner from '../common/Spinner';

// --- Audio Helper Functions ---
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
    pcmData.forEach((byte, index) => { view.setUint8(44 + index, byte); });
    return new Blob([view], { type: 'audio/wav' });
}

const CHARACTER_VOICES = [
  { id: 'zephyr-narrator', name: 'Narrator (Zephyr)', voice: 'Zephyr', persona: 'a wise, calm, and friendly male narrator with a smooth, reassuring voice' },
  { id: 'puck-playful', name: 'Playful Sprite (Puck)', voice: 'Puck', persona: 'a mischievous, energetic, and playful male character with a slightly high-pitched and expressive voice' },
  { id: 'charon-announcer', name: 'Announcer (Charon)', voice: 'Charon', persona: 'a deep, serious, and commanding male entity with a resonant, powerful voice, like a movie trailer announcer' },
  { id: 'kore-guide', name: 'Gentle Guide (Kore)', voice: 'Kore', persona: 'a warm, gentle, and empathetic female guide with a clear and soothing voice' },
  { id: 'fenrir-warrior', name: 'Warrior (Fenrir)', voice: 'Fenrir', persona: 'a strong, heroic, and confident female warrior with a clear, assertive voice' },
  { id: 'zephyr-news', name: 'News Anchor (Zephyr)', voice: 'Zephyr', persona: 'a professional news anchor with a clear, authoritative, and trustworthy male voice' },
  { id: 'puck-goblin', name: 'Goblin Merchant (Puck)', voice: 'Puck', persona: 'a quirky goblin merchant, with a high-pitched, energetic, and slightly raspy male voice' },
  { id: 'charon-villain', name: 'Movie Villain (Charon)', voice: 'Charon', persona: 'a classic movie villain with a deep, menacing, and resonant male voice' },
  { id: 'kore-teacher', name: 'Teacher (Kore)', voice: 'Kore', persona: 'a friendly and encouraging elementary school teacher with a warm and clear female voice' },
  { id: 'fenrir-general', name: 'Marine General (Fenrir)', voice: 'Fenrir', persona: 'a tough-as-nails space marine general, with a strong, commanding, and no-nonsense female voice' },
];

interface ConversationMessage {
    id: number;
    role: 'user' | 'model';
    text: string;
    imageUrl?: string;
    audioUrl?: string;
}

const VoiceCharacters: React.FC = () => {
    const [input, setInput] = useState('Hello, who are you?');
    const [selectedCharacter, setSelectedCharacter] = useState(CHARACTER_VOICES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [conversation, setConversation] = useState<ConversationMessage[]>([]);
    const [activeView, setActiveView] = useState<'gallery' | 'chat'>('gallery');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSendMessage = useCallback(async () => {
        if (!input.trim()) return;

        const userMessage: ConversationMessage = { id: Date.now(), role: 'user', text: input };
        setConversation(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError('');

        try {
            const imagePrompt = `A high-detail, fantasy art style, photorealistic character portrait of ${selectedCharacter.persona}. The character is currently speaking the words: "${input}". The expression and surrounding scene should match the tone and content of the text. Cinematic lighting.`;

            const [speechResponse, imageResponse] = await Promise.all([
                generateSpeech(input, selectedCharacter.voice, 'English', ''),
                generateImage(imagePrompt, 1, "1:1")
            ]);

            const pcmData = decode(speechResponse);
            const wavBlob = createWavBlob(pcmData);
            const audioUrl = URL.createObjectURL(wavBlob);

            const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

            const modelMessage: ConversationMessage = {
                id: Date.now() + 1,
                role: 'model',
                text: input,
                imageUrl,
                audioUrl,
            };
            setConversation(prev => [...prev, modelMessage]);

        } catch (err: any) {
            setError(`Failed to bring character to life: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [input, selectedCharacter]);

    const handleSelectCharacter = (character: typeof CHARACTER_VOICES[0]) => {
        setSelectedCharacter(character);
        setConversation([]);
        setError('');
        setActiveView('chat');
    };
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    if (activeView === 'gallery') {
        return (
            <div className="p-4 sm:p-6 h-full flex flex-col">
                <h3 className="text-xl font-bold mb-4">Choose a Character</h3>
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CHARACTER_VOICES.map(char => (
                            <button key={char.id} onClick={() => handleSelectCharacter(char)} className="p-4 rounded-lg text-left transition-colors bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{char.name}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{char.persona}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveView('gallery')} className="text-sm text-brand-primary hover:underline">{'<'} Back to Gallery</button>
                    <h3 className="text-xl font-bold">Chat with {selectedCharacter.name}</h3>
                </div>
             </div>

            <div className="flex-grow bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {conversation.map(msg => (
                        <div key={msg.id} className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-10 h-10 rounded-full bg-brand-primary flex-shrink-0"></div>}
                            <div className={`p-3 rounded-lg max-w-md ${msg.role === 'user' ? 'bg-brand-primary text-white' : 'bg-white dark:bg-slate-800'}`}>
                                {msg.role === 'user' ? (
                                    <p>{msg.text}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {msg.imageUrl && <img src={msg.imageUrl} alt="Character response" className="rounded-md" />}
                                        {msg.audioUrl && <audio src={msg.audioUrl} controls autoPlay className="w-full" />}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 items-start">
                            <div className="w-10 h-10 rounded-full bg-brand-primary flex-shrink-0"></div>
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-800"><Spinner /></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mb-2">{error}</p>}
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Say something..."
                            className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full py-2 px-4 pr-12"
                            disabled={isLoading}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary text-white rounded-full disabled:bg-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceCharacters;