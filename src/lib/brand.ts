import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

// Identidade da área de membros, editada em /admin/settings e usada no site inteiro e nos e-mails.
export interface Brand {
  name: string;
  logoUrl: string;
  hasCustomLogo: boolean;
  supportEmail: string;
  alertEmail: string;
}

export const BRAND_CACHE_TAG = "brand-settings";

export const BRAND_SETTING_KEYS = {
  name: "brand_name",
  logoUrl: "brand_logo_url",
  supportEmail: "support_email",
  alertEmail: "alert_email",
} as const;

// Valores usados enquanto o admin não salvar outros.
export const DEFAULT_BRAND: Brand = {
  name: "Personal Organizado",
  logoUrl: "/logo.png",
  hasCustomLogo: false,
  supportEmail: "personalorganizado2025@gmail.com",
  alertEmail: "personalorganizado2025@gmail.com",
};

// Fica em cache até o admin salvar as configurações, para não consultar o banco a cada página.
const getCachedBrand = unstable_cache(async (): Promise<Brand> => {
  const { data, error } = await createAdminClient().from("app_settings").select("key, value").in("key", Object.values(BRAND_SETTING_KEYS));
  if (error) throw new Error(error.message);
  const settings = new Map((data ?? []).map((row) => [row.key as string, (row.value as string | null)?.trim() || ""]));
  const logoUrl = settings.get(BRAND_SETTING_KEYS.logoUrl);
  return {
    name: settings.get(BRAND_SETTING_KEYS.name) || DEFAULT_BRAND.name,
    logoUrl: logoUrl || DEFAULT_BRAND.logoUrl,
    hasCustomLogo: !!logoUrl,
    supportEmail: settings.get(BRAND_SETTING_KEYS.supportEmail) || DEFAULT_BRAND.supportEmail,
    alertEmail: settings.get(BRAND_SETTING_KEYS.alertEmail) || DEFAULT_BRAND.alertEmail,
  };
}, [BRAND_CACHE_TAG], { tags: [BRAND_CACHE_TAG] });

// Se o banco falhar (ex.: Supabase pausado), usa o padrão sem guardar em cache, para o site continuar abrindo.
export async function getBrand(): Promise<Brand> {
  try {
    return await getCachedBrand();
  } catch (error) {
    console.error("Não foi possível carregar as configurações da marca:", error);
    return DEFAULT_BRAND;
  }
}
