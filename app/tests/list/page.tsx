"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { getCurrentProfile } from "../../../lib/supabase/profiles";
import { getAllTests, getEffectiveTestStatus } from "../../../lib/supabase/tests";
import type { Profile, TestRow } from "../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../components/AuthModal";
import TesterHeader from "../../components/TesterHeader";

const categoryTabs = ["전체", "화장품", "게임", "시제품", "설문조사", "식품", "기타"];

// 홈 화면(tests/page.tsx)과 같은 기준입니다. 여기 숫자를 바꾸면 같이 맞춰서 바꿔주세요.
const NEW_THRESHOLD_DAYS = 3;

function isRecentlyCreated(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  const thresholdMs = NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdTime <= thresholdMs;
}

type SortMode = "latest" | "new" | "popular";

const sortHeading: Record<SortMode, { eyebrow: string; title: string }> = {
  latest: { eyebrow: "NOTICE LIST", title: "전체 공고 목록" },
  new: { eyebrow: "NEW TEST", title: "새롭게 공개된 테스트 전체보기" },
  popular: { eyebrow: "POPULAR", title: "인기 많은 테스트 전체보기" },
};

// 카테고리별 기본 아이콘입니다. tests/page.tsx 목록 카드와 동일한 매핑을 씁니다.
function getCategoryEmoji(category: string) {
  if (category === "화장품") return "🧴";
  if (category === "게임") return "🎮";
  if (category === "시제품") return "📦";
  if (category === "설문조사") return "📝";
  if (category === "식품") return "🥤";

  return "🎁";
}

function TestListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());

  const sortParam = searchParams.get("sort");
  const sortMode: SortMode =
    sortParam === "new" || sortParam === "popular" ? sortParam : "latest";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [hideClosed, setHideClosed] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");
  const [pendingTestId, setPendingTestId] = useState<string | null>(null);

  // getAllTests가 created_at 최신순으로 내려주기 때문에 별도 정렬 없이 그대로 씁니다.
  const loadData = useCallback(async () => {
    const [currentProfile, testRows] = await Promise.all([
      getCurrentProfile(supabase, "tester"),
      getAllTests(supabase),
    ]);

    setProfile(currentProfile);
    setTests(testRows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const visibleTests = useMemo(() => {
    const withoutClosed = hideClosed
      ? tests.filter((test) => getEffectiveTestStatus(test) !== "마감")
      : tests;

    const filtered =
      categoryFilter === "전체"
        ? withoutClosed
        : withoutClosed.filter((test) => test.category === categoryFilter);

    if (sortMode === "popular") {
      return [...filtered].sort((a, b) => b.applicant_count - a.applicant_count);
    }

    if (sortMode === "new") {
      // 등록된 지 NEW_THRESHOLD_DAYS일 이내인 것만 보여줍니다(최신순 정렬은 그대로 유지).
      return filtered.filter((test) => isRecentlyCreated(test.created_at));
    }

    // "latest"는 getAllTests가 이미 created_at 최신순으로 내려주므로 그대로 씁니다.
    return filtered;
  }, [tests, categoryFilter, sortMode, hideClosed]);

  const handleApply = (testId: string) => {
    if (!profile) {
      setPendingTestId(testId);
      setAuthInitialMode("login");
      setAuthModalOpen(true);
      return;
    }

    router.push(`/tests/apply/${testId}`);
  };

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
        <p className="text-gray-500">공고 목록을 불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-gray-900">
      <TesterHeader
        supabase={supabase}
        profile={profile}
        onProfileChange={setProfile}
        onOpenAuth={openAuthModal}
      />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-2 text-sm font-bold text-gray-500">
          {sortHeading[sortMode].eyebrow}
        </p>
        <h1 className="mb-8 text-4xl font-black md:text-5xl">
          {sortHeading[sortMode].title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {categoryTabs.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  categoryFilter === category
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            onClick={() => setHideClosed((prev) => !prev)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              hideClosed
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {hideClosed ? "✓ 마감 공고 숨김" : "마감 공고 숨기기"}
          </button>
        </div>

        {visibleTests.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500">
            해당하는 공고가 없어요.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleTests.map((test) => {
              const effectiveStatus = getEffectiveTestStatus(test);

              return (
              <article
                key={test.id}
                onClick={() => router.push(`/tests/${test.id}`)}
                className="cursor-pointer rounded-3xl border border-gray-100 bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div className="flex gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-4xl">
                      {getCategoryEmoji(test.category)}
                    </div>

                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                          {test.category}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            effectiveStatus === "마감"
                              ? "bg-gray-200 text-gray-500"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {effectiveStatus}
                        </span>
                      </div>

                      <h3 className="mb-1 line-clamp-1 text-lg font-black">{test.title}</h3>

                      <p className="text-sm text-gray-500">
                        {test.company_name ?? "등록 호스트"} ·{" "}
                        {test.location ?? "진행 방식 미정"}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-gray-400">
                        👁 조회 {test.view_count} · 🙋 지원 {test.applicant_count}명
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:items-end">
                    <p className="font-bold text-blue-700">{test.reward}</p>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleApply(test.id);
                      }}
                      disabled={effectiveStatus === "마감"}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {effectiveStatus === "마감" ? "모집 마감" : "지원하기"}
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>

      {authModalOpen && (
        <AuthModal
          key={authInitialMode}
          initialMode={authInitialMode}
          accountRole="tester"
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={async () => {
            setAuthModalOpen(false);
            await loadData();

            if (pendingTestId) {
              const testId = pendingTestId;
              setPendingTestId(null);
              router.push(`/tests/apply/${testId}`);
            }
          }}
        />
      )}
    </main>
  );
}

export default function TestListPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
          <p className="text-gray-500">공고 목록을 불러오는 중...</p>
        </main>
      }
    >
      <TestListContent />
    </Suspense>
  );
}