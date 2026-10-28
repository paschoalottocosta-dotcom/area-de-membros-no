export const dynamic = "force-dynamic";

import Link from "next/link";

import { LessonForm } from "@/components/LessonForm";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export default async function NewLessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ module?: string }> }) {
  const { id } = await params;
  const { module: requestedModuleId } = await searchParams;
  const { adminSupabase } = await requireAdmin();
  const [{ data: product, error: productError }, { data: modules, error: modulesError }] = await Promise.all([
    adminSupabase.from("products").select("id, name, slug").eq("id", id).maybeSingle(),
    adminSupabase.from("modules").select("id, title").eq("product_id", id).order("position", { ascending: true }),
  ]);
  if (productError || modulesError) throw new Error("Não foi possível carregar o produto.");
  if (!product) return <main className="admin-page"><div className="admin-wrap"><p className="muted">Produto não encontrado.</p></div></main>;

  const moduleRows = modules ?? [];
  if (moduleRows.length === 0) {
    return <main className="admin-page"><div className="admin-wrap"><p className="muted">Crie um módulo antes de adicionar aulas. <Link href={`/admin/products/${id}`}>Voltar ao produto</Link></p></div></main>;
  }

  const moduleId = moduleRows.some((module) => module.id === requestedModuleId) ? requestedModuleId! : moduleRows[0].id;
  // Sugere a próxima posição do módulo para a aula nova entrar no fim da lista.
  const { data: lastLesson } = await adminSupabase.from("lessons").select("position").eq("module_id", moduleId).order("position", { ascending: false }).limit(1).maybeSingle();

  return <LessonForm product={product} modules={moduleRows} files={[]} defaultModuleId={moduleId} defaultPosition={(lastLesson?.position ?? 0) + 1} />;
}
