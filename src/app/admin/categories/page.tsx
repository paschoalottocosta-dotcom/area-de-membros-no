export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";

import { createCategory, deleteCategory, updateCategory } from "@/app/admin/actions";
import { DeleteCategoryButton } from "@/components/DeleteCategoryButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const { data: categories, error } = await createAdminClient().from("categories").select("id, name, position").order("position", { ascending: true });
  if (error) throw new Error(`Não foi possível carregar as categorias: ${error.message}`);

  return (
    <main className="admin-page">
      <div className="admin-wrap admin-wrap--narrow">
        <section className="page-section">
          <div className="section-head"><div><h1>Nova categoria</h1><p>As categorias agrupam os produtos em carrosséis no Início.</p></div></div>
          <form action={createCategory} className="form-row">
            <label className="admin-field">Nome<input name="name" required className="admin-input" /></label>
            <label className="admin-field admin-field--small">Posição<input name="position" type="number" defaultValue="0" className="admin-input" /></label>
            <button className="btn"><Plus size={14} /> Criar</button>
          </form>
        </section>

        <hr className="page-divider" />

        <section className="page-section">
          <div className="section-head"><div><h2>Categorias</h2><p>Edite o nome ou a ordem de exibição.</p></div></div>
          <div className="panel-list">
            {(categories ?? []).map((category) => (
              <div key={category.id} className="panel form-row">
                <form action={updateCategory} className="form-row" style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={category.id} />
                  <label className="admin-field">Nome<input name="name" required defaultValue={category.name} className="admin-input" /></label>
                  <label className="admin-field admin-field--small">Posição<input name="position" type="number" defaultValue={category.position} className="admin-input" /></label>
                  <button className="btn btn--outline">Salvar</button>
                </form>
                <div style={{ paddingBottom: 7 }}><DeleteCategoryButton categoryId={category.id} action={deleteCategory} /></div>
              </div>
            ))}
            {categories?.length === 0 && <div className="empty-state"><p className="empty-state__text">Nenhuma categoria cadastrada.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
