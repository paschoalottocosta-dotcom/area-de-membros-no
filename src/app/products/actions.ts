"use server";

import { revalidatePath } from "next/cache";

import { hasProductAccess } from "@/lib/member-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function toggleLessonComplete(formData: FormData) {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const completed = String(formData.get("completed") ?? "") === "true";
  const path = String(formData.get("path") ?? "").trim();
  if (!lessonId) throw new Error("Aula inválida.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login para continuar.");

  const adminSupabase = createAdminClient();
  const { data: lesson } = await adminSupabase.from("lessons").select("id, modules(product_id)").eq("id", lessonId).maybeSingle();
  const moduleRow = lesson?.modules as { product_id: string } | { product_id: string }[] | null | undefined;
  const productId = Array.isArray(moduleRow) ? moduleRow[0]?.product_id : moduleRow?.product_id;
  if (!productId || !(await hasProductAccess(adminSupabase, user.id, productId))) throw new Error("Você não tem acesso a esta aula.");

  const { error } = completed
    ? await adminSupabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" })
    : await adminSupabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  if (error) throw new Error(`Não foi possível salvar o progresso: ${error.message}`);

  if (path.startsWith("/products/")) revalidatePath(path);
}
