import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { profile, error } = await getCurrentProfile();
  if (error || profile?.blocked || !profile?.is_admin) redirect("/dashboard");
  return { user, adminSupabase: createAdminClient() };
}

export async function isAdmin() {
  const { profile } = await getCurrentProfile();
  return profile?.is_admin === true && profile.blocked !== true;
}
