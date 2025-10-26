
import React, { useState, useCallback } from 'react';
import { generateImage } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const MediaGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError('');
        setImageUrl('');

        try {
            const response = await generateImage(prompt);
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const url = `data:image/jpeg;base64,${base64ImageBytes}`;
            setImageUrl(url);
        } catch (err) {
            console.error('Image generation failed:', err);
            setError('Failed to generate image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Media Generator</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A cute cat astronaut floating in space"
                    className="flex-grow bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt.trim()}
                    className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner/> : 'Generate'}
                </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex-grow bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center p-4">
                {isLoading && <Spinner />}
                {!isLoading && !imageUrl && <p className="text-slate-500">Your generated image will appear here.</p>}
                {imageUrl && <img src={imageUrl} alt={prompt} className="max-w-full max-h-full object-contain rounded-md" />}
            </div>
            {imageUrl && !isLoading && (
                <div className="mt-4 flex justify-center">
                    <a
                        href={imageUrl}
                        download={`${prompt.replace(/\s+/g, '_').slice(0, 30) || 'generated_image'}.jpg`}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2 transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Download Image</span>
                    </a>
                </div>
            )}
        </div>
    );
};

export default MediaGenerator;