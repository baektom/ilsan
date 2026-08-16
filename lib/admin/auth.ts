import type { AdminProfile } from "./types";
import { mockAdminProfile } from "./mockData";

const ADMIN_MOCK_SESSION_KEY = "moadream_admin_mock_session";

// ---------------------------------------------------------------------------
// 개발용 mock 관리자 인증입니다. 지금 단계에서는 Supabase에 전혀 의존하지 않고
// 브라우저 sessionStorage 플래그만으로 로그인 상태를 흉내 냅니다.
//
// admin_users 테이블 + get_current_admin_profile() RPC가 Supabase에 준비되면
// 아래 함수들 내부에서 (필요하다면 lib/supabase/client.ts의 createClient()를
// 직접 호출해) 실제 조회로 교체하세요. 호출부(app/admin/layout.tsx,
// app/admin/components/AdminHeader.tsx, app/admin/login/page.tsx)는 함수
// 시그니처가 그대로이므로 수정할 필요가 없습니다.
//   getCurrentAdmin  -> createClient().rpc("get_current_admin_profile") 결과 반환
//   adminMockLogin   -> createClient().auth.signInWithPassword 후 관리자 재확인
//   adminLogout      -> createClient().auth.signOut()
// 실제 배포 전에는 반드시 교체해야 합니다.
// ---------------------------------------------------------------------------

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  if (typeof window === "undefined") return null;

  const hasMockSession = window.sessionStorage.getItem(ADMIN_MOCK_SESSION_KEY);
  return hasMockSession ? mockAdminProfile : null;
}

export async function adminMockLogin(
  loginId: string,
  password: string
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "브라우저에서만 로그인할 수 있습니다." };
  }

  // TODO: 실제 연동 시 createClient().auth.signInWithPassword 후 getCurrentAdmin으로
  // 관리자 여부를 재확인하고, 아니면 즉시 signOut 처리하도록 교체하세요.
  if (loginId === "admin" && password === "admin1234") {
    window.sessionStorage.setItem(ADMIN_MOCK_SESSION_KEY, "1");
    return { ok: true, message: "로그인되었습니다. (개발용 mock 계정)" };
  }

  return { ok: false, message: "아이디 또는 비밀번호를 확인해주세요." };
}

export async function adminLogout(): Promise<void> {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_MOCK_SESSION_KEY);
}
