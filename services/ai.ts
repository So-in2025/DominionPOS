
import { GoogleGenAI, Type } from "@google/genai";

export interface ScannedItem {
  productName: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  confidence: number;
}

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    throw new Error("Fragilidad Crítica: API_KEY no configurada. Funciones de IA deshabilitadas en este entorno.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function analyzeInvoiceImage(base64Image: string): Promise<ScannedItem[]> {
  try {
    const ai = getAIClient();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

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

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text);
    return Array.isArray(data) ? data.map((d: any) => ({ ...d, sellingPrice: 0 })) : [];

  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (error.message.includes("API_KEY")) {
        throw new Error("API_KEY no válida. Seleccione una clave activa en la configuración de IA.");
    }
    throw new Error(error.message || "Fallo en el servicio neuronal. Verifique su conexión.");
  }
}

export async function processAudioInventory(base64Audio: string): Promise<ScannedItem[]> {
    try {
      const ai = getAIClient();
      const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
  
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
  
      const text = response.text;
      if (!text) return [];
      return JSON.parse(text) as ScannedItem[];
  
    } catch (error: any) {
      console.error("AI Audio Error:", error);
      throw new Error(error.message || "Error al procesar fonemas.");
    }
}
