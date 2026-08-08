export type AdminProfile = {
  id: string;
  email: string;
  name: string | null;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  loginId: string | null;
  role: "tester" | "host";
  createdAt: string;
};

export type AdminTestRow = {
  id: string;
  title: string;
  companyName: string | null;
  status: "모집중" | "마감";
  applicantCount: number;
  targetPeople: number;
  createdAt: string;
};

export type CompanyApprovalStatus = "승인" | "대기" | "반려";

export type AdminCompanyRow = {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string;
  approvalStatus: CompanyApprovalStatus;
  testCount: number;
  createdAt: string;
};

export type ApplicantStatusCount = {
  status: "대기" | "수락" | "거절";
  count: number;
};

export type ApplicantStats = {
  totalApplications: number;
  byStatus: ApplicantStatusCount[];
  byTest: { testId: string; testTitle: string; count: number }[];
};

export type AdminNoticeRow = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

export type CreateAdminNoticeInput = {
  title: string;
  content: string;
};

// 관리자 API 공용 반환 형태입니다.
// 기존 lib/supabase/*.ts의 { ok, message } 규칙에 data만 추가한 형태라
// app/api/admin/*/route.ts로 교체될 때도 이 타입을 그대로 씁니다.
export type AdminApiResult<T> = {
  ok: boolean;
  message: string;
  data?: T;
};
