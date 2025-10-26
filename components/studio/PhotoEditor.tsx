import React, { useState, useCallback } from 'react';
import { editImage, generateImage } from '../../services/geminiService';
import Spinner from '../common/Spinner';

type EditorMode = 'generate' | 'edit' | 'upscale';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const EDITING_TOOLS = [
  { id: 'edit-with-text', name: 'Edit with Text', description: 'Describe any change you want.', requiresInput: true, placeholder: 'e.g., make the sky look like a sunset' },
  { id: 'object-removal', name: 'Object Removal', description: 'Remove an object from the image.', requiresInput: true, placeholder: 'e.g., the red car' },
  { id: 'background-remover', name: 'Background Remover', description: 'Isolate the subject on a white background.', requiresInput: false, placeholder: '' },
  { id: 'skin-retouch', name: 'Skin Retouch', description: 'Retouch skin for a smoother look.', requiresInput: false, placeholder: '' },
  { id: 'image-restorer', name: 'Image Restorer', description: 'Restore old or damaged photos.', requiresInput: false, placeholder: '' },
  { id: 'background-replacer', name: 'Background Replacer', description: 'Replace the background with a scene.', requiresInput: true, placeholder: 'e.g., a sunny beach with palm trees' },
  { id: 'cinematic-converter', name: 'Cinematic Converter', description: 'Give the image a cinematic look.', requiresInput: false, placeholder: '' },
];

interface SourceImage {
  base64: string;
  mimeType: string;
  url: string;
}

const PhotoEditor: React.FC = () => {
  const [mode, setMode] = useState<EditorMode>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Source can be uploaded or generated
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  // Result is from editing or upscaling
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  // Inputs
  const [prompt, setPrompt] = useState(''); // For generate mode
  const [activeToolId, setActiveToolId] = useState(EDITING_TOOLS[0].id); // For edit mode
  const [textInput, setTextInput] = useState(''); // For edit mode tools
  
  const activeTool = EDITING_TOOLS.find(t => t.id === activeToolId);
  
  const resetState = () => {
      setSourceImage(null);
      setResultImageUrl(null);
      setPrompt('');
      setTextInput('');
      setError('');
  };

  const handleModeChange = (newMode: EditorMode) => {
    setMode(newMode);
    setError('');
    // If switching to a mode that requires an image, but there is none, reset
    if ((newMode === 'edit' || newMode === 'upscale') && !sourceImage) {
      resetState();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setSourceImage({
          base64,
          mimeType: file.type,
          url: URL.createObjectURL(file),
        });
        setResultImageUrl(null);
        setError('');
      } catch (err) {
        setError('Failed to read the image file.');
      }
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { setError('Please enter a prompt.'); return; }
    setIsLoading(true);
    resetState();
    try {
      const response = await generateImage(prompt);
      const base64 = response.generatedImages[0].image.imageBytes;
      setSourceImage({
        base64,
        mimeType: 'image/jpeg',
        url: `data:image/jpeg;base64,${base64}`,
      });
    } catch (err) {
      console.error('Image generation failed:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  const handleEdit = useCallback(async () => {
    if (!sourceImage) { setError('Please provide an image.'); return; }
    if (activeTool?.requiresInput && !textInput.trim()) { setError('Please provide details for this tool.'); return; }
    
    setIsLoading(true);
    setResultImageUrl(null);
    setError('');

    let finalPrompt = '';
    switch (activeToolId) {
        case 'edit-with-text': finalPrompt = textInput; break;
        case 'object-removal': finalPrompt = `Remove the following object from the image: ${textInput}. Fill in the space naturally and seamlessly.`; break;
        case 'background-remover': finalPrompt = `Carefully remove the background of this image, leaving only the main subject. The new background should be solid white.`; break;
        case 'skin-retouch': finalPrompt = `Perform a professional skin retouch on the person in this image. Smooth out blemishes, reduce wrinkles, and even out skin tone, while maintaining a natural skin texture.`; break;
        case 'image-restorer': finalPrompt = `Restore this old or damaged photograph. Repair any visible scratches, tears, creases, and color fading. Improve contrast and clarity to make it look new again.`; break;
        case 'background-replacer': finalPrompt = `Replace the background of this image with the following scene: ${textInput}. Ensure the lighting, shadows, and perspective on the main subject match the new background for a realistic composition.`; break;
        case 'cinematic-converter': finalPrompt = `Convert this photo into a cinematic still frame. Apply dramatic, moody lighting, professional color grading with a teal and orange look, and add a widescreen (2.39:1) aspect ratio effect by adding black bars (letterboxing) to the top and bottom.`; break;
        default: setError('Please select a valid tool.'); setIsLoading(false); return;
    }

    try {
      const result = await editImage(finalPrompt, sourceImage.base64, sourceImage.mimeType);
      const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResultImageUrl(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error("The AI did not return an edited image.");
      }
    } catch (err: any) {
      setError(`Failed to edit the image: ${err.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [sourceImage, activeToolId, textInput, activeTool]);
  
  const handleUpscale = useCallback(async () => {
    if (!sourceImage) { setError('Please provide an image to upscale.'); return; }
    setIsLoading(true);
    setResultImageUrl(null);
    setError('');
    try {
      const upscalePrompt = `Upscale this image to a higher resolution. Enhance details, increase sharpness, and reduce noise or artifacts to improve the overall quality, making it look like a high-definition photo.`;
      const result = await editImage(upscalePrompt, sourceImage.base64, sourceImage.mimeType);
      const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResultImageUrl(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error("The AI did not return an upscaled image.");
      }
    } catch (err: any) {
      setError(`Failed to upscale the image: ${err.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [sourceImage]);

  const renderControls = () => {
    const uploader = (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
        <label htmlFor="photo-editor-input" className="cursor-pointer">
          <svg className="mx-auto h-12 w-12 text-slate-600 dark:text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="mt-2 block text-sm font-medium text-brand-primary">Upload an image</span>
        </label>
        <input id="photo-editor-input" name="photo-editor-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
      </div>
    );

    switch (mode) {
      case 'generate':
        return (
          <div className="flex flex-col gap-4 h-full">
            <label htmlFor="generate-prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Enter a prompt to create an image</label>
            <textarea id="generate-prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A cute cat astronaut floating in space" className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary flex-grow"/>
            <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600">Generate</button>
          </div>
        );
      case 'edit':
        if (!sourceImage) return uploader;
        return (
          <div className="flex flex-col gap-4 h-full">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Choose a Tool</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EDITING_TOOLS.map(tool => <button key={tool.id} onClick={() => { setActiveToolId(tool.id); setTextInput(''); }} className={`p-2 text-left rounded-md transition-colors text-xs ${activeToolId === tool.id ? 'bg-brand-primary/20 ring-2 ring-brand-primary' : 'bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700'}`}><p className="font-semibold">{tool.name}</p></button>)}
              </div>
            </div>
            {activeTool?.requiresInput && <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md p-2" placeholder={activeTool.placeholder} />}
            <button onClick={handleEdit} disabled={isLoading} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 mt-auto">Apply {activeTool?.name}</button>
          </div>
        );
      case 'upscale':
        if (!sourceImage) return uploader;
        return (
          <div className="flex flex-col gap-4 items-center justify-center h-full">
            <p className="text-center text-slate-600 dark:text-slate-400">Enhance the resolution and details of your image.</p>
            <button onClick={handleUpscale} disabled={isLoading} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600">Upscale Image</button>
          </div>
        );
    }
  };
  
  const displayUrl = resultImageUrl || sourceImage?.url;

  return (
    <div className="p-3 h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4">Photo Editor</h3>
      <div className="flex bg-slate-200 dark:bg-slate-800 rounded-md p-1 mb-4 flex-shrink-0">
          <button onClick={() => handleModeChange('generate')} className={`flex-1 text-sm p-2 rounded ${mode === 'generate' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Generate</button>
          <button onClick={() => handleModeChange('edit')} className={`flex-1 text-sm p-2 rounded ${mode === 'edit' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Edit</button>
          <button onClick={() => handleModeChange('upscale')} className={`flex-1 text-sm p-2 rounded ${mode === 'upscale' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Upscale</button>
      </div>
        
      <div className="flex-grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-6 overflow-hidden">
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            {renderControls()}
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        </div>

        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4 overflow-hidden">
            {isLoading && <Spinner />}
            {!isLoading && !displayUrl && <p className="text-slate-600 dark:text-slate-500 text-center">Your image will appear here.</p>}
            {displayUrl && !isLoading &&
                <div className="flex flex-col items-center justify-center gap-4 h-full w-full">
                  <img src={displayUrl} alt="Processed result" className="max-w-full max-h-[80%] object-contain rounded-md" />
                  <div className="flex gap-2">
                    <a href={displayUrl} download="edited_image.png" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">Download</a>
                    <button onClick={resetState} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Start Over</button>
                  </div>
                </div>
            }
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;