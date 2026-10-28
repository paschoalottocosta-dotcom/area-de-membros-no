export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createProduct } from "@/app/admin/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export default async function NewProductPage() {
  await requireAdmin();
  const { data: categories } = await createAdminClient().from("categories").select("id, name").order("position", { ascending: true });
  return (
    <main className="admin-page">
      <div className="admin-wrap admin-wrap--narrow">
        <Link href="/admin/products" className="back-link"><ArrowLeft size={14} /> Produtos</Link>
        <section className="page-section">
          <div className="section-head"><div><h1>Novo produto</h1><p>Depois de criar, você poderá adicionar módulos e aulas.</p></div></div>
          <form action={createProduct} className="admin-form">
            <label className="admin-field">Nome<input name="name" required className="admin-input" /></label>
            <label className="admin-field">Slug<input name="slug" className="admin-input" placeholder="gerado-a-partir-do-nome" /><span className="field-hint">Parte final do endereço do produto. Deixe em branco para gerar automaticamente.</span></label>
            <label className="admin-check"><input name="is_visible" type="checkbox" className="admin-checkbox" defaultChecked /> Visível na vitrine</label>
            <label className="admin-field">URL da página de vendas<input name="sales_url" className="admin-input" placeholder="https://..." /></label>
            <label className="admin-field">ID do produto na Yampi<input name="yampi_product_id" className="admin-input" /></label>
            <label className="admin-field">Categoria<select name="category_id" defaultValue="" className="admin-input"><option value="">Sem categoria</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="admin-field">Imagem de capa<input name="cover_image" type="file" accept="image/*" className="admin-input" /><span className="field-hint">Tamanho recomendado: 300x420.</span></label>
            <button className="btn">Criar produto</button>
          </form>
        </section>
      </div>
    </main>
  );
}
