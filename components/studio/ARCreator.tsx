import React, { useState, useCallback } from 'react';
import Spinner from '../common/Spinner';

const ARCreator: React.FC = () => {
  const [inputType, setInputType] = useState<'text' | 'file'>('text');
  const [text, setText] = useState('Hello AR!');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setQrCodeUrl('');

    try {
      if (inputType === 'file') {
        throw new Error('File-based AR creation is coming soon!');
      }

      // 1. Create an image from text using a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas API is not available in this browser.');
      
      const canvasSize = 512;
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw text
      ctx.fillStyle = textColor;
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Basic text wrapping
      const words = text.split(' ');
      let line = '';
      let y = canvasSize / 2; // Start in the middle
      
      // Calculate lines to center vertically
      const lines = [];
      for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvasSize - 40 && line.length > 0) {
              lines.push(line);
              line = word + ' ';
          } else {
              line = testLine;
          }
      }
      lines.push(line);
      y -= (lines.length - 1) * 36; // Adjust start Y pos based on line count

      // Actually draw the lines
      line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > canvasSize - 40 && line.length > 0) {
          ctx.fillText(line.trim(), canvasSize / 2, y);
          line = word + ' ';
          y += 72; // Move to next line
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), canvasSize / 2, y);


      const imageDataUrl = canvas.toDataURL('image/png');

      // 2. Check if the generated data URL is too large for a QR code
      if (imageDataUrl.length > 3000) {
        throw new Error('The generated text image is too large for a QR code. Please use shorter text.');
      }

      // 3. Construct a self-contained HTML page with <model-viewer>
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>AR View</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
            <style>html,body{margin:0;padding:0;width:100%;height:100%;}model-viewer{width:100%;height:100%;--progress-bar-color:transparent;}</style>
          </head>
          <body>
            <model-viewer
              src="${imageDataUrl}"
              alt="AR Content"
              ar ar-modes="webxr scene-viewer quick-look"
              camera-controls touch-action="pan-y"
              autoplay
              shadow-intensity="1"
            >
              <button slot="ar-button" style="background-color:white;border-radius:4px;border:none;position:absolute;top:16px;right:16px;padding:8px 16px;">
                  View in AR
              </button>
            </model-viewer>
          </body>
        </html>
      `;

      // 4. Encode the HTML content into a data URL
      const pageDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      
      // 5. Use a QR code generation API to get the QR image
      const finalQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pageDataUrl)}`;
      setQrCodeUrl(finalQrCodeUrl);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [inputType, text, textColor, bgColor]);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4">AR Creator</h3>
      <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
        {/* Controls Panel */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-md p-1">
            <button onClick={() => setInputType('text')} className={`flex-1 text-sm p-2 rounded ${inputType === 'text' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>Text</button>
            <button onClick={() => setInputType('file')} className={`flex-1 text-sm p-2 rounded ${inputType === 'file' ? 'bg-brand-primary text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700'}`}>3D File</button>
          </div>
          
          {inputType === 'text' ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 bg-slate-100 dark:bg-slate-800/50 rounded-md text-center border border-slate-200 dark:border-slate-700">
                <p className="font-semibold">Coming Soon!</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Support for uploading 3D models (.glb, .usdz) is under development.</p>
            </div>
          )}
          
          <button onClick={handleGenerate} disabled={isLoading || inputType === 'file'} className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center mt-auto">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARCreator;
