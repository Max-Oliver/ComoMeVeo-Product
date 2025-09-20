import axios from "axios";

const NB_URL = process.env.NANOBANANA_API_URL!;
const NB_KEY = process.env.NANOBANANA_API_KEY!;

export async function nanoTryOn(input: {
  user: string;        // dataURL base64 o URL
  garment: string;     // dataURL base64 o URL
  prompt?: string;
}) {
  if (!NB_URL || !NB_KEY) throw new Error("Config de NanoBanana faltante");
  const { user, garment, prompt = "Dress the user with the garment realistically" } = input;

  const res = await axios.post(NB_URL, {
    prompt,
    user_image: user,
    garment_image: garment
  }, { headers: { Authorization: `Bearer ${NB_KEY}` }, timeout: 60_000 });

  // Ajusta a la respuesta real de NanoBanana
  const b64 = res.data?.image_base64 || res.data?.result_base64;
  if (!b64) throw new Error("Respuesta inválida de NanoBanana");
  return `data:image/png;base64,${b64}`;
}
