export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { SetPageTitle } from "@/components/SidebarNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

interface Product { id: string; name: string; slug: string | null; }
interface Module { id: string; }
interface Lesson { id: string; module_id: string; }

// Ao abrir um curso, o aluno vai direto para a primeira aula.
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const [user, { profile }] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!user) redirect("/login");
  if (profile?.blocked) redirect("/login?message=account-blocked");

  const { data: product, error: productError } = await adminSupabase
    .from("products").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (productError || !product) redirect("/dashboard");
  const typedProduct = product as Product;

  // Acesso, módulos e aulas do produto de uma vez (as regras do banco só devolvem módulos/aulas a quem tem acesso).
  const [{ data: access, error: accessError }, { data: modules, error: modulesError }, { data: lessons, error: lessonsError }] = await Promise.all([
    supabase.from("user_access").select("product_id").eq("user_id", user.id).eq("product_id", typedProduct.id).eq("status", "active").maybeSingle(),
    supabase.from("modules").select("id").eq("product_id", typedProduct.id).order("position", { ascending: true }),
    supabase.from("lessons").select("id, module_id, modules!inner(product_id)").eq("modules.product_id", typedProduct.id).order("position", { ascending: true }),
  ]);
  if (accessError || (!profile?.unlimited_access && !access)) redirect("/dashboard");
  if (modulesError || lessonsError) throw new Error(`Não foi possível carregar as aulas: ${(modulesError ?? lessonsError)?.message}`);

  const lessonRows = (lessons ?? []) as Lesson[];
  for (const module of (modules ?? []) as Module[]) {
    const firstLesson = lessonRows.find((lesson) => lesson.module_id === module.id);
    if (firstLesson) redirect(`/products/${typedProduct.slug ?? slug}/lessons/${firstLesson.id}`);
  }

  return (
    <main className="admin-page">
      <SetPageTitle title={typedProduct.name} />
      <div className="admin-wrap">
        <Link href="/dashboard" className="back-link"><ArrowLeft size={14} /> Voltar aos conteúdos</Link>
        <div className="empty-state">
          <p className="empty-state__title">{typedProduct.name}</p>
          <p className="empty-state__text">Este conteúdo ainda não tem aulas.</p>
        </div>
      </div>
    </main>
  );
}
