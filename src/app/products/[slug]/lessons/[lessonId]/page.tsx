export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { LessonCompleteButton } from "@/components/LessonCompleteButton";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import { SetPageTitle } from "@/components/SidebarNav";
import { STORAGE_PREFIX } from "@/lib/lesson-files";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";
import { normalizeYouTubeToEmbed } from "@/lib/youtube";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

interface Product { id: string; name: string; slug: string | null; }
interface Module { id: string; title: string; product_id: string; position: number; }
interface Lesson { id: string; module_id: string; title: string; position: number; description?: string | null; video_url?: string | null; }
interface LessonFile { id: string; file_name: string; file_url: string; }

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const [user, { profile }, { data: product }] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    adminSupabase.from("products").select("id, name, slug").eq("slug", slug).maybeSingle(),
  ]);
  if (!user) redirect("/login");
  if (profile?.blocked) redirect("/login?message=account-blocked");
  if (!product) redirect("/dashboard");
  const typedProduct = product as Product;

  // Tudo o que a aula precisa numa leva só, em paralelo. As regras do banco (RLS) só devolvem
  // aulas, módulos e arquivos de produtos a que o aluno tem acesso.
  const [{ data: access }, { data: lesson }, { data: files, error: filesError }, { data: modules, error: modulesError }, { data: productLessons, error: lessonsError }, { data: progressRows }] = await Promise.all([
    supabase.from("user_access").select("product_id").eq("user_id", user.id).eq("product_id", typedProduct.id).eq("status", "active").maybeSingle(),
    supabase.from("lessons").select("id, module_id, title, description, video_url").eq("id", lessonId).maybeSingle(),
    supabase.from("lesson_files").select("id, file_name, file_url").eq("lesson_id", lessonId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("modules").select("id, title, product_id, position").eq("product_id", typedProduct.id).order("position", { ascending: true }),
    supabase.from("lessons").select("id, module_id, title, position, modules!inner(product_id)").eq("modules.product_id", typedProduct.id).order("position", { ascending: true }),
    // Se a tabela de progresso ainda não existir (migration não rodada), a página funciona sem progresso.
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
  ]);
  if (!profile?.unlimited_access && !access) redirect("/dashboard");
  if (!lesson) notFound();
  const typedLesson = lesson as Lesson;
  if (filesError || modulesError || lessonsError) throw new Error("Não foi possível carregar os detalhes da aula.");
  const moduleRows = (modules ?? []) as Module[];
  const currentModule = moduleRows.find((item) => item.id === typedLesson.module_id);
  if (!currentModule) notFound();
  const lessonRows = (productLessons ?? []) as Lesson[];
  const moduleLessons = moduleRows.map((item) => ({ module: item, lessons: lessonRows.filter((row) => row.module_id === item.id) }));
  const orderedLessons = moduleLessons.flatMap((item) => item.lessons);
  const currentLessonIndex = orderedLessons.findIndex((item) => item.id === typedLesson.id);
  const previousLesson = currentLessonIndex > 0 ? orderedLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < orderedLessons.length - 1 ? orderedLessons[currentLessonIndex + 1] : null;

  const userProgress = new Set(((progressRows ?? []) as { lesson_id: string }[]).map((row) => row.lesson_id));
  const completedIds = new Set(orderedLessons.filter((item) => userProgress.has(item.id)).map((item) => item.id));
  const progress = orderedLessons.length ? Math.round((completedIds.size / orderedLessons.length) * 100) : 0;

  const productPath = `/products/${typedProduct.slug ?? slug}`;
  const lessonPath = `${productPath}/lessons/${typedLesson.id}`;
  const lessonFiles = (files ?? []) as LessonFile[];
  const embedVideoUrl = normalizeYouTubeToEmbed(typedLesson.video_url ?? null);
  const descriptionHtml = sanitizeRichText(typedLesson.description);

  return (
    <main className="lesson-page">
      <SetPageTitle title={typedProduct.name} />
      <div className="lesson-player">
        <aside className="lesson-menu">
          <div className="lesson-progress">
            <div className="lesson-progress__label"><span>Progresso</span><strong>{progress}%</strong></div>
            <div className="lesson-progress__bar"><span style={{ width: `${progress}%` }} /></div>
          </div>
          {moduleLessons.map(({ module, lessons }) => (
            <details key={module.id} className="lesson-menu__module" open={module.id === currentModule.id}>
              <summary>{module.title}<ChevronDown size={14} /></summary>
              <nav>
                {lessons.map((item) => (
                  <Link key={item.id} href={`${productPath}/lessons/${item.id}`} className={`lesson-menu__item ${item.id === typedLesson.id ? "lesson-menu__item--active" : ""}`}>
                    <span>{item.title}</span>
                    {completedIds.has(item.id) && <CheckCircle2 size={14} className="lesson-menu__check" />}
                  </Link>
                ))}
                {lessons.length === 0 && <p className="lesson-menu__empty">Nenhuma aula.</p>}
              </nav>
            </details>
          ))}
        </aside>

        <article className="lesson-main">
          <div className="lesson-main__head">
            <h1>{typedLesson.title}</h1>
            <LessonCompleteButton lessonId={typedLesson.id} completed={completedIds.has(typedLesson.id)} path={lessonPath} />
          </div>
          {embedVideoUrl && <YoutubeEmbed embedUrl={embedVideoUrl} title={typedLesson.title} />}
          {descriptionHtml && <div className="lesson-description rich-text" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />}
          {lessonFiles.length > 0 && (
            <section className="lesson-files">
              <h2>Materiais da aula</h2>
              <div className="list-box">{lessonFiles.map((file) => <a key={file.id} href={file.file_url.startsWith(STORAGE_PREFIX) ? `/api/files/${file.id}` : file.file_url} target="_blank" rel="noreferrer" className="list-box__row"><span style={{ display: "flex", alignItems: "center", gap: 10 }}><FileText size={16} className="muted" />{file.file_name}</span><Download size={16} className="muted" /></a>)}</div>
            </section>
          )}
          <nav className="lesson-nav" aria-label="Navegação entre aulas">
            {previousLesson ? <Link href={`${productPath}/lessons/${previousLesson.id}`} className="btn lesson-nav__button"><ChevronLeft size={15} /> Anterior</Link> : <span />}
            {nextLesson ? <Link href={`${productPath}/lessons/${nextLesson.id}`} className="btn lesson-nav__button">Próxima <ChevronRight size={15} /></Link> : <Link href="/dashboard" className="btn lesson-nav__button">Voltar ao início <ChevronRight size={15} /></Link>}
          </nav>
        </article>
      </div>
    </main>
  );
}
