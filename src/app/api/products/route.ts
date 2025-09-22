import { hasWoo, getWooProducts } from "@/lib/woo";
import localData from "@/data/catalog.json";

export const runtime = "nodejs"; // evitar edge por dependencias

export async function GET() {
  if (hasWoo) {
    try {
      const items = await getWooProducts(50);
      const out = items.map(p => ({
        id: p.id, name: p.name, price: p.price, image: p.images?.[0]?.src || null, source: "woo"
      }));
      return Response.json(out);
    } catch (error) {
      console.error('Error fetching WooCommerce products:', error);
      // If WooCommerce fails, return empty array instead of local fallback
      return Response.json([]);
    }
  }
  
  // Only use local data if explicitly needed (for development)
  // For production, you should configure WooCommerce
  console.warn('WooCommerce not configured, using local demo data');
  return Response.json(localData.map(p => ({ ...p, source: "local" })));
}
