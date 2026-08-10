import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountRole,
  AccountRoleRow,
  Profile,
  UpdateProfileInput,
} from "./types";

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
    .select(
      "id, email, name, login_id, role, host_approval_status, host_type, business_number, business_name, business_start_date, representative_name, business_verification_status, business_verified_at, business_verification_message, age, region, phone"
    )
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const { data: accountData, error: accountError } = await supabase
    .from("account_roles")
    .select("id, profile_id, role, login_id, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (accountError) return null;

  const accounts = (accountData ?? []) as AccountRoleRow[];
  const selectedAccount = expectedRole
    ? accounts.find((account) => account.role === expectedRole)
    : accounts[0];

  if (!selectedAccount) return null;

  const profile = data as Omit<Profile, "roles">;

  return {
    ...profile,
    role: selectedAccount.role,
    login_id: selectedAccount.login_id,
    roles: accounts.map((account) => account.role),
  };
}

export function isApprovedHost(profile: Profile | null) {
  return (
    profile?.roles.includes("host") &&
    profile.host_approval_status === "approved"
  );
}

// 기업 호스트가 로그인한 뒤 국세청 검증을 요청합니다.
// API 키와 service role 키는 서버에서만 사용하며 브라우저에는 노출하지 않습니다.
export async function requestBusinessVerification(
  supabase: SupabaseClient
): Promise<{ ok: boolean; message: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const response = await fetch("/api/business/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = (await response.json()) as { message?: string };
  return {
    ok: response.ok,
    message: result.message ?? "사업자등록 확인 결과를 불러오지 못했습니다.",
  };
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
