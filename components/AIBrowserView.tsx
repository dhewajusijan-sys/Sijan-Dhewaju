import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { runWebSearch } from '../services/geminiService';
import Spinner from './common/Spinner';

type Memory = {
  id: number;
  url: string;
  title: string;
  summary: string;
  timestamp: number;
};

type SidebarMode = 'chat' | 'memory' | 'rewrite';

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

const AIBrowserView: React.FC = () => {
    const initialUrl = 'https://en.wikipedia.org/wiki/Nepal';
    const [urlInput, setUrlInput] = useState(initialUrl);
    const [iframeUrl, setIframeUrl] = useState(initialUrl);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('chat');

    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [browserMemory, setBrowserMemory] = useLocalStorage<Memory[]>('ai-browser-memory', []);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [rewriteText, setRewriteText] = useState('');
    const [rewriteInstruction, setRewriteInstruction] = useState('');
    const [rewriteResult, setRewriteResult] = useState('');

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showSecurityWarning, setShowSecurityWarning] = useState(true);
    const [memorySearch, setMemorySearch] = useState('');

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragInfo = useRef({ offsetX: 0, offsetY: 0, startX: 0, startY: 0, isClick: true });
    
    const [history, setHistory] = useState<string[]>([initialUrl]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

    const floatingButtonRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const mainContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mainContainerRef.current) {
            const rect = mainContainerRef.current.getBoundingClientRect();
             setPosition({ x: rect.width - 120, y: rect.height - 200 });
        }
    }, []);

    const isValidUrl = (str: string) => {
        try { new URL(str); return true; } catch (_) { return false; }
    };

    const handleNavigation = () => {
        let url = urlInput.trim();
        if (!url) return;

        if (!isValidUrl(url)) {
            if (!url.includes('://') && url.includes('.')) {
                url = `https://${url}`;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        
        const newHistory = [...history.slice(0, currentHistoryIndex + 1), url];
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
        setIframeUrl(url);
        setUrlInput(url);
    };
    
    const goBack = () => {
        if (currentHistoryIndex > 0) {
            const newIndex = currentHistoryIndex - 1;
            setCurrentHistoryIndex(newIndex);
            const newUrl = history[newIndex];
            setIframeUrl(newUrl);
            setUrlInput(newUrl);
        }
    };

    const goForward = () => {
        if (currentHistoryIndex < history.length - 1) {
            const newIndex = currentHistoryIndex + 1;
            setCurrentHistoryIndex(newIndex);
            const newUrl = history[newIndex];
            setIframeUrl(newUrl);
            setUrlInput(newUrl);
        }
    };

    const reload = () => {
        if (iframeRef.current) {
            iframeRef.current.src += ''; // A simple way to trigger a reload
        }
    };
    
    const runAIForPage = async (instruction: string, url: string) => {
        setIsAiLoading(true);
        setError('');
        setSidebarMode('chat');
        if(!isSidebarOpen) setIsSidebarOpen(true);

        const userMessage = { role: 'user' as const, content: `${instruction} for: ${url}` };
        setChatMessages(prev => [...prev, userMessage]);

        try {
            const prompt = `${instruction}. The user is currently on this URL: ${url}. Use your tools to access the page content and provide a response. If you are summarizing, also provide the title of the page in your response.`;
            const result = await runWebSearch(prompt);
            const modelMessage = { role: 'model' as const, content: result.text };
            setChatMessages(prev => [...prev, modelMessage]);

            if (instruction.toLowerCase().includes('summarize')) {
                const titleMatch = result.text.match(/(?:title|page title|article title) is:? "([^"]+)"/i);
                const title = titleMatch ? titleMatch[1] : url;

                const newMemory: Memory = {
                    id: Date.now(), url, title,
                    summary: result.text.length > 300 ? result.text.substring(0, 300) + '...' : result.text,
                    timestamp: Date.now()
                };
                setBrowserMemory(prev => [newMemory, ...prev.filter(m => m.url !== url)]);
            }
        } catch (err: any) {
            const errorMessage = `AI analysis failed: ${err.message || "Please try again."}`;
            setError(errorMessage);
            setChatMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleRewrite = async () => {
        if (!rewriteText || !rewriteInstruction) return;
        setIsAiLoading(true);
        setRewriteResult('');
        try {
            const prompt = `Rewrite the following text based on this instruction: "${rewriteInstruction}".\n\nOriginal Text:\n"${rewriteText}"\n\nReturn ONLY the rewritten text.`;
            const result = await runWebSearch(prompt);
            setRewriteResult(result.text);
        } catch(e: any) { setError(`Rewrite failed: ${e.message}`); }
        finally { setIsAiLoading(false); }
    };
    
    const filteredMemory = useMemo(() => {
        if (!memorySearch) return browserMemory;
        const lowerCaseSearch = memorySearch.toLowerCase();
        return browserMemory.filter(mem => 
            mem.title.toLowerCase().includes(lowerCaseSearch) || 
            mem.summary.toLowerCase().includes(lowerCaseSearch)
        );
    }, [browserMemory, memorySearch]);

    const handleDragStart = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setIsDragging(true);
        dragInfo.current = {
            offsetX: clientX - position.x,
            offsetY: clientY - position.y,
            startX: clientX,
            startY: clientY,
            isClick: true,
        };
    };

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging || !floatingButtonRef.current) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (dragInfo.current.isClick && (Math.abs(clientX - dragInfo.current.startX) > 5 || Math.abs(clientY - dragInfo.current.startY) > 5)) {
            dragInfo.current.isClick = false;
        }

        const newX = clientX - dragInfo.current.offsetX;
        const newY = clientY - dragInfo.current.offsetY;

        const parent = mainContainerRef.current;
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const buttonRect = floatingButtonRef.current.getBoundingClientRect();
        const boundedX = Math.max(16, Math.min(parentRect.width - buttonRect.width - 16, newX));
        const boundedY = Math.max(16, Math.min(parentRect.height - buttonRect.height - 16, newY));
        
        setPosition({ x: boundedX, y: boundedY });
    }, [isDragging]);

    const handleDragEnd = () => {
        if (!isDragging) return;
        
        if (dragInfo.current.isClick) {
            setIsMenuOpen(prev => !prev);
        }
        setIsDragging(false);

        if (mainContainerRef.current && floatingButtonRef.current) {
            const parentRect = mainContainerRef.current.getBoundingClientRect();
            const buttonRect = floatingButtonRef.current.getBoundingClientRect();
            
            const center = position.x + buttonRect.width / 2;
            const isLeft = center < parentRect.width / 2;
            const newX = isLeft ? 16 : parentRect.width - buttonRect.width - 16;
            
            setPosition(pos => ({ x: newX, y: pos.y }));
        }
    };
    
    useEffect(() => {
        const moveHandler = (e: MouseEvent | TouchEvent) => handleDragMove(e);
        const endHandler = () => handleDragEnd();
        
        if (isDragging) {
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('touchmove', moveHandler, { passive: false });
            document.addEventListener('mouseup', endHandler);
            document.addEventListener('touchend', endHandler);
        }
        return () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('mouseup', endHandler);
            document.removeEventListener('touchend', endHandler);
        };
    }, [isDragging, handleDragMove]);


    const FloatingButton: React.FC = () => (
        <div ref={floatingButtonRef} className="absolute z-40" style={{ top: 0, left: 0, transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}>
            <div className={`relative`}>
                {isMenuOpen && (
                    <div className="absolute bottom-full mb-3 w-48 bg-black/70 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-slate-600/50 overflow-hidden">
                        <button onClick={() => { setIsMenuOpen(false); runAIForPage('Summarize this page', iframeUrl); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors">Summarize Page</button>
                        <button onClick={() => { setIsSidebarOpen(true); setSidebarMode('rewrite'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors">Rewrite Text</button>
                        <button onClick={() => { setIsSidebarOpen(true); setSidebarMode('memory'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors">Access Memory</button>
                        <button disabled className="w-full text-left px-4 py-3 text-sm text-white/50 cursor-not-allowed">Agent Mode (Soon)</button>
                    </div>
                )}
                <button onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="w-14 h-14 rounded-full bg-black/40 dark:bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20 cursor-grab active:cursor-grabbing">
                    <div className="w-7 h-7 rounded-full bg-white"></div>
                </button>
            </div>
        </div>
    );
    
    return (
        <div ref={mainContainerRef} className="flex flex-col h-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                <div className="flex items-center gap-2 p-2">
                     <button onClick={goBack} disabled={currentHistoryIndex <= 0} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button onClick={goForward} disabled={currentHistoryIndex >= history.length - 1} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <button onClick={reload} className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
                    </button>
                    <input
                        type="text"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') handleNavigation() }}
                        placeholder="Search Google or type a URL"
                        className="flex-grow bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                     <button onClick={() => runAIForPage('Analyze this page', iframeUrl)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-md text-sm">Ask AI</button>
                </div>
                {showSecurityWarning && (
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs text-center flex items-center justify-center gap-4">
                        <span>Note: For security reasons, many websites (like social media, banking, and Google services) block being displayed in an embedded frame. This is a standard web security feature.</span>
                        <button onClick={() => setShowSecurityWarning(false)} className="font-bold text-lg leading-none">&times;</button>
                    </div>
                )}
            </div>
            <div className="flex flex-grow overflow-hidden">
                <main className="flex-grow transition-all duration-300">
                    <iframe ref={iframeRef} src={iframeUrl} title="AI Browser" className="w-full h-full border-0" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" />
                </main>
                <aside className={`flex-shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-full md:w-1/3' : 'w-0'}`}>
                    <div className="h-full flex flex-col">
                        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-semibold capitalize">{sidebarMode}</h3>
                            <button onClick={() => setIsSidebarOpen(false)}>&times;</button>
                        </div>

                        {sidebarMode === 'chat' && (
                            <div className="flex-grow p-2 overflow-y-auto space-y-4">
                                {chatMessages.map((msg, i) => <div key={i} className={`p-3 rounded-lg max-w-lg text-sm ${msg.role === 'user' ? 'bg-brand-primary text-white self-end ml-auto' : 'bg-slate-200 dark:bg-slate-700 self-start'}`}>{msg.content}</div>)}
                                {isAiLoading && <div className="self-start"><Spinner /></div>}
                            </div>
                        )}
                        {sidebarMode === 'memory' && (
                            <div className="flex flex-col h-full">
                                <div className="p-2 flex-shrink-0">
                                     <input
                                        type="search"
                                        value={memorySearch}
                                        onChange={e => setMemorySearch(e.target.value)}
                                        placeholder="Search memory..."
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div className="flex-grow p-2 overflow-y-auto space-y-2">
                                    {filteredMemory.length === 0 && <p className="text-center text-sm text-slate-500">No memories found.</p>}
                                    {filteredMemory.map(mem => (
                                        <div key={mem.id} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                            <p className="font-semibold text-sm truncate">{mem.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{mem.summary}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <button onClick={() => { setUrlInput(mem.url); setIframeUrl(mem.url); }} className="text-xs text-brand-primary hover:underline">Visit</button>
                                                <button onClick={() => setBrowserMemory(prev => prev.filter(m => m.id !== mem.id))} className="text-xs text-red-500">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {sidebarMode === 'rewrite' && (
                            <div className="flex flex-col gap-3 p-3">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Due to browser security, paste text here to have the AI edit it.</p>
                                <textarea value={rewriteText} onChange={e => setRewriteText(e.target.value)} rows={5} placeholder="Paste your text here..." className="w-full text-sm bg-slate-100 dark:bg-slate-700/50 p-2 rounded" />
                                <input value={rewriteInstruction} onChange={e => setRewriteInstruction(e.target.value)} placeholder="Instruction (e.g., make it more professional)" className="w-full text-sm bg-slate-100 dark:bg-slate-700/50 p-2 rounded" />
                                <button onClick={handleRewrite} disabled={isAiLoading} className="py-2 bg-brand-secondary text-white rounded font-semibold flex justify-center">{isAiLoading ? <Spinner/> : 'Rewrite'}</button>
                                {rewriteResult && <textarea readOnly value={rewriteResult} rows={5} className="w-full text-sm bg-slate-200 dark:bg-slate-800 p-2 rounded" />}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
            <FloatingButton />
        </div>
    );
};

export default AIBrowserView;