import { GoogleGenAI, Type } from "@google/genai";
import * as cloudService from './cloud';
import * as settingsService from './settings';

export interface ScannedItem {
  productName: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  confidence: number;
}

// Fix: Obtaining API key exclusively from environment variable as per mandatory guidelines.
const getAIClient = () => {
  if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
    throw new Error("Fragilidad Crítica: API_KEY del sistema no configurada. Contacte soporte.");
  }
  // Fix: Initializing client using direct environment variable reference.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export async function analyzeInvoiceImage(base64Image: string): Promise<ScannedItem[]> {
  try {
    const ai = getAIClient();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    // Fix: Using gemini-3-flash-preview for complex text analysis on images.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          {
            text: `Analiza esta imagen de una factura o lista. Extrae productos.
                   Retorna JSON puro.
                   Si no encuentras cantidad, asume 1. Si no encuentras costo, pon 0.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    productName: { type: Type.STRING },
                    costPrice: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER }
                }
            }
        }
      },
    });

    // Fix: Accessing generated text directly via property as per new API signature.
    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text);
    return Array.isArray(data) ? data.map((d: any) => ({ ...d, sellingPrice: 0 })) : [];

  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (error.message.includes("API_KEY")) {
        throw new Error("Error de autenticación con el servicio de IA.");
    }
    throw error;
  }
}

export async function processAudioInventory(base64Audio: string): Promise<ScannedItem[]> {
    try {
      const ai = getAIClient();
      const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
  
      // Fix: Using recommended model for native audio processing.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/webm',
                data: cleanBase64,
              },
            },
            {
              text: `Eres un experto en inventarios. Escucha el audio y extrae una lista.
                     Menciona costo y cantidad.
                     Retorna Array JSON.`
            },
          ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        productName: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        sellingPrice: { type: Type.NUMBER },
                        costPrice: { type: Type.NUMBER }
                    }
                }
            }
        },
      });
  
      // Fix: Accessing generated text directly via property.
      const text = response.text;
      if (!text) return [];
      return JSON.parse(text) as ScannedItem[];
  
    } catch (error: any) {
      console.error("AI Audio Error:", error);
      throw new Error(error.message || "Error al procesar fonemas.");
    }
}
