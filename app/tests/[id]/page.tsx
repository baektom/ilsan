"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { getTestById, incrementTestViewCount } from "../../../lib/supabase/tests";
import type { TestRow } from "../../../lib/supabase/types";

// 카테고리별 기본 아이콘입니다. tests/page.tsx 목록 카드와 동일한 매핑을 씁니다.
function getCategoryEmoji(category: string) {
  if (category === "화장품") return "🧴";
  if (category === "게임") return "🎮";
  if (category === "시제품") return "📦";
  if (category === "설문조사") return "📝";
  if (category === "식품") return "🥤";

  return "🎁";
}

export default function TestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [test, setTest] = useState<TestRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const testRow = await getTestById(supabase, params.id);

    setTest(testRow);
    setLoading(false);

    if (testRow) {
      void incrementTestViewCount(supabase, params.id);
    }
  }, [supabase, params.id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadData]);

  const handleApply = () => {
    router.push(`/tests/apply/${params.id}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fbff] px-6">
        <section className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-gray-900">
            존재하지 않는 테스트입니다
          </h1>
          <p className="mt-3 text-gray-500">
            삭제되었거나 잘못된 주소로 접근하셨어요.
          </p>
          <Link
            href="/tests"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            테스트 목록으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  const period =
    test.period_start && test.period_end
      ? `${test.period_start} ~ ${test.period_end}`
      : "상시 모집";

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-12 text-gray-900">
      <section className="mx-auto max-w-3xl">
        <Link href="/tests" className="text-sm font-bold text-blue-600">
          ← 테스트 목록으로
        </Link>

        <article className="mt-5 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-blue-100">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-4xl">
              {getCategoryEmoji(test.category)}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black text-white ${
                test.status === "마감" ? "bg-gray-400" : "bg-blue-600"
              }`}
            >
              {test.status}
            </span>
          </div>

          <p className="mb-2 text-sm font-bold text-blue-600">
            {test.category}
          </p>
          <h1 className="mb-3 text-3xl font-black leading-snug">
            {test.title}
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            {test.company_name ?? "등록 호스트"}
          </p>

          <p className="mb-8 text-xs font-semibold text-gray-400">
            👁 조회 {test.view_count} · 🙋 지원 {test.applicant_count}명
          </p>

          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-blue-50 p-5">
              <p className="text-xs text-gray-500">보상</p>
              <p className="mt-1 font-bold text-blue-700">{test.reward}</p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-5">
              <p className="text-xs text-gray-500">모집 인원</p>
              <p className="mt-1 font-bold text-blue-700">
                {test.target_people}명
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-5">
              <p className="text-xs text-gray-500">진행 방식/지역</p>
              <p className="mt-1 font-bold text-blue-700">
                {test.location ?? "진행 방식 미정"}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-5">
              <p className="text-xs text-gray-500">모집 기간</p>
              <p className="mt-1 font-bold text-blue-700">{period}</p>
            </div>
          </div>

          <div className="mb-10">
            <p className="mb-2 text-sm font-bold text-gray-700">
              테스트 설명
            </p>
            <p className="whitespace-pre-line leading-relaxed text-gray-600">
              {test.description}
            </p>
          </div>

          <button
            onClick={handleApply}
            disabled={test.status === "마감"}
            className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {test.status === "마감" ? "모집이 마감되었습니다" : "지원하기"}
          </button>
        </article>
      </section>
    </main>
  );
}