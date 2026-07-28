import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error ? null : user;
}

export async function getCurrentProfile(
  supabase: SupabaseClient
): Promise<Profile | null> {
  const user = await getCurrentUser(supabase);

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, login_id, role")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function logout(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}
