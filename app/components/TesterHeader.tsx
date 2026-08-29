"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logout } from "../../lib/supabase/profiles";
import type { Profile } from "../../lib/supabase/types";
import { AuthMode } from "./AuthModal";

type TesterHeaderProps = {
  supabase: SupabaseClient;
  profile: Profile | null;
  onProfileChange: (profile: Profile | null) => void;
  onOpenAuth: (mode: AuthMode) => void;
};

// 테스트 목록/마이페이지/전체보기 등 테스터 쪽 페이지에서 공통으로 쓰는 헤더입니다.
// 홈 화면(tests/page.tsx)의 헤더·메뉴와 항목을 동일하게 맞춰서,
// 어느 페이지에 있든 같은 버튼으로 같은 곳으로 이동할 수 있게 합니다.
export default function TesterHeader({
  supabase,
  profile,
  onProfileChange,
  onOpenAuth,
}: TesterHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout(supabase);
    onProfileChange(null);
    setMenuOpen(false);
  };

  const handleSwitchToHost = async () => {
    if (profile?.roles.includes("host")) {
      setMenuOpen(false);
      router.push("/host");
      return;
    }

    const targetAuthMode: AuthMode = profile ? "signup" : "login";
    await logout(supabase);
    onProfileChange(null);
    setMenuOpen(false);
    router.push(`/host?auth=${targetAuthMode}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/tests")}
            className="text-2xl font-black tracking-tight text-blue-600"
          >
            모아드림 테스트
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchToHost}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-xl text-purple-700 transition hover:bg-purple-100"
              aria-label="호스트로 전환하기"
              title="호스트로 전환하기"
            >
              🏢
            </button>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-2xl text-blue-700 transition hover:bg-blue-100"
              aria-label="메뉴 열기"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/20"
            onClick={() => setMenuOpen(false)}
            aria-label="메뉴 닫기 배경"
          />

          <aside className="absolute right-0 top-0 h-full w-[320px] overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-bold">메뉴</h2>

              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg hover:bg-gray-200"
                aria-label="메뉴 닫기"
              >
                ×
              </button>
            </div>

            {profile ? (
              <div className="mb-6 rounded-3xl bg-blue-50 p-5">
                <p className="text-sm text-blue-600">마이페이지</p>
                <h3 className="mt-1 text-xl font-bold">
                  {profile.name ?? "테스터"}님
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  @{profile.login_id ?? "tester"}
                </p>
                <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
              </div>
            ) : (
              <div className="mb-6 rounded-3xl bg-blue-50 p-5">
                <p className="text-sm font-bold text-blue-600">
                  로그인 전 상태
                </p>
                <h3 className="mt-2 text-xl font-black">
                  로그인하면 신청과 마이페이지를 이용할 수 있어요
                </h3>

                <div className="mt-5">
                  <button
                    onClick={() => onOpenAuth("login")}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    로그인
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (!profile) {
                    onOpenAuth("login");
                    return;
                  }

                  setMenuOpen(false);
                  router.push("/tests/mypage");
                }}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                👤 마이페이지
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/tests/list");
                }}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📋 공고 목록
              </button>

              <button
                onClick={() => {
                  if (!profile) {
                    onOpenAuth("login");
                    return;
                  }

                  setMenuOpen(false);
                  router.push("/tests/mypage");
                }}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                ✅ 내 신청 현황
              </button>

              {profile ? (
                <button
                  onClick={handleLogout}
                  className="w-full rounded-2xl bg-gray-900 px-5 py-4 text-left font-semibold text-white hover:bg-gray-700"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuth("signup")}
                  className="w-full rounded-2xl bg-gray-900 px-5 py-4 text-left font-semibold text-white hover:bg-gray-700"
                >
                  회원가입
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}