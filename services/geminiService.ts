import {
  GoogleGenAI,
  Chat,
  GenerateContentResponse,
  Type,
  Modality,
} from '@google/genai';

// Fix: Initialize GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Fix: Implement startChatSession function
export function startChatSession(systemInstruction: string): Chat {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });
}

// Fix: Implement streamChatResponse function
export async function streamChatResponse(
  chat: Chat,
  message: string,
  useGoogleSearch: boolean,
): Promise<AsyncGenerator<GenerateContentResponse>> {
  const config = useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {};
  return chat.sendMessageStream({ message, config });
}

// Fix: Implement generateSpeech function
export async function generateSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('No audio data received from API.');
  }
  return base64Audio;
}

// Fix: Implement analyzeImage function
export async function analyzeImage(
  prompt: string,
  base64Image: string,
  mimeType: string,
): Promise<GenerateContentResponse> {
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };
  const textPart = { text: prompt };
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });
}

// Fix: Implement generateImage function
export async function generateImage(prompt: string) {
  return ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });
}

// Fix: Implement generateWebsiteCode function
export async function generateWebsiteCode(prompt: string): Promise<GenerateContentResponse> {
  return ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: `Create HTML, CSS, and JavaScript for a website based on this description: ${prompt}.
      Respond with a JSON object with three keys: "html", "css", and "javascript".
      The HTML should be the content for the <body> tag.
      The CSS should be the complete styles.
      The JavaScript can be empty if not needed.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: { type: Type.STRING, description: 'HTML body content' },
          css: { type: Type.STRING, description: 'CSS styles' },
          javascript: { type: Type.STRING, description: 'JavaScript code' },
        },
        required: ['html', 'css'],
      },
    },
  });
}

// Fix: Implement editText function for ResumeMaker
export async function editText(prompt: string, textToEdit: string): Promise<GenerateContentResponse> {
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${prompt}:\n\n---\n\n${textToEdit}`,
    config: {
      systemInstruction: "You are a professional editor. Follow the user's instructions to revise the provided text."
    }
  });
}

// Fix: Implement runWebSearch function for ResearchTool
export async function runWebSearch(query: string): Promise<GenerateContentResponse> {
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
}

// Fix: Implement editImage function for PhotoEditor
export async function editImage(
  prompt: string,
  base64Image: string,
  mimeType: string,
): Promise<GenerateContentResponse> {
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };
  const textPart = { text: prompt };
  return ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });
}
