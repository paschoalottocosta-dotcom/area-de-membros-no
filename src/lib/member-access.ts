import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemberProfile {
  id: string;
  is_admin: boolean;
  blocked: boolean;
  unlimited_access: boolean;
}

export async function getMemberProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("id, is_admin, blocked, unlimited_access").eq("id", userId).maybeSingle();
  return { profile: data as MemberProfile | null, error };
}

export async function hasProductAccess(supabase: SupabaseClient, userId: string, productId: string, profile?: MemberProfile | null) {
  const memberProfile = profile ?? (await getMemberProfile(supabase, userId)).profile;
  if (memberProfile?.blocked) return false;
  if (memberProfile?.unlimited_access) return true;
  const { data, error } = await supabase.from("user_access").select("product_id").eq("user_id", userId).eq("product_id", productId).eq("status", "active").maybeSingle();
  return !error && Boolean(data);
}