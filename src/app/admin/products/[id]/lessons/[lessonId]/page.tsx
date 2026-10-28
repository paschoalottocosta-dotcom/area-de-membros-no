export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { LessonForm } from "@/components/LessonForm";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export default async function EditLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const { adminSupabase } = await requireAdmin();
  const [{ data: product, error: productError }, { data: modules, error: modulesError }, { data: lesson, error: lessonError }, { data: files, error: filesError }] = await Promise.all([
    adminSupabase.from("products").select("id, name, slug").eq("id", id).maybeSingle(),
    adminSupabase.from("modules").select("id, title").eq("product_id", id).order("position", { ascending: true }),
    adminSupabase.from("lessons").select("id, module_id, title, position, description, video_url").eq("id", lessonId).maybeSingle(),
    adminSupabase.from("lesson_files").select("file_name, file_url").eq("lesson_id", lessonId).order("position", { ascending: true }).order("created_at", { ascending: true }),
  ]);
  if (productError || modulesError || lessonError || filesError) throw new Error("Não foi possível carregar a aula.");
  const moduleRows = modules ?? [];
  if (!product || !lesson || !moduleRows.some((module) => module.id === lesson.module_id)) notFound();

  return <LessonForm product={product} modules={moduleRows} lesson={lesson} files={files ?? []} defaultModuleId={lesson.module_id} defaultPosition={lesson.position} />;
}
