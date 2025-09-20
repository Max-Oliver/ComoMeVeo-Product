/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/genai.ts
import { GoogleGenAI } from "@google/genai";

/**
 * Convierte un DataURL -> {inlineData:{mimeType,data}}
 * Acepta: data:image/png;base64,XXXX
 */
export function dataUrlToInlinePart(dataUrl: string) {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error("DataURL inválido");
  const mimeType = m[1];
  const data = m[2];
  return { inlineData: { mimeType, data } };
}

/**
 * Toma la primera imagen en inlineData del resultado de Gemini
 */
export function pickInlineImage(resp: any): { mimeType: string; data: string } | null {
  try {
    const parts = resp?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (p?.inlineData?.data) {
        return { mimeType: p.inlineData.mimeType || "image/png", data: p.inlineData.data };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Genera una imagen de try-on: usa la foto del usuario + prenda como contexto,
 * y pide al modelo renderizar al usuario vistiendo la prenda (MVP).
 * Retorna un dataURL (image/png base64).
 */
export async function generateTryOnImage({
  userDataUrl,
  garmentDataUrl,
  prompt
}: {
  userDataUrl: string;
  garmentDataUrl: string;
  prompt?: string;
}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Falta GOOGLE_API_KEY");

  const ai = new GoogleGenAI({ apiKey });

  const basePrompt =
    prompt ||
    "Render the person from the first image wearing the garment from the second image. Keep anatomy and lighting plausible, high detail, ecommerce-ready.";

  // Construimos el 'content' con texto + 2 imágenes inline
  const parts = [
    { text: basePrompt },
    dataUrlToInlinePart(userDataUrl),
    dataUrlToInlinePart(garmentDataUrl),
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: [{ role: "user", parts }],
  });

  const img = pickInlineImage(response);
  if (!img) {
    // Si el modelo devuelve texto, lo propagamos para debug
    const txt = response?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
    throw new Error(txt || "No se recibió imagen del modelo");
  }

  // Devolvemos como dataURL útil para el front
  const mime = img.mimeType || "image/png";
  return `data:${mime};base64,${img.data}`;

}
