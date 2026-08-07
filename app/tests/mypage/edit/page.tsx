"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { getCurrentProfile, updateProfile } from "../../../../lib/supabase/profiles";
import type { Profile } from "../../../../lib/supabase/types";
import AuthModal, { AuthMode } from "../../../components/AuthModal";

export default function EditProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const currentProfile = await getCurrentProfile(supabase, "tester");
    setProfile(currentProfile);

    if (currentProfile) {
      setName(currentProfile.name ?? "");
      setAge(currentProfile.age ? String(currentProfile.age) : "");
      setRegion(currentProfile.region ?? "");
      setPhone(currentProfile.phone ?? "");
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadProfile]);

  // 저장하면 profiles 테이블에 반영되고, 이후 지원 폼에 이 값들이 자동으로 채워집니다.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    const result = await updateProfile(supabase, {
      name,
      age: age ? Number(age) : null,
      region,
      phone,
    });
    setSaving(false);

    alert(result.message);

    if (result.ok) {
      router.push("/tests/mypage");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8fbff] px-6 text-center">
        <p className="text-lg font-bold">로그인이 필요한 페이지예요.</p>
        <button
          onClick={() => {
            setAuthInitialMode("login");
            setAuthModalOpen(true);
          }}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
        >
          로그인하기
        </button>

        {authModalOpen && (
          <AuthModal
            initialMode={authInitialMode}
            accountRole="tester"
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={loadProfile}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-12 text-gray-900">
      <section className="mx-auto max-w-lg">
        <Link
          href="/tests/mypage"
          className="text-sm font-bold text-blue-600 hover:text-blue-800"
        >
          ← 마이페이지로
        </Link>

        <div className="mt-5 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-blue-100">
          <p className="mb-2 text-sm font-bold text-blue-600">프로필 수정</p>
          <h1 className="text-2xl font-black">내 정보 관리</h1>
          <p className="mt-2 text-sm text-gray-500">
            여기에 저장한 정보는 다음 지원부터 지원 폼에 자동으로 채워져요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                이름
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="이름"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                나이
              </label>
              <input
                value={age}
                onChange={(event) => setAge(event.target.value)}
                type="number"
                min={1}
                placeholder="나이 (선택)"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                지역
              </label>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="지역 (선택)"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                연락처
              </label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="연락처 (선택)"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/tests/mypage")}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
