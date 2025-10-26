import React, { useState, useCallback, useEffect } from 'react';
import Spinner from '../common/Spinner';
import ExportModal from '../common/ExportModal';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const ARMaker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'video'>('text');
  
  // Text state
  const [text, setText] = useState('Hello AR!');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  
  // File state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Clean up blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    }
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
      const file = e.target.files?.[0];
      if (file) {
          if (type === 'image') {
              setImageFile(file);
              setVideoFile(null);
          } else {
              setVideoFile(file);
              setImageFile(null);
          }
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };
  
  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setQrCodeUrl('');

    try {
        let contentDataUrl = '';
        let altText = 'AR Content';

        if (activeTab === 'text') {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            canvas.width = 512; canvas.height = 512;
            ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = textColor; ctx.font = 'bold 72px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(text, 256, 256);
            contentDataUrl = canvas.toDataURL('image/png');
            altText = text;
        } else if (activeTab === 'image' && imageFile) {
            contentDataUrl = await fileToBase64(imageFile);
            altText = imageFile.name;
        } else if (activeTab === 'video' && videoFile) {
            contentDataUrl = await fileToBase64(videoFile);
            altText = videoFile.name;
        } else {
            throw new Error('Please provide content for the selected tab.');
        }

      if (contentDataUrl.length > 2953) {
        throw new Error('Content is too large for a QR code. Please use smaller text or a smaller file.');
      }

      const htmlContent = `<!DOCTYPE html><html><head><title>AR View</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script><style>html,body{margin:0;padding:0;width:100%;height:100%;}model-viewer{width:100%;height:100%;--progress-bar-color:transparent;}</style></head><body><model-viewer src="${contentDataUrl}" alt="${altText}" ar ar-modes="webxr scene-viewer quick-look" camera-controls touch-action="pan-y" autoplay shadow-intensity="1"><button slot="ar-button" style="background-color:white;border-radius:4px;border:none;position:absolute;top:16px;right:16px;padding:8px 16px;">View in AR</button></model-viewer></body></html>`;
      const pageDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      const finalQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pageDataUrl)}`;
      setQrCodeUrl(finalQrCodeUrl);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, text, textColor, bgColor, imageFile, videoFile]);

  return (
    <div className="p-3 h-full flex flex-col">
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        fileType="qr"
        sourceUrl={qrCodeUrl}
        fileName="ar-code"
        onExport={() => {}} // The modal handles its own export logic for now
      />
      <h3 className="text-xl font-bold mb-4">AR Creator</h3>
      <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
        {/* Controls Panel */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-md p-1">
            <button onClick={() => setActiveTab('text')} className={`flex-1 text-sm p-2 rounded ${activeTab === 'text' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Text</button>
            <button onClick={() => setActiveTab('image')} className={`flex-1 text-sm p-2 rounded ${activeTab === 'image' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Image</button>
            <button onClick={() => setActiveTab('video')} className={`flex-1 text-sm p-2 rounded ${activeTab === 'video' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Video</button>
          </div>
          
          {activeTab === 'text' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Text Content</label>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={4} className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Text Color</label>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-10 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600"/>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Background Color</label>
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-10 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600"/>
                </div>
              </div>
            </>
          )}

          {(activeTab === 'image' || activeTab === 'video') && (
               <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload File</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        {previewUrl && activeTab === 'image' && <img src={previewUrl} alt="Preview" className="mx-auto h-24 w-auto object-contain" />}
                        {previewUrl && activeTab === 'video' && <video src={previewUrl} className="mx-auto h-24 w-auto object-contain" />}
                        {!previewUrl && <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2"/></svg>}
                        <label htmlFor="ar-file-upload" className="cursor-pointer font-medium text-brand-primary hover:text-brand-secondary">
                            <span>{imageFile || videoFile ? "Change file" : `Upload ${activeTab}`}</span>
                            <input id="ar-file-upload" type="file" className="sr-only" accept={activeTab === 'image' ? 'image/*' : 'video/*'} onChange={e => handleFileChange(e, activeTab)} />
                        </label>
                    </div>
                </div>
            </div>
          )}
          
          <button onClick={handleGenerate} disabled={isLoading} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
            {isLoading ? <Spinner /> : 'Generate AR Code'}
          </button>
          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Result Panel */}
        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
          {isLoading && <Spinner />}
          {!isLoading && !qrCodeUrl && (
            <div className="text-center text-slate-600 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04"/><path d="M12 22.08V12"/></svg>
                <p>Your AR QR Code will appear here.</p>
            </div>
          )}
          {qrCodeUrl && (
            <div className="text-center">
                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Scan with your phone!</h4>
                <img src={qrCodeUrl} alt="Generated AR QR Code" className="w-64 h-64 rounded-md border-4 border-white dark:border-slate-700 shadow-lg" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 max-w-xs">Open your camera app and point it at the code to view the content in Augmented Reality.</p>
                <button onClick={() => setIsExportModalOpen(true)} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">Download QR Code</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARMaker;