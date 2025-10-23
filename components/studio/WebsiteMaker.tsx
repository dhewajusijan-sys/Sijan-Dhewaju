import React, { useState, useCallback } from 'react';
import { generateWebsiteCode } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import CodeBlock from '../common/CodeBlock';

interface WebsiteCode {
    html: string;
    css: string;
    javascript: string;
}

const WebsiteMaker: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [code, setCode] = useState<WebsiteCode | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please describe the website you want to build.');
            return;
        }

        setIsLoading(true);
        setError('');
        setCode(null);

        try {
            const response = await generateWebsiteCode(prompt);
            const jsonStr = response.text.trim();
            const parsedCode = JSON.parse(jsonStr);
            setCode(parsedCode);
        } catch (err) {
            console.error('Website generation failed:', err);
            setError('Failed to generate website code. The response might not be valid JSON. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);

    const getFullHtml = () => {
        if (!code) return '';
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <style>${code.css}</style>
</head>
<body>
    ${code.html}
    <script>${code.javascript || ''}</script>
</body>
</html>`;
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Website Maker</h3>
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A portfolio website for a photographer"
                    className="flex-grow bg-slate-700/50 border border-slate-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt.trim()}
                    className="py-2 px-4 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner/> : 'Generate'}
                </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex-grow bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
                {isLoading && <div className="flex-grow flex items-center justify-center"><Spinner /></div>}
                {!isLoading && !code && <p className="text-slate-500 flex-grow flex items-center justify-center">Your generated website code and preview will appear here.</p>}
                {code && (
                    <div className="grid md:grid-cols-2 h-full overflow-hidden">
                        <div className="flex flex-col overflow-y-auto">
                           <div className="p-4">
                             <h4 className="font-semibold mb-2">HTML</h4>
                             <CodeBlock language="html" code={code.html} />
                             <h4 className="font-semibold mb-2 mt-4">CSS</h4>
                             <CodeBlock language="css" code={code.css} />
                             {code.javascript && (
                                <>
                                <h4 className="font-semibold mb-2 mt-4">JavaScript</h4>
                                <CodeBlock language="javascript" code={code.javascript} />
                                </>
                             )}
                           </div>
                        </div>
                        <div className="border-l border-slate-700 h-full">
                             <iframe 
                                srcDoc={getFullHtml()} 
                                title="Website Preview" 
                                className="w-full h-full bg-white"
                                sandbox="allow-scripts"
                             />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebsiteMaker;
