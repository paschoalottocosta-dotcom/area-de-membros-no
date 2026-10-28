export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, FileText, Pencil, Plus, Video } from "lucide-react";

import { createModule, deleteLesson, deleteModule, updateModule, updateProduct } from "@/app/admin/actions";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { requireAdmin } from "@/lib/supabase/admin-auth";

interface Product { id: string; name: string; slug: string | null; yampi_product_id: string | null; is_visible: boolean; sales_url: string | null; cover_image_url: string | null; category_id: string | null; }
interface Module { id: string; title: string; position: number; }
interface Lesson { id: string; module_id: string; title: string; video_url: string | null; position: number; }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { adminSupabase } = await requireAdmin();
  const [{ data: product, error: productError }, { data: modules, error: modulesError }, { data: categories }] = await Promise.all([
    adminSupabase.from("products").select("id, name, slug, is_visible, sales_url, yampi_product_id, cover_image_url, category_id").eq("id", id).maybeSingle(),
    adminSupabase.from("modules").select("id, title, position").eq("product_id", id).order("position", { ascending: true }),
    adminSupabase.from("categories").select("id, name").order("position", { ascending: true }),
  ]);
  if (productError || modulesError) throw new Error("Não foi possível carregar o produto.");
  if (!product) return <main className="admin-page"><div className="admin-wrap"><p className="muted">Produto não encontrado.</p></div></main>;

  const typedProduct = product as Product;
  const moduleRows = (modules ?? []) as Module[];
  const { data: lessons, error: lessonsError } = moduleRows.length
    ? await adminSupabase.from("lessons").select("id, module_id, title, video_url, position").in("module_id", moduleRows.map((module) => module.id)).order("position", { ascending: true })
    : { data: [], error: null };
  if (lessonsError) throw new Error("Não foi possível carregar as aulas.");
  const lessonRows = (lessons ?? []) as Lesson[];
  const { data: files } = lessonRows.length
    ? await adminSupabase.from("lesson_files").select("lesson_id").in("lesson_id", lessonRows.map((lesson) => lesson.id))
    : { data: [] };
  const fileCount = new Map<string, number>();
  ((files ?? []) as { lesson_id: string }[]).forEach((file) => fileCount.set(file.lesson_id, (fileCount.get(file.lesson_id) ?? 0) + 1));
  const productPath = `/admin/products/${typedProduct.id}`;

  return (
    <main className="admin-page">
      <div className="admin-wrap">
        <Link href="/admin/products" className="back-link"><ArrowLeft size={14} /> Produtos</Link>
        <div className="section-head" style={{ marginBottom: 24 }}><div><h1>Editar produto</h1><p>{typedProduct.name}</p></div></div>

        <form action={updateProduct}>
          <input type="hidden" name="id" value={typedProduct.id} />
          <section className="settings-section">
            <div className="settings-section__intro"><h2>Detalhes do produto</h2><p>Nome, endereço, vitrine, página de vendas e integração com a Yampi.</p></div>
            <div className="panel form-grid">
              <label className="admin-field">Nome<input name="name" required defaultValue={typedProduct.name} className="admin-input" /></label>
              <label className="admin-field">Slug<input name="slug" defaultValue={typedProduct.slug ?? ""} className="admin-input" /></label>
              <label className="admin-field span-2">URL da página de vendas<input name="sales_url" defaultValue={typedProduct.sales_url ?? ""} className="admin-input" placeholder="https://..." /></label>
              <label className="admin-field">ID do produto na Yampi<input name="yampi_product_id" defaultValue={typedProduct.yampi_product_id ?? ""} className="admin-input" /></label>
              <label className="admin-field">Categoria<select name="category_id" defaultValue={typedProduct.category_id ?? ""} className="admin-input"><option value="">Sem categoria</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="admin-check span-2"><input name="is_visible" type="checkbox" defaultChecked={typedProduct.is_visible} className="admin-checkbox" /> Visível na vitrine (aparece trancado para quem não comprou)</label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__intro"><h2>Imagem de capa</h2><p>Capa exibida na vitrine, no tamanho 300 x 420 pixels.</p></div>
            <div className="panel settings-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {typedProduct.cover_image_url && <img src={typedProduct.cover_image_url} alt="Capa atual" className="settings-cover__preview" />}
              <label className="admin-field">{typedProduct.cover_image_url ? "Trocar capa" : "Enviar capa"}<input name="cover_image" type="file" accept="image/*" className="admin-input" /></label>
            </div>
          </section>

          <div className="settings-footer"><button className="btn">Salvar produto</button></div>
        </form>

        <hr className="page-divider" />

        <section className="page-section">
          <div className="section-head"><div><h2>Módulos e aulas</h2><p>Clique em uma aula para editar o texto, o vídeo e os arquivos.</p></div></div>
          <form action={createModule} className="panel panel--dashed form-row">
            <input type="hidden" name="product_id" value={typedProduct.id} />
            <label className="admin-field">Novo módulo<input name="title" required className="admin-input" /></label>
            <label className="admin-field admin-field--small">Posição<input name="position" type="number" defaultValue={moduleRows.length + 1} className="admin-input" /></label>
            <button className="btn btn--outline"><Plus size={14} /> Adicionar</button>
          </form>

          <div className="panel-list">
            {moduleRows.map((module) => {
              const moduleLessons = lessonRows.filter((lesson) => lesson.module_id === module.id);
              return (
                <section key={module.id} className="panel">
                  <div className="module-edit">
                    <form action={updateModule} className="form-row" style={{ flex: 1 }}>
                      <input type="hidden" name="product_id" value={typedProduct.id} />
                      <input type="hidden" name="module_id" value={module.id} />
                      <label className="admin-field">Módulo<input name="title" required defaultValue={module.title} className="admin-input" /></label>
                      <label className="admin-field admin-field--small">Posição<input name="position" type="number" defaultValue={module.position} className="admin-input" /></label>
                      <button className="btn btn--outline">Salvar</button>
                    </form>
                    <ConfirmDeleteForm action={deleteModule} fields={{ product_id: typedProduct.id, module_id: module.id }} label="Excluir módulo" message={`Excluir o módulo "${module.title}" e todas as aulas dele?`} />
                  </div>

                  <div className="lesson-list">
                    {moduleLessons.map((lesson) => (
                      <div key={lesson.id} className="lesson-list__row">
                        <Link href={`${productPath}/lessons/${lesson.id}`} className="lesson-list__title">
                          <span className="lesson-list__position">{lesson.position}</span>
                          {lesson.title}
                        </Link>
                        <span className="lesson-list__meta">
                          {lesson.video_url && <span title="Tem vídeo"><Video size={13} /></span>}
                          {(fileCount.get(lesson.id) ?? 0) > 0 && <span title="Arquivos"><FileText size={13} /> {fileCount.get(lesson.id)}</span>}
                        </span>
                        <Link href={`${productPath}/lessons/${lesson.id}`} className="admin-action-link"><Pencil size={12} /> Editar</Link>
                        <ConfirmDeleteForm action={deleteLesson} fields={{ product_id: typedProduct.id, lesson_id: lesson.id }} label="Excluir" message={`Excluir a aula "${lesson.title}"?`} />
                      </div>
                    ))}
                    {moduleLessons.length === 0 && <p className="field-hint" style={{ margin: 0 }}>Nenhuma aula neste módulo ainda.</p>}
                  </div>
                  <Link href={`${productPath}/lessons/new?module=${module.id}`} className="btn btn--outline" style={{ marginTop: 14 }}><Plus size={14} /> Nova aula</Link>
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
