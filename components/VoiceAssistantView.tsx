import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import {
  startChatSession,
  streamChatResponse,
  generateSpeech,
} from '../services/geminiService';
import type { ChatMessage } from '../types';
import Spinner from './common/Spinner';

const VoiceAssistantView: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // A more conversational persona
    setChat(
      startChatSession(
        'You are a friendly and helpful voice assistant. Keep your responses concise and conversational.',
      ),
    );
    setMessages([]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const playAudio = async (text: string) => {
    if (!text || isSynthesizing) return;
    setIsSynthesizing(true);
    try {
      const base64Audio = await generateSpeech(text);
      if (base64Audio && audioRef.current) {
        const audioUrl = `data:audio/webm;base64,${base64Audio}`;
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !chat) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await streamChatResponse(chat, input, false);
      let modelResponse: ChatMessage = {
        role: 'model',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, modelResponse]);

      let finalContent = '';
      for await (const chunk of stream) {
        modelResponse.content += chunk.text;
        finalContent += chunk.text;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...modelResponse };
          return newMessages;
        });
      }
      await playAudio(finalContent);
    } catch (error) {
      console.error('Error streaming chat response:', error);
      const errorMessage: ChatMessage = {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, chat]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-slate-700 flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <h2 className="font-bold text-lg">Voice Assistant</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex-shrink-0 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 3-1.9 4.8-4.8 1.9 4.8 1.9 1.9 4.8 1.9-4.8 4.8-1.9-4.8-1.9Z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-xl p-3 rounded-2xl relative ${
                msg.role === 'user'
                  ? 'bg-brand-primary text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-200 rounded-bl-none'
              }`}
            >
              <p>{msg.content}</p>
              {msg.role === 'model' && msg.content && (
                <button
                  onClick={() => playAudio(msg.content)}
                  disabled={isSynthesizing}
                  className="absolute -bottom-3 -right-3 p-1 bg-slate-600 rounded-full hover:bg-slate-500 transition-colors disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === 'user' && (
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
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-grow bg-transparent focus:outline-none px-2 py-1"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-md bg-brand-primary text-white disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
      <audio ref={audioRef} hidden />
    </div>
  );
};

export default VoiceAssistantView;
