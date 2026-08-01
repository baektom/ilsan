import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, UpdateProfileInput } from "./types";

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
    .select("id, email, name, login_id, role, age, region, phone")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

// 마이페이지 "프로필 수정"에서 사용합니다.
// 여기서 저장한 이름/나이/지역/연락처는 지원 페이지 폼에 자동으로 채워집니다.
export async function updateProfile(
  supabase: SupabaseClient,
  input: UpdateProfileInput
): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name: input.name,
      age: input.age,
      region: input.region,
      phone: input.phone,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "프로필 저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true, message: "프로필이 저장되었습니다." };
}

export async function logout(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}