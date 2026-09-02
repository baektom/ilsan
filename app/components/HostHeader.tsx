"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logout } from "../../lib/supabase/profiles";
import type { Profile } from "../../lib/supabase/types";
import { AuthMode } from "./AuthModal";

type HostHeaderProps = {
  supabase: SupabaseClient;
  profile: Profile | null;
  hostCanAct: boolean;
  onProfileChange: (profile: Profile | null) => void;
  onOpenAuth: (mode: AuthMode) => void;
};

// 호스트 마이페이지/지원자 확인/테스트 등록 등 호스트 쪽 페이지에서 공통으로 쓰는 헤더입니다.
// 홈 화면(host/page.tsx)의 헤더·메뉴와 항목을 동일하게 맞췄습니다.
export default function HostHeader({
  supabase,
  profile,
  hostCanAct,
  onProfileChange,
  onOpenAuth,
}: HostHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout(supabase);
    onProfileChange(null);
    setMenuOpen(false);
  };

  const handleSwitchToTester = async () => {
    if (profile?.roles.includes("tester")) {
      setMenuOpen(false);
      router.push("/tests");
      return;
    }

    const targetAuthMode: AuthMode = profile ? "signup" : "login";
    await logout(supabase);
    onProfileChange(null);
    setMenuOpen(false);
    router.push(`/tests?auth=${targetAuthMode}`);
  };

  const goToApplicants = () => {
    if (!profile) {
      onOpenAuth("login");
      return;
    }

    if (!hostCanAct) {
      alert("관리자 승인 후 호스트 기능을 이용할 수 있습니다.");
      return;
    }

    setMenuOpen(false);
    router.push("/host/applicants");
  };

  const goToCreateTest = () => {
    if (!profile) {
      onOpenAuth("login");
      return;
    }

    if (!hostCanAct) {
      alert("관리자 승인 후 테스트를 등록할 수 있습니다.");
      return;
    }

    setMenuOpen(false);
    router.push("/host/tests/new");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/host")}
            className="text-2xl font-black tracking-tight text-purple-600"
          >
            모아드림 호스트
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchToTester}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-xl text-blue-700 transition hover:bg-blue-100"
              aria-label="테스터로 전환하기"
              title="테스터로 전환하기"
            >
              🙋
            </button>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-2xl text-purple-700 transition hover:bg-purple-100"
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
              <div className="mb-6 rounded-3xl bg-purple-50 p-5">
                <p className="text-sm text-purple-600">호스트 계정</p>
                <h3 className="mt-1 text-xl font-bold">
                  {profile.name ?? "호스트"}님
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  @{profile.login_id ?? "host"}
                </p>
                <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
              </div>
            ) : (
              <div className="mb-6 rounded-3xl bg-purple-50 p-5">
                <p className="text-sm font-bold text-purple-600">
                  로그인 전 상태
                </p>
                <h3 className="mt-2 text-xl font-black">
                  로그인하면 테스트를 등록하고 지원자를 관리할 수 있어요
                </h3>

                <div className="mt-5">
                  <button
                    onClick={() => onOpenAuth("login")}
                    className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white hover:bg-purple-700"
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
                  if (!hostCanAct) {
                    alert("관리자 승인 후 호스트 마이페이지를 이용할 수 있습니다.");
                    return;
                  }
                  router.push("/host/mypage");
                }}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                👤 호스트 마이페이지
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/host");
                }}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📊 내 테스트 진행 현황
              </button>

              <button
                onClick={goToCreateTest}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📝 테스트 등록
              </button>

              <button
                onClick={goToApplicants}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                👥 지원자 확인
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