export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";

import { createCombo, deleteCombo, updateCombo } from "@/app/admin/actions";
import { DeleteComboButton } from "@/components/DeleteComboButton";
import { requireAdmin } from "@/lib/supabase/admin-auth";

interface Combo { id: string; name: string; yampi_product_id: string; }
interface ComboItem { combo_id: string; product_id: string; }
interface ProductOption { id: string; name: string; }

function ProductCheckboxes({ products, selected }: { products: ProductOption[]; selected: Set<string> }) {
  if (products.length === 0) return <p className="field-hint span-2" style={{ margin: 0 }}>Nenhum produto cadastrado.</p>;
  return (
    <div className="admin-field span-2">
      Produtos liberados
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {products.map((product) => (
          <label key={product.id} className="admin-check"><input name="product_id" value={product.id} type="checkbox" defaultChecked={selected.has(product.id)} className="admin-checkbox" /> {product.name}</label>
        ))}
      </div>
    </div>
  );
}

export default async function AdminCombosPage() {
  const { adminSupabase } = await requireAdmin();
  const [{ data: combos, error: combosError }, { data: comboItems, error: itemsError }, { data: products, error: productsError }] = await Promise.all([
    adminSupabase.from("combos").select("id, name, yampi_product_id").order("created_at", { ascending: true }),
    adminSupabase.from("combo_items").select("combo_id, product_id"),
    adminSupabase.from("products").select("id, name").order("name", { ascending: true }),
  ]);
  if (combosError || itemsError || productsError) throw new Error("Não foi possível carregar os combos.");

  const productOptions = (products ?? []) as ProductOption[];
  const itemRows = (comboItems ?? []) as ComboItem[];

  return (
    <main className="admin-page">
      <div className="admin-wrap admin-wrap--narrow">
        <section className="page-section">
          <div className="section-head"><div><h1>Novo combo</h1><p>Um combo é um produto da Yampi que libera vários produtos da área de membros.</p></div></div>
          <form action={createCombo} className="form-grid">
            <label className="admin-field">Nome<input name="name" required className="admin-input" placeholder="Kit de Materiais" /></label>
            <label className="admin-field">ID do produto na Yampi<input name="yampi_product_id" required className="admin-input" /></label>
            <ProductCheckboxes products={productOptions} selected={new Set()} />
            <div className="span-2"><button className="btn"><Plus size={14} /> Criar combo</button></div>
          </form>
        </section>

        <hr className="page-divider" />

        <section className="page-section">
          <div className="section-head"><div><h2>Combos</h2><p>Edite o nome, o ID da Yampi ou os produtos liberados.</p></div></div>
          <div className="panel-list">
            {((combos ?? []) as Combo[]).map((combo) => (
              <div key={combo.id} className="panel">
                <form action={updateCombo} className="form-grid">
                  <input type="hidden" name="id" value={combo.id} />
                  <label className="admin-field">Nome<input name="name" required defaultValue={combo.name} className="admin-input" /></label>
                  <label className="admin-field">ID do produto na Yampi<input name="yampi_product_id" required defaultValue={combo.yampi_product_id} className="admin-input" /></label>
                  <ProductCheckboxes products={productOptions} selected={new Set(itemRows.filter((item) => item.combo_id === combo.id).map((item) => item.product_id))} />
                  <div className="span-2"><button className="btn btn--outline">Salvar combo</button></div>
                </form>
                <div style={{ marginTop: 12 }}><DeleteComboButton comboId={combo.id} action={deleteCombo} /></div>
              </div>
            ))}
            {combos?.length === 0 && <div className="empty-state"><p className="empty-state__text">Nenhum combo cadastrado.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
