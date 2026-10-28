export const dynamic = "force-dynamic";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DeleteProductButton } from "@/components/DeleteProductButton";
import { deleteProduct } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export default async function AdminProductsPage() {
  const { adminSupabase } = await requireAdmin();
  const { data: products, error } = await adminSupabase.from("products").select("id, name, slug, is_visible, sales_url, yampi_product_id").order("position", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error(`Não foi possível carregar os produtos: ${error.message}`);

  return (
    <main className="admin-page">
      <div className="admin-wrap page-section">
        <div className="section-head">
          <div><h1>Produtos</h1><p>Gerencie o catálogo, capas, módulos e aulas.</p></div>
          <Link href="/admin/products/new" className="btn"><Plus size={14} /> Novo produto</Link>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Slug</th>
                <th>Vitrine</th>
                <th>Yampi ID</th>
                <th>Vendas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((product) => (
                <tr key={product.id}>
                  <td style={{ fontWeight: 500 }}>{product.name}</td>
                  <td className="muted">{product.slug}</td>
                  <td>{product.is_visible === false ? <span className="status-pill">Oculto</span> : "Sim"}</td>
                  <td className="muted">{product.yampi_product_id || "-"}</td>
                  <td className="muted">{product.sales_url ? "Sim" : "-"}</td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/products/${product.id}`} className="admin-action-link"><Pencil size={13} /> Editar</Link>
                    <DeleteProductButton productId={product.id} action={deleteProduct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products?.length === 0 && <p className="list-box__empty">Nenhum produto cadastrado.</p>}
        </div>
      </div>
    </main>
  );
}
