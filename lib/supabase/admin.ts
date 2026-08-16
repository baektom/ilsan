import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 서비스 롤(비밀) 키로 RLS를 우회하는 관리자 전용 클라이언트입니다.
//
// 반드시 app/api/admin/*/route.ts(서버 전용 Route Handler) 안에서만 import하세요.
// "use client" 파일에서는 절대 import하지 마세요 — SUPABASE_SERVICE_ROLE_KEY는
// NEXT_PUBLIC_* 접두사가 없어 브라우저 번들에 포함되지 않지만, 이 파일 자체를
// 클라이언트 코드에서 import하는 실수를 막기 위해 물리적으로 별도 파일로 뒀습니다.
//
// 이 클라이언트를 생성하기 전에, 호출하는 Route Handler는 항상 먼저
// lib/supabase/server.ts의 createClient()로 "요청자가 실제 관리자인지"를
// 확인해야 합니다. 서비스 롤이라는 이유로 인증 확인 없이 데이터를 반환해서는 안 됩니다.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. .env.local(로컬) 또는 배포 환경변수에 추가해주세요."
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
