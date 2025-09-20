import "./globals.css";

export const metadata = { 
  title: "ComoMeVeo - Virtual Try-On para B2B",
  description: "Prueba ropa y accesorios virtualmente antes de comprar. Solución B2B para mejorar las ventas de tu tienda."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                <span className="text-white text-sm font-bold">CMV</span>
              </div>
              <span className="text-xl font-light tracking-tight">ComoMeVeo</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8 text-sm text-gray-600">
              <a href="#catalogo" className="hover:text-black transition-colors">Catálogo</a>
              <a href="#tryon" className="hover:text-black transition-colors">Virtual Try-On</a>
              <a href="#resultados" className="hover:text-black transition-colors">Resultados</a>
            </nav>
            <div className="text-xs text-gray-500 font-mono">B2B MVP</div>
          </div>
        </header>
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>© {new Date().getFullYear()} ComoMeVeo</span>
                <span>•</span>
                <span>Virtual Try-On B2B</span>
              </div>
              <div className="mt-4 md:mt-0">
                <span className="text-xs">Powered by AI • Nano Banana</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
