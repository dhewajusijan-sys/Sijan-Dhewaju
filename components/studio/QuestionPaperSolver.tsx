import React, { useState, useCallback } from 'react';
import { analyzeImage, solveTextQuestion } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

type InputType = 'image' | 'text';

const QuestionPaperSolver: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>('image');
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
    setIsLoading(true);
    setResponse('');
    setError('');

    try {
        if (inputType === 'image') {
            if (!imageFile) {
              setError('Please upload an image of the document.');
              setIsLoading(false);
              return;
            }
            const base64Image = await fileToBase64(imageFile);
            const prompt = "Provide instant, step-by-step answers for each academic question in this image.";
            const result = await analyzeImage(prompt, base64Image, imageFile.type);
            setResponse(result.text);
        } else { // 'text'
            if (!textQuestion.trim()) {
              setError('Please enter a question to solve.');
              setIsLoading(false);
              return;
            }
            const result = await solveTextQuestion(textQuestion);
            setResponse(result.text);
        }
    } catch (err) {
      console.error('Question Solver failed:', err);
      setError('Failed to get an answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, textQuestion, inputType]);
  
  const isSubmitDisabled = isLoading || (inputType === 'image' && !imageFile) || (inputType === 'text' && !textQuestion.trim());

  return (
    <div className="p-3 h-full flex flex-col">
        <h3 className="text-xl font-bold mb-4">Question Solver</h3>
        <div className="flex-grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-6 overflow-hidden">
            <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">1. Choose Input Format</label>
                    <div className="flex bg-slate-700/50 rounded-md p-1">
                        <button onClick={() => setInputType('image')} className={`flex-1 text-sm p-2 rounded ${inputType === 'image' ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>Image</button>
                        <button onClick={() => setInputType('text')} className={`flex-1 text-sm p-2 rounded ${inputType === 'text' ? 'bg-brand-primary' : 'hover:bg-slate-600'}`}>Text</button>
                         <button disabled className={`flex-1 text-sm p-2 rounded relative opacity-50 cursor-not-allowed`}>PDF <span className="absolute top-0 right-1 text-xs text-slate-400">Soon</span></button>
                    </div>
                </div>

                {inputType === 'image' && (
                    <div>
                        <label htmlFor="image-upload" className="block text-sm font-medium text-slate-300 mb-2">2. Upload Question Image</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {previewUrl ? 
                                    <img src={previewUrl} alt="Preview" className="mx-auto h-28 w-auto object-contain rounded-md" /> :
                                    <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                }
                                <div className="flex text-sm text-slate-400 justify-center">
                                    <label htmlFor="qna-solver-input" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:ring-brand-primary px-1">
                                        <span>{imageFile ? "Change image" : "Upload an image"}</span>
                                        <input id="qna-solver-input" name="qna-solver-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500">PNG, JPG, up to 10MB</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {inputType === 'text' && (
                    <div>
                        <label htmlFor="text-question" className="block text-sm font-medium text-slate-300 mb-1">2. Enter Your Question</label>
                        <textarea
                            id="text-question"
                            rows={8}
                            value={textQuestion}
                            onChange={(e) => setTextQuestion(e.target.value)}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                            placeholder="e.g., What is the powerhouse of the cell? Explain in detail."
                        />
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    className="w-full mt-auto py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Solving...' : 'Solve Question'}
                </button>
                 {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 overflow-y-auto">
                <h3 className="font-semibold mb-2">Answer</h3>
                <div className="prose prose-invert prose-sm max-w-none">
                    {isLoading && <div className="flex justify-center"><Spinner /></div>}
                    {!isLoading && !response && <p className="text-slate-500">The step-by-step answer will appear here.</p>}
                    {response && <pre className="font-sans whitespace-pre-wrap">{response}</pre>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default QuestionPaperSolver;