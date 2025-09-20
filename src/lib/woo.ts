import axios from "axios";

const WOO_BASE_URL = process.env.WOO_BASE_URL;
const WOO_KEY = process.env.WOO_CONSUMER_KEY;
const WOO_SECRET = process.env.WOO_CONSUMER_SECRET;

export type WooProduct = { id: number; name: string; price: string; images?: { src: string }[] };

export const hasWoo = !!(WOO_BASE_URL && WOO_KEY && WOO_SECRET);

export async function getWooProducts(perPage = 24): Promise<WooProduct[]> {
  if (!hasWoo) return [];
  const url = `${WOO_BASE_URL!.replace(/\/$/, "")}/wp-json/wc/v3/products`;
  const { data } = await axios.get(url, {
    params: { per_page: perPage, consumer_key: WOO_KEY, consumer_secret: WOO_SECRET }
  });
  return data;
}
