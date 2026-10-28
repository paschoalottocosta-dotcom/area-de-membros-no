"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function acceptTerms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login para continuar.");

  const { error } = await createAdminClient().from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", user.id).is("terms_accepted_at", null);
  if (error) throw new Error(`Não foi possível registrar o aceite: ${error.message}`);
  revalidatePath("/", "layout");
}
