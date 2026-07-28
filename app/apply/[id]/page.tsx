"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createApplication } from "../../../lib/supabase/applications";
import { createClient } from "../../../lib/supabase/client";

export default function ApplyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [applicantName, setApplicantName] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    router.push("/apply/complete");
  };

  return (
    <main className="min-h-screen bg-blue-50 px-6 py-12 text-gray-900">
      <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
        <Link href="/tests" className="text-sm font-bold text-blue-600">
          ← 테스트 목록으로
        </Link>
        <h1 className="mt-5 text-3xl font-black">테스트 지원하기</h1>
        <p className="mt-2 text-sm text-gray-500">지원 정보를 입력해 주세요.</p>

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
      </section>
    </main>
  );
}
