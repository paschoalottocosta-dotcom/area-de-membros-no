import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { applyRemember, REMEMBER_COOKIE } from "@/lib/supabase/remember";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            const remember = cookieStore.get(REMEMBER_COOKIE)?.value;
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, applyRemember(options, remember)),
            );
          } catch {
            // Server Components cannot always write cookies.
          }
        },
      },
    },
  );
}

// Usuário e perfil da requisição atual. O cache() faz layout, página e checagem de admin
// reaproveitarem a mesma consulta em vez de repetirem a ida ao Supabase a cada componente.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export interface CurrentProfile {
  is_admin: boolean;
  blocked: boolean;
  unlimited_access: boolean;
  terms_accepted_at: string | null;
  bio: string | null;
}

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return { profile: null, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("is_admin, blocked, unlimited_access, terms_accepted_at, bio").eq("id", user.id).maybeSingle();
  return { profile: data as CurrentProfile | null, error };
});
