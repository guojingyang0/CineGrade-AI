
import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60, // Extend timeout for image processing
};

// Initialize Gemini Client server-side
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Server API_KEY is missing. Check Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Shared Schemas
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    contrast: { type: Type.NUMBER },
    saturation: { type: Type.NUMBER },
    temperature: { type: Type.NUMBER },
    tint: { type: Type.NUMBER },
    shadowsColor: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    highlightsColor: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    description: { type: Type.STRING }
  },
  required: ["contrast", "saturation", "temperature", "tint", "shadowsColor", "highlightsColor", "description"]
};

const suggestionsSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["suggestions"]
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, payload, lang } = await request.body;
    const ai = getClient();
    const model = ai.models;

    // --- Action 1: Style Suggestions ---
    if (action === 'suggest') {
        const { image } = payload;
        const cleanSource = image.replace(/^data:image\/.+;base64,/, '');
        
        const langInstruction = lang === 'zh' 
          ? "Provide the style names in Simplified Chinese." 
          : "Provide the style names in English.";

        const result = await model.generateContent({
            model: "gemini-2.5-flash",
            contents: {
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: cleanSource } },
                { text: `Analyze this movie frame. Suggest 4 distinct color grading styles. Return only style names. ${langInstruction}` }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: suggestionsSchema,
              temperature: 0.7
            }
        });
        
        return response.status(200).json(JSON.parse(result.text));
    }

    // --- Action 2: Generate Grading Params ---
    if (action === 'grade') {
        const { sourceImage, referenceImage, prompt } = payload;
        const cleanSource = sourceImage.replace(/^data:image\/.+;base64,/, '');
        
        const parts = [
            { inlineData: { mimeType: "image/jpeg", data: cleanSource } }
        ];

        let promptText = "";
        const langInstruction = lang === 'zh' 
          ? "Ensure the 'description' field in the JSON response is written in Simplified Chinese." 
          : "Ensure the 'description' field in the JSON response is written in English.";

        if (referenceImage) {
            const cleanRef = referenceImage.replace(/^data:image\/.+;base64,/, '');
            parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanRef } });
            promptText = `
                You are a DIT. Calculate the TRANSFORM needed to make Image 1 look like Image 2.
                Return adjustment parameters in JSON. ${langInstruction}
            `;
        } else {
             promptText = `
                You are a Colorist. Apply style: "${prompt}". 
                Calculate adjustments relative to current state.
                Return adjustment parameters in JSON. ${langInstruction}
            `;
        }

        parts.push({ text: promptText });

        const result = await model.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
              responseMimeType: "application/json",
              responseSchema: analysisSchema,
              temperature: 0.2
            }
        });

        return response.status(200).json(JSON.parse(result.text));
    }

    return response.status(400).json({ error: "Invalid Action" });

  } catch (error) {
    console.error("Server API Error:", error);
    return response.status(500).json({ 
        error: error.message || "Internal Server Error",
        details: error.toString()
    });
  }
}
