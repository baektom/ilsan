"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import HomeBanner from "./components/HomeBanner";

type Step = "intro" | "role";

export default function HomePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("intro");
  const [visible, setVisible] = useState(true);

  const moveTo = (nextStep: Step) => {
    setVisible(false);

    setTimeout(() => {
      setStep(nextStep);
      setVisible(true);
    }, 300);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div
          className={`w-full transition-all duration-300 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {step === "intro" && (
            <div className="flex flex-col items-center text-center">
              <HomeBanner />

              <div className="mb-8 h-[280px] w-[280px] overflow-hidden rounded-[40px] bg-white shadow-2xl md:h-[420px] md:w-[420px]">
                <Image
                  src="/moadream-main.png"
                  alt="모아드림 대표 이미지"
                  width={420}
                  height={420}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="mb-3 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                베타테스터 모집 플랫폼
              </p>

              <h1 className="mb-4 text-4xl font-black md:text-5xl">
                모아드림
              </h1>

              <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
                제품을 먼저 체험하고 싶은 테스터와 베타테스터를 모집하려는
                호스트를 연결합니다.
              </p>

              <button
                onClick={() => moveTo("role")}
                className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl"
              >
                시작하기
              </button>
            </div>
          )}

          {step === "role" && (
            <div className="mx-auto max-w-5xl">
              <div className="mb-10 text-center">
                <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                  접속 유형 선택
                </p>

                <h1 className="mb-4 text-4xl font-black md:text-5xl">
                  어떻게 시작할까요?
                </h1>

                <p className="text-lg text-gray-600">
                  로그인하지 않아도 먼저 서비스를 둘러볼 수 있습니다.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => router.push("/tests")}
                  className="group rounded-3xl border border-blue-100 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                    🙋
                  </div>

                  <h2 className="mb-3 text-2xl font-bold group-hover:text-blue-600">
                    테스터로 접속하기
                  </h2>

                  <p className="mb-6 leading-7 text-gray-600">
                    새롭게 공개된 테스트, 인기 테스트, 공고 목록을 확인하고
                    마음에 드는 테스트에 신청할 수 있습니다.
                  </p>

                  <div className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white group-hover:bg-blue-700">
                    테스터 홈으로 가기
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/host")}
                  className="group rounded-3xl border border-purple-100 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
                    🏢
                  </div>

                  <h2 className="mb-3 text-2xl font-bold group-hover:text-purple-600">
                    호스트로 접속하기
                  </h2>

                  <p className="mb-6 leading-7 text-gray-600">
                    기업이나 브랜드 담당자는 베타테스트 공고를 등록하고
                    신청자를 관리할 수 있습니다.
                  </p>

                  <div className="rounded-xl bg-purple-600 px-5 py-3 text-center font-semibold text-white group-hover:bg-purple-700">
                    호스트 홈으로 가기
                  </div>
                </button>
              </div>

              <button
                onClick={() => moveTo("intro")}
                className="mx-auto mt-8 block text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                처음 화면으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
