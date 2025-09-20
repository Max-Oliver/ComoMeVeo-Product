import { hasWoo, getWooProducts } from "@/lib/woo";
import localData from "@/data/catalog.json";

export const runtime = "nodejs"; // evitar edge por dependencias

export async function GET() {
  if (hasWoo) {
    const items = await getWooProducts(50);
    const out = items.map(p => ({
      id: p.id, name: p.name, price: p.price, image: p.images?.[0]?.src || null, source: "woo"
    }));
    return Response.json(out);
  }
  // Fallback a catálogo local
  return Response.json(localData.map(p => ({ ...p, source: "local" })));
}
