export type UserRole = "tester" | "host" | null;

export type TestStatus = "모집중" | "마감";

export type ApplicationStatus = "대기" | "수락" | "거절";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  login_id: string | null;
  role: UserRole;
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
