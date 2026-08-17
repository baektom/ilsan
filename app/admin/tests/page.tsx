"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminTests, updateAdminTestStatus } from "../../../lib/admin/api";
import type { AdminTestRow } from "../../../lib/admin/types";

type StatusFilter = "전체" | AdminTestRow["status"];

const statusStyle: Record<AdminTestRow["status"], string> = {
  모집중: "bg-green-50 text-green-700",
  마감: "bg-gray-100 text-gray-500",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function AdminTestsPage() {
  const [tests, setTests] = useState<AdminTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("전체");
  const [searchText, setSearchText] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await fetchAdminTests();

      if (!result.ok) {
        setMessage(result.message);
        setLoading(false);
        return;
      }

      setTests(result.data ?? []);
      setLoading(false);
    })();
  }, []);

  const visibleTests = useMemo(() => {
    return tests.filter((test) => {
      const statusMatched = statusFilter === "전체" || test.status === statusFilter;

      const keyword = searchText.trim().toLowerCase();
      const searchMatched =
        keyword.length === 0 ||
        test.title.toLowerCase().includes(keyword) ||
        (test.companyName ?? "").toLowerCase().includes(keyword);

      return statusMatched && searchMatched;
    });
  }, [tests, statusFilter, searchText]);

  const handleStatusChange = async (
    testId: string,
    status: AdminTestRow["status"]
  ) => {
    setUpdatingId(testId);
    const result = await updateAdminTestStatus(testId, status);
    setUpdatingId(null);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(result.message);
    setTests((current) =>
      current.map((test) => (test.id === testId ? { ...test, status } : test))
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">TESTS</p>
        <h1 className="text-2xl font-black text-gray-900">테스트 관리</h1>
        <p className="mt-2 text-sm text-gray-500">
          등록된 전체 테스트를 조회하고 모집 상태를 관리합니다. (현재 mock 데이터)
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="테스트 제목, 기업명으로 검색"
          className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />

        <div className="flex gap-2">
          {(["전체", "모집중", "마감"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-gray-500">불러오는 중...</p>
        ) : visibleTests.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            조건에 맞는 테스트가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">제목</th>
                  <th className="px-6 py-4 font-semibold">기업명</th>
                  <th className="px-6 py-4 font-semibold">신청자 수</th>
                  <th className="px-6 py-4 font-semibold">모집 인원</th>
                  <th className="px-6 py-4 font-semibold">생성일</th>
                  <th className="px-6 py-4 font-semibold">상태</th>
                  <th className="px-6 py-4 font-semibold">상태 변경</th>
                </tr>
              </thead>

              <tbody>
                {visibleTests.map((test) => (
                  <tr key={test.id} className="border-t border-gray-100">
                    <td className="px-6 py-4 font-semibold">{test.title}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {test.companyName ?? "등록 호스트"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {test.applicantCount}명
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {test.targetPeople}명
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(test.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[test.status]}`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(test.id, "모집중")}
                          disabled={
                            test.status === "모집중" || updatingId === test.id
                          }
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          모집중으로
                        </button>
                        <button
                          onClick={() => handleStatusChange(test.id, "마감")}
                          disabled={
                            test.status === "마감" || updatingId === test.id
                          }
                          className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          마감으로
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
