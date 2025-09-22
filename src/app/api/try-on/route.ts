/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/try-on/route.ts
import { z } from 'zod';
import {
  uploadAnyToFal,
  runNanoBananaFal,
  removeBgWithFal,
} from '@/lib/falClient';
import { generateTryOnImage } from '@/lib/genai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  user: z.string().min(10),
  garment: z.string().min(10),
  productId: z.number().optional(),
  prompt: z.string().optional(),
  cleanGarment: z.boolean().optional(), // ← permite activar el remover fondo desde el front
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const provider = (process.env.PROVIDER || 'fal').toLowerCase();

    if (provider === 'fal') {
      // 1) Subida/normalización
      const userUrl = await uploadAnyToFal(body.user);
      let garmentUrl = await uploadAnyToFal(body.garment);

      // 2) Preprocesado (opcional): remover fondo de la prenda
      if (body.cleanGarment) {
        try {
          garmentUrl = await removeBgWithFal(garmentUrl);
        } catch {}
      }

      // 3) Try-on
      const { url, meta } = await runNanoBananaFal({
        userUrl,
        garmentUrl,
        prompt: body.prompt,
      });

      return Response.json({ ok: true, resultUrl: url, provider: 'fal', meta });
    }

    // Fallback: Gemini
    const dataUrl = await generateTryOnImage({
      userDataUrl: body.user,
      garmentDataUrl: body.garment,
      prompt: body.prompt,
    });
    return Response.json({ ok: true, resultUrl: dataUrl, provider: 'gemini' });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || 'fail' }),
      { status: 400 }
    );
  }
}
