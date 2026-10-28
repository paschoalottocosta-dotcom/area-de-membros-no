import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";

const nextConfig: NextConfig = {
  images: {
    // Capas dos produtos (bucket público product-covers) e a logo (bucket branding) passam pela otimização de imagens:
    // são redimensionadas para o tamanho exibido, convertidas para WebP e ficam em cache.
    remotePatterns: supabaseHost ? [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/product-covers/**" },
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/branding/**" },
    ] : [],
    // Capas raramente mudam (trocar a capa gera um arquivo com nome novo), então o cache pode durar 30 dias.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
