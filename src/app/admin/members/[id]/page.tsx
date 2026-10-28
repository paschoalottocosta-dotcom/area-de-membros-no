export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

import { resendMemberPassword, updateMemberAccess, updateMemberEmail, updateMemberFlags, updateMemberPassword } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin-auth";

interface Product { id: string; name: string; slug: string | null; }
interface Access { product_id: string; status: "active" | "disabled"; }

export default async function AdminMemberDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const { adminSupabase } = await requireAdmin();
  const [{ data: userResult, error: userError }, { data: profile }, { data: products, error: productsError }, { data: access, error: accessError }] = await Promise.all([
    adminSupabase.auth.admin.getUserById(id),
    adminSupabase.from("profiles").select("blocked, unlimited_access").eq("id", id).maybeSingle(),
    adminSupabase.from("products").select("id, name, slug").order("name", { ascending: true }),
    adminSupabase.from("user_access").select("product_id, status").eq("user_id", id),
  ]);
  if (userError || productsError || accessError || !userResult.user) return <main className="admin-page"><div className="admin-wrap"><p className="muted">Membro não encontrado.</p></div></main>;

  const user = userResult.user;
  const accessMap = new Map((access ?? []).map((item) => [item.product_id, item as Access]));
  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "Sem nome";

  return (
    <main className="admin-page">
      <div className="admin-wrap admin-wrap--narrow">
        <Link href="/admin/members" className="back-link"><ArrowLeft size={14} /> Membros</Link>

        <section className="page-section">
          {created && <p className="panel" style={{ margin: 0, fontSize: 13 }}>Membro cadastrado com sucesso.</p>}
          <div className="section-head">
            <div><h1>{name}</h1><p>{user.email}</p></div>
            <form action={resendMemberPassword}><input type="hidden" name="user_id" value={id} /><button className="btn btn--outline"><Send size={14} /> Reenviar senha</button></form>
          </div>
          <form action={updateMemberEmail} className="form-row"><input type="hidden" name="user_id" value={id} /><label className="admin-field">E-mail<input name="email" type="email" required defaultValue={user.email ?? ""} className="admin-input" /></label><button className="btn">Salvar e-mail</button></form>
          <form action={updateMemberPassword} className="form-row"><input type="hidden" name="user_id" value={id} /><label className="admin-field">Nova senha<input name="password" type="text" minLength={6} required placeholder="Mínimo 6 caracteres" className="admin-input" /></label><button className="btn">Definir senha</button></form>
        </section>

        <hr className="page-divider" />

        <section className="page-section">
          <div className="section-head"><div><h2>Conta</h2><p>Controles gerais de acesso do aluno.</p></div></div>
          <form action={updateMemberFlags} className="panel toggle-row"><input type="hidden" name="user_id" value={id} /><input type="hidden" name="field" value="blocked" /><input type="hidden" name="enabled" value={profile?.blocked ? "false" : "true"} /><div><strong>Banido</strong><span>Bloqueia o acesso à conta.</span></div><button className={`btn ${profile?.blocked ? "btn--danger" : "btn--outline"}`}>{profile?.blocked ? "Ativado" : "Desativado"}</button></form>
          <form action={updateMemberFlags} className="panel toggle-row"><input type="hidden" name="user_id" value={id} /><input type="hidden" name="field" value="unlimited_access" /><input type="hidden" name="enabled" value={profile?.unlimited_access ? "false" : "true"} /><div><strong>Acesso ilimitado</strong><span>Libera produtos atuais e futuros.</span></div><button className={`btn ${profile?.unlimited_access ? "" : "btn--outline"}`}>{profile?.unlimited_access ? "Ativado" : "Desativado"}</button></form>
        </section>

        <hr className="page-divider" />

        <section className="page-section">
          <div className="section-head"><div><h2>Produtos</h2><p>Acesso individual a cada produto.</p></div></div>
          <div className="list-box">
            {((products ?? []) as Product[]).map((product) => {
              const current = accessMap.get(product.id);
              return (
                // A key muda junto com o status para o formulário ser recriado após salvar; sem isso o React
                // reseta o select para o valor antigo depois da Server Action.
                <form key={`${product.id}-${current?.status ?? "none"}`} action={updateMemberAccess} className="list-box__row">
                  <input type="hidden" name="user_id" value={id} /><input type="hidden" name="product_id" value={product.id} />
                  <span>{product.name}</span>
                  <div className="form-footer" style={{ flexWrap: "nowrap" }}>
                    <select name="status" defaultValue={current?.status ?? "none"} className="admin-input" style={{ width: "auto" }}><option value="none">Sem acesso</option><option value="active">Ativado</option><option value="disabled">Desativado</option></select>
                    <button className="btn btn--outline">Salvar</button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
