import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ColorAnalysis } from "../types";
import { Language } from "../App";

// Helper to initialize client safely at runtime
// This ensures we read the process.env.API_KEY *after* it has been injected by Vite
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing. Check Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

// Define the schema for the analysis response
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    contrast: { type: Type.NUMBER, description: "Contrast adjustment. 0 is no change. Range -1.0 to 1.0." },
    saturation: { type: Type.NUMBER, description: "Saturation adjustment. 1.0 is no change. Range 0.0 to 2.0." },
    temperature: { type: Type.NUMBER, description: "White balance temperature adjustment. 0 is no change. Range -1.0 (Cooler) to 1.0 (Warmer)." },
    tint: { type: Type.NUMBER, description: "Tint adjustment. 0 is no change. Range -1.0 (Green) to 1.0 (Magenta)." },
    shadowsColor: { 
      type: Type.ARRAY, 
      items: { type: Type.NUMBER },
      description: "RGB array [r, g, b] for shadow split toning. Default [0.5, 0.5, 0.5] (Gray/No tint)." 
    },
    highlightsColor: { 
      type: Type.ARRAY, 
      items: { type: Type.NUMBER },
      description: "RGB array [r, g, b] for highlight split toning. Default [0.5, 0.5, 0.5] (Gray/No tint)." 
    },
    description: { type: Type.STRING, description: "Brief reasoning for the applied grade based on the source and target." }
  },
  required: ["contrast", "saturation", "temperature", "tint", "shadowsColor", "highlightsColor", "description"]
};

// Schema for style suggestions
const suggestionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 4 creative color grading style names or brief descriptions suitable for the image."
    }
  },
  required: ["suggestions"]
};

interface GradingRequest {
  sourceImage: string; // Base64
  referenceImage?: string; // Base64 (Optional)
  prompt?: string; // Text description (Optional)
}

/**
 * Analyzes the source image and suggests suitable color grading styles.
 */
export const getStyleSuggestions = async (base64Image: string, lang: Language): Promise<string[]> => {
  try {
    const ai = getClient();
    const cleanSource = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const langInstruction = lang === 'zh' 
      ? "Provide the style names in Simplified Chinese (Chinese Characters)." 
      : "Provide the style names in English.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanSource } },
          { text: `Analyze this movie frame/image. Suggest 4 distinct, professional color grading styles (e.g., 'Teal & Orange', 'Bleach Bypass', 'Vintage Kodak', 'Cyberpunk') that would enhance its mood and lighting. Return only the style names/short phrases. ${langInstruction}` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestionsSchema,
        temperature: 0.7
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.suggestions || [];
    }
    return [];
  } catch (error) {
    console.error("Suggestion Error:", error);
    return lang === 'zh' 
      ? ["电影高对比", "复古胶片暖调", "冷调情绪", "自然增强"]
      : ["Cinematic High Contrast", "Warm Vintage", "Cool Moody", "Natural Enhancer"];
  }
};

/**
 * Calculates the Grading Parameters (Delta) needed to transform Source -> Target.
 */
export const generateGradingParams = async (request: GradingRequest, lang: Language): Promise<ColorAnalysis> => {
  try {
    const ai = getClient();
    const cleanSource = request.sourceImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const parts: any[] = [];

    // 1. Add Source Image
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanSource
      }
    });

    let promptText = "";
    const langInstruction = lang === 'zh' 
      ? "Ensure the 'description' field in the JSON response is written in Simplified Chinese." 
      : "Ensure the 'description' field in the JSON response is written in English.";

    // 2. Add Reference Image if exists (Color Match Mode)
    if (request.referenceImage) {
      const cleanRef = request.referenceImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanRef
        }
      });
      promptText = `
        You are a professional Digital Imaging Technician (DIT) and Colorist.
        
        IMAGE 1: The SOURCE footage.
        IMAGE 2: The REFERENCE Look.
        
        TASK:
        Calculcate the DIFFERENCE between the two images.
        Determine the adjustment parameters needed to make Image 1 look like Image 2.
        
        CRITICAL RULES:
        - Do NOT just describe Image 2. You must calculate the TRANSFORM.
        - If Image 1 is already warm and Image 2 is warm, the Temperature adjustment should be 0 (no change needed), not positive.
        - If Image 1 is Log/Flat and Image 2 is contrasty, Contrast should be high.
        - Preserve skin tones where possible. Avoid extreme color casts unless the reference style demands it (e.g. Matrix Green).
        
        ${langInstruction}
        Return the adjustment parameters in JSON.
      `;
    } 
    // 3. Text Prompt Mode
    else if (request.prompt) {
      promptText = `
        You are a professional Colorist.
        The image provided is the SOURCE footage.
        
        USER GOAL: Apply the style "${request.prompt}".
        
        TASK:
        Analyze the SOURCE image's current state (exposure, white balance, saturation).
        Calculate the adjustment parameters required to achieve the USER GOAL.
        
        CRITICAL RULES:
        - Adjust relative to the current image state. 
        - If the prompt says "Warm", and the image is already warm, do not add more temperature.
        - Be subtle with 'tint' to avoid unwanted color casts.
        
        ${langInstruction}
        Return the adjustment parameters in JSON.
      `;
    } else {
      throw new Error("Either reference image or prompt is required.");
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2 // Low temp for precise calculation
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as ColorAnalysis;
      return data;
    }
    throw new Error("No analysis data returned");

  } catch (error) {
    console.error("Gemini Grading Error:", error);
    return {
      contrast: 0,
      saturation: 1,
      temperature: 0,
      tint: 0,
      shadowsColor: [0.5, 0.5, 0.5],
      highlightsColor: [0.5, 0.5, 0.5],
      description: lang === 'zh' ? "生成失败，请检查 API Key 设置 (Vercel Environment Variables)。" : "Generation failed. Please check Vercel API Key settings."
    };
  }
};

export const suggestConversionParams = async (sourceProfile: string, targetProfile: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `I need to convert a LUT or color grade from ${sourceProfile} to ${targetProfile}. Provide a very brief, 2-sentence technical summary.`
        });
        return response.text || "Conversion parameters calculated.";
    } catch (e) {
        return "Using standard transform matrix.";
    }
}