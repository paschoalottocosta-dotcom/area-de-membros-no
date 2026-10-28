export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { requireAdmin } from "@/lib/supabase/admin-auth";

// Ignora maiúsculas e acentos na busca ("joao" encontra "João").
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function memberName(user: User) {
  return typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "Sem nome";
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function formatDate(value: string | null | undefined) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { adminSupabase } = await requireAdmin();

  // listUsers devolve uma página por vez; percorre todas para a lista e a busca cobrirem todos os alunos.
  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Não foi possível carregar os membros.");
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  users.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data: profiles, error: profilesError } = await adminSupabase.from("profiles").select("id, blocked, unlimited_access");
  if (profilesError) throw new Error("Não foi possível carregar os membros.");
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const term = normalize(q);
  const filtered = term ? users.filter((user) => normalize(`${memberName(user)} ${user.email ?? ""}`).includes(term)) : users;

  return (
    <main className="admin-page">
      <div className="admin-wrap page-section">
        <div className="section-head"><div><h1>Membros</h1><p>{users.length} {users.length === 1 ? "aluno cadastrado" : "alunos cadastrados"}.</p></div><Link href="/admin/members/new" className="btn"><Plus size={14} /> Novo membro</Link></div>
        <form className="member-search" role="search">
          <input name="q" type="search" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="admin-input" aria-label="Buscar membro" />
          <button className="btn"><Search size={14} /> Buscar</button>
          {term && <Link href="/admin/members" className="btn btn--outline">Limpar</Link>}
        </form>
        {term && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"} para &quot;{q}&quot;.</p>}
        <div className="table-responsive">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Data de inscrição</th><th>Último login</th><th>Conta</th><th /></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="muted">Nenhum membro encontrado.</td></tr>}
              {filtered.map((user) => {
                const profile = profileMap.get(user.id);
                return (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{memberName(user)}</td>
                    <td className="muted">{user.email ?? "-"}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDate(user.created_at)}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDate(user.last_sign_in_at)}</td>
                    <td>{profile?.blocked ? <span className="status-pill status-pill--danger">Banido</span> : profile?.unlimited_access ? <span className="status-pill">Acesso ilimitado</span> : <span className="status-pill">Ativa</span>}</td>
                    <td className="admin-row-actions"><Link href={`/admin/members/${user.id}`} className="admin-action-link">Detalhes <ArrowUpRight size={13} /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
