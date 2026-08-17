"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { getMyApplications } from "../../../lib/supabase/applications";
import { getCurrentProfile, logout } from "../../../lib/supabase/profiles";
import type {
  ApplicationStatus,
  ApplicationWithTest,
  Profile,
} from "../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../components/AuthModal";

const applicationStatusStyle: Record<ApplicationStatus, string> = {
  대기: "bg-gray-100 text-gray-600",
  수락: "bg-green-50 text-green-700",
  거절: "bg-red-50 text-red-600",
};

const applicationStatusLabel: Record<ApplicationStatus, string> = {
  대기: "대기중",
  수락: "승인",
  거절: "거절",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function formatPeriod(application: ApplicationWithTest) {
  const test = application.test;
  if (!test?.period_start && !test?.period_end) return "기간 미정";
  return `${test.period_start ?? "미정"} ~ ${test.period_end ?? "미정"}`;
}

export default function TesterMyPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");
  const [pageError, setPageError] = useState("");

  const [appliedTests, setAppliedTests] = useState<ApplicationWithTest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"전체" | ApplicationStatus>(
    "전체"
  );

  const loadProfile = useCallback(async () => {
    setPageError("");
    try {
      const currentProfile = await getCurrentProfile(supabase, "tester");
      setProfile(currentProfile);
      setAppliedTests(currentProfile ? await getMyApplications(supabase) : []);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "신청 내역을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadProfile]);

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout(supabase);
    setProfile(null);
    setAppliedTests([]);
    router.push("/tests");
  };

  const visibleAppliedTests = appliedTests.filter((test) =>
    statusFilter === "전체" ? true : test.status === statusFilter
  );

  const completedTests = appliedTests.filter(
    (application) =>
      application.status === "수락" && application.test?.status === "마감"
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
        <p className="text-gray-500">마이페이지를 불러오는 중...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8fbff] px-6 text-center">
        <p className="text-lg font-bold">로그인이 필요한 페이지예요.</p>
        <button
          onClick={() => openAuthModal("login")}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
        >
          로그인하기
        </button>

        {authModalOpen && (
          <AuthModal
            initialMode={authInitialMode}
            accountRole="tester"
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={loadProfile}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/tests")}
            className="text-2xl font-black tracking-tight text-blue-600"
          >
            모아드림 테스트
          </button>

          <button
            onClick={() => router.push("/tests")}
            className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            공고 목록으로
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
          마이페이지
        </p>
        <h1 className="mb-8 text-4xl font-black md:text-5xl">
          내 신청 현황을 확인해요
        </h1>

        {/* 1. 프로필 영역 — Supabase profiles 테이블에서 실제 조회 */}
        <div className="mb-8 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-blue-100">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-blue-600">테스터 계정</p>
              <h2 className="mt-1 text-2xl font-black">
                {profile.name ?? "이름 미설정"}님
              </h2>
              {profile.login_id && (
                <p className="mt-2 text-sm text-gray-500">
                  @{profile.login_id}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
              <p className="mt-3 text-sm text-gray-500">
                {profile.age ? `${profile.age}세` : "나이 미입력"} ·{" "}
                {profile.region || "지역 미입력"} ·{" "}
                {profile.phone || "연락처 미입력"}
              </p>
            </div>

            <div className="flex h-fit gap-2">
              <button
                onClick={() => router.push("/tests/mypage/edit")}
                className="rounded-2xl border border-blue-200 bg-white px-5 py-3 font-bold text-blue-700 hover:bg-blue-50"
              >
                프로필 수정
              </button>
              <button
                onClick={handleLogout}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-600 hover:bg-gray-50"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* 2. 내가 신청한 테스트 목록/상태 */}
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          {pageError && (
            <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {pageError}
            </p>
          )}
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-black">신청한 테스트</h2>

            <div className="flex gap-2">
              {(["전체", "대기", "수락", "거절"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    statusFilter === filter
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter === "전체" ? filter : applicationStatusLabel[filter]}
                </button>
              ))}
            </div>
          </div>

          {visibleAppliedTests.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              해당하는 신청 내역이 없어요.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleAppliedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {test.test?.category ?? "카테고리 미정"}
                    </span>
                    <p className="font-bold">
                      {test.test?.title ?? "삭제되었거나 조회할 수 없는 테스트"}
                    </p>
                    <p className="text-sm text-gray-500">
                      신청일 {formatDate(test.created_at)}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${applicationStatusStyle[test.status]}`}
                  >
                    {applicationStatusLabel[test.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. 참여 완료한 테스트 히스토리 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-black">참여 완료 히스토리</h2>

          {completedTests.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              아직 완료한 테스트가 없어요.
            </p>
          ) : (
            <div className="space-y-3">
              {completedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                      {test.test?.category ?? "카테고리 미정"}
                    </span>
                    <p className="font-bold">
                      {test.test?.title ?? "삭제되었거나 조회할 수 없는 테스트"}
                    </p>
                    <p className="text-sm text-gray-500">{formatPeriod(test)}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {test.test?.reward ?? "보상 정보 없음"}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      alert("다음 단계에서 후기 작성 기능을 연결할 예정입니다.")
                    }
                    className="w-fit rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    후기 작성하기
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}