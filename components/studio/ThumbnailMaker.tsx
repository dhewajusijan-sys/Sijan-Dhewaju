import React, { useState, useCallback, useEffect } from 'react';
import { generateImage, editImage } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

interface ThumbnailMakerProps {
    initialData?: string[];
}

const ThumbnailMaker: React.FC<ThumbnailMakerProps> = ({ initialData }) => {
    const [title, setTitle] = useState('');
    const [style, setStyle] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
    
    useEffect(() => {
        if(initialData) {
            setThumbnails(initialData);
        }
    }, [initialData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!title.trim()) {
            setError('Please enter a video title.');
            return;
        }

        setIsLoading(true);
        setError('');
        setThumbnails([]);
        setSelectedThumbnail(null);

        try {
            if (imageFile && previewUrl) {
                // Use editImage with photo upload
                const base64Image = await fileToBase64(imageFile);
                const prompt = `Turn this image into a vibrant, high-contrast, clickbait-style YouTube thumbnail for a video titled "${title}". Key elements to add: ${style || 'bright colors and bold text'}. The style should be eye-catching. Do not include gibberish or unreadable text; if text is used, it should be the video title. Output a 16:9 aspect ratio image.`;
                const response = await editImage(prompt, base64Image, imageFile.type);
                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    setThumbnails([url]);
                } else {
                    throw new Error("AI did not return an image.");
                }
            } else {
                // Use generateImage for text-only
                const prompt = `Generate 4 vibrant, high-contrast, clickbait-style YouTube thumbnails for a video titled "${title}". Key elements to include: ${style || 'bright colors and bold text'}. The style should be eye-catching with clear imagery. Do not include gibberish or unreadable text; if text is used, it should be the video title. Aspect ratio 16:9.`;
                const response = await generateImage(prompt, 4, '16:9');
                const urls = response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
                setThumbnails(urls);
            }
        } catch (err) {
            console.error('Thumbnail generation failed:', err);
            setError('Failed to generate thumbnails. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [title, style, imageFile, previewUrl]);

    const renderInitialView = () => (
        <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Upload a Photo (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        {previewUrl ? <img src={previewUrl} alt="Preview" className="mx-auto h-24 w-auto object-contain rounded-md" /> : <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>}
                        <label htmlFor="thumb-img-input" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary"><span>{imageFile ? "Change photo" : "Upload a photo"}</span><input id="thumb-img-input" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} /></label>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="thumb-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Video Title</label>
                <input id="thumb-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., My Trip to the Himalayas" className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" />
            </div>
            <div>
                <label htmlFor="thumb-style" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">3. Style & Key Elements</label>
                <textarea id="thumb-style" rows={3} value={style} onChange={e => setStyle(e.target.value)} placeholder="e.g., shocking face, bright yellow text" className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading || !title.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
                {isLoading ? <Spinner/> : 'Generate Thumbnails'}
            </button>
            {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
        </div>
    );

    const renderResultsView = () => (
        <div className="md:col-span-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
            {selectedThumbnail ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <img src={selectedThumbnail} alt="Selected thumbnail" className="max-w-full max-h-[80%] object-contain rounded-md" />
                    <div className="flex gap-2">
                         <a href={selectedThumbnail} download="thumbnail.jpg" className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md">Download</a>
                         <button onClick={() => setSelectedThumbnail(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-md">Back to Options</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <p className="font-semibold mb-2">Select a thumbnail to enlarge</p>
                    <div className={`grid gap-4 ${thumbnails.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
                        {thumbnails.map((url, i) => (
                            <button key={i} onClick={() => setSelectedThumbnail(url)}>
                                <img src={url} alt={`Thumbnail option ${i+1}`} className="w-full h-auto object-contain rounded-md border-2 border-transparent hover:border-brand-primary" />
                            </button>
                        ))}
                    </div>
                     <button onClick={() => { setThumbnails([]); setError('') }} className="text-sm text-brand-primary hover:underline mt-4">Start Over</button>
                </div>
            )}
        </div>
    );
    
    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
                {renderInitialView()}
                {isLoading ? (
                    <div className="md:col-span-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center"><Spinner /></div>
                ) : thumbnails.length > 0 ? (
                    renderResultsView()
                ) : (
                    <div className="md:col-span-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center"><p className="text-slate-600 dark:text-slate-500">Thumbnails will appear here.</p></div>
                )}
            </div>
        </div>
    );
};

export default ThumbnailMaker;
