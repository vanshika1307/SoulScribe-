import { GoogleGenAI, Type } from "@google/genai";

// NOTE: In a production environment, never expose keys in client-side code like this if possible.
// Use a proxy server. For this demo, we assume process.env.API_KEY is available.
const API_KEY = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Generates 5 journaling prompts for beginners based on a mood or topic.
 */
export const generateJournalPrompts = async (mood: string): Promise<string[]> => {
  if (!API_KEY) throw new Error("API Key missing");

  const model = "gemini-2.5-flash";
  const promptText = `
    The user is a beginner at journaling. Their current mood/context is: "${mood}".
    Provide exactly 5 short, engaging, and easy-to-answer journaling prompts (head points) to help them start writing about their day.
    Keep the tone warm, nostalgic, and encouraging. 
    Return the response as a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return ["Write about one good thing that happened today."];
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return [
      "What was the highlight of your day?",
      "List three things you are grateful for.",
      "How did you feel when you woke up today?",
      "What is one goal you want to achieve tomorrow?",
      "Describe a moment that made you smile."
    ];
  }
};

/**
 * Generates a cute aesthetic sticker or washi tape asset.
 */
export const generateDecorativeAsset = async (prompt: string, type: 'sticker' | 'washi'): Promise<string | null> => {
    if (!API_KEY) throw new Error("API Key missing");

    // Use gemini-2.5-flash-image for standard image generation, 
    // or gemini-3-pro-image-preview if high fidelity is needed.
    const model = "gemini-2.5-flash-image"; 
    
    let enhancedPrompt = "";
    
    if (type === 'sticker') {
        enhancedPrompt = `A high-quality, cute, die-cut sticker of ${prompt}. Vector art style, watercolor texture, thick white border around the shape, isolated on a white background. Charming, scrapbook aesthetic.`;
    } else {
        enhancedPrompt = `A strip of washi tape pattern with ${prompt}. Horizontal rectangular strip. Watercolor or pastel aesthetic, semi-transparent edges, isolated on white background.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: enhancedPrompt }]
            },
            config: {
               // We don't set responseMimeType for image models usually unless specific handling needed
            }
        });

        // Parse the response to find the inline image data
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Gemini Image Error:", error);
        throw error;
    }
};