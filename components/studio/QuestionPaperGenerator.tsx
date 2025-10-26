import React, { useState, useCallback } from 'react';
import { generateQuestionPaper } from '../../services/geminiService';
import Spinner from '../common/Spinner';

type GenerationMode = 'topic' | 'syllabus';
type OutputTab = 'paper' | 'key';

interface PaperResult {
    questionPaper: string;
    answerKey: string;
}

const QuestionPaperGenerator: React.FC = () => {
    const [generationMode, setGenerationMode] = useState<GenerationMode>('topic');
    const [sourceContent, setSourceContent] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [instructions, setInstructions] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [institutionName, setInstitutionName] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<PaperResult | null>(null);
    const [activeTab, setActiveTab] = useState<OutputTab>('paper');

    const handleSubmit = useCallback(async () => {
        if (!sourceContent.trim()) {
            setError(`Please enter a ${generationMode} to generate questions from.`);
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await generateQuestionPaper(generationMode, sourceContent, numQuestions, difficulty, institutionName, instructions);
            const parsedResult = JSON.parse(response.text);
            setResult(parsedResult);
        } catch (err) {
            console.error('Question paper generation failed:', err);
            setError('Failed to generate the question paper. The response may have been invalid. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [generationMode, sourceContent, numQuestions, difficulty, institutionName, instructions]);

    const handleCopy = () => {
        if (!result) return;
        const textToCopy = activeTab === 'paper' ? result.questionPaper : result.answerKey;
        navigator.clipboard.writeText(textToCopy);
    };

    const handleDownload = () => {
        if (!result) return;
        const content = activeTab === 'paper' ? result.questionPaper : result.answerKey;
        const filename = activeTab === 'paper' ? 'question_paper.txt' : 'answer_key.txt';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-3 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Question Paper Generator</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">1. Generation Mode</label>
                        <div className="flex bg-slate-700/50 rounded-md p-1">
                            <button onClick={() => setGenerationMode('topic')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'topic' ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>From Topic</button>
                            <button onClick={() => setGenerationMode('syllabus')} className={`flex-1 text-sm p-2 rounded ${generationMode === 'syllabus' ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>From Syllabus</button>
                        </div>
                    </div>
                    
                    {generationMode === 'topic' ? (
                         <div>
                            <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-1">2. Topic</label>
                            <input
                                id="topic"
                                type="text"
                                value={sourceContent}
                                onChange={(e) => setSourceContent(e.target.value)}
                                placeholder="e.g., The American Civil War"
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="syllabus" className="block text-sm font-medium text-slate-300 mb-1">2. Syllabus / Content</label>
                            <textarea
                                id="syllabus"
                                rows={5}
                                value={sourceContent}
                                onChange={(e) => setSourceContent(e.target.value)}
                                placeholder="Paste your syllabus, a chapter from a textbook, or any source material here..."
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary resize-y"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="institution" className="block text-sm font-medium text-slate-300 mb-1">Institution (Optional)</label>
                            <input id="institution" type="text" value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="e.g., Springfield University" className="w-full text-sm bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary" />
                        </div>
                         <div>
                            <label htmlFor="difficulty" className="block text-sm font-medium text-slate-300 mb-1">Difficulty</label>
                            <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full text-sm bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary">
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                        </div>
                    </div>

                     <div>
                        <label htmlFor="num-questions" className="block text-sm font-medium text-slate-300 mb-1">Number of Questions</label>
                        <input id="num-questions" type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10)))} min="1" max="50" className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary" />
                    </div>

                    <div>
                        <label htmlFor="instructions" className="block text-sm font-medium text-slate-300 mb-1">Instructions (Optional)</label>
                        <textarea id="instructions" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g., Include 5 multiple choice and 5 short answer questions. Total marks: 100." className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary resize-y" />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !sourceContent.trim()}
                        className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-auto"
                    >
                        {isLoading ? <Spinner/> : 'Generate Paper'}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex">
                            <button onClick={() => setActiveTab('paper')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'paper' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-400'}`}>Question Paper</button>
                            <button onClick={() => setActiveTab('key')} disabled={!result} className={`py-2 px-4 text-sm font-medium ${activeTab === 'key' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-400'} disabled:opacity-50`}>Answer Key</button>
                        </div>
                        {result && (
                            <div className="flex items-center gap-2 pr-4">
                                <button onClick={handleCopy} className="text-xs p-1 hover:bg-slate-700 rounded">Copy</button>
                                <button onClick={handleDownload} className="text-xs p-1 hover:bg-slate-700 rounded">Download</button>
                            </div>
                        )}
                    </div>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {isLoading && <div className="flex justify-center"><Spinner /></div>}
                        {!isLoading && !result && <p className="text-slate-500">The generated paper and answer key will appear here.</p>}
                        {result && (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap font-sans">
                                    {activeTab === 'paper' ? result.questionPaper : result.answerKey}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionPaperGenerator;