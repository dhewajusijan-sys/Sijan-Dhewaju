
import React, { useState, useCallback, useMemo } from 'react';
import { generateProjectCode } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import CodeBlock from '../common/CodeBlock';

type ProjectType = 'Website' | 'App' | 'Game';
type Platform = 'Web' | 'iOS' | 'Android' | 'Cross-Platform';
type BuilderMode = 'template' | 'custom';

const LANGUAGES = ['English', 'Spanish', 'French', 'Japanese', 'German', 'Nepali'];
const TEMPLATES = [
  { name: 'Modern Portfolio', type: 'Website', platform: 'Web', prompt: 'A clean, single-page portfolio for a creative professional. It should have a hero section with a name and title, an "About Me" section, a grid-based gallery for projects, and a simple contact form. Use a minimalist design with a dark theme and a single accent color.' },
  { name: 'SaaS Landing Page', type: 'Website', platform: 'Web', prompt: 'A high-converting landing page for a new SaaS product. It needs a strong hero section with a clear call-to-action (CTA), a "Features" section with three key points (each with an icon), a simple pricing table with two tiers, and a footer with social media links.' },
  { name: 'Task Tracker App', type: 'App', platform: 'Cross-Platform', prompt: 'A simple task tracker application. The main screen should have a text input to add a new task, a list of pending tasks with checkboxes, and a section for completed tasks. Use a clean, card-based layout.' },
  { name: 'Platformer Game', type: 'Game', platform: 'Web', prompt: 'A basic 2D platformer game. Generate the core Javascript logic for a player character that can move left, right, and jump. Include a simple ground platform and a collectible item.' },
];

const WebsiteMaker: React.FC = () => {
    const [mode, setMode] = useState<BuilderMode>('template');
    const [projectType, setProjectType] = useState<ProjectType>('Website');
    const [projectName, setProjectName] = useState('');
    const [platforms, setPlatforms] = useState<Platform>('Web');
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState(LANGUAGES[0]);

    const [isLoading, setIsLoading] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState('');

    const [codeFiles, setCodeFiles] = useState<Record<string, string> | null>(null);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [refinePrompt, setRefinePrompt] = useState('');

    const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
        setMode('custom');
        setProjectType(template.type as ProjectType);
        setPlatforms(template.platform as Platform);
        setProjectName(template.name);
        setDescription(`Based on the "${template.name}" template, with the following core functionality: ${template.prompt}\n\nPlease add these customizations:\n- `);
    };

    const callApi = useCallback(async (isRefinement: boolean) => {
        if (isRefinement) {
            if (!refinePrompt.trim() || !codeFiles) return;
            setIsRefining(true);
        } else {
            if (!description.trim() || !projectName.trim()) {
                setError('Please provide a name and description for your project.');
                return;
            }
            setIsLoading(true);
        }
        
        setError('');
        if (!isRefinement) setCodeFiles(null);
        
        try {
            const response = await generateProjectCode(
                projectType, 
                projectName, 
                platforms, 
                description, 
                language, 
                isRefinement ? codeFiles! : undefined,
                isRefinement ? refinePrompt : undefined
            );
            const parsedCode = JSON.parse(response.text.trim());
            setCodeFiles(parsedCode);

            if (!isRefinement) {
                const fileKeys = Object.keys(parsedCode);
                const readme = fileKeys.find(k => k.toLowerCase().includes('readme.md'));
                setActiveFile(readme || fileKeys[0] || null);
            }
             if (isRefinement) setRefinePrompt('');

        } catch (err) {
            console.error('Project generation/refinement failed:', err);
            setError('Failed to process the request. The AI response might be invalid. Please try again.');
        } finally {
            setIsLoading(false);
            setIsRefining(false);
        }
    }, [projectType, projectName, platforms, description, language, codeFiles, refinePrompt]);

    const fullHtmlPreview = useMemo(() => {
        if (!codeFiles) return '';
        const htmlFile = Object.keys(codeFiles).find(name => name.endsWith('.html'));
        if (!htmlFile) return '<html><body>No HTML file found to preview.</body></html>';

        let htmlContent = codeFiles[htmlFile];
        
        // Find and inline CSS
        const cssLinks = [...htmlContent.matchAll(/<link.+?href="(.+?\.css)".*?>/g)];
        for (const match of cssLinks) {
            const cssPath = match[1];
            const cssContent = codeFiles[cssPath];
            if (cssContent) {
                htmlContent = htmlContent.replace(match[0], `<style>${cssContent}</style>`);
            }
        }
        
        // Find and inline JS
        const scriptLinks = [...htmlContent.matchAll(/<script.+?src="(.+?\.js)".*?><\/script>/g)];
         for (const match of scriptLinks) {
            const jsPath = match[1];
            const jsContent = codeFiles[jsPath];
            if (jsContent) {
                htmlContent = htmlContent.replace(match[0], `<script>${jsContent}</script>`);
            }
        }
        return htmlContent;
    }, [codeFiles]);

    const getLanguageForCodeBlock = (filename: string): string => {
        const extension = filename.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'html': return 'html';
            case 'css': return 'css';
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'json': return 'json';
            case 'md': return 'markdown';
            default: return '';
        }
    };
    
     const FeaturePlaceholder = ({ title, description }: { title: string, description: string }) => (
        <button disabled className="p-2 text-left bg-slate-800 rounded-md cursor-not-allowed opacity-60 w-full">
            <p className="font-semibold text-xs text-slate-300">{title}</p>
            <p className="text-xs text-slate-400">{description}</p>
        </button>
    );

    const renderControls = () => {
        if (mode === 'template') {
            return (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TEMPLATES.map(template => (
                        <button key={template.name} onClick={() => handleSelectTemplate(template)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors">
                            <p className="font-semibold text-sm text-brand-primary">{template.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{template.type} / {template.platform}</p>
                        </button>
                    ))}
                </div>
            );
        }
        return (
            <>
                <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-medium mb-1">Project Type</label><select value={projectType} onChange={e => setProjectType(e.target.value as ProjectType)} className="w-full text-sm bg-slate-700/50 border p-2 rounded-md"><option>Website</option><option>App</option><option>Game</option></select></div>
                    <div><label className="block text-xs font-medium mb-1">Platform</label><select value={platforms} onChange={e => setPlatforms(e.target.value as Platform)} className="w-full text-sm bg-slate-700/50 border p-2 rounded-md"><option>Web</option><option>iOS</option><option>Android</option><option>Cross-Platform</option></select></div>
                </div>
                <div><label className="block text-xs font-medium mb-1">Project Name</label><input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g., My Awesome Game" className="w-full text-sm bg-slate-700/50 border p-2 rounded-md"/></div>
                <div><label className="block text-xs font-medium mb-1">Copywriting Language</label><select value={language} onChange={e => setLanguage(e.target.value)} className="w-full text-sm bg-slate-700/50 border p-2 rounded-md">{LANGUAGES.map(l => <option key={l}>{l}</option>)}</select></div>
                <div><label className="block text-xs font-medium mb-1">Describe your Project</label><textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full text-sm bg-slate-700/50 border p-2 rounded-md" placeholder="Be detailed! e.g., A 2D platformer game where a squirrel collects nuts..." /></div>
                <button onClick={() => callApi(false)} disabled={isLoading || !description.trim() || !projectName.trim()} className="w-full py-2 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-600 flex justify-center">{isLoading ? <Spinner/> : 'Generate Project'}</button>
                {codeFiles && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <label className="block text-sm font-medium mb-1">Refine & Customize</label>
                        <p className="text-xs text-slate-400 mb-2">Describe a change, like a no-code editor.</p>
                        <div className="flex gap-2">
                            <input value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && callApi(true)} placeholder="e.g., Change the color scheme to blue" className="flex-grow text-sm bg-slate-700/50 p-2 rounded-md" />
                            <button onClick={() => callApi(true)} disabled={isRefining || !refinePrompt} className="py-2 px-3 bg-brand-secondary text-white text-sm rounded-md disabled:bg-slate-600 flex justify-center">{isRefining ? <Spinner/> : "Refine"}</button>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">AI Web Builder</h3>
            <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-3 overflow-y-auto pr-2">
                    <div className="flex bg-slate-800 rounded-md p-1"><button onClick={() => setMode('template')} className={`flex-1 text-sm p-2 rounded ${mode === 'template' ? 'bg-brand-primary' : 'hover:bg-slate-700'}`}>Start from Template</button><button onClick={() => setMode('custom')} className={`flex-1 text-sm p-2 rounded ${mode === 'custom' ? 'bg-brand-primary' : 'hover:bg-slate-700'}`}>Custom Project</button></div>
                    {renderControls()}
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                     <div className="mt-auto pt-4 space-y-2">
                         <h4 className="text-sm font-semibold text-slate-400">Business Features (Coming Soon)</h4>
                         <div className="grid grid-cols-2 gap-2"><FeaturePlaceholder title="SEO Tools" description="Optimize for search." /><FeaturePlaceholder title="Analytics" description="Track user engagement." /><FeaturePlaceholder title="Version Control" description="Save & restore points." /><FeaturePlaceholder title="Sales Funnels" description="Create conversion paths." /></div>
                    </div>
                </div>

                <div className="md:col-span-2 bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
                    {isLoading && <div className="flex-grow flex items-center justify-center"><Spinner /></div>}
                    {!isLoading && !codeFiles && <p className="text-slate-500 flex-grow flex items-center justify-center text-center">Your generated website preview and code will appear here.</p>}
                    {codeFiles && (
                        <>
                        <div className="h-1/2 flex flex-col">
                           <div className="flex-shrink-0 p-2 border-b border-slate-700 flex items-center justify-between">
                             <h4 className="text-sm font-semibold">Live Preview</h4>
                             <div className="flex items-center gap-2">
                                <button disabled className="text-xs py-1 px-3 bg-slate-600 text-slate-400 rounded-md cursor-not-allowed">Export to WordPress</button>
                                <button disabled className="text-xs py-1 px-3 bg-slate-600 text-slate-400 rounded-md cursor-not-allowed">Download Project (.zip)</button>
                             </div>
                           </div>
                           <iframe srcDoc={fullHtmlPreview} title="Website Preview" className="w-full h-full bg-white" sandbox="allow-scripts" />
                        </div>
                         <div className="h-1/2 flex flex-col border-t-2 border-slate-700">
                             <div className="flex-shrink-0 border-b border-slate-700"><div className="flex space-x-2 p-2 overflow-x-auto">{Object.keys(codeFiles).map(filename => (<button key={filename} onClick={() => setActiveFile(filename)} className={`text-xs px-3 py-1 rounded-md ${activeFile === filename ? 'bg-brand-primary text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{filename}</button>))}</div></div>
                            <div className="flex-grow overflow-y-auto">{activeFile && <CodeBlock language={getLanguageForCodeBlock(activeFile)} code={codeFiles[activeFile]} />}</div>
                         </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebsiteMaker;