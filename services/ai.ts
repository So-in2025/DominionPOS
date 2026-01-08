
import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey } from "./settings";

export interface ScannedItem {
  productName: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  confidence: number;
}

export async function analyzeInvoiceImage(base64Image: string): Promise<ScannedItem[]> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
      throw new Error("API Key no configurada. Ve a Configuración > Inteligencia Artificial.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          {
            text: `Analiza esta imagen de una factura o lista. Extrae productos.
                   Retorna JSON puro:
                   { "productName": string, "costPrice": number, "quantity": number }
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
    
    try {
        const data = JSON.parse(text);
        return Array.isArray(data) ? data.map((d: any) => ({ ...d, sellingPrice: 0 })) : [];
    } catch (parseError) {
        console.error("Error parsing JSON response", parseError);
        return [];
    }

  } catch (error: any) {
    console.error("Error analyzing invoice:", error);
    if(error.message?.includes("API key")) {
        throw new Error("API Key inválida. Verifique en Configuración.");
    }
    throw new Error("No se pudo analizar la imagen. Verifique su conexión.");
  }
}

export async function processAudioInventory(base64Audio: string): Promise<ScannedItem[]> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("API Key no configurada. Ve a Configuración > Inteligencia Artificial.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
  
    try {
      const response = await ai.models.generateContent({
        // Usamos el modelo optimizado para audio nativo
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
              text: `Eres un experto en inventarios y economía. Escucha el audio del comerciante dictando su stock.
                     Extrae una lista estructurada de productos.
                     
                     Reglas de Extracción:
                     1. **Producto**: Identifica el nombre.
                     2. **Cantidad**: Si dice "10 cajas", "5 unidades", extrae el número. Si no dice nada, es 1.
                     3. **Precios**: Distingue rigurosamente entre COSTO (lo que paga el comerciante) y VENTA (al público).
                        - Palabras clave Costo: "costo", "compré a", "me costó", "reposición". Asignar a 'costPrice'.
                        - Palabras clave Venta: "venta", "precio", "al público", "vender a". Asignar a 'sellingPrice'.
                        - Si solo menciona un número sin contexto claro (ej: "Coca cola 10 dólares"), asúmelo como 'sellingPrice'.
                     
                     Retorna Array JSON:
                     [{
                       "productName": "Nombre normalizado",
                       "quantity": 10,
                       "sellingPrice": 0, // 0 si no se menciona
                       "costPrice": 0 // 0 si no se menciona
                     }]`
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
      try {
        return JSON.parse(text) as ScannedItem[];
      } catch (parseError) {
        console.error("Error parsing audio JSON response", parseError);
        return [];
      }
  
    } catch (error: any) {
      console.error("Error processing audio:", error);
      if(error.message?.includes("API key")) {
          throw new Error("API Key inválida.");
      }
      throw new Error("No se pudo procesar el audio.");
    }
  }
