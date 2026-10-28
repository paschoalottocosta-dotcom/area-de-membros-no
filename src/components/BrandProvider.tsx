"use client";

import Image from "next/image";
import { createContext, useContext } from "react";

import type { Brand } from "@/lib/brand";

// Leva o nome e a logo (salvos em /admin/settings) para os componentes do navegador, como o login.
const BrandContext = createContext<Brand | null>(null);

export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const brand = useContext(BrandContext);
  if (!brand) throw new Error("useBrand precisa estar dentro de <BrandProvider>.");
  return brand;
}

// Logo + nome no topo das telas de login e de senha.
export function LoginBrand() {
  const brand = useBrand();
  return (
    <div className="login-brand">
      <Image src={brand.logoUrl} alt="" width={26} height={26} priority />
      <span>{brand.name}</span>
    </div>
  );
}
