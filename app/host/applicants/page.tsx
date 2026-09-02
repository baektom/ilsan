"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import {
  getApplicationsForHostTests,
  markApplicationsViewed,
  updateApplicationStatus,
} from "../../../lib/supabase/applications";
import {
  getCurrentProfile,
  isApprovedHost,
} from "../../../lib/supabase/profiles";
import { getMyTests } from "../../../lib/supabase/tests";
import type {
  ApplicationRow,
  ApplicationStatus,
  Profile,
  TestRow,
} from "../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../components/AuthModal";
import HostHeader from "../../components/HostHeader";

export default function HostApplicantsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff]">
          <p className="text-gray-500">불러오는 중...</p>
        </main>
      }
    >
      <HostApplicantsContent />
    </Suspense>
  );
}

function HostApplicantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testIdFilter = searchParams.get("testId");

  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // "신규"는 호스트가 아직 한 번도 열어보지 않은 지원 건입니다.
  // 이 화면을 처음 연 시점 기준으로 신규 목록을 고정해두고,
  // 그 목록이 화면에 뜨는 순간 서버에는 열람 처리를 해둡니다(다음 방문부터는 신규에서 빠짐).
  const [newApplicationIds, setNewApplicationIds] = useState<Set<string>>(
    new Set()
  );
  const [viewMode, setViewMode] = useState<"new" | "all">("new");
  const [statusFilter, setStatusFilter] = useState<"전체" | ApplicationStatus>(
    "전체"
  );

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const loadData = useCallback(async () => {
    const currentProfile = await getCurrentProfile(supabase, "host");
    setProfile(currentProfile);

    if (!currentProfile || !isApprovedHost(currentProfile)) {
      setTests([]);
      setApplications([]);
      setLoading(false);
      return;
    }

    const myTests = await getMyTests(supabase);
    const testIds = myTests.map((test) => test.id);
    const hostApplications = await getApplicationsForHostTests(
      supabase,
      testIds
    );

    setTests(myTests);
    setApplications(hostApplications);
    setLoading(false);

    // 지금 시점에 아직 안 본 것들을 "신규"로 기억해두고, 화면에 뜬 김에 열람 처리합니다.
    const unviewedIds = hostApplications
      .filter((application) => !application.viewed_by_host)
      .map((application) => application.id);

    setNewApplicationIds(new Set(unviewedIds));

    if (unviewedIds.length > 0) {
      void markApplicationsViewed(supabase, unviewedIds);
    }
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadData]);

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const selectedTest = tests.find((test) => test.id === testIdFilter);

  const testFilteredApplications = useMemo(
    () =>
      testIdFilter
        ? applications.filter(
            (application) => application.test_id === testIdFilter
          )
        : applications,
    [applications, testIdFilter]
  );

  const visibleApplications = useMemo(() => {
    if (viewMode === "new") {
      return testFilteredApplications.filter((application) =>
        newApplicationIds.has(application.id)
      );
    }

    if (statusFilter === "전체") return testFilteredApplications;
    return testFilteredApplications.filter(
      (application) => application.status === statusFilter
    );
  }, [testFilteredApplications, viewMode, statusFilter, newApplicationIds]);

  // 지원자가 어떤 테스트에 지원했는지 테스트 제목을 찾아주는 함수입니다.
  const getTestTitle = (testId: string) => {
    return tests.find((test) => test.id === testId)?.title ?? "알 수 없는 테스트";
  };

  // 호스트가 지원자 상태를 대기 / 수락 / 거절로 변경하는 함수입니다.
  const handleApplicationStatusChange = async (
    applicationId: string,
    status: ApplicationStatus
  ) => {
    const result = await updateApplicationStatus(
      supabase,
      applicationId,
      status
    );

    alert(result.message);

    if (result.ok) {
      await loadData();
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff]">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (profile && !isApprovedHost(profile)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbf9ff] px-6 text-center">
        <p className="text-2xl font-black text-purple-700">호스트 승인 대기 중</p>
        <p className="text-gray-600">
          관리자 승인 후 지원자를 확인하고 관리할 수 있습니다.
        </p>
        <Link
          href="/host"
          className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-700"
        >
          호스트 홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] text-gray-900">
      {authModalOpen && (
        <AuthModal
          key={authInitialMode}
          initialMode={authInitialMode}
          accountRole="host"
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={async () => {
            setAuthModalOpen(false);
            await loadData();
          }}
        />
      )}

      <HostHeader
        supabase={supabase}
        profile={profile}
        hostCanAct={Boolean(isApprovedHost(profile))}
        onProfileChange={setProfile}
        onOpenAuth={openAuthModal}
      />

      <section className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        <button
          onClick={() => router.push("/host")}
          className="text-sm font-bold text-purple-600"
        >
          ← 호스트 홈으로
        </button>

        <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-sm font-bold text-purple-600">
                APPLICANTS
              </p>
              <h1 className="text-2xl font-black">
                {selectedTest ? `${selectedTest.title} ` : ""}
                {viewMode === "new" ? "신규 지원자" : "전체 지원자 확인"}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {viewMode === "new" ? (
                <button
                  onClick={() => setViewMode("all")}
                  className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700"
                >
                  전체 지원자 확인
                </button>
              ) : (
                <button
                  onClick={() => setViewMode("new")}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  신규 지원자만 보기
                </button>
              )}

              {testIdFilter && (
                <button
                  onClick={() => router.push("/host/applicants")}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  전체 테스트 보기
                </button>
              )}
            </div>
          </div>

          {viewMode === "all" && (
            <div className="mb-6 flex flex-wrap gap-2">
              {(["전체", "대기", "수락", "거절"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    statusFilter === status
                      ? "bg-purple-600 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}

          {!profile ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center">
              <p className="mb-5 text-gray-500">
                로그인하면 지원자 목록을 확인할 수 있습니다.
              </p>
              <button
                onClick={() => openAuthModal("login")}
                className="rounded-2xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
              >
                로그인하기
              </button>
            </div>
          ) : visibleApplications.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
              {viewMode === "new"
                ? "새로 들어온 지원이 없습니다."
                : selectedTest
                ? "이 테스트에는 아직 지원자가 없습니다."
                : "아직 지원자가 없습니다."}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleApplications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <p className="mb-2 text-sm font-bold text-purple-600">
                    {getTestTitle(application.test_id)}
                  </p>

                  <h3 className="mb-2 text-lg font-black">
                    {application.applicant_name}
                  </h3>

                  <p className="mb-3 text-sm text-gray-500">
                    나이: {application.age ?? "미입력"} · 지역:{" "}
                    {application.region ?? "미입력"} · 연락처:{" "}
                    {application.phone ?? "미입력"}
                  </p>

                  {application.message && (
                    <p className="mb-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                      {application.message}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                      현재 상태: {application.status}
                    </span>

                    <button
                      onClick={() =>
                        handleApplicationStatusChange(application.id, "수락")
                      }
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                    >
                      수락
                    </button>

                    <button
                      onClick={() =>
                        handleApplicationStatusChange(application.id, "거절")
                      }
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    >
                      거절
                    </button>

                    <button
                      onClick={() =>
                        handleApplicationStatusChange(application.id, "대기")
                      }
                      className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300"
                    >
                      대기
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}