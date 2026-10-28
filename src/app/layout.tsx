import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

import { cookies } from "next/headers";

import AppNavigation from "@/components/AppNavigation";
import { BrandProvider } from "@/components/BrandProvider";
import { FlashToast } from "@/components/FlashToast";
import { getBrand } from "@/lib/brand";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

// Nome e ícone da aba vêm de /admin/settings; sem logo própria, usa os ícones da pasta public.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: `${brand.name} | Área de Membros`,
    description: "Seu espaço privado de conteúdo digital.",
    icons: brand.hasCustomLogo ? { icon: brand.logoUrl, apple: brand.logoUrl } : { icon: "/icon.png", apple: "/apple-icon.png" },
  };
}

const themeScript = `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.remove("dark");if(localStorage.getItem("sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [cookieStore, brand] = await Promise.all([cookies(), getBrand()]);
  const flash = cookieStore.get("flash")?.value;
  return (
    <html lang="pt-BR" className={`dark ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <BrandProvider brand={brand}>
          <div className="app-shell">
            <AppNavigation>{children}</AppNavigation>
          </div>
        </BrandProvider>
        <FlashToast flash={flash} />
      </body>
    </html>
  );
}
