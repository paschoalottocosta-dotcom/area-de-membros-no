export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import ProfileForm from "@/components/ProfileForm";
import { TermsContent } from "@/components/TermsContent";
import { createClient } from "@/lib/supabase/server";
import { getTermsHtml } from "@/lib/terms";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("bio, terms_accepted_at").eq("id", user.id).maybeSingle();
  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email?.split("@")[0] ?? "Usuário";
  const acceptedAt = profile?.terms_accepted_at ? new Date(profile.terms_accepted_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : null;

  return (
    <main className="profile-page">
      <div className="profile-wrap">
        <ProfileForm profileId={user.id} initialName={name} email={user.email ?? ""} initialBio={profile?.bio ?? ""} />

        <hr className="page-divider" />

        <section className="page-section">
          <div className="section-head"><div><h2>Termos e condições de Uso</h2><p>{acceptedAt ? `Você leu e aceitou em ${acceptedAt}.` : "Política de reembolso e regras de uso da área de membros."}</p></div></div>
          <details className="terms-details">
            <summary>Ler os termos</summary>
            <TermsContent html={await getTermsHtml()} />
          </details>
        </section>
      </div>
    </main>
  );
}
