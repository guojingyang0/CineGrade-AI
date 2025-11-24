
import { ColorAnalysis } from "../types";
import { Language } from "../App";

// Helper: Compress image before sending to save bandwidth and fit Vercel function limits (4.5MB)
const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG quality 0.7
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str); // Fallback
  });
};

interface GradingRequest {
  sourceImage: string;
  referenceImage?: string;
  prompt?: string;
}

/**
 * Analyzes the source image and suggests styles via Server Proxy.
 */
export const getStyleSuggestions = async (base64Image: string, lang: Language): Promise<string[]> => {
  try {
    const compressedSource = await compressImage(base64Image);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suggest',
        lang,
        payload: { image: compressedSource }
      })
    });

    if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || [];

  } catch (error) {
    console.error("Suggestion Error:", error);
    return lang === 'zh' 
      ? ["电影高对比", "复古胶片暖调", "冷调情绪", "自然增强"]
      : ["Cinematic High Contrast", "Warm Vintage", "Cool Moody", "Natural Enhancer"];
  }
};

/**
 * Calculates Grading Parameters via Server Proxy.
 */
export const generateGradingParams = async (request: GradingRequest, lang: Language): Promise<ColorAnalysis> => {
  try {
    // Compress inputs to ensure we don't hit Vercel payload limits
    const compressedSource = await compressImage(request.sourceImage);
    let compressedRef = undefined;
    if (request.referenceImage) {
        compressedRef = await compressImage(request.referenceImage);
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'grade',
        lang,
        payload: {
            sourceImage: compressedSource,
            referenceImage: compressedRef,
            prompt: request.prompt
        }
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || response.statusText);
    }

    const data = await response.json();
    return data as ColorAnalysis;

  } catch (error: any) {
    console.error("Grading Error:", error);
    
    let errorMsg = error.message || "Unknown Error";

    if (errorMsg.includes("Failed to fetch")) {
       // Should rarely happen now unless Vercel is down
       errorMsg = lang === 'zh' ? "网络错误: 无法连接服务器" : "Network Error: Could not reach server";
    }

    return {
      contrast: 0,
      saturation: 1,
      temperature: 0,
      tint: 0,
      shadowsColor: [0.5, 0.5, 0.5],
      highlightsColor: [0.5, 0.5, 0.5],
      description: lang === 'zh' 
        ? `生成失败: ${errorMsg}` 
        : `Generation Failed: ${errorMsg}`
    };
  }
};

// Keep this client-side mock for now as it doesn't need heavy AI
export const suggestConversionParams = async (sourceProfile: string, targetProfile: string): Promise<string> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`${sourceProfile} to ${targetProfile} Transform Matrix applied.`);
        }, 1000);
    });
}
