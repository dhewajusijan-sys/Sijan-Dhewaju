import React, { useState, useCallback, useRef } from 'react';
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

interface GeneratedModel {
    url: string;
    base64: string;
    mimeType: string;
}

const ThreeDCreator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedModel, setGeneratedModel] = useState<GeneratedModel | null>(null);
    
    const [texturePrompt, setTexturePrompt] = useState('');
    const [isTexturing, setIsTexturing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim() && !imageFile) {
            setError('Please provide a text prompt or upload a reference image.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedModel(null);

        try {
            if (imageFile) { // Image-to-3D
                const base64 = await fileToBase64(imageFile);
                const fullPrompt = `Convert this 2D image into a photorealistic 3D model render. The model should be centered on a plain, dark background with studio lighting. ${prompt ? `Incorporate this style: "${prompt}"` : ''}`;
                const response = await editImage(fullPrompt, base64, imageFile.type);
                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    setGeneratedModel({
                        url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                        base64: imagePart.inlineData.data,
                        mimeType: imagePart.inlineData.mimeType,
                    });
                } else {
                    throw new Error("AI did not return a 3D model image.");
                }
            } else { // Text-to-3D
                const fullPrompt = `Create a photorealistic, high-detail, 4K, 3D model render of: "${prompt}". The model should be centered on a plain, dark background with professional studio lighting.`;
                const response = await generateImage(fullPrompt, 1, "16:9");
                const base64 = response.generatedImages[0].image.imageBytes;
                setGeneratedModel({
                    url: `data:image/jpeg;base64,${base64}`,
                    base64: base64,
                    mimeType: 'image/jpeg',
                });
            }
        } catch (err) {
            console.error('3D model generation failed:', err);
            setError('Failed to generate the 3D asset. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, imageFile]);

    const handleRefine = useCallback(async (refineType: 'texture' | 'mesh', instruction: string) => {
        if (!generatedModel) return;
        
        let processStateSetter: React.Dispatch<React.SetStateAction<boolean>>;
        let promptPrefix = '';

        if (refineType === 'texture') {
            if (!texturePrompt.trim()) return;
            processStateSetter = setIsTexturing;
            promptPrefix = `Apply a new texture to this 3D model. The texture should be: "${instruction}". Maintain the model's shape and lighting.`;
        } else { // mesh
            processStateSetter = setIsOptimizing;
            promptPrefix = `Re-render this 3D model with a different mesh complexity. The style should be: "${instruction}".`;
        }

        processStateSetter(true);
        setError('');

        try {
            const response = await editImage(promptPrefix, generatedModel.base64, generatedModel.mimeType);
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                setGeneratedModel({
                    url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                    base64: imagePart.inlineData.data,
                    mimeType: imagePart.inlineData.mimeType,
                });
                if (refineType === 'texture') setTexturePrompt('');
            } else {
                 throw new Error("AI did not return a refined model image.");
            }
        } catch (err) {
            setError('Failed to refine the asset.');
        } finally {
            processStateSetter(false);
        }

    }, [generatedModel, texturePrompt]);

    return (
        <div className="p-3 h-full flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">3D Creator</h3>
            <div className="flex-grow grid md:grid-cols-5 gap-6 overflow-hidden">
                {/* Left Panel: Generation */}
                <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2 border-r border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">Generate Model</h4>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">From Text Prompt</label>
                        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A rusty sci-fi drone" className="w-full text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-2 rounded-md" />
                    </div>
                     <div className="flex items-center"><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div><span className="flex-shrink mx-2 text-xs text-slate-500">OR</span><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div></div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">From 2D Image</label>
                        <div className="w-full h-24 border-2 border-dashed border-slate-400 dark:border-slate-600 rounded-md flex items-center justify-center text-center">
                            {previewUrl ? <img src={previewUrl} alt="preview" className="max-h-full max-w-full object-contain" /> : <label htmlFor="asset-upload" className="cursor-pointer text-xs text-slate-500 hover:text-brand-primary">Click to upload</label>}
                        </div>
                        <input id="asset-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <button onClick={handleSubmit} disabled={isLoading} className="w-full py-2 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">{isLoading ? <Spinner/> : 'Generate Asset'}</button>
                </div>

                {/* Center Panel: Viewport */}
                <div className="md:col-span-3 bg-slate-200 dark:bg-black rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4 overflow-hidden">
                    {isLoading ? <div className="text-center"><Spinner /><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Generating 3D asset...</p></div> : 
                     !generatedModel ? <p className="text-slate-500 text-center">3D Viewport</p> :
                     <img src={generatedModel.url} alt="Generated 3D asset" className="max-w-full max-h-full object-contain" />
                    }
                </div>

                {/* Right Panel: Refinement */}
                <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                     <h4 className="font-semibold text-slate-700 dark:text-slate-300">Refine Model</h4>
                     {generatedModel ? (
                         <>
                            <div>
                                <h5 className="text-sm font-semibold mb-2">AI Texturing</h5>
                                <textarea rows={3} value={texturePrompt} onChange={e => setTexturePrompt(e.target.value)} placeholder="e.g., a weathered stone texture" className="w-full text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-2 rounded-md"/>
                                <button onClick={() => handleRefine('texture', texturePrompt)} disabled={isTexturing || !texturePrompt.trim()} className="w-full text-sm py-2 mt-1 bg-brand-secondary/80 hover:bg-brand-secondary text-white rounded-md disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isTexturing ? <Spinner/> : 'Apply Texture'}</button>
                            </div>
                             <div>
                                <h5 className="text-sm font-semibold mb-2">Mesh Optimization</h5>
                                 <div className="space-y-2">
                                    <button onClick={() => handleRefine('mesh', 'low-poly, geometric style')} disabled={isOptimizing} className="w-full text-sm py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md">Low Poly</button>
                                    <button onClick={() => handleRefine('mesh', 'high-poly, highly detailed and complex')} disabled={isOptimizing} className="w-full text-sm py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md">High Poly</button>
                                 </div>
                                 {isOptimizing && <div className="flex justify-center mt-2"><Spinner/></div>}
                            </div>
                            <div className="mt-auto flex flex-col gap-2">
                                <button disabled className="w-full text-sm py-2 bg-green-600 rounded-md opacity-50 text-white">Export (.glb)</button>
                                <button disabled className="w-full text-sm py-2 bg-green-600 rounded-md opacity-50 text-white">Export (.obj)</button>
                            </div>
                         </>
                     ) : <p className="text-xs text-slate-500 text-center">Generate an asset to enable refinement tools.</p>}
                     {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default ThreeDCreator;