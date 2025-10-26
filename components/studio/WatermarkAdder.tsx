import React, { useState, useCallback } from 'react';
import { editImage } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const WatermarkAdder: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setEditedImageUrl('');
      setError('');
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!imageFile || !watermarkText.trim()) {
      setError('Please upload an image and provide watermark text.');
      return;
    }
    
    setIsLoading(true);
    setEditedImageUrl('');
    setError('');

    try {
      const base64Image = await fileToBase64(imageFile);
      const prompt = `Add the text "${watermarkText}" as a watermark to this image. The watermark should be semi-transparent and placed tastefully in the bottom-right corner.`;
      const result = await editImage(prompt, base64Image, imageFile.type);
      
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          setEditedImageUrl(imageUrl);
          break;
        }
      }

    } catch (err) {
      console.error('Watermark addition failed:', err);
      setError('Failed to add watermark. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, watermarkText]);

  return (
    <div className="p-6 h-full flex flex-col">
        <h3 className="text-xl font-bold mb-4">Watermark Adder</h3>
        <div className="flex-grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-6 overflow-hidden">
            <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                <div>
                    <label htmlFor="image-upload" className="block text-sm font-medium text-slate-300 mb-2">1. Upload Image</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            {previewUrl ? 
                                <img src={previewUrl} alt="Original" className="mx-auto h-40 w-auto object-contain rounded-md" /> :
                                <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            }
                            <div className="flex text-sm text-slate-400 justify-center">
                                <label htmlFor="watermark-adder-input" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:ring-brand-primary px-1">
                                    <span>{imageFile ? "Change image" : "Upload an image"}</span>
                                    <input id="watermark-adder-input" name="watermark-adder-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>
                            <p className="text-xs text-slate-500">PNG, JPG, up to 10MB</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="watermark-text" className="block text-sm font-medium text-slate-300 mb-1">2. Watermark Text</label>
                    <input
                        id="watermark-text"
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                        placeholder="e.g., © My Photography 2024"
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !imageFile || !watermarkText.trim()}
                    className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Adding...' : 'Add Watermark'}
                </button>
                 {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 flex flex-col items-center justify-center overflow-hidden">
                {isLoading && <Spinner />}
                {!isLoading && !editedImageUrl && <p className="text-slate-500 text-center">Your watermarked image will appear here.</p>}
                {editedImageUrl && 
                    <div className="flex flex-col items-center gap-4">
                        <img src={editedImageUrl} alt="Watermarked" className="max-w-full max-h-full object-contain rounded-md" />
                         <a
                            href={editedImageUrl}
                            download={`watermarked_image.png`}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2 transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span>Download Image</span>
                        </a>
                    </div>
                }
            </div>
        </div>
    </div>
  );
};

export default WatermarkAdder;