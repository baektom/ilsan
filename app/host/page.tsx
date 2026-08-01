"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import {
  getApplicationsForHostTests,
  updateApplicationStatus,
} from "../../lib/supabase/applications";
import {
  getCurrentProfile,
  isApprovedHost,
  logout,
} from "../../lib/supabase/profiles";
import { createTest, getMyTests } from "../../lib/supabase/tests";
import type {
  ApplicationRow,
  ApplicationStatus,
  CreateTestInput,
  Profile,
  TestRow,
} from "../../lib/supabase/types";
import AuthModal, { AuthMode } from "../components/AuthModal";

type HostView = "dashboard" | "create" | "applicants";

type RewardType = "all" | "lottery";

type RegisteredTestView = {
  id: string;
  title: string;
  category: string;
  status: string;
  applicants: number;
  target: number;
  reward: string;
  periodEnd: string | null;
  progressPercent: number;
  daysLeftText: string;
};

function getDaysLeftText(periodEnd: string | null) {
  if (!periodEnd) {
    return "기간 미정";
  }

  const now = new Date();
  const endDate = new Date(`${periodEnd}T23:59:59`);
  const diffMs = endDate.getTime() - now.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil(diffMs / dayMs);

  if (daysLeft < 0) {
    return "종료됨";
  }

  if (daysLeft === 0) {
    return "오늘 종료";
  }

  return `${daysLeft}일 남음`;
}

function getProgressPercent(applicants: number, target: number) {
  if (!target || target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((applicants / target) * 100));
}

export default function HostPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [currentView, setCurrentView] = useState<HostView>("dashboard");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [selectedApplicantTestId, setSelectedApplicantTestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [category, setCategory] = useState("화장품");
  const [rewardType, setRewardType] = useState<RewardType>("all");
  const [allReward, setAllReward] = useState("");
  const [lotteryWinnerCount, setLotteryWinnerCount] = useState("");
  const [lotteryReward, setLotteryReward] = useState("");
  const [targetPeople, setTargetPeople] = useState("");
  const [location, setLocation] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadHostData = useCallback(async () => {
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
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadHostData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadHostData]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("auth") !== "login") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setAuthInitialMode("login");
      setAuthModalOpen(true);
      window.history.replaceState({}, "", "/host");
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const hostCanAct = isApprovedHost(profile);

  const registeredTests = useMemo<RegisteredTestView[]>(() => {
    return tests.map((test) => {
      const applicantCount = applications.filter(
        (application) => application.test_id === test.id
      ).length;

      return {
        id: test.id,
        title: test.title,
        category: test.category,
        status: test.status,
        applicants: applicantCount,
        target: test.target_people,
        reward: test.reward,
        periodEnd: test.period_end,
        progressPercent: getProgressPercent(applicantCount, test.target_people),
        daysLeftText: getDaysLeftText(test.period_end),
      };
    });
  }, [tests, applications]);

  const waitingApplicantsCount = applications.filter(
    (application) => application.status === "대기"
  ).length;

  const visibleApplications = useMemo(
    () =>
      selectedApplicantTestId
        ? applications.filter(
            (application) => application.test_id === selectedApplicantTestId
          )
        : applications,
    [applications, selectedApplicantTestId]
  );

  const selectedApplicantTest = tests.find(
    (test) => test.id === selectedApplicantTestId
  );

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
    setMenuOpen(false);
  };

  const moveToView = (view: HostView) => {
    if (!profile && view !== "dashboard") {
      openAuthModal("login");
      return;
    }

    if (profile && !hostCanAct && view !== "dashboard") {
      alert("관리자 승인 후 호스트 기능을 이용할 수 있습니다.");
      return;
    }

    setCurrentView(view);
    setMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openApplicantsForTest = (testId: string) => {
    setSelectedApplicantTestId(testId);
    moveToView("applicants");
  };

  const handleLogout = async () => {
    await logout(supabase);
    setProfile(null);
    setTests([]);
    setApplications([]);
    setCurrentView("dashboard");
    setMenuOpen(false);
  };

  const handleSwitchToTester = async () => {
    await logout(supabase);
    setProfile(null);
    setTests([]);
    setApplications([]);
    setMenuOpen(false);
    router.push("/tests?auth=login");
  };

  const handleCreateTest = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!profile) {
    openAuthModal("login");
    return;
  }

  if (!hostCanAct) {
    alert("관리자 승인 후 테스트를 등록할 수 있습니다.");
    return;
  }

  const targetNumber = Number(targetPeople);

  if (!targetNumber || Number.isNaN(targetNumber) || targetNumber < 30) {
    alert("모집 인원은 최소 30명 이상이어야 합니다.");
    return;
  }

  if (periodStart && periodEnd && periodStart > periodEnd) {
    alert("종료일은 시작일보다 빠를 수 없습니다.");
    return;
  }

  let finalReward = "";

  if (rewardType === "all") {
    if (!allReward.trim()) {
      alert("참가자 전원에게 제공할 보상 내용을 입력해주세요.");
      return;
    }

    finalReward = `전원 제공: ${allReward.trim()}`;
  }

  if (rewardType === "lottery") {
    const winnerCount = Number(lotteryWinnerCount);

    if (!winnerCount || Number.isNaN(winnerCount) || winnerCount <= 0) {
      alert("추첨 보상 인원을 올바르게 입력해주세요.");
      return;
    }

    if (winnerCount > targetNumber) {
      alert("추첨 보상 인원은 모집 인원보다 많을 수 없습니다.");
      return;
    }

    if (!lotteryReward.trim()) {
      alert("추첨으로 제공할 보상 내용을 입력해주세요.");
      return;
    }

    finalReward = `추첨 ${winnerCount}명: ${lotteryReward.trim()}`;
  }

  const input: CreateTestInput = {
    title,
    companyName,
    category,
    reward: finalReward,
    targetPeople: targetNumber,
    location,
    periodStart,
    periodEnd,
    description,
  };

  setSubmitting(true);
  const result = await createTest(supabase, input);
  setSubmitting(false);

  alert(result.message);

  if (!result.ok) {
    return;
  }

  setTitle("");
  setCompanyName("");
  setCategory("화장품");
  setRewardType("all");
  setAllReward("");
  setLotteryWinnerCount("");
  setLotteryReward("");
  setTargetPeople("");
  setLocation("");
  setPeriodStart("");
  setPeriodEnd("");
  setDescription("");

  await loadHostData();
  setCurrentView("dashboard");
};

  // 호스트가 지원자 상태를 대기 / 수락 / 거절로 변경하는 함수입니다.
  // 지원자 확인 화면의 수락, 거절, 대기 버튼에서 사용합니다.
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
      await loadHostData();
    }
  };

  // 지원자가 어떤 테스트에 지원했는지 테스트 제목을 찾아주는 함수입니다.
  const getTestTitle = (testId: string) => {
    return tests.find((test) => test.id === testId)?.title ?? "알 수 없는 테스트";
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-purple-50">
        <p className="text-gray-500">호스트 화면을 불러오는 중...</p>
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

          <aside className="absolute right-0 top-0 h-full w-[320px] bg-white p-6 shadow-2xl">
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
                    onClick={() => openAuthModal("login")}
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
                    openAuthModal("login");
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
                onClick={() => moveToView("dashboard")}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📊 내 테스트 진행 현황
              </button>

              <button
                onClick={() => moveToView("create")}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📝 테스트 등록
              </button>

              <button
                onClick={() => {
                  setSelectedApplicantTestId(null);
                  moveToView("applicants");
                }}
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
                  onClick={() => openAuthModal("signup")}
                  className="w-full rounded-2xl bg-gray-900 px-5 py-4 text-left font-semibold text-white hover:bg-gray-700"
                >
                  회원가입
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {authModalOpen && (
        <AuthModal
          key={authInitialMode}
          initialMode={authInitialMode}
          accountRole="host"
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={async () => {
            await loadHostData();
          }}
        />
      )}

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 rounded-[36px] bg-white p-8 shadow-sm ring-1 ring-purple-100 md:p-10">
          <p className="mb-4 inline-block rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
            호스트 홈
          </p>

          <h1 className="mb-4 text-4xl font-black md:text-5xl">
            베타테스터 모집 현황을 한눈에 확인하세요
          </h1>

          {!profile ? (
            <>
              <p className="mb-8 max-w-2xl text-lg leading-8 text-gray-600">
                로그인하지 않아도 호스트 기능을 둘러볼 수 있습니다. 실제 테스트
                등록과 신청자 관리는 로그인 후 이용할 수 있습니다.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => openAuthModal("login")}
                  className="rounded-2xl bg-purple-600 px-6 py-4 font-bold text-white hover:bg-purple-700"
                >
                  로그인하고 시작하기
                </button>

                <button
                  onClick={() => openAuthModal("signup")}
                  className="rounded-2xl border border-purple-200 bg-white px-6 py-4 font-bold text-purple-700 hover:bg-purple-50"
                >
                  회원가입
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-8 max-w-2xl text-lg leading-8 text-gray-600">
                {hostCanAct
                  ? "현재 진행 중인 테스트의 참여 현황, 목표 달성률, 지원자 상태를 확인할 수 있습니다."
                  : "호스트 가입이 완료되었습니다. 관리자 승인 전에도 호스트 홈은 둘러볼 수 있습니다."}
              </p>

              <button
                onClick={() => moveToView("create")}
                disabled={!hostCanAct}
                className="rounded-2xl bg-purple-600 px-6 py-4 font-bold text-white shadow-lg shadow-purple-100 hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
              >
                {hostCanAct ? "빠른 공고 등록" : "관리자 승인 대기 중"}
              </button>
            </>
          )}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">내 등록 테스트</p>
            <p className="mt-2 text-3xl font-black text-purple-600">
              {registeredTests.length}개
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">전체 지원자</p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {applications.length}명
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">대기 중 지원자</p>
            <p className="mt-2 text-3xl font-black text-orange-500">
              {waitingApplicantsCount}명
            </p>
          </div>
        </div>

        {currentView === "dashboard" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-bold text-purple-600">
                  STATUS
                </p>
                <h2 className="text-2xl font-black">내 테스트 진행 현황</h2>
              </div>

              {profile && (
                <button
                  onClick={() => moveToView("create")}
                  className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700"
                >
                  새 공고 등록
                </button>
              )}
            </div>

            {!profile ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center">
                <p className="mb-5 text-gray-500">
                  로그인하면 내 테스트 진행 현황을 확인할 수 있습니다.
                </p>
                <button
                  onClick={() => openAuthModal("login")}
                  className="rounded-2xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
                >
                  로그인하기
                </button>
              </div>
            ) : registeredTests.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center">
                <p className="mb-5 text-gray-500">
                  아직 등록한 테스트가 없습니다.
                </p>
                <button
                  onClick={() => moveToView("create")}
                  className="rounded-2xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
                >
                  첫 테스트 등록하기
                </button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {registeredTests.map((test) => (
                  <article
                    key={test.id}
                    className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <span className="mb-3 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                          {test.category}
                        </span>

                        <h3 className="text-xl font-black">{test.title}</h3>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {test.status}
                      </span>
                    </div>

                    <div className="mb-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">참여자</p>
                        <p className="mt-1 font-black text-blue-600">
                          {test.applicants}/{test.target}명
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">남은 기간</p>
                        <p className="mt-1 font-black text-orange-500">
                          {test.daysLeftText}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">달성률</p>
                        <p className="mt-1 font-black text-purple-600">
                          {test.progressPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="mb-2 flex justify-between text-xs text-gray-500">
                        <span>목표 테스터 달성률</span>
                        <span>{test.progressPercent}%</span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-purple-600"
                          style={{ width: `${test.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openApplicantsForTest(test.id)}
                        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
                      >
                        지원자 확인
                      </button>

                      <button
                        onClick={() =>
                          alert("테스트 수정 기능은 다음 단계에서 만들 예정입니다.")
                        }
                        className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
                      >
                        수정
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {currentView === "create" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-bold text-purple-600">
                  CREATE
                </p>
                <h2 className="text-2xl font-black">새 테스트 등록</h2>
              </div>

              <button
                onClick={() => moveToView("dashboard")}
                className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                진행 현황으로 돌아가기
              </button>
            </div>

            {!profile && (
              <div className="mb-5 rounded-2xl bg-purple-50 p-5 text-sm font-semibold text-purple-700">
                테스트 등록은 로그인 후 가능합니다.
              </div>
            )}

            <form
              onSubmit={handleCreateTest}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  테스트 제목
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  placeholder="예: 신규 수분크림 7일 사용 테스트"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  회사명/브랜드명
                </label>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="예: 모아드림랩"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  카테고리
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option>화장품</option>
                  <option>게임</option>
                  <option>시제품</option>
                  <option>설문조사</option>
                  <option>식품</option>
                  <option>기타</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  모집 인원
                </label>
                <input
                  value={targetPeople}
                  onChange={(event) => setTargetPeople(event.target.value)}
                  required
                  type="number"
                  min="30"
                  placeholder="최소 30명"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
                <p className="mt-2 text-xs text-gray-400">
                  모아드림 공고는 최소 30명 이상 모집부터 등록할 수 있습니다.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-3 block text-sm font-semibold text-gray-700">
                  보상 방식
                </label>

                <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-2">
                  <button
                    type="button"
                    onClick={() => setRewardType("all")}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      rewardType === "all"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    참가자 전원 제공
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardType("lottery")}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      rewardType === "lottery"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    추첨 제공
                  </button>
                </div>

                {rewardType === "all" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      참가자 전원 보상 내용
                    </label>
                    <input
                      value={allReward}
                      onChange={(event) => setAllReward(event.target.value)}
                      required
                      placeholder="예: 제품 제공 + 10,000원"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      테스트에 참여한 모든 사람에게 제공되는 보상을 입력해주세요.
                    </p>
                  </div>
                )}

                {rewardType === "lottery" && (
                  <div className="grid gap-4 md:grid-cols-[0.6fr_1.4fr]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        추첨 인원
                      </label>
                      <input
                        value={lotteryWinnerCount}
                        onChange={(event) => setLotteryWinnerCount(event.target.value)}
                        required
                        type="number"
                        min="1"
                        placeholder="예: 5"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        추첨 보상 내용
                      </label>
                      <input
                        value={lotteryReward}
                        onChange={(event) => setLotteryReward(event.target.value)}
                        required
                        placeholder="예: 5명에게 백화점 상품권 5만원권"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                      />
                    </div>

                    <p className="text-xs text-gray-400 md:col-span-2">
                      추첨 보상 인원은 모집 인원보다 많을 수 없습니다.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  진행 방식/지역
                </label>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="예: 온라인, 전국 배송, 서울/경기"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  시작일
                </label>
                <input
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  type="date"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  종료일
                </label>
                <input
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  type="date"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  테스트 설명
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  rows={6}
                  placeholder="테스트 목적, 진행 방식, 신청 조건 등을 입력하세요."
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700 disabled:bg-gray-400 md:col-span-2"
              >
                {submitting
                  ? "등록 중..."
                  : profile
                    ? "테스트 등록하기"
                    : "로그인 후 등록하기"}
              </button>
            </form>
          </section>
        )}

        {currentView === "applicants" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-bold text-purple-600">
                  APPLICANTS
                </p>
                <h2 className="text-2xl font-black">
                  {selectedApplicantTest
                    ? `${selectedApplicantTest.title} 지원자 확인`
                    : "전체 지원자 확인"}
                </h2>
              </div>

              <button
                onClick={() => moveToView("dashboard")}
                className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                진행 현황으로 돌아가기
              </button>
            </div>

            {!profile ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
                로그인하면 지원자 목록을 확인할 수 있습니다.
              </div>
            ) : visibleApplications.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
                {selectedApplicantTest
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
          </section>
        )}
      </section>
    </main>
  );
}
