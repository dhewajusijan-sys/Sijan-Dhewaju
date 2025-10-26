
import React, { useState, useCallback, useRef } from 'react';
import { runMultimodalAnalysis } from '../services/geminiService';
import Spinner from './common/Spinner';

interface MultimodalPart {
  id: string;
  type: 'text' | 'image' | 'audio';
  data: string; // text content or base64 string for image/audio
  mimeType?: string;
  previewUrl?: string; // for image previews
  name?: string; // for audio file names
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const TASK_TEMPLATES = [
    { id: 'describe', name: 'Describe Scene', prompt: 'Describe this scene in detail.', requiredParts: 1, useGoogleSearch: false },
    { id: 'compare', name: 'Compare Images', prompt: 'Compare and contrast the following images, pointing out key similarities and differences.', requiredParts: 2, useGoogleSearch: false },
    { id: 'story', name: 'Generate Story', prompt: 'Write a short story based on the following images in sequence.', requiredParts: 2, useGoogleSearch: false },
    { id: 'facial-recognition', name: 'Facial Recognition (Public Figures)', prompt: 'Identify the public figure in this image using facial recognition and web search. Provide a brief biography. Note: This feature is intended for identifying public figures and respects privacy; it will not identify private individuals.', requiredParts: 1, useGoogleSearch: true },
];


const MultimodalView: React.FC = () => {
  const [parts, setParts] = useState<MultimodalPart[]>([]);
  const [mainPrompt, setMainPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [responseSources, setResponseSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [activeTemplateId, setActiveTemplateId] = useState('');

  const addImagePart = async (file: File) => {
    const base64 = await fileToBase64(file);
    const newPart: MultimodalPart = {
      id: `image-${Date.now()}`,
      type: 'image',
      data: base64,
      mimeType: file.type,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    };
    setParts(prev => [...prev, newPart]);
  };
  
  const addAudioPart = async (file: File) => {
      const base64 = await fileToBase64(file);
      const newPart: MultimodalPart = {
          id: `audio-${Date.now()}`,
          type: 'audio',
          data: base64,
          mimeType: file.type,
          name: file.name,
      };
      setParts(prev => [...prev, newPart]);
  };
  
  const addTextPart = () => {
      const newPart: MultimodalPart = {
        id: `text-${Date.now()}`,
        type: 'text',
        data: ''
      };
      setParts(prev => [...prev, newPart]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        addImagePart(file);
      } else if (file.type.startsWith('audio/')) {
        addAudioPart(file);
      }
    }
  };
  
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
        addAudioPart(file);
    }
  };

  const updatePartData = (id: string, data: string) => {
      setParts(prev => prev.map(p => p.id === id ? {...p, data} : p));
  };
  
  const removePart = (id: string) => {
      setParts(prev => prev.filter(p => p.id !== id));
  };

  const applyTemplate = (templateId: string) => {
    setActiveTemplateId(templateId);
    const template = TASK_TEMPLATES.find(t => t.id === templateId);
    if (template) {
        setMainPrompt(template.prompt);
    }
  };
  
  const handleSubmit = useCallback(async () => {
    if (!mainPrompt.trim()) {
        setError('Please provide a main prompt or goal for the analysis.');
        return;
    }
    if (parts.length === 0) {
        setError('Please add at least one image or text block to analyze.');
        return;
    }
    
    setIsLoading(true);
    setResponse('');
    setResponseSources([]);
    setError('');

    try {
      const activeTemplate = TASK_TEMPLATES.find(t => t.id === activeTemplateId);
      const useSearch = activeTemplate?.useGoogleSearch || false;

      const apiParts: any[] = [{ text: mainPrompt }];
      for (const part of parts) {
        if (part.type === 'image' || part.type === 'audio') {
          apiParts.push({
            inlineData: {
              data: part.data,
              mimeType: part.mimeType!,
            },
          });
        } else { // text
          apiParts.push({ text: part.data });
        }
      }
      
      const result = await runMultimodalAnalysis(apiParts, useSearch);
      setResponse(result.text);
      if (useSearch && result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        setResponseSources(result.candidates[0].groundingMetadata.groundingChunks);
      }

    } catch (err) {
      console.error('Multimodal analysis failed:', err);
      setError('Failed to analyze the provided content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [parts, mainPrompt, activeTemplateId]);
  
  const AudioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19.5v-15"/><path d="M8.5 16.5v-9"/><path d="M5 14v-4"/><path d="M15.5 16.5v-9"/><path d="M19 14v-4"/></svg>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-brand-cyan/20">
        <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100" style={{ textShadow: '0 0 8px rgba(34, 211, 238, 0.5)' }}>Multimodal Understanding</h2>
      </div>
      <div className="flex-grow p-4 sm:p-6 grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-6 overflow-hidden">
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
           <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Build Your Prompt</label>
                <div className="space-y-3 p-3 border border-slate-300 dark:border-blue-500/20 rounded-lg bg-slate-100/80 dark:bg-charcoal-800/30 min-h-[150px]">
                    {parts.map((part, index) => (
                        <div key={part.id} className="p-2 bg-white/70 dark:bg-charcoal-900/50 rounded-md flex items-start gap-2 relative shadow-sm border border-slate-200 dark:border-blue-500/10">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">{index + 1}</span>
                            {part.type === 'image' && <img src={part.previewUrl} alt="input" className="w-20 h-20 object-contain rounded bg-slate-200 dark:bg-charcoal-800" />}
                            {part.type === 'audio' && <div className="w-20 h-20 flex flex-col items-center justify-center bg-slate-200 dark:bg-charcoal-800 rounded text-slate-500 dark:text-slate-400"><AudioIcon /><span className="text-xs text-center truncate w-full px-1" title={part.name}>{part.name}</span></div>}
                            {part.type === 'text' && <textarea value={part.data} onChange={e => updatePartData(part.id, e.target.value)} rows={3} className="flex-grow text-sm bg-slate-200/70 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-brand-cyan" placeholder="Add context or text here..." />}
                            <button onClick={() => removePart(part.id)} className="absolute top-1 right-1 text-slate-500 hover:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                        <button onClick={addTextPart} className="text-sm py-1.5 px-3 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:text-white dark:bg-charcoal-700 dark:hover:bg-charcoal-600 rounded-md border border-slate-300 dark:border-blue-500/20">+ Text</button>
                        <button onClick={() => fileInputRef.current?.click()} className="text-sm py-1.5 px-3 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:text-white dark:bg-charcoal-700 dark:hover:bg-charcoal-600 rounded-md border border-slate-300 dark:border-blue-500/20">+ Image</button>
                         <button onClick={() => audioInputRef.current?.click()} className="text-sm py-1.5 px-3 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:text-white dark:bg-charcoal-700 dark:hover:bg-charcoal-600 rounded-md border border-slate-300 dark:border-blue-500/20">+ Audio</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        <input type="file" ref={audioInputRef} onChange={handleAudioFileChange} className="hidden" accept="audio/*" />
                    </div>
                </div>
            </div>
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Set Your Goal</label>
            <div className="flex gap-2 items-stretch">
                <textarea
                    id="prompt"
                    rows={3}
                    value={mainPrompt}
                    onChange={(e) => setMainPrompt(e.target.value)}
                    className="w-full bg-slate-200/70 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    placeholder="e.g., Describe what is happening in these images..."
                />
                 <div className="flex flex-col gap-1">
                    <select onChange={e => applyTemplate(e.target.value)} defaultValue="" className="text-xs h-full bg-slate-200/70 dark:bg-charcoal-800/50 border border-slate-300 dark:border-blue-500/20 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-brand-cyan">
                        <option value="">Use Template...</option>
                        {TASK_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || parts.length === 0 || !mainPrompt.trim()}
            className="w-full py-2.5 px-4 bg-brand-blue text-white rounded-md font-semibold disabled:bg-slate-300 dark:disabled:bg-charcoal-700 disabled:cursor-not-allowed hover:bg-sky-400 transition-colors mt-auto shadow-md shadow-brand-blue/20"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Content'}
          </button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
        <div className="bg-slate-100/80 dark:bg-charcoal-900/50 rounded-lg border border-slate-200 dark:border-brand-cyan/20 p-4 sm:p-6 flex flex-col overflow-hidden">
          <h3 className="font-semibold mb-4 flex-shrink-0 text-slate-800 dark:text-slate-200">Analysis Result</h3>
          <div className="prose prose-sm dark:prose-invert max-w-none flex-grow overflow-y-auto">
            {isLoading && <div className="flex justify-center"><Spinner /></div>}
            {error && <p className="text-red-400">{error}</p>}
            {response ? (
                <>
                    <p>{response}</p>
                    {responseSources && responseSources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sources:</h4>
                            <ul className="text-xs space-y-1 list-none p-0">
                                {responseSources.map((source, i) => source.web && (
                                    <li key={i} className="p-0">
                                        <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all no-underline">
                                            {i + 1}. {source.web.title || source.web.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            ) : !isLoading && <p className="text-slate-500 dark:text-slate-400">The analysis will appear here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultimodalView;