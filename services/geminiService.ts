import { 
    GoogleGenAI, 
    Chat, 
    GenerateContentResponse, 
    GenerateImagesResponse,
    Type, 
    FunctionDeclaration, 
    Modality, 
    Blob as GenAI_Blob,
    VideoGenerationReferenceImage,
    VideoGenerationReferenceType,
    Operation,
    Part,
} from '@google/genai';
import type { Source } from '../types';

// Per guidelines, create a new instance before API calls where necessary, especially for Veo.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });
const getVeoAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });


// --- Chat ---
export const startChatSession = (systemInstruction: string, language: string, model: 'gemini-2.5-flash' | 'gemini-2.5-pro'): Chat => {
    const ai = getAI();
    return ai.chats.create({
        model: model,
        config: {
            systemInstruction: `${systemInstruction} All your responses must be in ${language}.`,
        },
    });
};

export const streamChatResponse = async (chat: Chat, parts: (string | Part)[], useGoogleSearch: boolean): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const config = useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {};
    // The message property now accepts an array of Parts for multimodal input
    const messageParts = parts.map(p => typeof p === 'string' ? { text: p } : p);
    return chat.sendMessageStream({ message: messageParts, config });
};


// --- General Text & Multimodal ---

export const runMultimodalAnalysis = async (parts: any[], useGoogleSearch: boolean): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts },
        config: useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {}
    });
};

export const analyzeImage = async (prompt: string, base64Image: string, mimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const imagePart = { inlineData: { data: base64Image, mimeType } };
    const textPart = { text: prompt };
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, textPart] },
    });
};

export const solveTextQuestion = async (question: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Solve the following academic question step-by-step:\n\n${question}`;
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
};


// --- Text Analysis & Transformation ---

export const analyzeSentiment = async (text: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Analyze the sentiment of the following text. Respond with only one word: "Positive", "Neutral", or "Negative".\n\nText: "${text}"`;
    return ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
};

export const summarizeText = async (text: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize the following conversation concisely:\n\n${text}`,
    });
};

export const summarizeLectureChunk = async (text: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const systemInstruction = "You are a note-taking AI assistant. Your task is to listen to a lecture and create structured, concise, and easy-to-read notes. Identify key concepts, definitions, important names, dates, and action items. Use bullet points, bolding, and clear headings to organize the information.";
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
        config: { systemInstruction },
    });
};

export const boostPrompt = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const systemInstruction = "You are a prompt engineering expert. Your task is to take a user's simple prompt and expand it into a more detailed, effective prompt for a large language model. Add context, specify the desired format, and include constraints to get a better response. Only return the improved prompt, without any explanation or preamble.";
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction },
    });
};

export const generateSuggestedReplies = async (history: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following conversation, generate 3 short, relevant, and diverse suggested replies for the user to continue the conversation. The user just received the last message from the model.\n\n${history}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
};

export const editText = async (instruction: string, textToEdit: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Instruction: ${instruction}\n\nText to Edit:\n${textToEdit}`,
    });
};

export const refineText = async (textToRefine: string, instruction: string, contentType: 'Presentation' | 'Test Paper' | 'Mind Map'): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are editing a ${contentType}. Refine the following text based on the instruction provided.\n\nInstruction: ${instruction}\n\nOriginal Text:\n${textToRefine}\n\nReturn ONLY the refined text.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
}

// --- Image Generation & Editing ---

export const generateImage = async (prompt: string, numberOfImages: number = 1, aspectRatio: "1:1" | "16:9" = "1:1"): Promise<GenerateImagesResponse> => {
    const ai = getAI();
    return ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { numberOfImages, aspectRatio, outputMimeType: 'image/jpeg' }
    });
};

export const generateLogo = async (prompt: string): Promise<GenerateImagesResponse> => {
    const ai = getAI();
    const fullPrompt = `Generate 4 professional, clean, modern logo designs based on this description: "${prompt}". The logos should be on a solid white background.`;
    return ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: { numberOfImages: 4 }
    });
};

export const editImage = async (prompt: string, base64Image: string, mimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const imagePart = { inlineData: { data: base64Image, mimeType } };
    const textPart = { text: prompt };
    return ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: { responseModalities: [Modality.IMAGE] }
    });
};

export const virtualTryOn = async (personBase64: string, personMimeType: string, outfitBase64: string, outfitMimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const personPart = { inlineData: { data: personBase64, mimeType: personMimeType } };
    const outfitPart = { inlineData: { data: outfitBase64, mimeType: outfitMimeType } };
    const textPart = { text: "You are a virtual stylist AI. The user has provided two images: one of a person and one of an outfit. Your task is to realistically place the outfit onto the person. Adapt the clothing to their body shape, pose, and the lighting of the original photo. Return only the final image." };
    
    return ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [personPart, outfitPart, textPart] },
        config: { responseModalities: [Modality.IMAGE] }
    });
};

export const placeProductInRoom = async (roomBase64: string, roomMimeType: string, productBase64: string, productMimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const roomPart = { inlineData: { data: roomBase64, mimeType: roomMimeType } };
    const productPart = { inlineData: { data: productBase64, mimeType: productMimeType } };
    const textPart = { text: "You are a virtual interior designer AI. The user has provided two images: one of a room and one of a product. Your task is to realistically place the product into the room. Pay close attention to perspective, scale, lighting, and shadows to make the composition look natural. Return only the final image." };

    return ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [roomPart, productPart, textPart] },
        config: { responseModalities: [Modality.IMAGE] }
    });
};


// --- Video Generation (Veo) ---
export const generateVideo = async (prompt: string, image?: { base64: string, mimeType: string }): Promise<string> => {
    const ai = getVeoAI();
    let initialOperation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: image ? { imageBytes: image.base64, mimeType: image.mimeType } : undefined,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    
    while (!initialOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        initialOperation = await ai.operations.getVideosOperation({ operation: initialOperation });
    }
    
    const downloadLink = initialOperation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video URI not found in operation response.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY!}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const generateProVideo = async (prompt: string, images: { base64: string, mimeType: string }[]): Promise<Operation<any>> => {
    const ai = getVeoAI();
    const referenceImagesPayload: VideoGenerationReferenceImage[] = images.map(img => ({
        image: { imageBytes: img.base64, mimeType: img.mimeType },
        referenceType: VideoGenerationReferenceType.ASSET,
    }));

    return ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            referenceImages: referenceImagesPayload,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });
};

export const extendVideo = async (prompt: string, previousVideo: any, aspectRatio: string): Promise<Operation<any>> => {
    const ai = getVeoAI();
    return ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        video: previousVideo,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
};

export const pollVideoOperation = async (operation: Operation<any>): Promise<Operation<any>> => {
    const ai = getVeoAI();
    return ai.operations.getVideosOperation({ operation });
};

export const getVideoObjectUrlFromOperation = async (operation: Operation<any>): Promise<string> => {
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video URI not found in operation response.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY!}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

// --- Web Search & Grounding ---

export const runWebSearch = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });
};

export const summarizeYouTubeVideo = async (url: string, task: string, language: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    let prompt = '';
    switch (task) {
        case 'summary': prompt = `Provide a concise summary of the key ideas from the YouTube video at this URL: ${url}.`; break;
        case 'timestamps': prompt = `Generate a list of key topics with timestamps for the YouTube video at this URL: ${url}.`; break;
        case 'comments': prompt = `Analyze the comment section of the YouTube video at ${url} and summarize the overall sentiment and main discussion points.`; break;
        case 'transcript': prompt = `Provide the full transcript for the YouTube video at this URL: ${url}.`; break;
    }
    prompt += ` The response should be in ${language}.`;

    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });
};

export const queryGroundedContent = async (sources: Source[], prompt: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const sourceContents = sources.map(s => {
        let content = s.content;
        // For non-text types, give the AI context about the source type
        if (s.type === 'pdf') return `Source (PDF Document named ${s.name}):\n${content}`;
        if (s.type === 'audio') return `Source (Audio file named ${s.name}):\n${content}`;
        if (s.type === 'video') return `Source (Video file named ${s.name}):\n${content}`;
        return `Source (${s.type}):\n${content}`;
    }).join('\n\n---\n\n');
    
    const fullPrompt = `Based on the following sources, answer the user's prompt.\n\n--- SOURCES ---\n${sourceContents}\n\n--- PROMPT ---\n${prompt}`;
    
    const useGoogleSearch = sources.some(s => s.type === 'topic');
    
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt,
        config: useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {}
    });
};

// --- Code Generation ---

export const generateProjectCode = async (projectType: string, projectName: string, platform: string, description: string, language: string, existingCode?: Record<string, string>, refineInstruction?: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    let prompt = '';
    if (refineInstruction && existingCode) {
        prompt = `You are a senior software engineer. Based on the following existing code files, apply the requested refinement.\n\n--- EXISTING CODE ---\n${JSON.stringify(existingCode, null, 2)}\n\n--- REFINEMENT INSTRUCTION ---\n${refineInstruction}\n\nRespond with a JSON object containing the updated file structure and complete code for each file. Only update the necessary files.`;
    } else {
        prompt = `You are a senior software engineer. Generate the complete code for a new project.\n\n- Project Name: ${projectName}\n- Project Type: ${projectType}\n- Platform: ${platform}\n- Description: ${description}\n- Copywriting Language: ${language}\n\nRespond with a JSON object where keys are filenames (e.g., "index.html", "style.css", "script.js") and values are the complete, clean code for those files. Include a README.md file.`;
    }
    
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: { type: Type.OBJECT }
        },
    });
};

export const analyzeSeo = async (htmlContent: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are a senior SEO specialist. Analyze the following HTML code and provide a detailed report on SEO improvements. Focus on title tags, meta descriptions, header structure (H1, H2s), image alt attributes, and mobile-friendliness. Provide actionable recommendations formatted in Markdown.`;
    return ai.models.generateContent({ model: 'gemini-2.5-pro', contents: {parts: [{text: prompt}, {text: htmlContent}] }});
};

export const suggestAnalytics = async (htmlContent: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are a digital analytics consultant. Based on the following website's HTML, suggest key performance indicators (KPIs) to track. Also, provide a basic analytics plan, including what events to track (e.g., button clicks, form submissions) to measure user engagement and conversion. Format the response in Markdown.`;
    return ai.models.generateContent({ model: 'gemini-2.5-pro', contents: {parts: [{text: prompt}, {text: htmlContent}] }});
};

// --- Data Analysis ---
export const runDataAnalysis = async (csvData: string, pythonCode: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are a data analyst. The user has provided a snippet of a CSV file and a Python script using the pandas library. The script will be executed in an environment where pandas is installed and the data is loaded into a DataFrame named 'df'. Return the output of the script, such as from a print() statement or the value of the last expression.

--- CSV DATA SNIPPET ---
${csvData}

--- PYTHON CODE ---
${pythonCode}

--- OUTPUT ---`;
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
};

// --- Agentic AI ---
export const generateAgenticPlan = async (goal: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const systemInstruction = "You are an AI planner. Your task is to break down a user's goal into a sequence of executable steps. For each step, determine if a tool is needed. The only available tool is 'web_search'. If the step is a question that needs external information, use 'web_search'. If it's a thinking or synthesis step, use 'none'. The 'query' for web_search should be a concise search term. Respond with a JSON object that follows the provided schema.";
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Goal: ${goal}`,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    plan: {
                        type: Type.ARRAY,
                        description: "The sequence of steps to achieve the goal.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                step: { type: Type.INTEGER, description: "The step number." },
                                description: { type: Type.STRING, description: "A description of what to do in this step." },
                                tool: { type: Type.STRING, enum: ['web_search', 'none'], description: "The tool to use for this step." },
                                query: { type: Type.STRING, description: "The search query if web_search is the tool." }
                            },
                            required: ["step", "description", "tool"]
                        }
                    }
                }
            }
        }
    });
};

export const synthesizeAgenticResult = async (goal: string, results: { step: number, description: string, result: string }[]): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const systemInstruction = "You are an AI synthesizer. Your task is to combine the results from a series of actions into a final, comprehensive answer for the user's original goal. Format the answer clearly in Markdown.";
    const resultsString = results.map(r => `Step ${r.step} (${r.description}):\n${r.result}`).join('\n\n');
    const prompt = `Original Goal: ${goal}\n\nHere are the results from the steps taken:\n${resultsString}\n\nSynthesize these results into a final answer.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { systemInstruction }
    });
};


// --- Document & Presentation ---

export const generatePresentation = async (topic: string, numSlides: number): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Generate a professional presentation about "${topic}". It should have exactly ${numSlides} slides. Respond with a JSON object containing a "slides" array. Each object in the array should have a "title" (string) and "content" (string, formatted as newline-separated bullet points).`;
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    slides: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                content: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });
};

export const refineSlideContent = async (title: string, content: string, instruction: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Refine the content for a presentation slide titled "${title}". The current content is:\n\n${content}\n\nInstruction: "${instruction}".\n\nReturn only the refined content, keeping the newline-separated bullet point format.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
};

export const generateQuestionPaper = async (mode: 'topic' | 'syllabus', content: string, numQuestions: number, difficulty: string, institution?: string, instructions?: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are an expert educator. Generate a question paper and a separate answer key.\n\n- Institution: ${institution || 'Test Paper'}\n- Source: Based on the following ${mode}: ${content}\n- Number of Questions: ${numQuestions}\n- Difficulty: ${difficulty}\n- Instructions: ${instructions || 'Answer all questions.'}\n\nRespond with a single JSON object containing two keys: "questionPaper" (a string with the full paper) and "answerKey" (a string with the answers).`;
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questionPaper: { type: Type.STRING },
                    answerKey: { type: Type.STRING }
                }
            }
        }
    });
};

export const generateMindMap = async (source: string, mode: 'topic' | 'text'): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Generate a detailed mind map from the following ${mode}: "${source}". Use Markdown with nested bullet points (using tabs for indentation) to represent the hierarchy. The central idea should be the first line.`;
    return ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
};

export const getMindMapSuggestions = async (mindMap: string, instruction: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are a creative assistant. Based on the existing mind map below, provide a numbered list of 3 new ideas to expand it based on the user's instruction.\n\n--- MIND MAP ---\n${mindMap}\n\n--- INSTRUCTION ---\n${instruction}\n\nReturn only the list of suggestions.`;
    return ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
};

export interface TextExtractorConfig {
    ocr: boolean;
    handwriting: boolean;
    multiLanguage: string;
    extractKeyValuePairs: boolean;
    identifyDocumentStructure: boolean;
    extractTables: boolean;
    contextualUnderstanding: boolean;
    performImagePreprocessing: boolean;
    includeConfidenceScore: boolean;
}

export const extractTextFromDocument = async (base64Image: string, mimeType: string, config: TextExtractorConfig): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const imagePart = { inlineData: { data: base64Image, mimeType } };

    let instructions = [
        "You are an advanced Document AI. Analyze the provided image and extract information based on the following configuration.",
        config.ocr && "Perform Optical Character Recognition (OCR) on all printed text.",
        config.handwriting && "Perform Handwriting Recognition (ICR/IWR) on all handwritten text.",
        `The document contains text in the following languages: ${config.multiLanguage}. Process accordingly.`,
        config.extractKeyValuePairs && "Identify and extract all key-value pairs (e.g., 'Total Amount': '$50.00').",
        config.extractTables && "Extract all tables into a structured format.",
        config.identifyDocumentStructure && "Identify the document's structure (e.g., headers, footers, paragraphs, lists).",
        config.contextualUnderstanding && "Apply contextual understanding to interpret the data, not just extract it.",
        config.performImagePreprocessing && "Mentally correct for any skew or orientation issues before processing.",
        config.includeConfidenceScore && "For each extracted piece of data (text block, key-value pair, table cell), provide a confidence score from 0 to 1.",
        "Return the result as a single, clean JSON object matching the provided schema. Do not include any markdown formatting like ```json."
    ].filter(Boolean).join('\n');

    const textPart = { text: instructions };

    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    rawText: { type: Type.STRING, description: "The full, raw extracted text from the document." },
                    documentStructure: {
                        type: Type.OBJECT, description: "Identified structural elements.",
                        properties: {
                            title: { type: Type.STRING },
                            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                            paragraphsCount: { type: Type.INTEGER },
                        }
                    },
                    keyValuePairs: {
                        type: Type.ARRAY, description: "All extracted key-value pairs.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                key: { type: Type.STRING },
                                value: { type: Type.STRING },
                                confidence: { type: Type.NUMBER }
                            }
                        }
                    },
                    tables: {
                        type: Type.ARRAY, description: "All extracted tables.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                                rows: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    },
                    overallConfidence: { type: Type.NUMBER, description: "Overall confidence for the analysis." }
                }
            }
        }
    });
};

export const extractTextFromImage = async (base64Image: string, mimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const imagePart = { inlineData: { data: base64Image, mimeType } };
    const textPart = { text: "Extract all text from this image, preserving the formatting as much as possible." };
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, textPart] },
    });
};

export const classifyDocument = async (text: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Classify the following document text into one of these categories: Invoice, Resume, Contract, Report, Article, Letter, Other. Respond with only the category name.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
};

// --- Learning Hub Specific ---

export const generateLessonPlan = async (topic: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `You are an expert curriculum designer. Create a structured, 5-step lesson plan for the topic: "${topic}". The plan should break the topic down into logical, easy-to-follow sub-topics for a beginner.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    lessonPlan: {
                        type: Type.ARRAY,
                        description: "A 5-step lesson plan.",
                        items: {
                           type: Type.OBJECT,
                           properties: {
                               step: { type: Type.INTEGER },
                               title: { type: Type.STRING },
                               description: { type: Type.STRING },
                           }
                        }
                    }
                }
            }
        }
    });
};

export const generateFlashcards = async (sources: Source[]): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const sourceContents = sources.map(s => `Source (${s.type}):\n${s.content}`).join('\n\n---\n\n');
    const prompt = `Based on the following sources, generate a set of 10-15 flashcards for studying. Each flashcard should cover a key concept, term, or question. Respond with a JSON object containing a "flashcards" array. Each object in the array should have a "front" (the question or term) and a "back" (the answer or definition).

--- SOURCES ---
${sourceContents}`;

    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    flashcards: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                front: { type: Type.STRING },
                                back: { type: Type.STRING }
                            },
                             required: ["front", "back"]
                        }
                    }
                }
            }
        }
    });
};

export const generateAudioSummary = async (sources: Source[]): Promise<string> => {
    const ai = getAI();
    // Step 1: Generate a text summary
    const sourceContents = sources.map(s => `Source (${s.type}):\n${s.content}`).join('\n\n---\n\n');
    const summaryPrompt = `Based on the following sources, create a concise audio script that summarizes the key information. The script should be engaging and easy to listen to, like a short podcast segment.

--- SOURCES ---
${sourceContents}`;
    const summaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: summaryPrompt,
    });
    const script = summaryResponse.text;

    // Step 2: Convert the summary to speech
    const speechResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
    });

    const base64Audio = speechResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned for summary.");
    return base64Audio;
};


// --- Audio ---
export const generateSpeech = async (text: string, voice: string, language: string, style: string): Promise<string> => {
    const ai = getAI();
    const prompt = style ? `Say in a ${style} manner: ${text}` : text;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned.");
    return base64Audio;
};

export const transcribeAudio = async (base64: string, mimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const audioPart = { inlineData: { data: base64, mimeType } };
    const textPart = { text: "Transcribe the following audio file." };
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [audioPart, textPart] }
    });
};

export const enhanceSpeech = async (base64: string, mimeType: string): Promise<string> => {
    const ai = getAI();
    const audioPart = { inlineData: { data: base64, mimeType } };
    const textPart = { text: "Enhance the speech in this audio. Remove background noise, normalize volume, and improve clarity." };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        contents: { parts: [audioPart, textPart] },
        config: { responseModalities: [Modality.AUDIO] }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned.");
    return base64Audio;
};

export const generateLyrics = (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write song lyrics for a song about: ${prompt}.`,
    });
};

export const generateTranslation = (text: string, language: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following text to ${language}:\n\n${text}`,
    });
};

export const suggestVideoClips = (transcript: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const prompt = `Based on the following video transcript, identify 3-5 engaging, shareable moments that would make good short clips (e.g., for TikTok, YouTube Shorts). For each clip, provide a catchy title, the start/end timestamp (in MM:SS format, assuming the transcript is spoken at a normal pace), and a brief reason why it's a good clip.\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing a "clips" array.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    clips: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                timestamp: { type: Type.STRING },
                                reason: { type: Type.STRING },
                            }
                        }
                    }
                }
            }
        }
    });
};

// --- Security & Advanced Analysis ---

export const analyzeForThreats = (content: string, type: 'Code' | 'URL' | 'Text' | 'File', filename?: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    let prompt = `As a cybersecurity expert, analyze the following ${type} for potential threats, vulnerabilities, or malicious intent. Provide a detailed report of your findings, including risk level, evidence, and recommended mitigation steps.\n\n`;

    if (type === 'File' && filename) {
        prompt += `--- FILENAME ---\n${filename}\n\n--- FILE CONTENT ---\n${content}`;
    } else {
        prompt += `--- CONTENT ---\n${content}`;
    }

    return ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
};

export const runFacialAnalysis = async (base64Image: string, mimeType: string, task: string): Promise<any> => {
    const ai = getAI();
    let prompt = '';
    let responseMimeType: 'application/json' | undefined;
    let responseSchema: any;
    let useSearch = false;
    let model: 'gemini-2.5-flash-image' | 'gemini-2.5-pro' = 'gemini-2.5-flash-image';
    let responseModalities: Modality[] | undefined;

    switch (task) {
        case 'detect-faces':
            prompt = "Detect all human faces in this image and draw a bounding box around each one.";
            responseModalities = [Modality.IMAGE];
            break;
        case 'analyze-attributes':
            model = 'gemini-2.5-pro';
            prompt = "Analyze the primary face in this image and estimate the apparent age, gender, and primary emotion. Respond in a JSON object with 'age', 'gender', and 'emotion' keys.";
            responseMimeType = 'application/json';
            responseSchema = { type: Type.OBJECT, properties: { age: { type: Type.STRING }, gender: { type: Type.STRING }, emotion: { type: Type.STRING } } };
            break;
        case 'extract-features':
            model = 'gemini-2.5-pro';
            prompt = "Analyze the facial features of the person in this image and describe them in a detailed text format. This is for conceptual analysis, not biometric data.";
            break;
        case 'identify-person':
            model = 'gemini-2.5-pro';
            prompt = "Identify the public figure in this image using web search. Provide a brief biography. Note: This feature is intended for identifying public figures and respects privacy; it will not identify private individuals.";
            useSearch = true;
            break;
        case 'reverse-face-search':
             model = 'gemini-2.5-pro';
             prompt = `Perform a reverse face search using the provided image. Analyze the results to determine if the person is a public figure, if the image is likely AI-generated, and provide a risk assessment. Return a JSON object with keys: "is_ai_generated" (object with "result": boolean, "confidence": float, "reasoning": string), "summary" (string), "risk_assessment" (string), and "matches" (array of objects with "url", "confidence_score", "context").`;
             useSearch = true;
             responseMimeType = 'application/json';
             responseSchema = { type: Type.OBJECT };
             break;
        default:
            throw new Error(`Unknown facial analysis task: ${task}`);
    }

    const imagePart = { inlineData: { data: base64Image, mimeType } };
    const textPart = { text: prompt };
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
            tools: useSearch ? [{ googleSearch: {} }] : undefined,
            responseMimeType,
            responseSchema,
            responseModalities,
        }
    });

    // Post-process response to fit expected component structure
    if (task === 'detect-faces') {
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData) throw new Error("No image returned from face detection.");
        return { type: 'image', mimeType: imagePart.inlineData.mimeType, data: imagePart.inlineData.data };
    }
    if (responseMimeType === 'application/json') {
        const data = JSON.parse(response.text);
        return { type: task === 'reverse-face-search' ? 'reverse-search' : 'json', data };
    }
     if (task === 'identify-person') {
        return { type: 'text-with-sources', data: { text: response.text, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] } };
    }

    return { type: 'text', data: response.text };
};


export const generateVisualDesign = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getAI();
    const fullPrompt = `You are a professional graphic designer. Create a single, self-contained HTML file for a visual design based on the user's prompt. Use inline CSS for styling and embed any images as Base64 data URLs. The design should be modern, visually appealing, and fully responsive.\n\nPrompt: "${prompt}"\n\nRespond with a JSON object containing a single key "designHtml" with the full HTML content as a string.`;
    return ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    designHtml: { type: Type.STRING }
                }
            }
        }
    });
};