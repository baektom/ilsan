import type {
  AdminApiResult,
  AdminCompanyRow,
  AdminNoticeRow,
  AdminTestRow,
  AdminUserRow,
  ApplicantStats,
  CompanyApprovalStatus,
  CreateAdminNoticeInput,
} from "./types";
import {
  mockApplicantStats,
  mockCompanies,
  mockNotices,
  mockTests,
  mockUsers,
} from "./mockData";

// mock 단계 공통 원칙: 아래 함수들은 lib/admin/mockData.ts의 원본 배열/객체를 절대
// mutate하지 않습니다. "상태 변경"류 함수는 성공 메시지만 반환하고, 실제 화면 반영은
// 호출한 page.tsx가 자체 React state로만 처리합니다. 즉 새로고침하거나 페이지를
// 재진입(재조회)하면 항상 mockData.ts의 초기값으로 돌아갑니다.

// TODO: 아래 함수 내부만 fetch("/api/admin/users")로 교체하면 됩니다.
// 이 함수를 호출하는 페이지(app/admin/users/page.tsx)는 변경할 필요가 없습니다.
export async function fetchAdminUsers(): Promise<AdminApiResult<AdminUserRow[]>> {
  return { ok: true, message: "mock 데이터입니다.", data: mockUsers };
}

// TODO: 아래 함수 내부만 fetch("/api/admin/companies")로 교체하면 됩니다.
// 이 함수를 호출하는 페이지(app/admin/companies/page.tsx)는 변경할 필요가 없습니다.
export async function fetchAdminCompanies(): Promise<
  AdminApiResult<AdminCompanyRow[]>
> {
  return { ok: true, message: "mock 데이터입니다.", data: mockCompanies };
}

// TODO: 아래 함수 내부만 fetch(`/api/admin/companies/${companyId}/approval`, { method: "PATCH", ... })로 교체하면 됩니다.
export async function updateCompanyApproval(
  _companyId: string,
  status: CompanyApprovalStatus
): Promise<AdminApiResult<null>> {
  return {
    ok: true,
    message: `mock 환경입니다. "${status}" 상태로 화면에만 반영되며, 새로고침하면 초기화됩니다.`,
  };
}

// TODO: 아래 함수 내부만 fetch("/api/admin/tests")로 교체하면 됩니다.
// 이 함수를 호출하는 페이지(app/admin/tests/page.tsx)는 변경할 필요가 없습니다.
export async function fetchAdminTests(): Promise<AdminApiResult<AdminTestRow[]>> {
  return { ok: true, message: "mock 데이터입니다.", data: mockTests };
}

// TODO: 아래 함수 내부만 fetch(`/api/admin/tests/${testId}/status`, { method: "PATCH", ... })로 교체하면 됩니다.
export async function updateAdminTestStatus(
  _testId: string,
  status: AdminTestRow["status"]
): Promise<AdminApiResult<null>> {
  return {
    ok: true,
    message: `mock 환경입니다. "${status}" 상태로 화면에만 반영되며, 새로고침하면 초기화됩니다.`,
  };
}

// TODO: 아래 함수 내부만 fetch("/api/admin/notices")로 교체하면 됩니다.
// 이 함수를 호출하는 페이지(app/admin/notices/page.tsx)는 변경할 필요가 없습니다.
export async function fetchAdminNotices(): Promise<
  AdminApiResult<AdminNoticeRow[]>
> {
  return { ok: true, message: "mock 데이터입니다.", data: mockNotices };
}

// TODO: 아래 함수 내부만 fetch("/api/admin/notices", { method: "POST", ... })로 교체하면 됩니다.
// mockData.ts의 mockNotices 원본은 건드리지 않습니다 — 새로 만든 공지는 페이지의
// React state에만 추가되고, 새로고침하면 사라집니다(다른 상태 변경 함수와 동일한 원칙).
export async function createAdminNotice(
  input: CreateAdminNoticeInput
): Promise<AdminApiResult<AdminNoticeRow>> {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) return { ok: false, message: "제목을 입력해 주세요." };
  if (!content) return { ok: false, message: "내용을 입력해 주세요." };

  const notice: AdminNoticeRow = {
    id: `notice-${Date.now()}`,
    title,
    content,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    message: "공지사항이 등록되었습니다. (mock 환경 — 화면에만 반영되며 새로고침하면 초기화됩니다)",
    data: notice,
  };
}

// TODO: 아래 함수 내부만 fetch("/api/admin/applications/stats")로 교체하면 됩니다.
// 이 함수를 호출하는 페이지(app/admin/applicants/page.tsx)는 변경할 필요가 없습니다.
export async function fetchApplicantStats(): Promise<
  AdminApiResult<ApplicantStats>
> {
  return { ok: true, message: "mock 데이터입니다.", data: mockApplicantStats };
}
