"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import {
  getApplicationsForHostTests,
  updateApplicationStatus,
} from "../../../lib/supabase/applications";
import { getCurrentProfile, logout } from "../../../lib/supabase/profiles";
import { getMyTests } from "../../../lib/supabase/tests";
import type {
  ApplicationRow,
  ApplicationStatus,
  Profile,
  TestRow,
  TestStatus,
} from "../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../components/AuthModal";

const statusStyle: Record<TestStatus, string> = {
  모집중: "bg-green-50 text-green-700",
  마감: "bg-gray-100 text-gray-500",
};

const applicantStatusStyle: Record<ApplicationStatus, string> = {
  대기: "bg-gray-100 text-gray-600",
  수락: "bg-green-50 text-green-700",
  거절: "bg-red-50 text-red-600",
};

const applicantStatusLabel: Record<ApplicationStatus, string> = {
  대기: "대기중",
  수락: "승인",
  거절: "거절",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function HostMyPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");
  const [pageError, setPageError] = useState("");
  const [updatingApplicantId, setUpdatingApplicantId] = useState<string | null>(null);

  const [tests, setTests] = useState<TestRow[]>([]);
  const [applicants, setApplicants] = useState<ApplicationRow[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [applicantFilter, setApplicantFilter] = useState<
    "전체" | ApplicationStatus
  >("전체");

  const loadProfile = useCallback(async () => {
    setPageError("");
    try {
      const currentProfile = await getCurrentProfile(supabase);
      setProfile(currentProfile);

      if (!currentProfile) {
        setTests([]);
        setApplicants([]);
        setSelectedTestId(null);
        return;
      }

      const hostTests = await getMyTests(supabase);
      setTests(hostTests);
      setSelectedTestId((current) =>
        current && hostTests.some((test) => test.id === current)
          ? current
          : (hostTests[0]?.id ?? null)
      );

      const hostApplications = await getApplicationsForHostTests(
        supabase,
        hostTests.map((test) => test.id)
      );
      setApplicants(hostApplications);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "호스트 데이터를 불러오지 못했습니다."
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
    setTests([]);
    setApplicants([]);
    router.push("/host");
  };

  const updateApplicantStatus = async (
    id: string,
    status: ApplicationStatus
  ) => {
    setUpdatingApplicantId(id);
    const result = await updateApplicationStatus(supabase, id, status);
    setUpdatingApplicantId(null);

    if (!result.ok) {
      setPageError(result.message);
      return;
    }

    setApplicants((current) =>
      current.map((applicant) =>
        applicant.id === id ? { ...applicant, status } : applicant
      )
    );
  };

  const visibleApplicants = applicants.filter((applicant) => {
    if (applicant.test_id !== selectedTestId) return false;
    if (applicantFilter === "전체") return true;
    return applicant.status === applicantFilter;
  });

  const selectedTest = tests.find((test) => test.id === selectedTestId);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff]">
        <p className="text-gray-500">마이페이지를 불러오는 중...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbf9ff] px-6 text-center">
        <p className="text-lg font-bold">로그인이 필요한 페이지예요.</p>
        <button
          onClick={() => openAuthModal("login")}
          className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-700"
        >
          로그인하기
        </button>

        {authModalOpen && (
          <AuthModal
            initialMode={authInitialMode}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={loadProfile}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/host")}
            className="text-2xl font-black tracking-tight text-purple-600"
          >
            모아드림 호스트
          </button>

          <button
            onClick={() => router.push("/host")}
            className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700 hover:bg-purple-100"
          >
            호스트 홈으로
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-4 inline-block rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
          마이페이지
        </p>
        <h1 className="mb-8 text-4xl font-black md:text-5xl">
          내 정보와 테스트를 관리해요
        </h1>

        {pageError && (
          <p className="mb-8 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {pageError}
          </p>
        )}

        {/* 1. 프로필 영역 — Supabase profiles 테이블에서 실제 조회 */}
        <div className="mb-8 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-purple-100">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-purple-600">호스트 계정</p>
              <h2 className="mt-1 text-2xl font-black">
                {profile.name ?? "이름 미설정"}님
              </h2>
              {profile.login_id && (
                <p className="mt-2 text-sm text-gray-500">
                  @{profile.login_id}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
            </div>

            <div className="flex h-fit gap-2">
              <button
                onClick={() =>
                  alert("다음 단계에서 Supabase 프로필 수정 기능을 연결할 예정입니다.")
                }
                className="rounded-2xl border border-purple-200 bg-white px-5 py-3 font-bold text-purple-700 hover:bg-purple-50"
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

        {/* 2. 내가 등록한 테스트 목록/현황 */}
        <section className="mb-8">
          <h2 className="mb-5 text-2xl font-black">내가 등록한 테스트</h2>

          {tests.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
              아직 등록한 테스트가 없어요.
            </div>
          ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {tests.map((test) => (
              <button
                key={test.id}
                onClick={() => {
                  setSelectedTestId(test.id);
                  setApplicantFilter("전체");
                }}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedTestId === test.id
                    ? "border-purple-400 bg-purple-50 ring-2 ring-purple-200"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span
                  className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${statusStyle[test.status]}`}
                >
                  {test.status}
                </span>

                <h3 className="mb-3 font-bold">{test.title}</h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    신청자 {applicants.filter((applicant) => applicant.test_id === test.id).length}/{test.target_people}명
                  </p>
                  <p>{test.reward}</p>
                </div>
              </button>
            ))}
          </div>
          )}
        </section>

        {/* 3. 신청자 관리 (승인/거절) */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-black">
              신청자 관리
              {selectedTest && (
                <span className="ml-2 text-base font-medium text-gray-500">
                  · {selectedTest.title}
                </span>
              )}
            </h2>

            <div className="flex gap-2">
              {(["전체", "대기", "수락", "거절"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setApplicantFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    applicantFilter === filter
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter === "전체" ? filter : applicantStatusLabel[filter]}
                </button>
              ))}
            </div>
          </div>

          {visibleApplicants.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              해당하는 신청자가 없어요.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleApplicants.map((applicant) => (
                <div
                  key={applicant.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-bold">{applicant.applicant_name}</p>
                    <p className="text-sm text-gray-500">
                      신청일 {formatDate(applicant.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${applicantStatusStyle[applicant.status]}`}
                    >
                      {applicantStatusLabel[applicant.status]}
                    </span>

                    <button
                      onClick={() => void updateApplicantStatus(applicant.id, "수락")}
                      disabled={applicant.status === "수락" || updatingApplicantId === applicant.id}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => void updateApplicantStatus(applicant.id, "거절")}
                      disabled={applicant.status === "거절" || updatingApplicantId === applicant.id}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
