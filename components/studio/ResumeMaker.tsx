import React, { useState, useCallback } from 'react';
import { editText } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const ResumeMaker: React.FC = () => {
    const [prompt, setPrompt] = useState('Proofread and improve the tone.');
    const [textToEdit, setTextToEdit] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [editedText, setEditedText] = useState('');

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim() || !textToEdit.trim()) {
            setError('Please provide text to edit and an instruction.');
            return;
        }
        setIsLoading(true);
        setError('');
        setEditedText('');
        try {
            const response = await editText(prompt, textToEdit);
            setEditedText(response.text);
        } catch (err) {
            console.error('Text editing failed:', err);
            setError('Failed to edit text. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, textToEdit]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Resume Improver</h3>
            <div className="flex-grow grid md:grid-cols-2 gap-4 overflow-hidden">
                <div className="flex flex-col gap-4">
                    <label htmlFor="text-to-edit" className="block text-sm font-medium text-slate-300">Your Resume/Text</label>
                    <textarea
                        id="text-to-edit"
                        value={textToEdit}
                        onChange={(e) => setTextToEdit(e.target.value)}
                        className="w-full flex-grow bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                        placeholder="Paste your resume content or any text here..."
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <label htmlFor="prompt" className="block text-sm font-medium text-slate-300">How should I improve it?</label>
                    <textarea
                        id="prompt"
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                        placeholder="e.g., Make it more professional for a software engineer role."
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !prompt.trim() || !textToEdit.trim()}
                        className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <Spinner/> : 'Improve Text'}
                    </button>
                    <div className="flex-grow bg-slate-900/50 rounded-lg border border-slate-700 p-4 overflow-y-auto">
                        <h4 className="font-semibold mb-2">Result</h4>
                        <div className="prose prose-invert prose-sm max-w-none">
                            {isLoading && <Spinner />}
                            {error && <p className="text-red-400">{error}</p>}
                            {editedText ? <p>{editedText}</p> : !isLoading && <p className="text-slate-500">The improved text will appear here.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeMaker;
