import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Quem já está logado (ex.: "Manter conectado") vai direto para o Início em vez de ver o formulário de login.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return children;
}
