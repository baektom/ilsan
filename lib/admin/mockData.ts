import type {
  AdminCompanyRow,
  AdminNoticeRow,
  AdminProfile,
  AdminTestRow,
  AdminUserRow,
  ApplicantStats,
} from "./types";

// 개발용 mock 관리자 프로필입니다.
// admin_users 테이블/RPC가 준비되면 lib/admin/auth.ts에서 이 값을 실제 조회 결과로 교체하세요.
export const mockAdminProfile: AdminProfile = {
  id: "mock-admin-id",
  email: "admin@moadream.com",
  name: "모아드림 관리자",
};

// /admin/users 화면 확인용 mock 회원 목록입니다.
// 실제 연동 시 app/api/admin/users/route.ts가 이 배열과 같은 형태의 데이터를 반환하면 됩니다.
export const mockUsers: AdminUserRow[] = [
  {
    id: "user-1",
    email: "minji@example.com",
    name: "김민지",
    loginId: "minji_kim",
    role: "tester",
    createdAt: "2026-07-29T09:00:00.000Z",
  },
  {
    id: "user-2",
    email: "seojun@example.com",
    name: "이서준",
    loginId: "seojun_lee",
    role: "tester",
    createdAt: "2026-07-29T10:30:00.000Z",
  },
  {
    id: "user-3",
    email: "admin@beautylab.co.kr",
    name: "뷰티랩",
    loginId: "beautylab",
    role: "host",
    createdAt: "2026-07-28T08:15:00.000Z",
  },
  {
    id: "user-4",
    email: "haneul@example.com",
    name: "박하늘",
    loginId: "haneul_park",
    role: "tester",
    createdAt: "2026-07-28T14:45:00.000Z",
  },
  {
    id: "user-5",
    email: "contact@dreamgames.co.kr",
    name: "드림게임즈",
    loginId: "dreamgames",
    role: "host",
    createdAt: "2026-07-25T11:20:00.000Z",
  },
];

// /admin/companies 화면 확인용 mock 기업(호스트) 목록입니다.
// 실제 연동 시 app/api/admin/companies/route.ts가 이 배열과 같은 형태의 데이터를 반환하면 됩니다.
export const mockCompanies: AdminCompanyRow[] = [
  {
    id: "company-1",
    companyName: "뷰티랩",
    contactName: "김서연",
    email: "admin@beautylab.co.kr",
    approvalStatus: "대기",
    testCount: 1,
    createdAt: "2026-07-28T08:15:00.000Z",
  },
  {
    id: "company-2",
    companyName: "드림게임즈",
    contactName: "이도윤",
    email: "contact@dreamgames.co.kr",
    approvalStatus: "승인",
    testCount: 2,
    createdAt: "2026-07-25T11:20:00.000Z",
  },
  {
    id: "company-3",
    companyName: "에듀테크",
    contactName: "박지우",
    email: "contact@edutech.co.kr",
    approvalStatus: "승인",
    testCount: 1,
    createdAt: "2026-07-20T09:40:00.000Z",
  },
  {
    id: "company-4",
    companyName: "페이플러스",
    contactName: "최하준",
    email: "contact@payplus.co.kr",
    approvalStatus: "대기",
    testCount: 0,
    createdAt: "2026-07-30T13:10:00.000Z",
  },
  {
    id: "company-5",
    companyName: "테크노바",
    contactName: "정수아",
    email: "contact@technova.co.kr",
    approvalStatus: "반려",
    testCount: 0,
    createdAt: "2026-07-15T09:20:00.000Z",
  },
];

// /admin/tests 화면 확인용 mock 테스트 목록입니다.
// 실제 연동 시 app/api/admin/tests/route.ts가 이 배열과 같은 형태의 데이터를 반환하면 됩니다.
export const mockTests: AdminTestRow[] = [
  {
    id: "test-1",
    title: "신규 모바일 게임 CBT 참가자 모집",
    companyName: "드림게임즈",
    status: "모집중",
    applicantCount: 128,
    targetPeople: 150,
    createdAt: "2026-07-29T09:00:00.000Z",
  },
  {
    id: "test-2",
    title: "민감성 피부용 스킨케어 체험단",
    companyName: "뷰티랩",
    status: "모집중",
    applicantCount: 54,
    targetPeople: 100,
    createdAt: "2026-07-28T08:15:00.000Z",
  },
  {
    id: "test-3",
    title: "AI 학습 도우미 서비스 사용성 테스트",
    companyName: "에듀테크",
    status: "모집중",
    applicantCount: 87,
    targetPeople: 120,
    createdAt: "2026-07-20T09:40:00.000Z",
  },
  {
    id: "test-4",
    title: "간편결제 앱 신규 기능 테스트",
    companyName: "페이플러스",
    status: "마감",
    applicantCount: 203,
    targetPeople: 200,
    createdAt: "2026-06-15T11:20:00.000Z",
  },
  {
    id: "test-5",
    title: "수분크림 7일 사용 테스트",
    companyName: "뷰티랩",
    status: "마감",
    applicantCount: 60,
    targetPeople: 60,
    createdAt: "2026-06-01T10:00:00.000Z",
  },
];

// /admin/applicants 화면 확인용 mock 지원자 통계입니다.
// mockTests의 applicantCount 합계와 맞춰뒀습니다.
// 실제 연동 시 app/api/admin/applications/stats/route.ts가 이 형태의 데이터를 반환하면 됩니다.
export const mockApplicantStats: ApplicantStats = {
  totalApplications: 532,
  byStatus: [
    { status: "대기", count: 45 },
    { status: "수락", count: 380 },
    { status: "거절", count: 107 },
  ],
  byTest: [
    { testId: "test-1", testTitle: "신규 모바일 게임 CBT 참가자 모집", count: 128 },
    { testId: "test-4", testTitle: "간편결제 앱 신규 기능 테스트", count: 203 },
    { testId: "test-3", testTitle: "AI 학습 도우미 서비스 사용성 테스트", count: 87 },
    { testId: "test-5", testTitle: "수분크림 7일 사용 테스트", count: 60 },
    { testId: "test-2", testTitle: "민감성 피부용 스킨케어 체험단", count: 54 },
  ],
};

// /admin/notices 화면 확인용 mock 공지사항 목록입니다.
// 실제 연동 시 app/api/admin/notices/route.ts가 이 배열과 같은 형태의 데이터를 주고받으면 됩니다.
export const mockNotices: AdminNoticeRow[] = [
  {
    id: "notice-1",
    title: "8월 서비스 점검 안내",
    content: "8월 10일 새벽 2시~4시 서버 점검이 진행됩니다. 해당 시간에는 서비스 이용이 제한됩니다.",
    createdAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "notice-2",
    title: "호스트 승인 절차 변경 안내",
    content: "기업 회원가입 후 관리자 승인이 완료되어야 테스트 등록이 가능하도록 절차가 변경되었습니다.",
    createdAt: "2026-07-20T10:30:00.000Z",
  },
];
