"use client";
import { useEffect, useState } from "react";

type Product = { id: number; name: string; price: string; image?: string | null; source: 'woo' | 'local' };

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | "">("");
  const [userB64, setUserB64] = useState<string | null>(null);
  const [garmentB64, setGarmentB64] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);

  const toDataURL = (file: File) => new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  async function onSelectUser(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUserB64(await toDataURL(f));
  }
  
  async function onSelectGarment(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setGarmentB64(await toDataURL(f));
  }

  // Auto-replace garment image when product is selected from catalog
  useEffect(() => {
    if (productId !== "") {
      const selectedProduct = products.find(p => p.id === productId);
      if (selectedProduct?.image) {
        // Check if it's a WooCommerce product (has full URL) or local product
        if (selectedProduct.image.startsWith('http')) {
          // WooCommerce product - convert to base64
          fetch(selectedProduct.image)
            .then(response => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              return response.blob();
            })
            .then(blob => {
              const reader = new FileReader();
              reader.onload = () => setGarmentB64(reader.result as string);
              reader.readAsDataURL(blob);
            })
            .catch(error => {
              console.error('Error loading WooCommerce product image:', error);
              // Fallback: use image URL directly
              if (selectedProduct.image) {
                setGarmentB64(selectedProduct.image);
              }
            });
        } else {
          // Local product - use image URL directly (it should be a valid public URL)
          setGarmentB64(selectedProduct.image);
        }
      }
    }
  }, [productId, products]);

  async function handleTryOn() {
    if (!userB64 || !garmentB64) return alert("Sube ambas imágenes");
    setLoading(true);
    setResultUrl(null);
    const r = await fetch("/api/try-on", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user: userB64,
        garment: garmentB64,
        productId: productId === "" ? undefined : Number(productId),
        // prompt: 'Viste al usuario con el producto seleccionado, manten el fondo, el estilo, y los detalles, solo es un preview de como le quedaria la prenda colocada a ese usuario.'
      })
    });
    const data = await r.json();
    setLoading(false);
    if (data?.ok) setResultUrl(data.resultUrl);
    else alert(data?.error || "Error");
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="hero-title text-black mb-6">
            Virtual Try-On
            <br />
            <span className="text-gray-600">para B2B</span>
          </h1>
          <p className="hero-subtitle text-gray-600 max-w-2xl mx-auto mb-12">
            Prueba ropa y accesorios virtualmente antes de comprar. 
            Mejora las ventas de tu tienda con tecnología de realidad aumentada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span>Powered by AI</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <span>Nano Banana Technology</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Left Column - Catalog */}
          <div className="space-y-8">
            
            {/* Catalog Section */}
            <section id="catalogo" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-light tracking-tight">Catálogo de Productos</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {products.length} productos
                  </span>
                  {products.length > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      products[0].source === 'woo' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {products[0].source === 'woo' ? 'WooCommerce' : 'Demo Local'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <select
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:bg-white transition-all"
                  value={productId}
                  onChange={e => setProductId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Selecciona un producto del catálogo</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <div 
                    key={p.id} 
                    className={`group relative bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                      productId === p.id ? 'ring-2 ring-black' : ''
                    }`}
                    onClick={() => setProductId(p.id)}
                  >
                    {p.image && (
                      <div className="aspect-square bg-gray-50">
                        <img 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                          src={p.image} 
                          alt={p.name} 
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{p.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">${p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Upload & Results */}
          <div className="space-y-6">
            
            {/* Compact Upload Section */}
            <section id="tryon" className="space-y-4">
              <h2 className="text-xl font-light tracking-tight">Cargar Imágenes</h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* User Photo Upload */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <label className="block text-xs font-medium text-gray-900 mb-2">
                    Tu foto
                  </label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="user-photo"
                      onChange={onSelectUser} 
                    />
                    <label 
                      htmlFor="user-photo"
                      className="flex w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                      {userB64 ? (
                        <div className="w-full h-full rounded-lg overflow-hidden">
                          <img src={userB64} className="w-full h-full object-cover" alt="Foto del usuario" />
                        </div>
                      ) : (
                        <>
                          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-xs">Subir foto</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Garment Photo Upload */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <label className="block text-xs font-medium text-gray-900 mb-2">
                    Foto de la prenda
                    {productId !== "" && (
                      <span className="ml-1 text-xs text-green-600 bg-green-100 px-1 py-0.5 rounded-full">
                        Catálogo
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="garment-photo"
                      onChange={onSelectGarment} 
                    />
                    <label 
                      htmlFor="garment-photo"
                      className="flex w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                      {garmentB64 ? (
                        <div className="w-full h-full rounded-lg overflow-hidden">
                          <img src={garmentB64} className="w-full h-full object-cover" alt="Foto de la prenda" />
                        </div>
                      ) : (
                        <>
                          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-xs">Subir prenda</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleTryOn}
                disabled={loading || !userB64 || !garmentB64}
                className="w-full bg-black text-white rounded-xl px-6 py-3 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Probar Prenda Virtualmente</span>
                  </>
                )}
              </button>
            </section>

            {/* Results Section */}
            <section id="resultados">
              <h2 className="text-2xl font-light tracking-tight mb-6">Resultado</h2>
              
              {resultUrl ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="relative group">
                    <img 
                      src={resultUrl} 
                      className="w-full rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]" 
                      alt="Resultado del virtual try-on" 
                    />
                    <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Virtual Try-On
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultUrl;
                        link.download = 'virtual-try-on-result.jpg';
                        link.click();
                      }}
                      className="flex-1 bg-gray-100 text-gray-900 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Descargar</span>
                    </button>
                    <button 
                      onClick={() => setResultUrl(null)}
                      className="flex-1 bg-black text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Generar Nuevo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay resultado aún</h3>
                  <p className="text-gray-500 text-sm">
                    Sube tu foto y la prenda para generar tu virtual try-on
                  </p>
                </div>
              )}
            </section>

            {/* Features */}
            <section className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Características</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>IA de última generación</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Resultados realistas</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Integración con catálogo</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Optimizado para B2B</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
