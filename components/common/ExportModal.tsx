import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Spinner from './Spinner';

export type ExportFileType = 'image' | 'video' | 'audio' | 'qr' | 'text' | 'zip' | '3d';

interface ExportSettings {
  format: string;
  quality?: number;
  resolution?: string;
  [key: string]: any;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  fileType: ExportFileType;
  sourceUrl: string | null;
  fileName: string;
  originalDimensions?: { width: number; height: number };
  sourceData?: any; // For text, etc.
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, fileType, sourceUrl, fileName, sourceData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  
  // Settings State
  const [format, setFormat] = useState('');
  const [quality, setQuality] = useState(90);
  const [resolution, setResolution] = useState('original');
  const [originalDims, setOriginalDims] = useState({ width: 0, height: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen && (fileType === 'image' || fileType === 'qr') && sourceUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = sourceUrl;
      img.onload = () => {
        setOriginalDims({ width: img.width, height: img.height });
      };
      imageRef.current = img;
    }
    
    // Set default formats
    switch(fileType) {
        case 'image':
        case 'qr':
            setFormat('png');
            break;
        case 'video':
            setFormat('mp4');
            break;

        case 'audio':
            setFormat('wav');
            break;
        case 'text':
            setFormat('txt');
            break;
        default:
            setFormat('');
            break;
    }
  }, [isOpen, fileType, sourceUrl]);

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
        const finalFilename = `${fileName}.${format}`;

        if ((fileType === 'image' || fileType === 'qr') && sourceUrl && imageRef.current && imageRef.current.complete) {
            const img = imageRef.current;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');

            let newWidth = originalDims.width;
            let newHeight = originalDims.height;
            const aspectRatio = originalDims.width / originalDims.height;

            if (resolution !== 'original') {
                const targetWidth = parseInt(resolution, 10);
                newWidth = targetWidth;
                newHeight = Math.round(targetWidth / aspectRatio);
            }

            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality / 100 : undefined);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } else if (fileType === 'text' && sourceData) {
            const blob = new Blob([sourceData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (sourceUrl) { // For video, audio, and other simple downloads
            const a = document.createElement('a');
            a.href = sourceUrl;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            throw new Error("Source data is not available for export.");
        }

        onClose();
    } catch(err) {
        setError("Failed to export file. Please try again.");
        console.error(err);
    } finally {
        setIsExporting(false);
    }
  };

  const renderImageSettings = () => (
    <>
      <div>
        <label className="text-sm font-medium">Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
          <option value="png">PNG (High Quality)</option>
          <option value="jpeg">JPG (Compressed)</option>
        </select>
      </div>
      {format === 'jpeg' && (
        <div>
          <label className="text-sm font-medium">Quality ({quality})</label>
          <input type="range" min="10" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full mt-1" />
        </div>
      )}
      <div>
        <label className="text-sm font-medium">Resolution</label>
        <select value={resolution} onChange={e => setResolution(e.target.value)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
          <option value="original">Original ({originalDims.width}x{originalDims.height})</option>
          <option value="1920">Full HD (1920px width)</option>
          <option value="1024">Standard (1024px width)</option>
          <option value="512">Small (512px width)</option>
        </select>
      </div>
    </>
  );

  const renderVideoSettings = () => (
     <div>
        <label className="text-sm font-medium">Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
          <option value="mp4">MP4 (Video)</option>
          <option value="gif" disabled>GIF (Animated Image) - Soon</option>
        </select>
        <p className="text-xs text-slate-500 mt-2">Quality and resolution are determined at generation time.</p>
      </div>
  );
  
    const renderAudioSettings = () => (
     <div>
        <label className="text-sm font-medium">Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
          <option value="wav">WAV (Lossless)</option>
          <option value="mp3" disabled>MP3 (Compressed) - Soon</option>
        </select>
      </div>
  );

   const renderTextSettings = () => (
     <div>
        <label className="text-sm font-medium">Format</label>
        <select value={format} onChange={e => setFormat(e.target.value)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
          <option value="txt">TXT (Plain Text)</option>
          <option value="md" disabled>Markdown (.md) - Soon</option>
          <option value="pdf" disabled>PDF - Soon</option>
        </select>
      </div>
  );

  const renderMockSettings = (title: string, options: string[]) => (
      <div>
          <p className="text-sm text-slate-500 text-center">Advanced export options for {title} are coming soon.</p>
          <div className="mt-4 space-y-2">
            {options.map(opt => <label key={opt} className="flex items-center gap-2 text-slate-400"><input type="checkbox" disabled className="h-4 w-4" /> {opt}</label>)}
          </div>
      </div>
  );

  const renderSettings = () => {
    switch(fileType) {
        case 'image':
        case 'qr':
            return renderImageSettings();
        case 'video':
            return renderVideoSettings();
        case 'audio':
            return renderAudioSettings();
        case 'text':
            return renderTextSettings();
        case 'zip':
            return renderMockSettings('Project Files', ['Minify Code', 'Prettify Code', 'Include Source Maps']);
        case '3d':
             return renderMockSettings('3D Models', ['High Poly Mesh', 'Low Poly Mesh', '4K Textures', 'Include Rigging']);
        default:
            return <p>No export options available for this file type.</p>;
    }
  }

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-sm w-full shadow-xl text-slate-800 dark:text-slate-200" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Export Options</h3>
        <div className="space-y-4">
            {renderSettings()}
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="py-2 px-4 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold text-sm">Cancel</button>
            <button onClick={handleExport} disabled={isExporting} className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold text-sm flex items-center justify-center w-28 disabled:bg-slate-400">
                {isExporting ? <Spinner /> : 'Export'}
            </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default ExportModal;
