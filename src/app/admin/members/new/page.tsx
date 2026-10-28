export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

import { createMember } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { adminSupabase } = await requireAdmin();
  const { data: products } = await adminSupabase.from("products").select("id, name").order("name", { ascending: true });

  return (
    <main className="admin-page">
      <div className="admin-wrap admin-wrap--narrow">
        <Link href="/admin/members" className="back-link"><ArrowLeft size={14} /> Membros</Link>
        <section className="page-section">
          <div className="section-head"><div><h1>Novo membro</h1><p>Cadastre um aluno manualmente e escolha o que ele pode acessar.</p></div></div>
          {error && <p className="panel" style={{ margin: 0, color: "var(--destructive)", fontSize: 13 }}>{error}</p>}
          <form action={createMember} className="admin-form">
            <label className="admin-field">Nome<input name="name" className="admin-input" placeholder="Nome do aluno" /></label>
            <label className="admin-field">E-mail<input name="email" type="email" required className="admin-input" placeholder="aluno@email.com" /></label>
            <label className="admin-field">Senha<input name="password" type="text" minLength={6} className="admin-input" placeholder="Deixe em branco para gerar automaticamente" /><span className="field-hint">Mínimo 6 caracteres. Em branco, o sistema cria uma senha aleatória.</span></label>

            <div className="admin-field">Produtos liberados
              <div className="list-box">
                {(products ?? []).map((product) => (
                  <label key={product.id} className="list-box__row admin-check" style={{ justifyContent: "flex-start", cursor: "pointer" }}><input type="checkbox" name="product_ids" value={product.id} className="admin-checkbox" /> {product.name}</label>
                ))}
                {products?.length === 0 && <p className="list-box__empty">Nenhum produto cadastrado.</p>}
              </div>
            </div>

            <label className="admin-check"><input type="checkbox" name="unlimited_access" className="admin-checkbox" /> Acesso ilimitado (libera todos os produtos atuais e futuros)</label>
            <label className="admin-check"><input type="checkbox" name="send_email" defaultChecked className="admin-checkbox" /> Enviar e-mail de boas-vindas com o login e a senha</label>

            <button className="btn"><UserPlus size={14} /> Cadastrar membro</button>
          </form>
        </section>
      </div>
    </main>
  );
}
