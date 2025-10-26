import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import Spinner from '../common/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

type Mode = 'add' | 'remove';

const WatermarkStudio: React.FC = () => {
    const [mode, setMode] = useState<Mode>('remove');
    
    // Common State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // 'Add' Mode State
    const [text, setText] = useState('© My Brand');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [opacity, setOpacity] = useState(50);
    const [size, setSize] = useState(10);
    const [rotation, setRotation] = useState(-30);
    const [isTiled, setIsTiled] = useState(false);
    const [color, setColor] = useState('#ffffff');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResultUrl(null);
            setError('');
        }
    };
    
    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };
    
    const reset = () => {
        setImageFile(null);
        setPreviewUrl(null);
        setResultUrl(null);
        setError('');
    };

    const processImage = useCallback(async (prompt: string, parts: any[]) => {
        setIsLoading(true);
        setError('');
        setResultUrl(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] }
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                setResultUrl(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                throw new Error("The AI did not return an image.");
            }
        } catch (err: any) {
            setError(`Failed to process image: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRemoveWatermark = async () => {
        if (!imageFile) return;
        const base64 = await fileToBase64(imageFile);
        const imagePart = { inlineData: { data: base64, mimeType: imageFile.type } };
        const textPart = { text: "Detect and remove any visible watermarks from this image, filling in the area naturally and seamlessly to match the original photo." };
        processImage("Remove watermark", [imagePart, textPart]);
    };

    const handleAddWatermark = async () => {
        if (!imageFile) return;
        
        const mainImageBase64 = await fileToBase64(imageFile);
        const mainImagePart = { inlineData: { data: mainImageBase64, mimeType: imageFile.type } };
        
        let logoPart = null;
        if (logoFile) {
            const logoBase64 = await fileToBase64(logoFile);
            logoPart = { inlineData: { data: logoBase64, mimeType: logoFile.type } };
        }

        let placement = isTiled ? 'Tile the watermark across the entire image in a repeating diagonal pattern.' : 'Place the watermark tastefully in the bottom-right corner.';
        let content = `The watermark consists of the text "${text}" in the color ${color}.`;
        if (logoPart) {
            content = `The watermark consists of the provided logo image and the text "${text}" in the color ${color}.`;
        }

        const prompt = `Add a watermark to the main image. ${content} ${placement} Apply these parameters: size should be approximately ${size}% of the image width, opacity should be ${opacity}%, and rotation should be ${rotation} degrees.`;
        
        const parts: any[] = [mainImagePart];
        if (logoPart) parts.push(logoPart);
        parts.push({ text: prompt });
        
        processImage("Add watermark", parts);
    };

    const RemoveUI = () => (
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            {!previewUrl && (
                <div className="text-center">
                    <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Remove Watermark</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">A simple one-click process.</p>
                    <label htmlFor="watermark-upload" className="cursor-pointer block p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className="text-brand-primary font-semibold">Click to Upload Image</span>
                    </label>
                    <input id="watermark-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                </div>
            )}
            {previewUrl && !resultUrl && !isLoading && (
                 <div className="text-center">
                    <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded-md mb-4" />
                    <div className="flex gap-4">
                        <button onClick={reset} className="py-2 px-4 bg-slate-600 text-white rounded-md font-semibold">Change Image</button>
                        <button onClick={handleRemoveWatermark} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold">Remove Watermark</button>
                    </div>
                </div>
            )}
            {isLoading && <Spinner />}
            {resultUrl && (
                <div className="w-full">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><h5 className="font-semibold text-center mb-2">Before</h5><img src={previewUrl!} alt="Original" className="w-full object-contain rounded-md"/></div>
                        <div><h5 className="font-semibold text-center mb-2">After</h5><img src={resultUrl} alt="Result" className="w-full object-contain rounded-md"/></div>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button onClick={reset} className="py-2 px-4 bg-slate-600 text-white rounded-md font-semibold">Start Over</button>
                        <a href={resultUrl} download="watermark_removed.png" className="py-2 px-4 bg-green-600 text-white rounded-md font-semibold">Download</a>
                    </div>
                </div>
            )}
        </div>
    );
    
    const AddUI = () => (
        <div className="grid md:grid-cols-5 gap-6 h-full p-4 overflow-hidden">
            <div className="md:col-span-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center p-2">
                {!previewUrl && <label htmlFor="watermark-upload" className="cursor-pointer text-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg"><span className="text-brand-primary font-semibold">Upload Image</span></label>}
                {previewUrl && <img src={resultUrl || previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />}
            </div>
            <div className="md:col-span-2 flex flex-col gap-3 overflow-y-auto pr-2">
                <h4 className="font-semibold">Watermark Design</h4>
                <div><label className="text-sm">Text</label><input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md text-sm border border-slate-300 dark:border-slate-600" /></div>
                <div><label className="text-sm">Logo (Optional)</label>
                    <div className="flex items-center gap-2">
                        <label htmlFor="logo-upload" className="flex-1 text-center text-xs py-2 bg-slate-200 dark:bg-slate-700 rounded-md cursor-pointer">{logoFile ? "Change Logo" : "Upload Logo"}</label>
                        {logoPreview && <img src={logoPreview} alt="logo" className="h-8 w-8 object-contain" />}
                    </div>
                </div>
                <div><label className="text-sm">Opacity ({opacity}%)</label><input type="range" min="0" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full" /></div>
                <div><label className="text-sm">Size ({size}%)</label><input type="range" min="1" max="100" value={size} onChange={e => setSize(Number(e.target.value))} className="w-full" /></div>
                <div><label className="text-sm">Rotation ({rotation}°)</label><input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(Number(e.target.value))} className="w-full" /></div>
                <div className="flex items-center justify-between"><label className="text-sm">Text Color</label><input type="color" value={color} onChange={e => setColor(e.target.value)} /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={isTiled} onChange={e => setIsTiled(e.target.checked)} /> Tile Watermark</label>
                <button onClick={handleAddWatermark} disabled={isLoading || !imageFile} className="w-full py-2 bg-brand-primary text-white rounded-md font-semibold flex justify-center mt-auto disabled:bg-slate-400">{isLoading ? <Spinner/> : 'Apply Watermark'}</button>
            </div>
            <input id="watermark-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
            <input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoFileChange} />
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold mb-2">Watermark Studio</h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1 w-fit">
                    <button onClick={() => { setMode('remove'); reset(); }} className={`px-3 py-1 text-sm rounded ${mode === 'remove' ? 'bg-brand-primary text-white' : ''}`}>Remove</button>
                    <button onClick={() => { setMode('add'); reset(); }} className={`px-3 py-1 text-sm rounded ${mode === 'add' ? 'bg-brand-primary text-white' : ''}`}>Add</button>
                </div>
            </div>
            {error && <p className="p-2 text-center text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">{error}</p>}
            {mode === 'remove' ? <RemoveUI /> : <AddUI />}
        </div>
    );
};

export default WatermarkStudio;