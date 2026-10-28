"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, FolderKanban, House, Headset, LogOut, Moon, Package, PanelLeft, Settings, ShoppingBag, Sun, UserRound, Users } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

import { useBrand } from "@/components/BrandProvider";

export interface NavLink { href: string; label: string; icon: "home" | "user" | "support" | "bag" | "package" | "folder" | "users" | "settings"; }

const icons = { home: House, user: UserRound, support: Headset, bag: ShoppingBag, package: Package, folder: FolderKanban, users: Users, settings: Settings };

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/products");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}

function closeMobileMenu() {
  delete document.documentElement.dataset.mobileMenu;
}

export function SidebarNav({ commonLinks, adminLinks, user }: { commonLinks: NavLink[]; adminLinks: NavLink[]; user: { name: string; email: string } }) {
  const pathname = usePathname();
  const brand = useBrand();

  // No celular, fecha o menu lateral ao trocar de página.
  useEffect(() => { closeMobileMenu(); }, [pathname]);

  const renderLinks = (links: NavLink[]) => links.map((link) => {
    const Icon = icons[link.icon];
    return (
      <Link key={link.href} href={link.href} title={link.label} className={`app-sidebar__link ${isActive(pathname, link.href) ? "app-sidebar__link--active" : ""}`}>
        <Icon size={16} />
        <span>{link.label}</span>
      </Link>
    );
  });

  return (
    <>
      <aside className="app-sidebar">
        <Link href="/dashboard" className="app-sidebar__brand">
          <Image src={brand.logoUrl} alt={brand.name} width={32} height={32} priority className="app-sidebar__brand-logo" />
          <span className="app-sidebar__brand-text"><strong>{brand.name}</strong><small>Área de Membros</small></span>
        </Link>

        <nav className="app-sidebar__nav">
          <p className="app-sidebar__group">Menu</p>
          {renderLinks(commonLinks)}
          {adminLinks.length > 0 && <p className="app-sidebar__group app-sidebar__group--spaced">Administração</p>}
          {renderLinks(adminLinks)}
        </nav>

        <details className="app-sidebar__user">
          <summary title={user.name}>
            <span className="app-sidebar__avatar">{initials(user.name)}</span>
            <span className="app-sidebar__user-text"><strong>{user.name}</strong><small>{user.email}</small></span>
            <ChevronsUpDown size={16} />
          </summary>
          <div className="app-sidebar__user-menu">
            <Link href="/profile" className="app-sidebar__link"><UserRound size={16} /> Meu Perfil</Link>
            <form action="/api/auth/signout" method="post">
              <button className="app-sidebar__link"><LogOut size={16} /> Sair</button>
            </form>
          </div>
        </details>
      </aside>

      <div className="app-sidebar-backdrop" onClick={closeMobileMenu} aria-hidden="true" />
    </>
  );
}

export function AppHeader({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const pageTitle = useContext(PageTitleContext)?.title;
  const title = pageTitle || (links.find((link) => isActive(pathname, link.href))?.label ?? "Início");

  const toggleSidebar = () => {
    const root = document.documentElement;
    // No celular o botão abre/fecha o menu deslizante em vez de recolher a barra.
    if (window.matchMedia("(max-width: 900px)").matches) {
      if (root.dataset.mobileMenu === "open") closeMobileMenu();
      else root.dataset.mobileMenu = "open";
      return;
    }
    const next = root.dataset.sidebar === "collapsed" ? "" : "collapsed";
    root.dataset.sidebar = next;
    try { localStorage.setItem("sidebar", next); } catch {}
  };

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setIsDark(next);
  };

  return (
    <header className="app-header">
      <button type="button" className="app-header__button app-header__sidebar-toggle" onClick={toggleSidebar} aria-label="Mostrar ou esconder menu"><PanelLeft size={16} /></button>
      <span className="app-header__divider" />
      <h1 className="app-header__title">{title}</h1>
      <button type="button" className="app-header__button app-header__theme" onClick={toggleTheme} aria-label="Alternar tema">{isDark ? <Moon size={16} /> : <Sun size={16} />}</button>
    </header>
  );
}

// Permite que uma página troque o título da barra superior (ex.: nome do curso na tela de aula).
const PageTitleContext = createContext<{ title: string; setTitle: (title: string) => void } | null>(null);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("");
  return <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>;
}

export function SetPageTitle({ title }: { title: string }) {
  const setTitle = useContext(PageTitleContext)?.setTitle;
  useEffect(() => {
    setTitle?.(title);
    return () => setTitle?.("");
  }, [setTitle, title]);
  return null;
}
