import Link from "next/link";

export default function ApplyCompletePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 px-6">
      <section className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-sm">
        <p className="text-5xl">✅</p>
        <h1 className="mt-5 text-3xl font-black text-gray-900">지원이 완료되었습니다</h1>
        <p className="mt-3 text-gray-500">
          호스트가 지원 내용을 확인하면 상태가 변경됩니다.
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
