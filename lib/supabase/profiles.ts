import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountRole, Profile } from "./types";

export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error ? null : user;
}

export async function getCurrentProfile(
  supabase: SupabaseClient,
  expectedRole?: AccountRole
): Promise<Profile | null> {
  const user = await getCurrentUser(supabase);

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, login_id, role, host_approval_status")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const profile = data as Profile;
  if (expectedRole && profile.role !== expectedRole) return null;

  return profile;
}

export function isApprovedHost(profile: Profile | null) {
  return (
    profile?.role === "host" && profile.host_approval_status === "approved"
  );
}

export async function logout(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}
