
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { streamChatResponse, startChatSession } from '../services/geminiService';
import type { ChatMessage, Persona } from '../types';
import { PERSONAS } from '../constants';
import CodeBlock from './common/CodeBlock';
import Spinner from './common/Spinner';

const ChatView: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<Persona>(PERSONAS[0]);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChat(startChatSession(currentPersona.systemInstruction));
    setMessages([]);
  }, [currentPersona]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const parseMessageContent = (content: string) => {
    const parts = content.split(/(\`\`\`[\s\S]*?\`\`\`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeBlock = part.slice(3, -3);
        const language = codeBlock.match(/^[a-z]+\n/)?.[0].trim() || '';
        const code = language ? codeBlock.substring(language.length + 1) : codeBlock;
        return <CodeBlock key={index} language={language} code={code} />;
      }
      const bolded = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <span key={index} dangerouslySetInnerHTML={{ __html: bolded }} />;
    });
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !chat) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const stream = await streamChatResponse(chat, input, useGoogleSearch);
        let modelResponse: ChatMessage = { role: 'model', content: '', timestamp: new Date(), sources: [] };
        setMessages((prev) => [...prev, modelResponse]);

        for await (const chunk of stream) {
            modelResponse.content += chunk.text;
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                modelResponse.sources = chunk.candidates[0].groundingMetadata.groundingChunks;
            }

            setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...modelResponse };
                return newMessages;
            });
        }
    } catch (error) {
        console.error('Error streaming chat response:', error);
        const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() };
        setMessages((prev) => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }, [input, chat, useGoogleSearch]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            {currentPersona.icon}
            <h2 className="font-bold text-lg">{currentPersona.name}</h2>
        </div>
         <div className="flex items-center gap-4">
             <div className="relative inline-block w-48">
                <select 
                    value={currentPersona.id}
                    onChange={(e) => setCurrentPersona(PERSONAS.find(p => p.id === e.target.value) || PERSONAS[0])}
                    className="block appearance-none w-full bg-slate-700 border border-slate-600 hover:border-slate-500 px-4 py-2 pr-8 rounded-md shadow-sm leading-tight focus:outline-none focus:shadow-outline text-sm"
                >
                    {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-300">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                    type="checkbox"
                    checked={useGoogleSearch}
                    onChange={() => setUseGoogleSearch(!useGoogleSearch)}
                    className="form-checkbox h-4 w-4 text-brand-primary bg-slate-700 border-slate-600 rounded focus:ring-brand-primary"
                />
                Search Web
            </label>
         </div>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex-shrink-0"></div>}
            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
              <div className="prose prose-invert prose-sm max-w-none message-content">{parseMessageContent(msg.content)}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-600">
                    <h4 className="text-xs font-bold text-slate-400 mb-1">Sources:</h4>
                    <ul className="text-xs space-y-1">
                        {msg.sources.map((source, i) => source.web && (
                            <li key={i}>
                                <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                    {i+1}. {source.web.title || source.web.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length-1].role === 'user' && (
            <div className="flex gap-3 justify-start">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex-shrink-0"></div>
                 <div className="max-w-xl p-3 rounded-2xl bg-slate-700 text-slate-200 rounded-bl-none">
                    <Spinner />
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 p-4 border-t border-slate-700">
        <div className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-lg">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type your message..."
            rows={1}
            className="flex-grow bg-transparent focus:outline-none resize-none px-2 py-1 max-h-24"
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 rounded-md bg-brand-primary text-white disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
