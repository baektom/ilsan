import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentProfile, getCurrentUser, isApprovedHost } from "./profiles";
import type { CreateTestInput, TestRow, TestStatus } from "./types";

export async function getAllTests(supabase: SupabaseClient): Promise<TestRow[]> {
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TestRow[];
}

export async function getTestById(
  supabase: SupabaseClient,
  testId: string
): Promise<TestRow | null> {
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .eq("id", testId)
    .single();

  if (error || !data) return null;
  return data as TestRow;
}

export async function getMyTests(supabase: SupabaseClient): Promise<TestRow[]> {
  const user = await getCurrentUser(supabase);
  if (!user) return [];

  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TestRow[];
}

export async function createTest(
  supabase: SupabaseClient,
  input: CreateTestInput
): Promise<{ ok: boolean; message: string }> {
  const profile = await getCurrentProfile(supabase, "host");

  if (!profile) return { ok: false, message: "로그인 후 등록할 수 있습니다." };
  if (!isApprovedHost(profile)) {
    return { ok: false, message: "관리자 승인 후 테스트를 등록할 수 있습니다." };
  }
  if (!input.title.trim()) return { ok: false, message: "제목을 입력해 주세요." };
  if (!input.reward.trim()) return { ok: false, message: "보상을 입력해 주세요." };
  if (!Number.isInteger(input.targetPeople) || input.targetPeople < 1) {
    return { ok: false, message: "모집 인원은 1명 이상이어야 합니다." };
  }
  if (!input.description.trim()) {
    return { ok: false, message: "테스트 설명을 입력해 주세요." };
  }
  if (input.periodStart && input.periodEnd && input.periodStart > input.periodEnd) {
    return { ok: false, message: "종료일은 시작일보다 빠를 수 없습니다." };
  }

  const { error } = await supabase.from("tests").insert({
    host_id: profile.id,
    title: input.title.trim(),
    company_name: input.companyName.trim() || null,
    category: input.category,
    reward: input.reward.trim(),
    target_people: input.targetPeople,
    location: input.location.trim() || null,
    period_start: input.periodStart || null,
    period_end: input.periodEnd || null,
    description: input.description.trim(),
    status: "모집중",
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "테스트가 등록되었습니다." };
}

export async function updateTestStatus(
  supabase: SupabaseClient,
  testId: string,
  status: TestStatus
): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase.from("tests").update({ status }).eq("id", testId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "테스트 상태가 변경되었습니다." };
}
