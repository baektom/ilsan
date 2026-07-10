"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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

const registeredTests = [
  {
    id: 1,
    title: "신규 수분크림 7일 사용 테스트",
    category: "화장품",
    status: "모집중",
    applicants: 18,
    target: 30,
    reward: "제품 제공 + 10,000원",
  },
  {
    id: 2,
    title: "모바일 퍼즐게임 베타 플레이 테스트",
    category: "게임",
    status: "검토중",
    applicants: 42,
    target: 50,
    reward: "20,000원",
  },
];

export default function HostPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const registeredTestsRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("화장품");
  const [reward, setReward] = useState("");
  const [targetPeople, setTargetPeople] = useState("");
  const [description, setDescription] = useState("");

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMenuOpen(false);
  };

  const moveToRegisteredTests = () => {
    if (!profile) {
      openAuthModal("login");
      return;
    }

    setMenuOpen(false);

    setTimeout(() => {
      registeredTestsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleCreateTest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      openAuthModal("login");
      return;
    }

    alert("다음 단계에서 Supabase에 테스트 등록 정보를 저장할 예정입니다.");

    setTitle("");
    setCategory("화장품");
    setReward("");
    setTargetPeople("");
    setDescription("");
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
            onClick={() => router.push("/")}
            className="text-2xl font-black tracking-tight text-purple-600"
          >
            모아드림 호스트
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/tests")}
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
                  로그인하면 테스트를 등록할 수 있어요
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
              <button className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50">
                📊 호스트 대시보드
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo({ top: 520, behavior: "smooth" });
                }}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📝 테스트 등록
              </button>

              <button
                onClick={moveToRegisteredTests}
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-left font-semibold hover:bg-gray-50"
              >
                📌 내가 등록한 테스트 현황
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
        <div className="mb-8 rounded-[36px] bg-white p-8 shadow-sm ring-1 ring-purple-100 md:p-10">
          <p className="mb-4 inline-block rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
            호스트 홈
          </p>

          <h1 className="mb-4 text-4xl font-black md:text-5xl">
            베타테스터 모집을 시작해보세요
          </h1>

          <p className="mb-8 max-w-2xl text-lg leading-8 text-gray-600">
            로그인하지 않아도 호스트 기능을 둘러볼 수 있습니다. 실제 테스트
            등록과 신청자 관리는 로그인 후 이용할 수 있습니다.
          </p>

          {!profile && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => openAuthModal("login")}
                className="rounded-2xl bg-purple-600 px-6 py-4 font-bold text-white hover:bg-purple-700"
              >
                로그인하고 등록하기
              </button>

              <button
                onClick={() => openAuthModal("signup")}
                className="rounded-2xl border border-purple-200 bg-white px-6 py-4 font-bold text-purple-700 hover:bg-purple-50"
              >
                회원가입
              </button>
            </div>
          )}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">등록 예시 테스트</p>
            <p className="mt-2 text-3xl font-black text-purple-600">
              {registeredTests.length}개
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">예상 신청자</p>
            <p className="mt-2 text-3xl font-black text-blue-600">60명</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">관리 기능</p>
            <p className="mt-2 text-3xl font-black text-green-600">준비중</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-black">새 테스트 등록</h2>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder="테스트 제목"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option>화장품</option>
                <option>게임</option>
                <option>시제품</option>
                <option>설문조사</option>
                <option>기타</option>
              </select>

              <input
                value={targetPeople}
                onChange={(event) => setTargetPeople(event.target.value)}
                required
                placeholder="모집 인원"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <input
                value={reward}
                onChange={(event) => setReward(event.target.value)}
                required
                placeholder="보상"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={5}
                placeholder="테스트 설명"
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
              >
                {profile ? "테스트 등록하기" : "로그인 후 등록하기"}
              </button>
            </form>
          </section>

          <section
            ref={registeredTestsRef}
            className="scroll-mt-28 rounded-3xl bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 text-2xl font-black">내가 등록한 테스트 현황</h2>

            <div className="space-y-4">
              {registeredTests.map((test) => (
                <article
                  key={test.id}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <span className="mb-2 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                    {test.category}
                  </span>

                  <h3 className="mb-3 font-bold">{test.title}</h3>

                  <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      신청자 {test.applicants}/{test.target}명
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      {test.reward}
                    </div>
                    <div className="rounded-xl bg-green-50 p-3 font-bold text-green-700">
                      {test.status}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}