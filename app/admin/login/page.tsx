"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { adminMockLogin } from "../../../lib/admin/auth";

export default function AdminLoginPage() {
  const router = useRouter();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const result = await adminMockLogin(loginId.trim(), password);

    setLoading(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    router.push("/admin");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <section className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <p className="mb-2 text-sm font-semibold text-blue-600">
          MOADREAM ADMIN
        </p>
        <h1 className="mb-8 text-2xl font-black text-gray-900">
          관리자 로그인
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              관리자 아이디
            </label>
            <input
              type="text"
              required
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="관리자 아이디"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              비밀번호
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errorMessage && (
            <p className="text-center text-sm font-medium text-red-500">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          개발용 mock 계정: admin / admin1234
        </p>
      </section>
    </main>
  );
}
