import React, { useState, useRef, useCallback, useEffect } from 'react';
import { editImage } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const AI_EFFECTS = [
  { name: 'Pencil Sketch', prompt: 'Convert this image into a detailed, high-contrast black and white pencil sketch.', icon: '✏️' },
  { name: '3D Cartoon', prompt: 'Recreate this image in a 3D Disney/Pixar animated movie style.', icon: '🧸' },
  { name: 'Vintage Photo', prompt: 'Make this image look like an old, faded vintage photograph from the 1950s.', icon: '📷' },
  { name: 'Pop Art', prompt: 'Recreate this image in the style of Andy Warhol\'s pop art.', icon: '🎨' },
  { name: 'Neon', prompt: 'Add futuristic neon lighting effects to this image.', icon: '💡' },
  { name: 'Impressionist', prompt: 'Turn this image into an impressionist painting in the style of Monet.', icon: '🖌️' },
  { name: 'Imagine', prompt: 'Transform this image into a stylized, imaginative, and surreal AI photograph.', icon: '✨' },
  { name: 'Ethereal Glow', prompt: 'Add a soft, ethereal glow effect to the person in this selfie.', icon: '😇' },
  { name: 'Bokeh', prompt: 'Apply a strong but realistic bokeh/portrait mode blur to the background.', icon: '📸' },
  { name: 'Dog Filter', prompt: 'Add cute dog ears and a nose to the person\'s face.', icon: '🐶' },
  { name: 'Green Screen', prompt: 'Replace the background with a solid green screen.', icon: '🟩' },
];

const WebcamFxView: React.FC = () => {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [selectedEffect, setSelectedEffect] = useState(AI_EFFECTS[0]);
    const [showOriginal, setShowOriginal] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
    }, []);

    const startCamera = useCallback(async () => {
        if (streamRef.current) stopCamera();
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => setError("Video playback failed."));
                };
            }
            setIsCameraOn(true);
        } catch (err) {
            setError("Could not access the camera. Please check permissions.");
            setIsCameraOn(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        startCamera();
        return stopCamera;
    }, [startCamera, stopCamera]);

    const captureAndProcess = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
        setIsLoading(true);
        setError('');
        setResultImage(null);
        setOriginalImage(null);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError('Could not get canvas context.');
            setIsLoading(false);
            return;
        }
        
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const originalDataUrl = canvas.toDataURL('image/jpeg');
        setOriginalImage(originalDataUrl);
        const base64Image = originalDataUrl.split(',')[1];
        
        try {
            const result = await editImage(selectedEffect.prompt, base64Image, 'image/jpeg');
            const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                setResultImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                throw new Error("The AI did not return an image.");
            }
        } catch (err: any) {
            setError(`Failed to apply effect: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedEffect]);

    const EffectSelector = () => (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-full px-4 z-20">
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {AI_EFFECTS.map(effect => (
                    <button key={effect.name} onClick={() => setSelectedEffect(effect)}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-200 backdrop-blur-md
                        ${selectedEffect.name === effect.name ? 'bg-white/30 border-2 border-white' : 'bg-black/20'}`}>
                        <span className="text-2xl">{effect.icon}</span>
                        <span className="text-white text-[10px] font-semibold text-center leading-tight">{effect.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
    
    if (isLoading || resultImage) {
        return (
            <div className="p-4 sm:p-6 h-full flex flex-col items-center justify-center bg-black relative">
                {isLoading && <div className="flex flex-col items-center gap-4"><Spinner /><p className="text-white">Applying AI effect...</p></div>}
                {resultImage && (
                    <div 
                        className="w-full h-full flex flex-col items-center justify-center gap-4"
                        onMouseDown={() => setShowOriginal(true)} onMouseUp={() => setShowOriginal(false)}
                        onTouchStart={() => setShowOriginal(true)} onTouchEnd={() => setShowOriginal(false)}
                    >
                        <div className="absolute top-4 left-4 text-white bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm z-10">
                            {showOriginal ? 'Before' : 'After (Hold to see Before)'}
                        </div>
                        <div className="w-full h-full flex items-center justify-center">
                            <img 
                                src={showOriginal ? originalImage! : resultImage} 
                                alt={showOriginal ? 'Original' : 'Effect applied'} 
                                className="max-w-full max-h-full object-contain rounded-lg" 
                            />
                        </div>
                        <div className="absolute bottom-6 flex gap-4 z-10">
                             <a href={resultImage} download={`camera_fx_${selectedEffect.name}.jpg`} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full inline-flex items-center gap-2">Download</a>
                            <button onClick={() => { setResultImage(null); setOriginalImage(null); }} className="bg-brand-primary hover:bg-sky-400 text-white font-bold py-2 px-4 rounded-full">Try Another</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-black relative">
            {!isCameraOn && error ? (
                <div className="flex-grow flex flex-col items-center justify-center text-white text-center p-4">
                    <p className="mb-4">{error || "Camera is off or unavailable."}</p>
                    <button onClick={startCamera} className="py-2 px-4 bg-green-600 rounded-md font-semibold">Try Again</button>
                </div>
            ) : (
                <div className="w-full h-full relative flex flex-col items-center justify-end">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
                    <canvas ref={canvasRef} className="hidden" />
                    <EffectSelector />
                    <div className="absolute bottom-6 z-10">
                        <button onClick={captureAndProcess} className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-4 border-white/50">
                            <div className="w-12 h-12 rounded-full bg-white active:bg-slate-200"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebcamFxView;