"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createApplication } from "../../../../lib/supabase/applications";
import { createClient } from "../../../../lib/supabase/client";
import { getCurrentProfile } from "../../../../lib/supabase/profiles";
import { getEffectiveTestStatus, getTestById } from "../../../../lib/supabase/tests";
import type { Profile, TestRow } from "../../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../../components/AuthModal";

export default function ApplyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [test, setTest] = useState<TestRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const [applicantName, setApplicantName] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 프로필과 테스트 상세 정보를 같이 불러오고,
  // 프로필에 저장된 이름/나이/지역/연락처로 지원 폼을 자동으로 채웁니다.
  const loadData = useCallback(async () => {
    const [currentProfile, testRow] = await Promise.all([
      getCurrentProfile(supabase, "tester"),
      getTestById(supabase, params.id),
    ]);

    setProfile(currentProfile);
    setApplicantName((prev) => prev || currentProfile?.name || "");
    setAge((prev) => prev || (currentProfile?.age ? String(currentProfile.age) : ""));
    setRegion((prev) => prev || currentProfile?.region || "");
    setPhone((prev) => prev || currentProfile?.phone || "");
    setTest(testRow);
    setLoading(false);
  }, [supabase, params.id]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      openAuthModal("login");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const result = await createApplication(supabase, {
      testId: params.id,
      applicantName,
      age: age ? Number(age) : null,
      region,
      phone,
      message,
    });

    setSaving(false);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    router.push("/tests/apply/complete");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-50">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-50 px-6">
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

  if (getEffectiveTestStatus(test) === "마감") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-50 px-6">
        <section className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-gray-900">
            모집이 마감된 테스트입니다
          </h1>
          <p className="mt-3 text-gray-500">
            아쉽지만 이 테스트는 더 이상 지원을 받지 않고 있어요.
          </p>
          <Link
            href="/tests"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            다른 테스트 보러 가기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-50 px-6 py-12 text-gray-900">
      {authModalOpen && (
        <AuthModal
          key={authInitialMode}
          initialMode={authInitialMode}
          accountRole="tester"
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={async () => {
            setAuthModalOpen(false);
            await loadData();
          }}
        />
      )}

      <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
        <Link href="/tests" className="text-sm font-bold text-blue-600">
          ← 테스트 목록으로
        </Link>

        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-blue-600">테스트 지원</p>
          <h1 className="text-3xl font-black">{test.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {test.company_name ?? "등록 호스트"} · {test.reward}
          </p>
        </div>

        {!profile ? (
          <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-sm font-semibold text-blue-700">
            지원하려면 먼저 로그인해주세요.{" "}
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="underline"
            >
              로그인하기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {errorMessage && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <input
              value={applicantName}
              onChange={(event) => setApplicantName(event.target.value)}
              required
              placeholder="이름"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
            <input
              value={age}
              onChange={(event) => setAge(event.target.value)}
              type="number"
              min={1}
              placeholder="나이 (선택)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              placeholder="지역 (선택)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="연락처 (선택)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="지원 동기 또는 전달할 내용 (선택)"
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? "지원 중..." : "지원서 제출"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}