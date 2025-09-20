/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/try-on/route.ts
import { z } from "zod";
import { generateTryOnImage } from "@/lib/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  user: z.string().min(10),       // DataURL base64
  garment: z.string().min(10),    // DataURL base64
  productId: z.number().optional(),
  prompt: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const resultUrl = await generateTryOnImage({
      userDataUrl: body.user,
      garmentDataUrl: body.garment,
      prompt: body.prompt,
    });

    // Aquí podrías subir a Woo como media y devolver la URL pública.
    return Response.json({ ok: true, resultUrl });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || "fail" }), { status: 400 });
  }
}
