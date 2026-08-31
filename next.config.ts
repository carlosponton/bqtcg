import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el dev server a través de un túnel (probar desde el celular).
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    remotePatterns: [
      // Storage de Supabase (fotos de anuncios y avatares)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Catálogo de cartas
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      // Avatares de Google (login con OAuth)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
