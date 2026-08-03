import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentProfile, getCurrentUser } from "./profiles";
import type {
  ApplicationRow,
  ApplicationStatus,
  ApplicationWithTest,
  CreateApplicationInput,
} from "./types";

export async function createApplication(
  supabase: SupabaseClient,
  input: CreateApplicationInput
): Promise<{ ok: boolean; message: string }> {
  const profile = await getCurrentProfile(supabase, "tester");

  if (!profile) return { ok: false, message: "로그인 후 지원할 수 있습니다." };
  if (!input.applicantName.trim()) {
    return { ok: false, message: "이름을 입력해 주세요." };
  }

  const { error } = await supabase.from("applications").insert({
    test_id: input.testId,
    tester_id: profile.id,
    applicant_name: input.applicantName.trim(),
    age: input.age,
    region: input.region.trim() || null,
    phone: input.phone.trim() || null,
    message: input.message.trim() || null,
    status: "대기",
  });

  if (error?.code === "23505") {
    return { ok: false, message: "이미 지원한 테스트입니다." };
  }
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "지원이 완료되었습니다." };
}

export async function getMyApplications(
  supabase: SupabaseClient
): Promise<ApplicationWithTest[]> {
  const user = await getCurrentUser(supabase);
  if (!user) return [];

  const { data, error } = await supabase
    .from("applications")
    .select(`
      *,
      test:tests!applications_test_id_fkey (
        id,
        host_id,
        title,
        company_name,
        category,
        reward,
        target_people,
        location,
        period_start,
        period_end,
        description,
        status,
        created_at
      )
    `)
    .eq("tester_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationWithTest[];
}

export async function getApplicationsForHostTests(
  supabase: SupabaseClient,
  testIds: string[]
): Promise<ApplicationRow[]> {
  if (testIds.length === 0) return [];

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .in("test_id", testIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationRow[];
}

export async function updateApplicationStatus(
  supabase: SupabaseClient,
  applicationId: string,
  status: ApplicationStatus
): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "지원 상태가 변경되었습니다." };
}
