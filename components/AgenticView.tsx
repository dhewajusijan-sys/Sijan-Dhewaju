import React, { useState, useCallback, useEffect } from 'react';
import { generateAgenticPlan, runWebSearch, synthesizeAgenticResult } from '../services/geminiService';
import type { AgenticStep } from '../types';
import Spinner from './common/Spinner';
import CodeBlock from './common/CodeBlock';

const AgenticView: React.FC = () => {
    const [goal, setGoal] = useState('');
    const [plan, setPlan] = useState<AgenticStep[]>([]);
    const [finalAnswer, setFinalAnswer] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState('');
    const endOfStepsRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => endOfStepsRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollToBottom, [plan, finalAnswer]);

    const handleExecute = useCallback(async () => {
        if (!goal.trim()) return;

        setIsRunning(true);
        setError('');
        setPlan([]);
        setFinalAnswer('');

        try {
            // 1. Generate Plan
            const planResponse = await generateAgenticPlan(goal);
            const parsedPlan = JSON.parse(planResponse.text).plan;
            const initialSteps: AgenticStep[] = parsedPlan.map((p: any) => ({
                ...p,
                status: 'pending',
            }));
            setPlan(initialSteps);

            // 2. Execute Plan
            const stepResults: { step: number; description: string; result: string }[] = [];
            for (let i = 0; i < initialSteps.length; i++) {
                const step = initialSteps[i];

                // Update UI to show step is running
                setPlan(prev => prev.map(s => s.step === step.step ? { ...s, status: 'running' } : s));

                let resultText = '';
                let stepError: string | undefined;

                try {
                    if (step.tool === 'web_search' && step.query) {
                        const searchResult = await runWebSearch(step.query);
                        resultText = searchResult.text;
                    } else {
                        resultText = 'No action required for this step.';
                    }
                    stepResults.push({ step: step.step, description: step.description, result: resultText });
                } catch (e: any) {
                    resultText = `Error during execution: ${e.message}`;
                    stepError = e.message;
                }

                // Update UI with result
                setPlan(prev => prev.map(s => s.step === step.step ? { ...s, status: stepError ? 'error' : 'complete', result: resultText, error: stepError } : s));
                
                if (stepError) {
                    throw new Error(`Execution failed at step ${step.step}`);
                }
            }

            // 3. Synthesize Final Answer
            const finalResponse = await synthesizeAgenticResult(goal, stepResults);
            setFinalAnswer(finalResponse.text);

        } catch (err: any) {
            setError(`Agent failed: ${err.message || 'An unknown error occurred.'}`);
        } finally {
            setIsRunning(false);
        }
    }, [goal]);

    const getStatusIcon = (status: AgenticStep['status']) => {
        switch (status) {
            case 'pending': return <div className="w-4 h-4 rounded-full border-2 border-slate-400"></div>;
            case 'running': return <Spinner />;
            case 'complete': return <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg></div>;
            case 'error': return <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-xs">!</div>;
        }
    };
    
    const renderStep = (step: AgenticStep) => (
        <div key={step.step} className="p-3 sm:p-4 bg-white/50 dark:bg-charcoal-900/50 rounded-lg border border-slate-200 dark:border-brand-cyan/20">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">{getStatusIcon(step.status)}</div>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Step {step.step}: {step.description}</p>
                    {step.tool === 'web_search' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Action: Web Search, Query: "{step.query}"</p>}
                </div>
            </div>
            {step.result && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                     <CodeBlock language={step.status === 'error' ? '' : 'markdown'} code={step.result} />
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full text-slate-700 dark:text-slate-300">
            <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-6">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100" style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}>Agentic AI</h2>
                    <p className="text-slate-500">Give the AI a goal, and watch it think, plan, and act to find the answer.</p>
                </div>

                <div className="space-y-4">
                    {plan.map(renderStep)}
                </div>

                {finalAnswer && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-500/30">
                        <h3 className="font-bold text-lg text-green-800 dark:text-green-300 mb-2">Final Answer</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: finalAnswer.replace(/\n/g, '<br />') }} />
                    </div>
                )}
                 <div ref={endOfStepsRef}></div>
            </div>

            <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-white/50 dark:bg-charcoal-900/50 backdrop-blur-md border-t border-slate-200 dark:border-brand-cyan/20 z-10">
                {error && <p className="text-red-500 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center gap-3 p-2 bg-slate-100/60 dark:bg-charcoal-800/40 border border-slate-300 dark:border-blue-500/20 rounded-xl">
                    <input
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleExecute(); }}
                        placeholder="Enter a complex goal... e.g., 'What were the key findings of the top 3 papers on LLM reasoning from last month?'"
                        className="w-full bg-transparent p-2 focus:outline-none text-slate-800 dark:text-slate-300 placeholder-slate-500"
                        disabled={isRunning}
                    />
                    <button onClick={handleExecute} disabled={!goal.trim() || isRunning} className="py-2 px-4 sm:px-6 bg-brand-blue text-white rounded-lg disabled:bg-slate-400 dark:disabled:bg-charcoal-700 transition-colors">
                        {isRunning ? <Spinner/> : 'Execute'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgenticView;