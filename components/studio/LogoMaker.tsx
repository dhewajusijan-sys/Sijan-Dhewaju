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

const VISUAL_STYLES = ['Minimalist', 'Geometric', '3D', 'Abstract', 'Vintage', 'Hand-drawn'];
const COLOR_PALETTES = ['Vibrant & Colorful', 'Monochromatic Black & White', 'Earthy Tones', 'Pastel Colors', 'Blue & Gold'];

interface LogoMakerProps {
    initialData?: { url: string; base64: string; }[];
}

const LogoMaker: React.FC<LogoMakerProps> = ({ initialData }) => {
    const [prompt, setPrompt] = useState('');
    const [referenceImage, setReferenceImage] = useState<{file: File, url: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [logos, setLogos] = useState<{ url: string, base64: string }[]>([]);
    const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
    const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);

    useEffect(() => {
        if(initialData) {
            setLogos(initialData);
        }
    }, [initialData]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReferenceImage({ file, url: URL.createObjectURL(file) });
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a description for your logo.');
            return;
        }
        setIsLoading(true);
        setError('');
        setLogos([]);

        try {
            if (referenceImage) {
                 const base64 = await fileToBase64(referenceImage.file);
                 const fullPrompt = `Using the supplied image as a reference or sketch, generate a professional, clean, modern logo based on this description: "${prompt}". The style should be ${selectedStyle} using a ${selectedPalette} color palette. The logo should be on a solid white background. Generate 4 variations.`;
                 const response = await editImage(fullPrompt, base64, referenceImage.file.type);
                 const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                 if (imagePart?.inlineData) {
                     const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                     setLogos([{ url, base64: imagePart.inlineData.data }]);
                 } else {
                     throw new Error("AI did not return a logo image.");
                 }
            } else {
                const finalPrompt = `A logo for "${prompt}". Style: ${selectedStyle}. Color Palette: ${selectedPalette}. The logo should be professional, clean, modern, and suitable for branding. It must be on a solid white background, presented as a flat vector-style graphic.`;
                const response = await generateImage(finalPrompt, 4, "1:1");
                const generatedLogos = response.generatedImages.map(img => ({
                    url: `data:image/jpeg;base64,${img.image.imageBytes}`,
                    base64: img.image.imageBytes,
                }));
                setLogos(generatedLogos);
            }
        } catch (err) {
            console.error('Logo generation failed:', err);
            setError('Failed to generate logos. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, referenceImage, selectedStyle, selectedPalette]);

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Logo Maker</h3>
            <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
                {/* Left Panel: Controls */}
                <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1. Description</label>
                        <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'Starlight Cafe', a coffee shop with a space theme." className="w-full text-sm bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 p-2 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Reference Image (Optional)</label>
                        <div className="w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md flex items-center justify-center text-center">
                            {referenceImage ? <img src={referenceImage.url} alt="reference" className="max-h-full max-w-full object-contain" /> : <label htmlFor="logo-ref-upload" className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-brand-primary">Click to upload sketch</label>}
                        </div>
                        <input id="logo-ref-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">3. Visual Style</label>
                        <div className="flex flex-wrap gap-2">
                           {VISUAL_STYLES.map(style => (
                                <button key={style} onClick={() => setSelectedStyle(style)} className={`text-xs px-3 py-1 rounded-full ${selectedStyle === style ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{style}</button>
                           ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">4. Color Palette</label>
                        <div className="flex flex-wrap gap-2">
                           {COLOR_PALETTES.map(palette => (
                                <button key={palette} onClick={() => setSelectedPalette(palette)} className={`text-xs px-3 py-1 rounded-full ${selectedPalette === palette ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{palette}</button>
                           ))}
                        </div>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full py-2 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">{isLoading ? <Spinner /> : 'Generate Concepts'}</button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>

                {/* Right Panel: Results */}
                <div className="md:col-span-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4 overflow-hidden">
                     <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 self-start">Generated Concepts</h4>
                    <div className="flex-grow w-full flex items-center justify-center">
                        {isLoading && <Spinner />}
                        {!isLoading && logos.length === 0 && <p className="text-slate-600 dark:text-slate-500 text-center">Logo variations will appear here.</p>}
                        {logos.length > 0 && (
                            <div className={`grid gap-4 ${logos.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                                {logos.map((logo, i) => (
                                    <a key={i} href={logo.url} download={`logo_${i+1}.jpg`} className="bg-white p-2 rounded-md shadow-sm hover:shadow-lg transition-shadow">
                                        <img src={logo.url} alt={`Logo option ${i+1}`} className="w-full h-auto object-contain" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoMaker;