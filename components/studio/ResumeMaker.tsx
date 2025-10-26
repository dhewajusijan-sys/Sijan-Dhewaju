
import React, { useState, useCallback, useEffect } from 'react';
import { editText } from '../../services/geminiService';
import Spinner from '../common/Spinner';

const TEMPLATES = [
    { name: 'Modern', description: 'Clean lines, sans-serif fonts.', thumbnail: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Professional', description: 'Classic, serif fonts, structured.', thumbnail: 'https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Creative', description: 'Unique layout, expressive fonts.', thumbnail: 'https://images.pexels.com/photos/5926382/pexels-photo-5926382.jpeg?auto=compress&cs=tinysrgb&w=300' },
];

interface ResumeMakerProps {
    initialData?: string;
}

const ResumeMaker: React.FC<ResumeMakerProps> = ({ initialData }) => {
    const [step, setStep] = useState(1); // 1: Template, 2: Content, 3: Result
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
    const [formData, setFormData] = useState({
        fullName: '',
        contactInfo: '',
        summary: '',
        experience: '',
        education: '',
        skills: ''
    });
    const [jobDescription, setJobDescription] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData) {
            setResult(initialData);
            setStep(3);
        }
    }, [initialData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError('');

        let prompt;
        if (jobDescription.trim()) {
            prompt = `You are an expert career coach. Tailor the following resume information for the job description provided. Optimize the summary, and experience to highlight relevant skills and achievements. The resume should be in the "${selectedTemplate.name}" style. Format the output in clean Markdown.`;
        } else {
            prompt = `You are a professional resume writer. Create a complete, professional resume in the "${selectedTemplate.name}" style using the provided information. Ensure formatting is clean using Markdown.`;
        }
        
        const textToEdit = `
            --- RESUME INFORMATION ---
            Full Name: ${formData.fullName}
            Contact: ${formData.contactInfo}
            Summary: ${formData.summary}
            Work Experience: ${formData.experience}
            Education: ${formData.education}
            Skills: ${formData.skills}
            
            --- JOB DESCRIPTION (if applicable) ---
            ${jobDescription}
        `;

        try {
            const response = await editText(prompt, textToEdit);
            setResult(response.text);
            setStep(3);
        } catch (err) {
            setError('Failed to generate resume. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [formData, jobDescription, selectedTemplate]);

    const renderStep1 = () => (
        <div className="text-center">
            <h4 className="font-semibold text-lg mb-4">1. Choose a Style</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => { setSelectedTemplate(t); setStep(2); }} className="p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-left transition-colors group border-2 border-transparent hover:border-brand-primary">
                        <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden mb-2">
                             <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                        </div>
                        <p className="font-semibold text-brand-primary">{t.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
    
    const renderStep2 = () => (
        <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-lg text-center">2. Fill Your Details ({selectedTemplate.name} Style)</h4>
            <input name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Full Name" className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" />
            <textarea name="contactInfo" value={formData.contactInfo} onChange={handleInputChange} rows={2} placeholder="Contact Info (Email, Phone, LinkedIn)" className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" />
            <textarea name="summary" value={formData.summary} onChange={handleInputChange} rows={3} placeholder="Professional Summary" className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" />
            <textarea name="experience" value={formData.experience} onChange={handleInputChange} rows={5} placeholder="Work Experience (Job Title, Company, Dates, Responsibilities)" className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" />
            <textarea name="education" value={formData.education} onChange={handleInputChange} rows={2} placeholder="Education (Degree, University, Dates)" className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" />
            <textarea name="skills" value={formData.skills} onChange={handleInputChange} rows={2} placeholder="Skills (e.g., Python, Project Management)" className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" />
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium mb-1">Tailor to Job (Optional)</label>
                <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={4} className="w-full bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md border border-slate-300 dark:border-slate-600" placeholder="Paste job description here to tailor your resume..." />
            </div>
            <div className="flex gap-2 mt-2">
                 <button onClick={() => setStep(1)} className="flex-1 py-2 bg-slate-600 text-white rounded-md font-semibold hover:bg-slate-500 transition-colors">Back to Templates</button>
                <button onClick={handleGenerate} disabled={isLoading} className="flex-1 py-2 bg-brand-primary text-white rounded-md font-semibold disabled:bg-slate-400 dark:disabled:bg-slate-600 flex justify-center">{isLoading ? <Spinner/> : 'Generate Resume'}</button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="flex flex-col h-full">
            <h4 className="font-semibold text-lg text-center mb-4">3. Your AI-Powered Resume</h4>
            <div className="flex-grow bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 p-6 rounded-md overflow-y-auto prose dark:prose-invert max-w-none prose-sm">
                 <pre className="font-sans whitespace-pre-wrap">{result}</pre>
            </div>
            <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(2)} className="flex-1 py-2 bg-slate-600 text-white rounded-md font-semibold hover:bg-slate-500 transition-colors">Back to Edit</button>
                 <button disabled className="flex-1 py-2 bg-green-600 text-white rounded-md font-semibold disabled:opacity-50">Download PDF (Soon)</button>
            </div>
        </div>
    );

    return (
        <div className="p-3 h-full flex flex-col">
            <div className="flex-grow bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
                {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
};

export default ResumeMaker;
