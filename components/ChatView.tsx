

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { Chat, Part } from '@google/genai';
import { 
    streamChatResponse, 
    startChatSession,
} from '../services/geminiService';
import type { ChatMessage, Persona } from '../types';
import { PERSONAS, PROMPT_BOOK } from '../constants';
import CodeBlock from './common/CodeBlock';
import Spinner from './common/Spinner';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import PromptBookModal from './PromptBookModal';

const LANGUAGES = [ 'English', 'Nepali', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Code', 'Bengali', 'Tamil', 'Telugu', 'Kannada' ];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const ModelBadge: React.FC<{ model: string, isUpgraded?: boolean }> = ({ model, isUpgraded }) => {
  const isPro = model.includes('pro');
  const badgeClass = isPro
    ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
    : 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30';
  
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
      {isPro ? 'PRO' : 'FLASH'}
    </span>
  );
};

const UserAvatar = () => (
    <div className="w-8 h-8 flex-shrink-0 self-start relative flex items-center justify-center">
        <div className="absolute inset-0 bg-brand-cyan/30 rounded-full animate-subtle-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-brand-cyan" style={{boxShadow: '0 0 8px 2px rgba(34, 211, 238, 0.7)'}}></div>
    </div>
);
const AiAvatar = () => (
    <div className="w-8 h-8 flex-shrink-0 self-start relative flex items-center justify-center">
        <div className="absolute inset-0 bg-brand-purple/30 rounded-full animate-subtle-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="w-2 h-2 rounded-full bg-brand-purple" style={{boxShadow: '0 0 8px 2px rgba(167, 139, 250, 0.7)'}}></div>
    </div>
);

const ChatView: React.FC = () => {
  const [flashChat, setFlashChat] = useState<Chat | null>(null);
  const [proChat, setProChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<Persona>(PERSONAS[0]);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const [isPromptBookOpen, setIsPromptBookOpen] = useState(false);
  
  const [attachment, setAttachment] = useState<{ file: File, previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startNewChat = useCallback(() => {
    const systemInstruction = currentPersona.systemInstruction;
    const language = selectedLanguage;
    setFlashChat(startChatSession(systemInstruction, language, 'gemini-2.5-flash'));
    setProChat(startChatSession(systemInstruction, language, 'gemini-2.5-pro'));
    setMessages([]);
    setAttachment(null);
  }, [currentPersona, selectedLanguage]);
  
  useEffect(startNewChat, [startNewChat]);

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(scrollToBottom, [messages]);

  const parseMessageContent = (content: string) => {
    const parts = content.split(/(\`\`\`[\s\S]*?\`\`\`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const languageMatch = part.match(/^```([a-z]+)\n/);
        const language = languageMatch ? languageMatch[1] : '';
        const code = part.slice(3, -3).replace(/^([a-z]+)\n/, '');
        return <CodeBlock key={index} language={language} code={code} />;
      }
      const bolded = part.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-slate-100">$1</strong>').replace(/\n/g, '<br />');
      return <span key={index} dangerouslySetInnerHTML={{ __html: bolded }} />;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setAttachment({ file, previewUrl: URL.createObjectURL(file) });
    }
    if(e.target) e.target.value = '';
  };

  const handleSend = useCallback(async (messageText: string) => {
    if ((!messageText.trim() && !attachment) || !flashChat || !proChat) return;

    const userMessage: ChatMessage = { 
        id: Date.now(), 
        role: 'user', 
        content: messageText, 
        timestamp: new Date(),
        attachment: attachment ? { type: 'image', url: attachment.previewUrl } : undefined
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const parts: (string | Part)[] = [];
    if (messageText.trim()) { parts.push(messageText); }
    if (attachment) {
        const base64Data = await fileToBase64(attachment.file);
        parts.push({ inlineData: { data: base64Data, mimeType: attachment.file.type } });
    }
    
    setAttachment(null);

    const modelMessageId = Date.now() + 1;
    const modelResponsePlaceholder: ChatMessage = {
        id: modelMessageId, role: 'model', content: '', timestamp: new Date(),
        sources: [], status: 'streaming_flash', model: 'gemini-2.5-flash',
    };
    setMessages(prev => [...prev, modelResponsePlaceholder]);
    
    const useGoogleSearchConfig = useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {};

    proChat.sendMessage({ message: parts.map(p => typeof p === 'string' ? {text:p} : p), config: useGoogleSearchConfig }).then(proResponse => {
        setMessages(prev => prev.map((m): ChatMessage => m.id === modelMessageId ? {
            ...m, content: proResponse.text, status: 'complete_pro', model: 'gemini-2.5-pro',
            sources: proResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        } : m));
    }).catch(err => {
        console.error('Pro model error:', err);
        setMessages(prev => prev.map((m): ChatMessage => (m.id === modelMessageId && m.status !== 'complete_pro') ? { ...m, status: 'complete_flash' } : m));
    });

    try {
        const stream = await streamChatResponse(flashChat, parts, useGoogleSearch);
        let accumulatedContent = '';
        for await (const chunk of stream) {
            accumulatedContent += chunk.text;
            setMessages(prev => prev.map(m => (m.id === modelMessageId && m.status === 'streaming_flash') ? { ...m, content: accumulatedContent, sources: chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || m.sources } : m));
        }
        setMessages(prev => prev.map((m): ChatMessage => (m.id === modelMessageId && m.status === 'streaming_flash') ? { ...m, status: 'complete_flash' } : m));
    } catch (error) {
        console.error('Flash model error:', error);
        setMessages(prev => prev.map(m => (m.id === modelMessageId && m.status === 'streaming_flash') ? { ...m, content: 'An error occurred.', status: 'complete_flash' } : m));
    } finally {
        setIsLoading(false);
    }
  }, [flashChat, proChat, useGoogleSearch, attachment]);

  const handleQuickPromptSelect = (prompt: string) => {
    setInput(prompt);
    handleSend(prompt);
    setIsPromptBookOpen(false);
  };
  
  const MemoizedPromptBook = React.memo(PromptBookModal);

  return (
    <div className="flex flex-col h-full text-slate-700 dark:text-slate-300 relative">
        {isPromptBookOpen && ReactDOM.createPortal(<MemoizedPromptBook onClose={() => setIsPromptBookOpen(false)} onSelectPrompt={handleQuickPromptSelect} />, document.getElementById('modal-root')!)}
      
        <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-brand-cyan/20 bg-white/50 dark:bg-charcoal-900/50 backdrop-blur-sm flex items-center justify-between flex-wrap gap-2 z-10">
            <div className="flex items-center gap-3">
                 <button onClick={startNewChat} className="text-sm py-1.5 px-3 bg-white/50 hover:bg-slate-50 dark:bg-charcoal-800/50 dark:hover:bg-charcoal-700/70 border border-slate-300 dark:border-blue-500/20 rounded-md transition-colors">New Chat</button>
                 <select value={currentPersona.id} onChange={(e) => setCurrentPersona(PERSONAS.find(p => p.id === e.target.value)!)} className="appearance-none bg-white/50 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-cyan text-sm">
                    {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
                  <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="appearance-none bg-white/50 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-cyan text-sm">
                    {LANGUAGES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
             <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer"><input type="checkbox" checked={useGoogleSearch} onChange={e => setUseGoogleSearch(e.target.checked)} className="h-4 w-4 rounded border-slate-300 bg-slate-100 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-white dark:border-slate-600 dark:bg-charcoal-700 dark:focus:ring-offset-charcoal-900" /> Web Search</label>
        </div>
        
        <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-8">
            {messages.length === 0 && !isLoading && (
                <div className="text-center text-slate-500 pt-10 animate-message-in">
                    <h2 className="text-3xl font-bold mb-2 text-slate-700 dark:text-slate-300" style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}>Nepal's 1st AI</h2>
                    <p>Begin a conversation in this holographic space.</p>
                </div>
            )}
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 items-start ${msg.role === 'user' ? 'justify-end' : ''} animate-message-in`}>
                    {msg.role === 'model' && <AiAvatar />}
                    <div className={`max-w-2xl p-4 rounded-lg bg-white/50 dark:bg-charcoal-900/50 backdrop-blur-sm ${msg.role === 'user' ? 'border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'border border-purple-500/30 shadow-[0_0_20px_rgba(167,139,250,0.15)]'}`}>
                         <div className="flex justify-between items-center mb-2">
                           <span className={`text-xs font-bold ${msg.role === 'user' ? 'text-brand-cyan' : 'text-brand-purple'}`}>{msg.role === 'user' ? 'You' : currentPersona.name}</span>
                           {msg.role === 'model' && msg.status && <ModelBadge model={msg.model!} />}
                         </div>
                         {msg.attachment && msg.attachment.type === 'image' && (
                            <img src={msg.attachment.url} alt="attachment" className="rounded-md my-2 max-w-xs border border-slate-200 dark:border-charcoal-700" />
                         )}
                        <div className="prose prose-sm prose-invert max-w-none text-slate-700 dark:text-slate-300 message-content">{parseMessageContent(msg.content)}</div>
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Sources:</h4>
                                <ul className="text-xs space-y-1">{msg.sources.map((source, i) => source.web && (
                                    <li key={i}><a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">{i + 1}. {source.web.title || source.web.uri}</a></li>
                                ))}</ul>
                            </div>
                        )}
                    </div>
                    {msg.role === 'user' && <UserAvatar />}
                </div>
            ))}
            {isLoading && messages[messages.length-1].role === 'model' && messages[messages.length-1].content === '' && (
                 <div className="flex gap-4 items-start animate-message-in"><AiAvatar /><div className="p-3 px-4 rounded-lg bg-white/50 dark:bg-charcoal-900/50 border border-purple-500/30"><Spinner /></div></div>
            )}
            <div ref={messagesEndRef} />
        </div>
        
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-white/50 dark:bg-charcoal-900/50 backdrop-blur-md border-t border-slate-200 dark:border-brand-cyan/20 z-10">
            <div className="space-y-3">
                {attachment && (
                    <div className="relative w-20 h-20 group">
                        <img src={attachment.previewUrl} alt="attachment preview" className="w-full h-full object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                        <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-slate-200 text-slate-800 dark:bg-charcoal-700 dark:text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                    </div>
                )}
                <div className="flex items-center gap-2 p-2 bg-slate-100/60 dark:bg-charcoal-800/40 border border-slate-300 dark:border-blue-500/20 rounded-xl">
                    <button onClick={() => setIsPromptBookOpen(true)} className="p-2 hover:bg-slate-200/50 dark:hover:bg-charcoal-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-200/50 dark:hover:bg-charcoal-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                        placeholder="Flow with the conversation..."
                        className="w-full bg-transparent p-2 resize-none focus:outline-none text-slate-800 dark:text-slate-300 placeholder-slate-500"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button onClick={isListening ? stopListening : startListening} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/50 text-white' : 'hover:bg-slate-200/50 dark:hover:bg-charcoal-700/50 text-slate-500 dark:text-slate-400 hover:text-brand-cyan'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    </button>
                    <button onClick={() => handleSend(input)} disabled={(!input.trim() && !attachment) || isLoading} className="p-2 w-10 h-10 flex items-center justify-center bg-brand-cyan text-white rounded-full disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-charcoal-700 dark:disabled:text-slate-500 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.7)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ChatView;