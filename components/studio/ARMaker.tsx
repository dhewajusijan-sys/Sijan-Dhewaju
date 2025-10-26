import React, { useState, useCallback, useEffect } from 'react';
import Spinner from '../common/Spinner';

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
  
  // Clean up blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (qrCodeUrl && qrCodeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [qrCodeUrl]);

  const handleTabChange = (tab: 'text' | 'image' | 'video') => {
      setActiveTab(tab);
      // Reset inputs when changing tabs
      setImageFile(null);
      setVideoFile(null);
      setPreviewUrl(null);
      setError('');
      setQrCodeUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === 'image') {
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setVideoFile(null);
        setPreviewUrl(URL.createObjectURL(file));
        setError('');
      } else {
        setError('Please upload a valid image file.');
      }
    } else if (activeTab === 'video') {
       if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setImageFile(null);
        setPreviewUrl(URL.createObjectURL(file));
        setError('');
      } else {
        setError('Please upload a valid video file.');
      }
    }
  };

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    if (qrCodeUrl.startsWith('blob:')) {
      URL.revokeObjectURL(qrCodeUrl);
    }
    setQrCodeUrl('');

    try {
      let contentDataUrl = '';
      let viewerHtml = '';

      const imageViewerHtml = `<!DOCTYPE html><html><head><title>AR View</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script><style>html,body{margin:0;padding:0;width:100%;height:100%;}model-viewer{width:100%;height:100%;--progress-bar-color:transparent;}</style></head><body><model-viewer id="viewer" alt="AR Content" ar ar-modes="webxr scene-viewer quick-look" camera-controls touch-action="pan-y" shadow-intensity="1"><button slot="ar-button" style="background-color:white;border-radius:4px;border:none;position:absolute;top:16px;right:16px;padding:8px 16px;">View in AR</button></model-viewer><script>document.addEventListener('DOMContentLoaded',()=>{try{document.getElementById('viewer').src=decodeURIComponent(window.location.hash.substring(1));}catch(e){console.error('Error loading content:',e);}});</script></body></html>`;
      const videoViewerHtml = `<!DOCTYPE html><html><head><title>AR View</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script><style>html,body{margin:0;padding:0;width:100%;height:100%;}model-viewer{width:100%;height:100%;--progress-bar-color:transparent;}#ar-video{display:none;}</style></head><body><video id="ar-video" loop playsinline muted autoplay crossOrigin="anonymous"></video><model-viewer id="viewer" ar ar-modes="webxr scene-viewer quick-look" camera-controls touch-action="pan-y" shadow-intensity="1"><material><pbr-metallic-roughness base-color-texture='{"video":"ar-video"}'></pbr-metallic-roughness></material><button slot="ar-button" style="background-color:white;border-radius:4px;border:none;position:absolute;top:16px;right:16px;padding:8px 16px;">View in AR</button></model-viewer><script>document.addEventListener('DOMContentLoaded',()=>{const video=document.getElementById('ar-video');const viewer=document.getElementById('viewer');try{const videoUrl=decodeURIComponent(window.location.hash.substring(1));video.src=videoUrl;viewer.src='data:model/gltf-binary;base64,Z2xURgIAAAEAAQAEAAAA//+AB5+gAAAAACAAAABAAAAAEAAgAEAAAADgAAAAAAAABkAAAAAgAAAAQAJwAAAAAAAABkAAAAAwAAAAAABwAAAAAAAABoAAAABAAAAAAABwAAAAAAAABoAAAAAQAAAAAABQAAAAAAAACAAAAAAQAAAAgAAAAEAAAAiAAAAAEAAAAJAAAACQAAACgAAAADAAAACgAAAAgAAAAwAAAAAwAAAAsAAAAEAAAA6AAAAGxpcHMBAgAAAAAABQAAAAAAAACsAAAAAQAAAAwAAAAKAAAAvgABAAYPAAEAAQAAAAAAAP//AAACAAAABgADAAEAAAAAAAD//wAAAwAAAAgAAwABAAAAAAABAAEABQAAAAAADwADAAEAAAAAAAD//wAAAwAAAAAADgADAAEAAAAAAAD//wAABAAAAAABAAAAAQAAAAAACgADAAEAAAAAAAD//wAAAwAAAAAACgADAAEAAAAAAAD//wAABQAAAAAAAgABAAAAAAAKAAUAAgAAAAAADgADAAEAAAAAAAD//wAAAwAAAAAACgADAAEAAAAAAAD//wAABgAAAAAAAwAAAAAAAAsAAQACAAAAAAAEAAQAAQAAAAsAAgADAAAAAAADAAUAAQAAAAAACwADAAQAAAAAAAMABQACAAAAAAADAAQABAAAAAsAAgAEAAAAAAAEAAUABQAAAAAADAAIAAQAAAAAAAgACgAFAAAAAAAOAAUAAwAAAAAABgAIAAEAAAAADAAIAAMAAAAAAAYACgACAAAAAAAGAAUABAAAAAsACAAFAAAAAAAOAAUABgAAAAAACwAIAAYAAAAAAAYACgAEAAAAAAAIABQABQAAAAAADAAIAAgAAAAAAAgACgAIAAAAAAAOAAUAAgAAAAAABgAIAAMAAAAAAAYACgADAAAAAAAIABQABgAAAAAADAAIAAYAAAAAAAgACgAGAAAAAAAOAAUAAgAAAAAACAAIAAQAAAAAAAgACgAEAAAAAAAOAAUABgAAAAAACAAIAAYAAAAAAAOAAcAAAAAAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAAAAAABAAAAARAAAAEgAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAaAAAAGwAAABwAAAAdAAAAHgAAAB8AAAAgAAAAIQAAACIAAAAjAAAAJAAAACUAAAAmAAAAJwAAACgAAAAnAAAAKgAAACsAAAAsAAAALQAAAC4AAAAvAAAAMAAAADEAAAAyAAAAMwAAADQAAAA1AAAANgAAADcAAAA4AAAAOQAAADoAAAA7AAAAPAAAAD0AAAA+AAAAPwAAAEAAAABBAAAAQgAAAEMAAABEAAAARQAAAEAAAABHAAAASAAAAEkAAABKAAAASwAAAEwAAABNAAAATgAAAE8AAABQAAAAUQAAAFIAAABTAAAAVAAAAFUAAABWAAAAFwAAAFgAAABZAAAAWgAAAFsAAABcAAAAVwAAAF4AAABfAAAAWAAAAGEAAABiAAAAIwAAAGQAAABlAAAAYgAAAGcAAABoAAAAawAAAGoAAABrAAAAbAAAAG0AAABuAAAAbwAAAHAAAABxAAAAcgAAAHMAAAB0AAAAdQAAAHYAAAB3AAAAeAAAAHkAAAB6AAAAewAAAHwAAAB9AAAAfgAAAH8AAACAAAAAgQAAAIIAAACDAAAAhAAAAIUAAACGAgAABAAAAAEAAAB7AgAAAwAAAAYAAABSAgAABAAAAAMAAABeAgAABAAAAAEAAABqAgAABwAAAAAAAABwAgAABAAAAAIAAAB+AgAABwAAAAAAAAAAAAUAAQACAAAAAAALAAQABwAAAAAAAACIAgAACAAAAAEAAAAAAAAAAAAJAAUAAgAAAAAACwAEAAcAAAAAAAAAkwIAAAYAAAB4AAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAEAAAAAAQAAAAAAQAAAAAA';viewer.addEventListener('load',()=>{video.play().catch(()=>{});});}catch(e){console.error('Error processing AR video content:',e);}});</script></body></html>`;

      if (activeTab === 'text') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const canvasSize = 512;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        ctx.fillStyle = textColor;
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (const word of words) {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > canvasSize - 40 && line.length > 0) {
            lines.push(line);
            line = word + ' ';
          } else { line = testLine; }
        }
        lines.push(line);
        
        let y = (canvasSize / 2) - ((lines.length - 1) * 36);
        for (const l of lines) {
            ctx.fillText(l.trim(), canvasSize / 2, y);
            y += 72;
        }
        contentDataUrl = canvas.toDataURL('image/png');
        viewerHtml = imageViewerHtml;
      } else if (activeTab === 'image' && imageFile) {
        contentDataUrl = await fileToBase64(imageFile);
        viewerHtml = imageViewerHtml;
      } else if (activeTab === 'video' && videoFile) {
        contentDataUrl = await fileToBase64(videoFile);
        viewerHtml = videoViewerHtml;
      } else {
        throw new Error('No valid input for AR generation.');
      }
      
      const pageUrl = `data:text/html;charset=utf-8,${encodeURIComponent(viewerHtml)}#${encodeURIComponent(contentDataUrl)}`;
      
      // A conservative URL length limit. Most modern browsers support much longer URLs, 
      // but QR code readers and the API might not. 4000 is a safer limit than a QR code's theoretical max.
      if (pageUrl.length > 4000) {
          throw new Error('Content is too large to be encoded in a QR code. Please use smaller text, or a smaller image/video file.');
      }

      // Use a GET request by setting the image src directly. This avoids CORS/network issues with fetch.
      const finalQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pageUrl)}`;
      setQrCodeUrl(finalQrCodeUrl);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred. The content might be too large.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, text, textColor, bgColor, imageFile, videoFile]);
  
  const isGenerateDisabled = isLoading || (activeTab === 'text' && !text.trim()) || (activeTab === 'image' && !imageFile) || (activeTab === 'video' && !videoFile);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4">AR Maker</h3>
      <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
        {/* Controls Panel */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-md p-1">
            <button onClick={() => handleTabChange('text')} className={`flex-1 text-sm p-2 rounded ${activeTab === 'text' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Text</button>
            <button onClick={() => handleTabChange('image')} className={`flex-1 text-sm p-2 rounded ${activeTab === 'image' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Image</button>
            <button onClick={() => handleTabChange('video')} className={`flex-1 text-sm p-2 rounded ${activeTab === 'video' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Video</button>
          </div>
          
          {activeTab === 'text' && (
            <>
              <div><label className="block text-sm font-medium">Text Content</label><textarea value={text} onChange={e => setText(e.target.value)} rows={4} className="w-full mt-1 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">Text Color</label><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-10 mt-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600"/></div>
                <div><label className="block text-sm font-medium">Background Color</label><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-10 mt-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600"/></div>
              </div>
            </>
          )}

          {(activeTab === 'image' || activeTab === 'video') && (
            <div className="flex flex-col items-center justify-center h-full p-4 bg-slate-100 dark:bg-slate-800/50 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                {previewUrl && activeTab === 'image' && <img src={previewUrl} alt="Preview" className="max-h-48 object-contain rounded-md" />}
                {previewUrl && activeTab === 'video' && <video src={previewUrl} muted autoPlay loop className="max-h-48 object-contain rounded-md" />}
                {!previewUrl && <p>Upload an {activeTab}</p>}
                <label htmlFor="ar-file-upload" className="cursor-pointer mt-4 text-sm font-semibold text-brand-primary hover:underline">{previewUrl ? `Change ${activeTab}` : `Select ${activeTab}`}</label>
                <input id="ar-file-upload" type="file" className="sr-only" accept={activeTab === 'image' ? 'image/*' : 'video/*'} onChange={handleFileChange} />
            </div>
          )}
          
          <button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
            {isLoading ? <Spinner /> : 'Generate AR Code'}
          </button>
          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Result Panel */}
        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4">
          {isLoading ? <Spinner /> : !qrCodeUrl ? (
            <div className="text-center text-slate-600 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04"/><path d="M12 22.08V12"/></svg>
                <p>Your AR QR Code will appear here.</p>
            </div>
          ) : (
            <div className="text-center">
                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Scan with your phone!</h4>
                <div className="p-2 bg-white rounded-lg inline-block shadow-lg border border-slate-200 dark:border-slate-700">
                    <img src={qrCodeUrl} alt="Generated AR QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 max-w-xs">Open your camera app and point it at the code to view the content in Augmented Reality.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARMaker;
