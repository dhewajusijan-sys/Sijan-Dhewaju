import React, { useState, useCallback } from 'react';
import {
    generatePresentation,
    generateImage,
    refineSlideContent,
    generateMindMap,
    getMindMapSuggestions,
    generateQuestionPaper,
    analyzeImage,
    solveTextQuestion,
} from '../../services/geminiService';
import Spinner from '../common/Spinner';

// --- TYPE DEFINITIONS ---

interface Slide {
    title: string;
    content: string;
    imageUrl?: string;
}

type ProcessingState = {
    slideIndex: number;
    type: 'image' | 'text';
} | null;

type GenerationModePaper = 'topic' | 'syllabus';
type OutputTabPaper = 'paper' | 'key';
interface PaperResult {
    questionPaper: string;
    answerKey: string;
}

type GenerationModeMindMap = 'topic' | 'text';
type InputTypeSolver = 'image' | 'text';

// --- HELPER FUNCTIONS ---

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

// --- SUB-COMPONENTS for each tool ---

const PresentationTool: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [numSlides, setNumSlides] = useState(7);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState<ProcessingState>(null);
    const [error, setError] = useState('');
    const [slides, setSlides] = useState<Slide[]>([]);

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a topic or description for the presentation.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSlides([]);
        try {
            const response = await generatePresentation(prompt, numSlides);
            const jsonStr = response.text.trim();
            const parsedData = JSON.parse(jsonStr);
            setSlides(parsedData.slides);
        } catch (err) {
            setError('Failed to generate presentation. The response might not be valid. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, numSlides]);
    
    const handleGenerateImage = useCallback(async (slideIndex: number) => {
        const slide = slides[slideIndex];
        if (!slide) return;
        setIsProcessing({ slideIndex, type: 'image' });
        try {
            const imagePrompt = `A visually appealing, professional image for a presentation slide titled "${slide.title}". The slide content is about: ${slide.content}. The image should be abstract or conceptual and relevant.`;
            const response = await generateImage(imagePrompt, 1, '16:9');
            const url = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
            setSlides(prevSlides => {
                const newSlides = [...prevSlides];
                newSlides[slideIndex].imageUrl = url;
                return newSlides;
            });
        } catch (err) { console.error('Image generation for slide failed:', err); } 
        finally { setIsProcessing(null); }
    }, [slides]);
    
    const handleRefineContent = useCallback(async (slideIndex: number, instruction: string) => {
        const slide = slides[slideIndex];
        if (!slide) return;
        setIsProcessing({ slideIndex, type: 'text' });
        try {
            const response = await refineSlideContent(slide.title, slide.content, instruction);
            setSlides(prevSlides => {
                const newSlides = [...prevSlides];
                newSlides[slideIndex].content = response.text;
                return newSlides;
            });
        } catch (err) { console.error('Slide content refinement failed:', err); } 
        finally { setIsProcessing(null); }
    }, [slides]);

    const renderInitialView = () => ( <div className="flex flex-col gap-4"> <div> <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Presentation Prompt</label> <textarea id="prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A 10-minute presentation on the future of renewable energy..." className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> </div> <div className="flex items-center gap-2"> <label htmlFor="num-slides" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Number of Slides:</label> <input id="num-slides" type="number" value={numSlides} onChange={(e) => setNumSlides(Math.max(3, parseInt(e.target.value, 10)))} min="3" max="20" className="w-20 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> </div> <button onClick={handleSubmit} disabled={isLoading || !prompt.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isLoading ? <Spinner/> : 'Generate Presentation'}</button> </div> );
    const RefineDropdown = ({ slideIndex }: { slideIndex: number }) => ( <select onChange={(e) => handleRefineContent(slideIndex, e.target.value)} disabled={isProcessing?.slideIndex === slideIndex && isProcessing.type === 'text'} className="text-xs bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md p-1 appearance-none"> <option value="">Refine Content...</option> <option value="Make it more professional">Make Professional</option> <option value="Simplify the language">Simplify</option> <option value="Add more detail">Add Detail</option> </select> );
    const renderPresentationView = () => ( <div className="space-y-4"> {slides.map((slide, index) => ( <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4"> <div className="w-full sm:w-1/2 flex flex-col"> <h4 className="font-bold text-md text-brand-primary mb-2">Slide {index + 1}: {slide.title}</h4> <div className="prose prose-sm dark:prose-invert max-w-none flex-grow"> {isProcessing?.slideIndex === index && isProcessing.type === 'text' ? <Spinner/> : ( <ul className="list-disc pl-5 space-y-1 text-sm">{slide.content.split('\n').map((point, i) => point.trim() && <li key={i}>{point.replace(/^- /, '')}</li>)}</ul> )} </div> <div className="mt-auto pt-2"> <RefineDropdown slideIndex={index} /> </div> </div> <div className="w-full sm:w-1/2"> <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center"> {isProcessing?.slideIndex === index && isProcessing.type === 'image' && <Spinner/>} {slide.imageUrl && !(isProcessing?.slideIndex === index && isProcessing.type === 'image') && <img src={slide.imageUrl} alt={`Generated for "${slide.title}"`} className="w-full h-full object-cover rounded-md" />} {!slide.imageUrl && !(isProcessing?.slideIndex === index && isProcessing.type === 'image') && ( <button onClick={() => handleGenerateImage(index)} className="text-sm bg-brand-secondary/50 hover:bg-brand-secondary/80 text-white font-bold py-2 px-4 rounded-md">Generate Image</button> )} </div> </div> </div> ))} </div> );

    return <div className="h-full flex flex-col p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto">{isLoading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : <>{error && <p className="text-red-500 dark:text-red-400 text-sm text-center mb-2">{error}</p>}{slides.length === 0 ? renderInitialView() : renderPresentationView()}</>}</div>;
};

const MindMapTool: React.FC = () => {
    const [generationMode, setGenerationMode] = useState<GenerationModeMindMap>('topic');
    const [sourceInput, setSourceInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState('');
    const [mindMapContent, setMindMapContent] = useState('');
    const [copilotPrompt, setCopilotPrompt] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleGenerate = useCallback(async () => {
        if (!sourceInput.trim()) { setError(`Please enter a ${generationMode}.`); return; }
        setIsLoading(true); setError(''); setMindMapContent(''); setSuggestions([]);
        try {
            const response = await generateMindMap(sourceInput, generationMode);
            setMindMapContent(response.text);
        } catch (err) { setError('Failed to generate the mind map.'); } 
        finally { setIsLoading(false); }
    }, [sourceInput, generationMode]);

    const handleGetSuggestions = useCallback(async () => {
        if (!copilotPrompt.trim() || !mindMapContent.trim()) return;
        setIsSuggesting(true); setSuggestions([]);
        try {
            const response = await getMindMapSuggestions(mindMapContent, copilotPrompt);
            const suggestionLines = response.text.split('\n').filter(line => line.trim());
            setSuggestions(suggestionLines);
        } catch (err) { setError('Failed to get suggestions.'); } 
        finally { setIsSuggesting(false); }
    }, [mindMapContent, copilotPrompt]);

    return ( <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden"> <div className="flex flex-col gap-4 overflow-y-auto pr-2"> <div> <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Generation Mode</label> <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1"> <button onClick={() => setGenerationMode('topic')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'topic' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>From Topic</button> <button onClick={() => setGenerationMode('text')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'text' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>From Text</button> </div> </div> <div> <label htmlFor="source-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. {generationMode === 'topic' ? 'Topic' : 'Source Text'}</label> <textarea id="source-input" rows={generationMode === 'topic' ? 2 : 8} value={sourceInput} onChange={(e) => setSourceInput(e.target.value)} placeholder={generationMode === 'topic' ? 'e.g., The Future of AI' : 'Paste your text...'} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> </div> <button onClick={handleGenerate} disabled={isLoading || !sourceInput.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isLoading ? <Spinner/> : 'Generate Mind Map'}</button> {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>} {mindMapContent && ( <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"> <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">3. Copilot: Expand Your Map</h4> <textarea rows={2} value={copilotPrompt} onChange={e => setCopilotPrompt(e.target.value)} placeholder="e.g., Add a section about ethics" className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> <button onClick={handleGetSuggestions} disabled={isSuggesting || !copilotPrompt.trim()} className="w-full mt-2 py-2 px-4 bg-brand-secondary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isSuggesting ? <Spinner/> : 'Get Suggestions'}</button> {suggestions.length > 0 && ( <div className="mt-2 space-y-1">{suggestions.map((s, i) => <p key={i} className="text-xs p-1 bg-slate-200 dark:bg-slate-700/50 rounded">{s}</p>)}</div> )} </div> )} </div> <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto"> <div className="prose prose-invert prose-sm max-w-none"> {isLoading ? <div className="flex justify-center"><Spinner /></div> : mindMapContent ? <pre className="whitespace-pre-wrap font-sans">{mindMapContent}</pre> : <p className="text-slate-600 dark:text-slate-500">Your mind map will appear here.</p>} </div> </div> </div> );
};

const TestGeneratorTool: React.FC = () => {
    const [generationMode, setGenerationMode] = useState<GenerationModePaper>('topic');
    const [sourceContent, setSourceContent] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState('Medium');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<PaperResult | null>(null);
    const [activeTab, setActiveTab] = useState<OutputTabPaper>('paper');

    const handleSubmit = useCallback(async () => {
        if (!sourceContent.trim()) { setError(`Please enter a ${generationMode}.`); return; }
        setIsLoading(true); setError(''); setResult(null);
        try {
            const response = await generateQuestionPaper(generationMode, sourceContent, numQuestions, difficulty);
            const parsedResult = JSON.parse(response.text);
            setResult(parsedResult);
        } catch (err) { setError('Failed to generate the paper.'); } 
        finally { setIsLoading(false); }
    }, [generationMode, sourceContent, numQuestions, difficulty]);
    
    return ( <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden"> <div className="flex flex-col gap-4 overflow-y-auto pr-2"> <div> <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Generation Mode</label> <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1"> <button onClick={() => setGenerationMode('topic')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'topic' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>From Topic</button> <button onClick={() => setGenerationMode('syllabus')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'syllabus' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>From Syllabus</button> </div> </div> {generationMode === 'topic' ? ( <div> <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Topic</label> <input id="topic" type="text" value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} placeholder="e.g., The American Civil War" className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> </div> ) : ( <div> <label htmlFor="syllabus" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Syllabus / Content</label> <textarea id="syllabus" rows={5} value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} placeholder="Paste your syllabus or source material here..." className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> </div> )} <div className="grid grid-cols-2 gap-4"> <div> <label htmlFor="num-questions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"># of Questions</label> <input id="num-questions" type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10)))} min="1" max="50" className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" /> </div> <div> <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Difficulty</label> <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full text-sm bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2"> <option>Easy</option> <option>Medium</option> <option>Hard</option> </select> </div> </div> <button onClick={handleSubmit} disabled={isLoading || !sourceContent.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center mt-auto">{isLoading ? <Spinner/> : 'Generate Paper'}</button> {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>} </div> <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"> <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"> <div className="flex"> <button onClick={() => setActiveTab('paper')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'paper' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-600 dark:text-slate-400'}`}>Question Paper</button> <button onClick={() => setActiveTab('key')} disabled={!result} className={`py-2 px-4 text-sm font-medium ${activeTab === 'key' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-600 dark:text-slate-400'} disabled:opacity-50`}>Answer Key</button> </div> </div> <div className="flex-grow p-4 overflow-y-auto"> {isLoading && <div className="flex justify-center"><Spinner /></div>} {!isLoading && !result && <p className="text-slate-600 dark:text-slate-500">The generated paper will appear here.</p>} {result && ( <div className="prose prose-invert prose-sm max-w-none"> <pre className="whitespace-pre-wrap font-sans">{activeTab === 'paper' ? result.questionPaper : result.answerKey}</pre> </div> )} </div> </div> </div> );
};

const TestSolverTool: React.FC = () => {
    const [inputType, setInputType] = useState<InputTypeSolver>('image');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [textQuestion, setTextQuestion] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResponse('');
            setError('');
        }
    };

    const handleSubmit = useCallback(async () => {
        setIsLoading(true); setResponse(''); setError('');
        try {
            if (inputType === 'image') {
                if (!imageFile) { setError('Please upload an image.'); setIsLoading(false); return; }
                const base64Image = await fileToBase64(imageFile);
                const result = await analyzeImage("Solve the questions in this image step-by-step.", base64Image, imageFile.type);
                setResponse(result.text);
            } else {
                if (!textQuestion.trim()) { setError('Please enter a question.'); setIsLoading(false); return; }
                const result = await solveTextQuestion(textQuestion);
                setResponse(result.text);
            }
        } catch (err) { setError('Failed to get an answer.'); } 
        finally { setIsLoading(false); }
    }, [imageFile, textQuestion, inputType]);
    
    const isSubmitDisabled = isLoading || (inputType === 'image' && !imageFile) || (inputType === 'text' && !textQuestion.trim());

    return ( <div className="h-full grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-6 overflow-hidden"> <div className="flex flex-col gap-4 overflow-y-auto pr-2"> <div> <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Input Format</label> <div className="flex bg-slate-200 dark:bg-slate-700/50 rounded-md p-1"> <button onClick={() => setInputType('image')} className={`flex-1 text-sm p-2 rounded ${inputType === 'image' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Image</button> <button onClick={() => setInputType('text')} className={`flex-1 text-sm p-2 rounded ${inputType === 'text' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Text</button> </div> </div> {inputType === 'image' ? ( <div> <label htmlFor="image-upload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Upload Image</label> <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md"> <div className="space-y-1 text-center"> {previewUrl ? <img src={previewUrl} alt="Preview" className="mx-auto h-28 w-auto object-contain rounded-md" /> : <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>} <label htmlFor="qna-solver-input" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary"><span>{imageFile ? "Change image" : "Upload an image"}</span><input id="qna-solver-input" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} /></label> </div> </div> </div> ) : ( <div> <label htmlFor="text-question" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Enter Question</label> <textarea id="text-question" rows={8} value={textQuestion} onChange={(e) => setTextQuestion(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" placeholder="e.g., What is the powerhouse of the cell?" /> </div> )} <button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full mt-auto py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600">{isLoading ? 'Solving...' : 'Solve Question'}</button> {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>} </div> <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto"> <h3 className="font-semibold mb-2">Answer</h3> <div className="prose prose-invert prose-sm max-w-none"> {isLoading && <div className="flex justify-center"><Spinner /></div>} {!isLoading && !response && <p className="text-slate-600 dark:text-slate-500">The answer will appear here.</p>} {response && <pre className="font-sans whitespace-pre-wrap">{response}</pre>} </div> </div> </div> );
};


// --- Main Study Helper Component ---

const StudyHelper: React.FC = () => {
    const [activeTool, setActiveTool] = useState('presentation');

    const renderTool = () => {
        switch (activeTool) {
            case 'presentation': return <PresentationTool />;
            case 'mind-map': return <MindMapTool />;
            case 'generator': return <TestGeneratorTool />;
            case 'solver': return <TestSolverTool />;
            default: return null;
        }
    };
    
    const TABS = [
        { id: 'presentation', name: 'Presentation Studio' },
        { id: 'mind-map', name: 'Mind Map Creator' },
        { id: 'generator', name: 'Test Generator' },
        { id: 'solver', name: 'Question Solver' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTool(tab.id)}
                            className={`${
                                activeTool === tab.id
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow p-4 sm:p-6 overflow-hidden">
                {renderTool()}
            </div>
        </div>
    );
};

export default StudyHelper;