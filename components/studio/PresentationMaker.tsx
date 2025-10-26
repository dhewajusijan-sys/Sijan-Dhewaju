
import React, { useState, useCallback } from 'react';
import { generatePresentation, generateImage, refineSlideContent } from '../../services/geminiService';
import Spinner from '../common/Spinner';

interface Slide {
    title: string;
    content: string;
    imageUrl?: string;
}

type ProcessingState = {
    slideIndex: number;
    type: 'image' | 'text';
} | null;

const INSPIRATION_THUMBNAILS = [
    { title: "Corporate Report", url: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300" },
    { title: "Creative Pitch", url: "https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=300" },
    { title: "Academic Lecture", url: "https://images.pexels.com/photos/267507/pexels-photo-267507.jpeg?auto=compress&cs=tinysrgb&w=300" }
];

const PresentationMaker: React.FC = () => {
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
            console.error('Presentation generation failed:', err);
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
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const url = `data:image/jpeg;base64,${base64ImageBytes}`;

            setSlides(prevSlides => {
                const newSlides = [...prevSlides];
                newSlides[slideIndex].imageUrl = url;
                return newSlides;
            });
        } catch (err) {
            console.error('Image generation for slide failed:', err);
            // Optionally, set a slide-specific error
        } finally {
            setIsProcessing(null);
        }
    }, [slides]);
    
    const handleRefineContent = useCallback(async (slideIndex: number, instruction: string) => {
        const slide = slides[slideIndex];
        if (!slide) return;

        setIsProcessing({ slideIndex, type: 'text' });
        try {
            const response = await refineSlideContent(slide.title, slide.content, instruction);
            const newContent = response.text;
            
             setSlides(prevSlides => {
                const newSlides = [...prevSlides];
                newSlides[slideIndex].content = newContent;
                return newSlides;
            });

        } catch (err) {
            console.error('Slide content refinement failed:', err);
        } finally {
            setIsProcessing(null);
        }
    }, [slides]);

    const renderInitialView = () => (
        <div className="flex flex-col gap-4">
            <div className="mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 text-center">Get Inspired by Style</p>
                <div className="grid grid-cols-3 gap-3">
                    {INSPIRATION_THUMBNAILS.map(thumb => (
                        <div key={thumb.title} className="text-center">
                            <img src={thumb.url} alt={thumb.title} className="w-full h-20 object-cover rounded-md"/>
                            <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">{thumb.title}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Presentation Prompt</label>
                <textarea
                    id="prompt"
                    rows={5}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A 10-minute presentation on the future of renewable energy, focusing on solar and wind power innovations."
                    className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="num-slides" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Number of Slides:</label>
                <input
                    id="num-slides"
                    type="number"
                    value={numSlides}
                    onChange={(e) => setNumSlides(Math.max(3, parseInt(e.target.value, 10)))}
                    min="3"
                    max="20"
                    className="w-20 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
            </div>
            <button
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
                className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? <Spinner/> : 'Generate Presentation'}
            </button>
        </div>
    );
    
    const RefineDropdown = ({ slideIndex }: { slideIndex: number }) => (
      <div className="relative inline-block text-left">
        <select 
          onChange={(e) => handleRefineContent(slideIndex, e.target.value)}
          disabled={isProcessing?.slideIndex === slideIndex && isProcessing.type === 'text'}
          className="text-xs bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md p-1 appearance-none"
        >
          <option value="">Refine Content...</option>
          <option value="Make it more professional">Make Professional</option>
          <option value="Simplify the language">Simplify</option>
          <option value="Add more detail">Add Detail</option>
        </select>
      </div>
    );

    const renderPresentationView = () => (
         <div className="space-y-4">
            {slides.map((slide, index) => (
                <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/2 flex flex-col">
                        <h4 className="font-bold text-md text-brand-primary mb-2">Slide {index + 1}: {slide.title}</h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none flex-grow">
                            {isProcessing?.slideIndex === index && isProcessing.type === 'text' ? <Spinner/> : (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    {slide.content.split('\n').map((point, i) => point.trim() && <li key={i}>{point.replace(/^- /, '')}</li>)}
                                </ul>
                            )}
                        </div>
                         <div className="mt-auto pt-2 flex items-center gap-2">
                            <RefineDropdown slideIndex={index} />
                         </div>
                    </div>
                    <div className="w-full sm:w-1/2">
                        <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center">
                           {isProcessing?.slideIndex === index && isProcessing.type === 'image' && <Spinner/>}
                           {slide.imageUrl && !(isProcessing?.slideIndex === index && isProcessing.type === 'image') && <img src={slide.imageUrl} alt={`Generated for "${slide.title}"`} className="w-full h-full object-cover rounded-md" />}
                           {!slide.imageUrl && !(isProcessing?.slideIndex === index && isProcessing.type === 'image') && (
                               <button onClick={() => handleGenerateImage(index)} className="text-sm bg-brand-secondary/50 hover:bg-brand-secondary/80 text-white font-bold py-2 px-4 rounded-md">
                                  Generate Image
                               </button>
                           )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Presentation Studio</h3>
                {slides.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button disabled className="text-sm py-1 px-3 bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-md cursor-not-allowed">Design / Theme</button>
                        <button disabled className="text-sm py-1 px-3 bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-md cursor-not-allowed">Share</button>
                        <button disabled className="text-sm py-1 px-3 bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-md cursor-not-allowed">Export</button>
                    </div>
                )}
            </div>
            
            <div className="flex-grow bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
                {isLoading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
                {!isLoading && !error && slides.length === 0 && renderInitialView()}
                {!isLoading && slides.length > 0 && renderPresentationView()}
            </div>
        </div>
    );
};

export default PresentationMaker;