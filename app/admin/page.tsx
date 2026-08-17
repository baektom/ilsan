"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { getCurrentProfile, logout } from "../../lib/supabase/profiles";
import type { Profile } from "../../lib/supabase/types";

export default function AdminPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 관리자 화면을 확장할 때도 반드시 role이 admin인지 먼저 확인해야 합니다.
    // 브라우저 화면을 숨기는 것만으로는 보안이 되지 않으므로 DB의 RLS 정책도 함께 추가하세요.
    void getCurrentProfile(supabase, "admin").then((currentProfile) => {
      if (!currentProfile) {
        router.replace("/admin/login");
        return;
      }
      setProfile(currentProfile);
      setLoading(false);
    });
  }, [router, supabase]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">관리자 계정 확인 중…</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-16">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-bold text-blue-600">관리자 전용</p>
        <h1 className="mt-2 text-3xl font-black">관리자 페이지</h1>
        <p className="mt-4 text-gray-600">{profile?.name ?? profile?.login_id} 계정으로 로그인했습니다.</p>
        <p className="mt-6 rounded-2xl bg-gray-50 p-5 text-sm leading-6 text-gray-600">
          현재는 관리자 계정 분리와 접근 제어만 구현되어 있습니다. 이후 이 화면에 개인 호스트 승인 및 기업 검증 결과 관리 기능을 연결하면 됩니다.
        </p>
        <button
          className="mt-8 rounded-xl border border-gray-300 px-5 py-3 font-bold"
          onClick={async () => {
            await logout(supabase);
            router.replace("/admin/login");
          }}
        >
          로그아웃
        </button>
      </section>
    </main>
  );
}
