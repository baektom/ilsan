"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import AuthModal, { AuthMode } from "../components/AuthModal";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  login_id: string | null;
  role: "tester" | "host" | null;
};

type TestItem = {
  id: number;
  category: string;
  title: string;
  company: string;
  reward: string;
  people: string;
  period: string;
  location: string;
  description: string;
  badge: string;
  applicants: number;
  imageEmoji: string;
};

const testList: TestItem[] = [
  {
    id: 1,
    category: "화장품",
    title: "신규 수분크림 7일 사용 테스트",
    company: "루미코스",
    reward: "제품 제공 + 10,000원",
    people: "30명 모집",
    period: "2026.07.10 ~ 2026.07.17",
    location: "전국 배송",
    description:
      "신규 수분크림을 7일간 사용하고 피부 자극, 보습감, 발림성에 대한 간단한 설문을 작성하는 테스트입니다.",
    badge: "NEW",
    applicants: 18,
    imageEmoji: "🧴",
  },
  {
    id: 2,
    category: "게임",
    title: "모바일 퍼즐게임 베타 플레이 테스트",
    company: "플레이몽",
    reward: "20,000원",
    people: "50명 모집",
    period: "2026.07.12 ~ 2026.07.15",
    location: "온라인",
    description:
      "출시 전 모바일 퍼즐게임을 플레이하고 난이도, 재미, 버그 여부에 대한 피드백을 제출하는 테스트입니다.",
    badge: "인기",
    applicants: 42,
    imageEmoji: "🎮",
  },
  {
    id: 3,
    category: "시제품",
    title: "생활용품 사용성 테스트",
    company: "데일리랩",
    reward: "제품 제공 + 15,000원",
    people: "20명 모집",
    period: "2026.07.20 ~ 2026.07.27",
    location: "서울/경기",
    description:
      "새로운 생활용품 시제품을 실제 환경에서 사용해보고 불편한 점과 개선점을 제출하는 테스트입니다.",
    badge: "NEW",
    applicants: 9,
    imageEmoji: "📦",
  },
  {
    id: 4,
    category: "설문조사",
    title: "대학생 소비 패턴 설문조사",
    company: "인사이트리서치",
    reward: "5,000원",
    people: "100명 모집",
    period: "2026.07.05 ~ 2026.07.09",
    location: "온라인",
    description:
      "대학생의 소비 습관, 앱 사용 패턴, 브랜드 선호도를 조사하는 10분 내외의 온라인 설문입니다.",
    badge: "인기",
    applicants: 87,
    imageEmoji: "📝",
  },
  {
    id: 5,
    category: "식품",
    title: "신규 단백질 음료 맛 평가 테스트",
    company: "핏드링크",
    reward: "제품 제공 + 8,000원",
    people: "40명 모집",
    period: "2026.07.18 ~ 2026.07.22",
    location: "전국 배송",
    description:
      "신규 단백질 음료를 시음하고 맛, 향, 패키지 만족도에 대한 피드백을 작성하는 테스트입니다.",
    badge: "NEW",
    applicants: 25,
    imageEmoji: "🥤",
  },
];

export default function TesterPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const noticeListRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchText, setSearchText] = useState("");

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, email, name, login_id, role")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data as Profile);
    }

    setLoading(false);
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
    setMenuOpen(false);
  };

  const newTests = testList.filter((test) => test.badge === "NEW");
  const popularTests = [...testList]
    .sort((a, b) => b.applicants - a.applicants)
    .slice(0, 3);

  const filteredTests = useMemo(() => {
    return testList.filter((test) => {
      const categoryMatched =
        selectedCategory === "전체" || test.category === selectedCategory;

      const searchMatched =
        test.title.toLowerCase().includes(searchText.toLowerCase()) ||
        test.company.toLowerCase().includes(searchText.toLowerCase()) ||
        test.description.toLowerCase().includes(searchText.toLowerCase());

      return categoryMatched && searchMatched;
    });
  }, [selectedCategory, searchText]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMenuOpen(false);
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

  const handleApply = (title: string) => {
    if (!profile) {
      openAuthModal("login");
      return;
    }

    alert(
      `${title}\n\n다음 단계에서 Supabase에 신청 정보를 저장하도록 만들 예정입니다.`
    );
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
            onClick={() => router.push("/")}
            className="text-2xl font-black tracking-tight text-blue-600"
          >
            모아드림
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/host")}
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
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={loadProfile}
        />
      )}

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 overflow-hidden rounded-[36px] bg-white p-8 shadow-sm ring-1 ring-blue-100 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                테스터 홈
              </p>

              <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">
                새롭게 열린 테스트를
                <br />
                가장 먼저 확인해보세요
              </h1>

              <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
                로그인하지 않아도 공고는 둘러볼 수 있습니다. 신청하려면
                로그인 또는 회원가입이 필요합니다.
              </p>

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

            <div className="rounded-[32px] bg-gradient-to-br from-blue-100 via-purple-100 to-white p-6">
              <div className="rounded-[28px] bg-white p-6 shadow-sm">
                <p className="mb-3 text-sm font-bold text-gray-500">
                  오늘의 추천
                </p>
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-5xl">
                  🎁
                </div>
                <h2 className="mb-3 text-2xl font-bold">
                  제품 받고 피드백하면 보상까지
                </h2>
                <p className="leading-7 text-gray-600">
                  현재 신청 가능한 테스트 {testList.length}개가 준비되어
                  있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-blue-600">NEW TEST</p>
              <h2 className="text-2xl font-black">새롭게 공개된 테스트</h2>
            </div>

            <button
              onClick={moveToNoticeList}
              className="text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              전체보기
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {newTests.map((test) => (
              <article
                key={test.id}
                className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-blue-100 transition hover:-translate-y-1 hover:shadow-lg"
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

                <h3 className="mb-3 text-xl font-black leading-snug">
                  {test.title}
                </h3>

                <p className="mb-4 text-sm text-gray-500">{test.company}</p>

                <div className="mb-5 rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs text-gray-500">보상</p>
                  <p className="font-bold text-blue-700">{test.reward}</p>
                </div>

                <button
                  onClick={() => handleApply(test.title)}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                >
                  자세히 보기
                </button>
              </article>
            ))}
          </div>
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
              onClick={moveToNoticeList}
              className="text-sm font-bold text-purple-600 hover:text-purple-800"
            >
              전체보기
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {popularTests.map((test, index) => (
              <article
                key={test.id}
                className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-purple-100 transition hover:-translate-y-1 hover:shadow-lg"
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

                <h3 className="mb-3 text-xl font-black leading-snug">
                  {test.title}
                </h3>

                <p className="mb-4 text-sm text-gray-500">{test.company}</p>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-purple-50 p-4">
                    <p className="text-xs text-gray-500">신청자</p>
                    <p className="font-bold text-purple-700">
                      {test.applicants}명
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
                  onClick={() => handleApply(test.title)}
                  className="w-full rounded-2xl bg-purple-600 px-4 py-3 font-bold text-white hover:bg-purple-700"
                >
                  자세히 보기
                </button>
              </article>
            ))}
          </div>
        </section>

        <section
          ref={noticeListRef}
          className="scroll-mt-28 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-gray-100"
        >
          <div className="mb-6">
            <p className="mb-2 text-sm font-bold text-gray-500">NOTICE LIST</p>
            <h2 className="text-2xl font-black">공고 목록</h2>
          </div>

          <div className="mb-6 rounded-2xl bg-gray-50 p-5">
            <div className="mb-4">
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="테스트명, 기업명, 설명으로 검색"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {["전체", "화장품", "게임", "시제품", "설문조사", "식품"].map(
                (category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      selectedCategory === category
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {category}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredTests.map((test) => (
              <article
                key={test.id}
                className="rounded-3xl border border-gray-100 bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
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
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          {test.badge}
                        </span>
                      </div>

                      <h3 className="mb-1 text-lg font-black">{test.title}</h3>

                      <p className="text-sm text-gray-500">
                        {test.company} · {test.location} · {test.period}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:items-end">
                    <p className="font-bold text-blue-700">{test.reward}</p>

                    <button
                      onClick={() => handleApply(test.title)}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      신청하기
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}