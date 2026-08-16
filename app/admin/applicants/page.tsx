"use client";

import { useEffect, useState } from "react";
import { fetchApplicantStats } from "../../../lib/admin/api";
import type { ApplicantStats, ApplicantStatusCount } from "../../../lib/admin/types";

const statusStyle: Record<ApplicantStatusCount["status"], string> = {
  대기: "bg-gray-100 text-gray-600",
  수락: "bg-green-50 text-green-700",
  거절: "bg-red-50 text-red-600",
};

export default function AdminApplicantsPage() {
  const [stats, setStats] = useState<ApplicantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    (async () => {
      const result = await fetchApplicantStats();

      if (!result.ok || !result.data) {
        setErrorMessage(result.message);
        setLoading(false);
        return;
      }

      setStats(result.data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">APPLICANTS</p>
        <h1 className="text-2xl font-black text-gray-900">지원자 통계</h1>
        <p className="mt-2 text-sm text-gray-500">
          전체 지원 현황과 테스트별 지원자 수를 확인합니다. (현재 mock 데이터)
        </p>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
          불러오는 중...
        </div>
      ) : errorMessage || !stats ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
          {errorMessage || "통계를 불러오지 못했습니다."}
        </div>
      ) : stats.totalApplications === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
          아직 지원 내역이 없습니다.
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">전체 지원 수</p>
              <p className="mt-2 text-3xl font-black text-blue-600">
                {stats.totalApplications}건
              </p>
            </div>

            {stats.byStatus.map((item) => (
              <div key={item.status} className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">{item.status}</p>
                <p className="mt-2 text-3xl font-black text-gray-900">
                  {item.count}건
                </p>
              </div>
            ))}
          </section>

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">상태별 통계</h2>

            <div className="space-y-3">
              {stats.byStatus.map((item) => {
                const percent =
                  stats.totalApplications === 0
                    ? 0
                    : Math.round((item.count / stats.totalApplications) * 100);

                return (
                  <div key={item.status}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-gray-500">
                        {item.count}건 ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              테스트별 지원자 수
            </h2>

            {stats.byTest.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
                테스트별 지원 내역이 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">테스트</th>
                      <th className="px-6 py-4 font-semibold">지원자 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byTest.map((item) => (
                      <tr key={item.testId} className="border-t border-gray-100">
                        <td className="px-6 py-4 font-semibold">
                          {item.testTitle}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{item.count}명</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
