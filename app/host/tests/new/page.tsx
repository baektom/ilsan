"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import {
  getCurrentProfile,
  isApprovedHost,
} from "../../../../lib/supabase/profiles";
import { createTest } from "../../../../lib/supabase/tests";
import type { CreateTestInput, Profile } from "../../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../../components/AuthModal";

type RewardType = "all" | "lottery";

export default function NewHostTestPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

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
  const [method, setMethod] = useState("");
  const [region, setRegion] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    const currentProfile = await getCurrentProfile(supabase, "host");
    setProfile(currentProfile);
    setCheckingProfile(false);
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadProfile]);

  const openAuthModal = (mode: AuthMode) => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleCreateTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      openAuthModal("login");
      return;
    }

    if (!isApprovedHost(profile)) {
      alert("관리자 승인 후 테스트를 등록할 수 있습니다.");
      return;
    }

    if (!companyName.trim()) {
      alert("회사명/브랜드명을 입력해주세요.");
      return;
    }

    if (!method.trim()) {
      alert("진행 방식을 입력해주세요.");
      return;
    }

    if (!region.trim()) {
      alert("지역을 입력해주세요.");
      return;
    }

    if (!periodStart) {
      alert("시작일을 선택해주세요.");
      return;
    }

    if (!periodEnd) {
      alert("종료일을 선택해주세요.");
      return;
    }

    const targetNumber = Number(targetPeople);

    if (!targetNumber || Number.isNaN(targetNumber) || targetNumber < 10) {
      alert("모집 인원은 최소 10명 이상이어야 합니다.");
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
      location: `${method.trim()} · ${region.trim()}`,
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

    router.push("/host");
  };

  if (checkingProfile) {
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
          관리자 승인 후 새 테스트를 등록할 수 있습니다.
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
    <main className="min-h-screen bg-[#fbf9ff] px-6 py-12 text-gray-900">
      {authModalOpen && (
        <AuthModal
          key={authInitialMode}
          initialMode={authInitialMode}
          accountRole="host"
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={async () => {
            setAuthModalOpen(false);
            await loadProfile();
          }}
        />
      )}

      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
        <Link href="/host" className="text-sm font-bold text-purple-600">
          ← 호스트 홈으로
        </Link>

        <p className="mb-2 mt-5 text-sm font-bold text-purple-600">CREATE</p>
        <h1 className="mb-6 text-3xl font-black">새 테스트 등록</h1>

        {!profile && (
          <div className="mb-5 rounded-2xl bg-purple-50 p-5 text-sm font-semibold text-purple-700">
            테스트 등록은 로그인 후 가능합니다.{" "}
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="underline"
            >
              로그인하기
            </button>
          </div>
        )}

        <form onSubmit={handleCreateTest} className="grid gap-4 md:grid-cols-2">
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
              회사명/브랜드명 <span className="text-red-500">*</span>
            </label>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
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
              min="10"
              placeholder="최소 10명"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
            <p className="mt-2 text-xs text-gray-400">
              모아드림 공고는 최소 10명 이상 모집부터 등록할 수 있습니다.
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                진행 방식 <span className="text-red-500">*</span>
              </label>
              <input
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                required
                placeholder="예: 온라인, 오프라인"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                지역 <span className="text-red-500">*</span>
              </label>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                required
                placeholder="예: 서울/경기, 전국"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                required
                type="date"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                required
                type="date"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>
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
    </main>
  );
}
