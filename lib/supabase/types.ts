export type AccountRole = "tester" | "host";

export type UserRole = AccountRole | "admin" | null;

export type HostApprovalStatus =
  | "not_applicable"
  | "pending"
  | "approved"
  | "rejected";

export type BannerPlacement = "home";

// 관리자 페이지에서 배너 목록/등록 폼을 만들 때 이 타입을 그대로 사용하면 됩니다.
export type BannerRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  button_label: string | null;
  background_color: string;
  text_color: string;
  placement: BannerPlacement;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TestStatus = "모집중" | "마감";

export type ApplicationStatus = "대기" | "수락" | "거절";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  login_id: string | null;
  role: UserRole;
  host_approval_status: HostApprovalStatus;
};

export type TestRow = {
  id: string;
  host_id: string;
  title: string;
  company_name: string | null;
  category: string;
  reward: string;
  target_people: number;
  location: string | null;
  period_start: string | null;
  period_end: string | null;
  description: string;
  status: TestStatus;
  created_at: string;
};

export type ApplicationRow = {
  id: string;
  test_id: string;
  tester_id: string;
  applicant_name: string;
  age: number | null;
  region: string | null;
  phone: string | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type ApplicationWithTest = ApplicationRow & {
  test: TestRow | null;
};

export type CreateTestInput = {
  title: string;
  companyName: string;
  category: string;
  reward: string;
  targetPeople: number;
  location: string;
  periodStart: string;
  periodEnd: string;
  description: string;
};

export type CreateApplicationInput = {
  testId: string;
  applicantName: string;
  age: number | null;
  region: string;
  phone: string;
  message: string;
};
