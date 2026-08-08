import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 요청자의 로그인 세션으로 동작하는 서버 전용 Supabase 클라이언트입니다.
// RLS가 그대로 적용되며, app/api/admin/* Route Handler에서
// "지금 이 요청을 보낸 사용자가 누구인지"를 확인할 때 사용합니다.
//
// lib/supabase/client.ts(브라우저 전용)와 이름은 같지만 경로로 구분됩니다.
// 서비스 롤 클라이언트는 이 파일이 아니라 lib/supabase/admin.ts에 있습니다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출되면 쓰기가 실패할 수 있습니다.
            // 세션 갱신은 미들웨어가 담당하는 구조가 아니라면 무시해도 안전합니다.
          }
        },
      },
    }
  );
}
