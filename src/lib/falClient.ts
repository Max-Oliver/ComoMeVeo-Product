// src/lib/falClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import fal from '@fal-ai/serverless-client';
type FalOut = any;

export function ensureFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('Falta FAL_KEY');
  fal.config({ credentials: key });
}

/** -------- Utilidades -------- */
function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error('DataURL inválido');
  const mime = m[1];
  const b64 = m[2];
  const buf = Buffer.from(b64, 'base64');
  return new Blob([buf], { type: mime });
}

export async function uploadAnyToFal(input: string | Blob): Promise<string> {
  ensureFal();
  if (typeof input === 'string') {
    if (isHttpUrl(input)) return input;
    if (input.startsWith('data:'))
      return await fal.storage.upload(dataUrlToBlob(input));
    throw new Error('Formato no soportado (esperaba URL http(s) o DataURL)');
  }
  return await fal.storage.upload(input);
}

/** Remueve fondo de una imagen (mejor si la prenda viene en PNG) */
export async function removeBgWithFal(
  inputUrlOrDataUrl: string
): Promise<string> {
  ensureFal();
  // sube a storage si hace falta
  const url = await uploadAnyToFal(inputUrlOrDataUrl);
  // muchos runners de background removal aceptan `image_url`
  const r: any = await fal.subscribe('fal-ai/background-removal', {
    input: { image_url: url },
    logs: false,
  });
  // intenta normalizar la salida a URL
  const outUrl: string | undefined =
    r?.image?.url ??
    r?.images?.[0]?.url ??
    r?.url ??
    (Array.isArray(r) ? r[0]?.url : undefined);
  if (!outUrl) throw new Error('No se obtuvo URL del background-removal');
  return outUrl;
}

/** -------- Try-On con FAL -------- */
function pickBestUrl(r: FalOut): string | undefined {
  return (
    r?.images?.[0]?.url ??
    r?.image?.url ??
    (Array.isArray(r?.images) ? r.images[0] : undefined) ??
    (Array.isArray(r) ? r[0]?.url : undefined) ??
    r?.url
  );
}

/**
 * Usa FAL para generar Try-On. Por defecto usa FAL_MODEL (env) y prueba nombres de campos típicos.
 * Incluye prompt y negative_prompt fuertes + seed para consistencia.
 */
export async function runNanoBananaFal(params: {
  userUrl: string; // persona
  garmentUrl: string; // prenda (ideal PNG sin fondo)
  prompt?: string;
}): Promise<{ url: string; meta?: any }> {
  ensureFal();

  const model = process.env.FAL_MODEL || 'fal-ai/nano-banana/edit'; // cámbialo cuando uses un VTO real

  const basePrompt = [
    'Fusiona la Imagen 1 (persona) y la Imagen 2 (prenda/accesorio) para crear una previsualización fotorealista de comercio electrónico, priorizando una integración impecable y natural.',
    'De la Imagen 1 (Persona):',
    'Mantén la persona original (rostro, peinado, gafas, cuerpo, postura) y el fondo completamente inalterados y con su iluminación original.',
    'De la Imagen 2 (Prenda/Accesorio):',
    'Reemplaza exclusivamente la vestimenta superior (o añade el accesorio, si aplica, como un reloj) con el elemento de la Imagen 2. Es absolutamente crucial que se respete y se transfiera con la máxima precisión:',
    'El color exacto de la prenda/accesorio.',
    'El tipo de tela o material, incluyendo su textura, la forma en que refleja la luz y su caída natural sobre el cuerpo.',
    'El largo de las mangas (corta, larga), el corte del cuello, el dobladillo y el tipo de prenda (vestido, camiseta, suéter, etc.).',
    'El tamaño y las proporciones originales del producto.',
    'Énfasis en la Integración Fotorrealista:',
    'La prenda/accesorio debe adaptarse de forma natural y realista al cuerpo de la persona, como si estuviera siendo usada en el momento de la foto original. Esto incluye:',
    'Generar pliegues y arrugas realistas en la tela que correspondan a la postura del cuerpo.',
    'Proyectar sombras coherentes de la prenda sobre el cuerpo y del cuerpo sobre la prenda, respetando la fuente de luz de la Imagen 1.',
    'Asegurar que la prenda se ajuste y caiga correctamente, reflejando el volumen y la forma del cuerpo de la persona, sin parecer superpuesta o plana.',
    'El resultado final debe ser indistinguible de una fotografía real, manteniendo la iluminación, la perspectiva y las proporciones de la Imagen 1, pero con la prenda de la Imagen 2 perfectamente integrada.',
  ].join('');

  const newPrompt = params.prompt
    ? `${basePrompt} ${params.prompt}`
    : basePrompt;

  const negative = [
    'text, watermark, logo, extra limbs, multiple people, cropped face, distorted anatomy,',
    'changing background, changing face, unrelated scenes, mannequins',
  ].join(' ');

  const tries: { tag: string; input: any }[] = [
    {
      tag: 'image_urls',
      input: {
        image_urls: [params.userUrl, params.garmentUrl],
        prompt: newPrompt,
        negative_prompt: negative,
        seed: 12345,
        num_images: 1,
      },
    },
  ];

  let lastErr: any;
  for (const t of tries) {
    try {
      const res = await fal.subscribe(model, {
        input: t.input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.map((log) => log.message).forEach(console.log);
          }
        },
      });

      const url = pickBestUrl(res);

      console.log('Url Resultante: ', url);
      if (typeof url === 'string' && url.startsWith('https')) {
        const response = {
          url,
          meta: {
            variant: t.tag,
            model,
            requestId:
              typeof res === 'object' && res !== null && 'requestId' in res
                ? (res as any).requestId
                : undefined,
            rawOutput:
              typeof res === 'object' && res !== null && 'data' in res
                ? (res as any).data
                : undefined,
          },
        };
        return response;
      }
      lastErr = new Error('Sin URL de salida');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('No fue posible generar la imagen');
}
