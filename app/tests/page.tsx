"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { getCurrentProfile, logout } from "../../lib/supabase/profiles";
import { getAllTests } from "../../lib/supabase/tests";
import type { Profile, TestRow } from "../../lib/supabase/types";
import AuthModal, { AuthMode } from "../components/AuthModal";
import HeroCarousel from "../components/HeroCarousel";

type TestItem = {
  id: string;
  category: string;
  title: string;
  company: string;
  reward: string;
  people: string;
  period: string;
  location: string;
  description: string;
  badge: string;
  imageEmoji: string;
  viewCount: number;
  applicantCount: number;
  isNew: boolean;
};

// 등록된 지 며칠 이내면 "신규"로 볼지 기준입니다.
// 여기 숫자만 바꾸면 홈 화면 NEW 배지, 신규 섹션, /tests/list?sort=new 전체보기가 다 같이 바뀝니다.
const NEW_THRESHOLD_DAYS = 3;

function isRecentlyCreated(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  const thresholdMs = NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdTime <= thresholdMs;
}

// 카테고리별 기본 아이콘입니다.
// 나중에 UI 담당자가 이미지나 아이콘 컴포넌트로 바꿔도 됩니다.
function getCategoryEmoji(category: string) {
  if (category === "화장품") return "🧴";
  if (category === "게임") return "🎮";
  if (category === "시제품") return "📦";
  if (category === "설문조사") return "📝";
  if (category === "식품") return "🥤";

  return "🎁";
}

// Supabase tests 테이블 데이터를 현재 테스터 UI 카드 형태로 바꿔주는 함수입니다.
function mapTestRowToItem(test: TestRow): TestItem {
  const period =
    test.period_start && test.period_end
      ? `${test.period_start} ~ ${test.period_end}`
      : "상시 모집";

  return {
    id: test.id,
    category: test.category,
    title: test.title,
    company: test.company_name ?? "등록 호스트",
    reward: test.reward,
    people: `${test.target_people}명 모집`,
    period,
    location: test.location ?? "진행 방식 미정",
    description: test.description,
    badge: isRecentlyCreated(test.created_at) ? "NEW" : "",
    imageEmoji: getCategoryEmoji(test.category),
    viewCount: test.view_count,
    applicantCount: test.applicant_count,
    isNew: isRecentlyCreated(test.created_at),
  };
}

export default function TesterPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const noticeListRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [testList, setTestList] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const [pendingTest, setPendingTest] = useState<TestItem | null>(null);

  // 현재 로그인 사용자 정보와 Supabase에 저장된 테스트 공고를 같이 불러옵니다.
  const loadPageData = useCallback(async () => {
    const currentProfile = await getCurrentProfile(supabase, "tester");
    const testRows = await getAllTests(supabase);

    setProfile(currentProfile);
    setTestList(testRows.map(mapTestRowToItem));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPageData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadPageData]);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("auth");
    if (requestedMode !== "login" && requestedMode !== "signup") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setAuthInitialMode(requestedMode);
      setAuthModalOpen(true);
      window.history.replaceState({}, "", "/tests");
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
    setMenuOpen(false);
  };

  const newTests = testList.filter((test) => test.isNew).slice(0, 3);
  const popularTests = [...testList]
    .sort((a, b) => b.applicantCount - a.applicantCount)
    .slice(0, 3);

  // 홈 화면 하단 "공고 목록"은 탭으로 고른 카테고리 기준 최대 5개까지만 보여주고,
  // 전체 목록은 /tests/list 페이지에서 확인하도록 합니다.
  const [previewCategory, setPreviewCategory] = useState("전체");

  const noticeListPreview = useMemo(() => {
    const filtered =
      previewCategory === "전체"
        ? testList
        : testList.filter((test) => test.category === previewCategory);

    return filtered.slice(0, 5);
  }, [testList, previewCategory]);

  const handleLogout = async () => {
    await logout(supabase);
    setProfile(null);
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
    setProfile(null);
    setMenuOpen(false);
    router.push(`/host?auth=${targetAuthMode}`);
  };

  const moveToNoticeList = () => {
    setMenuOpen(false);

    setTimeout(() => {
      noticeListRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // 지원하기 버튼을 눌렀을 때 실행됩니다.
  // 로그인 전이면 로그인창을 열고, 로그인 후면 지원 페이지로 이동합니다.
  const handleApply = (test: TestItem) => {
    if (!profile) {
      setPendingTest(test);
      openAuthModal("login");
      return;
    }

    router.push(`/tests/apply/${test.id}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-50">
        <p className="text-gray-500">테스터 화면을 불러오는 중...</p>
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
                    onClick={() => openAuthModal("login")}
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
                    openAuthModal("login");
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
                onClick={moveToNoticeList}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📋 공고 목록
              </button>

              <button
                onClick={() => {
                  if (!profile) {
                    openAuthModal("login");
                    return;
                  }

                  alert("다음 단계에서 내 신청 현황 페이지를 만들 예정입니다.");
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
          accountRole="tester"
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={async () => {
            await loadPageData();

            if (pendingTest) {
              const testId = pendingTest.id;
              setPendingTest(null);
              router.push(`/tests/apply/${testId}`);
            }
          }}
        />
      )}

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10">
  <HeroCarousel
    accentColor="blue"
    slides={[
      <div
        key="intro"
        className="flex h-full min-h-[520px] flex-col bg-white p-8 shadow-sm ring-1 ring-blue-100 md:min-h-[430px] md:p-10"
      >
        <div className="grid flex-1 gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              테스터 홈
            </p>

            <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">
              새롭게 열린 테스트를
              <br />
              가장 먼저 확인해보세요
            </h1>

            {profile ? (
              <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
                {profile.name ?? "테스터"}님에게 맞는 테스트를
                둘러보고, 마음에 드는 공고에 바로 지원해보세요.
              </p>
            ) : (
              <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
                로그인하지 않아도 공고는 둘러볼 수 있습니다. 신청하려면
                로그인 또는 회원가입이 필요합니다.
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={moveToNoticeList}
                className="rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
              >
                공고 목록 보기
              </button>

              {!profile && (
                <button
                  onClick={() => openAuthModal("login")}
                  className="rounded-2xl border border-blue-200 bg-white px-6 py-4 font-bold text-blue-700 hover:bg-blue-50"
                >
                  로그인하기
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">
                  TESTER BOARD
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  오늘의 테스트 현황
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                🔎
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-600">
                  신청 가능 공고
                </p>
                <p className="mt-1 text-2xl font-black text-blue-700">
                  {testList.length}개
                </p>
              </div>

              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-xs font-bold text-purple-600">
                  새로 올라온 테스트
                </p>
                <p className="mt-1 text-2xl font-black text-purple-700">
                  {newTests.length}개
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-500">
                  추천 행동
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  관심 있는 공고를 눌러 지원 조건을 확인해보세요.
                </p>
              </div>
            </div>

            <button
              onClick={moveToNoticeList}
              className="mt-5 w-full rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-700"
            >
              공고 목록 바로가기
            </button>
          </div>
        </div>
      </div>,

      <div
        key="cash-reward"
        className="flex h-full min-h-[520px] flex-col bg-white p-8 shadow-sm ring-1 ring-blue-100 md:min-h-[430px] md:p-10"
      >
        <div className="grid flex-1 gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              EVENT
            </p>

            <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">
              첫 테스트 참여 시
              <br />
              캐시 보상을 드려요
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
              처음 참여하는 테스트를 완료하면 캐시 보상이 지급됩니다.
              지금 관심 있는 공고에 지원해보세요.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={moveToNoticeList}
                className="rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
              >
                공고 목록 보기
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl">
              💰
            </div>
            <p className="text-sm font-bold text-blue-600">
              첫 참여 캐시 보상
            </p>
            <p className="mt-2 text-2xl font-black text-blue-700">
              첫 테스트 완료 시 캐시 지급
            </p>
            <p className="mt-3 text-sm text-blue-900/70">
              공고별 상세 보상 조건은 각 테스트 상세 페이지에서
              확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>,

      <div
        key="trust-rank"
        className="flex h-full min-h-[520px] flex-col bg-white p-8 shadow-sm ring-1 ring-blue-100 md:min-h-[430px] md:p-10"
      >
        <div className="grid flex-1 gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              INFO
            </p>

            <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">
              참여할수록 신뢰도 높은
              <br />
              테스터로 추천돼요
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
              테스트 참여 이력이 많을수록 공고를 관리하는 호스트에게
              더 높은 순위, 높은 신뢰도의 테스터로 추천됩니다.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={moveToNoticeList}
                className="rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
              >
                참여할 테스트 찾아보기
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl">
              🏅
            </div>
            <p className="text-sm font-bold text-blue-600">
              신뢰도 높은 테스터
            </p>
            <p className="mt-2 text-2xl font-black text-blue-700">
              참여 이력 = 신뢰도
            </p>
            <p className="mt-3 text-sm text-blue-900/70">
              꾸준히 참여할수록 호스트가 우선적으로 신뢰하는 테스터로
              노출됩니다.
            </p>
          </div>
        </div>
      </div>,
    ]}
  />
</div>

        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-blue-600">
                NEW TEST
              </p>
              <h2 className="text-2xl font-black">새롭게 공개된 테스트</h2>
            </div>

            <button
              onClick={() => router.push("/tests/list?sort=new")}
              className="text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              전체보기
            </button>
          </div>

          {newTests.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-blue-100">
              아직 등록된 테스트가 없습니다.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {newTests.map((test) => (
                <article
                  key={test.id}
                  onClick={() => router.push(`/tests/${test.id}`)}
                  className="cursor-pointer rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-blue-100 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-4xl">
                      {test.imageEmoji}
                    </div>

                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                      NEW
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-bold text-blue-600">
                    {test.category}
                  </p>

                  <h3 className="mb-3 line-clamp-2 min-h-[3.4rem] text-xl font-black leading-snug">
                    {test.title}
                  </h3>

                  <p className="mb-4 line-clamp-1 text-sm text-gray-500">{test.company}</p>

                  <p className="mb-4 text-xs font-semibold text-gray-400">
                    👁 조회 {test.viewCount} · 🙋 지원 {test.applicantCount}명
                  </p>

                  <div className="mb-5 rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs text-gray-500">보상</p>
                    <p className="font-bold text-blue-700">{test.reward}</p>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleApply(test);
                    }}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                  >
                    지원하기
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-purple-600">
                POPULAR
              </p>
              <h2 className="text-2xl font-black">인기 많은 테스트</h2>
            </div>

            <button
              onClick={() => router.push("/tests/list?sort=popular")}
              className="text-sm font-bold text-purple-600 hover:text-purple-800"
            >
              전체보기
            </button>
          </div>

          {popularTests.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-purple-100">
              아직 인기 테스트가 없습니다.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {popularTests.map((test, index) => (
                <article
                  key={test.id}
                  onClick={() => router.push(`/tests/${test.id}`)}
                  className="cursor-pointer rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-purple-100 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-4xl">
                      {test.imageEmoji}
                    </div>

                    <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
                      TOP {index + 1}
                    </span>
                  </div>

                  <p className="mb-2 text-sm font-bold text-purple-600">
                    {test.category}
                  </p>

                  <h3 className="mb-3 line-clamp-2 min-h-[3.4rem] text-xl font-black leading-snug">
                    {test.title}
                  </h3>

                  <p className="mb-4 line-clamp-1 text-sm text-gray-500">{test.company}</p>

                  <p className="mb-4 text-xs font-semibold text-gray-400">
                    👁 조회 {test.viewCount} · 🙋 지원 {test.applicantCount}명
                  </p>

                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-purple-50 p-4">
                      <p className="text-xs text-gray-500">모집</p>
                      <p className="font-bold text-purple-700">
                        {test.people}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-purple-50 p-4">
                      <p className="text-xs text-gray-500">진행</p>
                      <p className="font-bold text-purple-700">
                        {test.location}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleApply(test);
                    }}
                    className="w-full rounded-2xl bg-purple-600 px-4 py-3 font-bold text-white hover:bg-purple-700"
                  >
                    지원하기
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          ref={noticeListRef}
          className="scroll-mt-28 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-gray-100"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-gray-500">
                NOTICE LIST
              </p>
              <h2 className="text-2xl font-black">공고 목록</h2>
            </div>

            <button
              onClick={() => router.push("/tests/list")}
              className="text-sm font-bold text-gray-700 hover:text-gray-900"
            >
              전체보기
            </button>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {["전체", "화장품", "게임", "시제품", "설문조사", "식품", "기타"].map(
              (category) => (
                <button
                  key={category}
                  onClick={() => setPreviewCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    previewCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {category}
                </button>
              )
            )}
          </div>

          {noticeListPreview.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center text-gray-500">
              해당 카테고리에 등록된 공고가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {noticeListPreview.map((test) => (
                <article
                  key={test.id}
                  onClick={() => router.push(`/tests/${test.id}`)}
                  className="cursor-pointer rounded-3xl border border-gray-100 bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-4xl">
                        {test.imageEmoji}
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                            {test.category}
                          </span>
                          {test.badge && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {test.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="mb-1 line-clamp-1 text-lg font-black">
                          {test.title}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {test.company} · {test.location} · {test.period}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-gray-400">
                          👁 조회 {test.viewCount} · 🙋 지원 {test.applicantCount}명
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <p className="font-bold text-blue-700">{test.reward}</p>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleApply(test);
                        }}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        지원하기
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}