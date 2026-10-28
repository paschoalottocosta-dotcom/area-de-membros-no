export const dynamic = "force-dynamic";

import Link from "next/link";
import { BookOpen } from "lucide-react";

import { CategoryProductRow } from "@/components/CategoryProductRow";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/supabase/admin-auth";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

interface Product { id: string; name: string; slug?: string | null; created_at: string; is_visible?: boolean | null; sales_url?: string | null; cover_image_url?: string | null; category_id?: string | null; }
interface Access { product_id: string; }
interface Category { id: string; name: string; position: number; }

export default async function DashboardPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const user = await getCurrentUser();
  if (!user) return null;
  const [userIsAdmin, { profile }] = await Promise.all([isAdmin(), getCurrentProfile()]);
  if (profile?.blocked) return null;

  const [productsResult, accessResult, categoriesResult] = await Promise.all([
    adminSupabase.from("products").select("id, name, slug, created_at, is_visible, sales_url, cover_image_url, category_id").order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("user_access").select("product_id").eq("user_id", user.id).eq("status", "active"),
    supabase.from("categories").select("id, name, position").order("position", { ascending: true }),
  ]);
  if (productsResult.error) throw new Error(`Não foi possível carregar o catálogo: ${productsResult.error.message}`);
  if (accessResult.error) throw new Error(`Não foi possível carregar seus acessos: ${accessResult.error.message}`);
  if (categoriesResult.error) throw new Error(`Não foi possível carregar as categorias: ${categoriesResult.error.message}`);

  const access = new Set((accessResult.data as Access[]).map((row) => row.product_id));
  const items = (productsResult.data as Product[]) ?? [];
  if (profile?.unlimited_access) items.forEach((product) => access.add(product.id));

  const visibleItems = items.filter((product) => {
    const hasAccess = access.has(product.id);
    return hasAccess || product.is_visible !== false;
  });
  const categories = (categoriesResult.data ?? []) as Category[];
  const sections = categories.map((category) => ({ category, products: visibleItems.filter((product) => product.category_id === category.id) })).filter((section) => section.products.length > 0);
  const uncategorized = visibleItems.filter((product) => !product.category_id);

  return (
    <main className="dashboard-page">

      {visibleItems.length === 0 ? (
        <div className="empty-state">
          <BookOpen className="empty-state__icon" size={28} />
          <p className="empty-state__title">Seus conteúdos aparecerão aqui.</p>
          <p className="empty-state__text">Ainda não há produtos cadastrados.</p>
        </div>
      ) : (
        <div className="dashboard-sections">
          {sections.map(({ category, products }) => <section key={category.id} className="dashboard-category"><CategoryProductRow title={category.name} products={products} access={access} canReorder={userIsAdmin} /></section>)}
          {uncategorized.length > 0 && <section className="dashboard-category"><CategoryProductRow title="Outros" products={uncategorized} access={access} canReorder={userIsAdmin} /></section>}
        </div>
      )}
    </main>
  );
}
