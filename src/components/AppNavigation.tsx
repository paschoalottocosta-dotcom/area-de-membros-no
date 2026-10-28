import { isAdmin } from "@/lib/supabase/admin-auth";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { AppHeader, PageTitleProvider, SidebarNav, type NavLink } from "@/components/SidebarNav";
import { TermsModal } from "@/components/TermsModal";
import { getTermsHtml } from "@/lib/terms";

export default async function AppNavigation({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <div className="app-content">{children}</div>;

  const [userIsAdmin, { profile, error: profileError }] = await Promise.all([isAdmin(), getCurrentProfile()]);
  // Se a consulta falhar (ex.: migration ainda não aplicada), não bloqueia a área com o pop-up.
  const mustAcceptTerms = !profileError && !!profile && !profile.terms_accepted_at;
  const termsHtml = mustAcceptTerms ? await getTermsHtml() : null;

  const commonLinks: NavLink[] = [
    { href: "/dashboard", label: "Início", icon: "home" },
    { href: "/profile", label: "Meu Perfil", icon: "user" },
    { href: "/support", label: "Suporte", icon: "support" },
  ];

  const adminLinks: NavLink[] = userIsAdmin ? [
    { href: "/admin/products", label: "Produtos", icon: "bag" },
    { href: "/admin/combos", label: "Combos", icon: "package" },
    { href: "/admin/categories", label: "Categorias", icon: "folder" },
    { href: "/admin/members", label: "Membros", icon: "users" },
    { href: "/admin/settings", label: "Configurações", icon: "settings" },
  ] : [];

  const name = typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim() ? user.user_metadata.name : (user.email?.split("@")[0] ?? "Aluno");

  return (
    <PageTitleProvider>
      <SidebarNav commonLinks={commonLinks} adminLinks={adminLinks} user={{ name, email: user.email ?? "" }} />
      <div className="app-content">
        <AppHeader links={commonLinks.concat(adminLinks)} />
        {children}
      </div>
      {termsHtml && <TermsModal html={termsHtml} />}
    </PageTitleProvider>
  );
}
