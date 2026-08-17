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
    .select("id, email, name")
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

  const roleDetails = selectedAccount.role === "tester"
    ? await supabase
        .from("tester_profiles")
        .select("age, region, phone")
        .eq("profile_id", user.id)
        .single()
    : selectedAccount.role === "host"
      ? await supabase
          .from("host_profiles")
          .select(
            "host_type, approval_status, business_number, business_name, business_start_date, representative_name, business_verification_status, business_verified_at, business_verification_message"
          )
          .eq("profile_id", user.id)
          .single()
      : { data: null, error: null };

  if (roleDetails.error) return null;

  const details = roleDetails.data;
  const testerDetails = selectedAccount.role === "tester"
    ? details as { age: number | null; region: string | null; phone: string | null } | null
    : null;
  const hostDetails = selectedAccount.role === "host"
    ? details as {
        host_type: Profile["host_type"];
        approval_status: Profile["host_approval_status"];
        business_number: string | null;
        business_name: string | null;
        business_start_date: string | null;
        representative_name: string | null;
        business_verification_status: Profile["business_verification_status"];
        business_verified_at: string | null;
        business_verification_message: string | null;
      } | null
    : null;

  return {
    ...data,
    role: selectedAccount.role,
    login_id: selectedAccount.login_id,
    roles: accounts.map((account) => account.role),
    host_approval_status: hostDetails?.approval_status ?? "not_applicable",
    host_type: hostDetails?.host_type ?? null,
    business_number: hostDetails?.business_number ?? null,
    business_name: hostDetails?.business_name ?? null,
    business_start_date: hostDetails?.business_start_date ?? null,
    representative_name: hostDetails?.representative_name ?? null,
    business_verification_status: hostDetails?.business_verification_status ?? "not_applicable",
    business_verified_at: hostDetails?.business_verified_at ?? null,
    business_verification_message: hostDetails?.business_verification_message ?? null,
    age: testerDetails?.age ?? null,
    region: testerDetails?.region ?? null,
    phone: testerDetails?.phone ?? null,
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

  const { error: commonError } = await supabase
    .from("profiles")
    .update({ name: input.name })
    .eq("id", user.id);

  const { error: testerError } = await supabase
    .from("tester_profiles")
    .update({
      age: input.age,
      region: input.region,
      phone: input.phone,
    })
    .eq("profile_id", user.id);

  if (commonError || testerError) {
    return { ok: false, message: "프로필 저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { ok: true, message: "프로필이 저장되었습니다." };
}

export async function logout(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}
