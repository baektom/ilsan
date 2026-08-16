"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminCompanies, updateCompanyApproval } from "../../../lib/admin/api";
import type { AdminCompanyRow, CompanyApprovalStatus } from "../../../lib/admin/types";

type ApprovalFilter = "전체" | CompanyApprovalStatus;

const approvalStyle: Record<CompanyApprovalStatus, string> = {
  승인: "bg-green-50 text-green-700",
  대기: "bg-yellow-50 text-yellow-700",
  반려: "bg-red-50 text-red-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("전체");
  const [searchText, setSearchText] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await fetchAdminCompanies();

      if (!result.ok) {
        setMessage(result.message);
        setLoading(false);
        return;
      }

      setCompanies(result.data ?? []);
      setLoading(false);
    })();
  }, []);

  const visibleCompanies = useMemo(() => {
    return companies.filter((company) => {
      const approvalMatched =
        approvalFilter === "전체" || company.approvalStatus === approvalFilter;

      const keyword = searchText.trim().toLowerCase();
      const searchMatched =
        keyword.length === 0 ||
        company.companyName.toLowerCase().includes(keyword) ||
        company.email.toLowerCase().includes(keyword) ||
        (company.contactName ?? "").toLowerCase().includes(keyword);

      return approvalMatched && searchMatched;
    });
  }, [companies, approvalFilter, searchText]);

  const handleApprovalChange = async (
    companyId: string,
    status: CompanyApprovalStatus
  ) => {
    setUpdatingId(companyId);
    const result = await updateCompanyApproval(companyId, status);
    setUpdatingId(null);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setCompanies((current) =>
      current.map((company) =>
        company.id === companyId ? { ...company, approvalStatus: status } : company
      )
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">COMPANIES</p>
        <h1 className="text-2xl font-black text-gray-900">기업 관리</h1>
        <p className="mt-2 text-sm text-gray-500">
          등록된 기업(호스트)을 조회하고 승인 상태를 관리합니다. (현재 mock 데이터)
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="기업명, 담당자, 이메일로 검색"
          className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />

        <div className="flex gap-2">
          {(["전체", "승인", "대기", "반려"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setApprovalFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                approvalFilter === status
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
        ) : visibleCompanies.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            조건에 맞는 기업이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">기업명</th>
                  <th className="px-6 py-4 font-semibold">담당자</th>
                  <th className="px-6 py-4 font-semibold">이메일</th>
                  <th className="px-6 py-4 font-semibold">등록 테스트</th>
                  <th className="px-6 py-4 font-semibold">가입일</th>
                  <th className="px-6 py-4 font-semibold">상태</th>
                  <th className="px-6 py-4 font-semibold">승인 처리</th>
                </tr>
              </thead>

              <tbody>
                {visibleCompanies.map((company) => (
                  <tr key={company.id} className="border-t border-gray-100">
                    <td className="px-6 py-4 font-semibold">
                      {company.companyName}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {company.contactName ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{company.email}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {company.testCount}건
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(company.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${approvalStyle[company.approvalStatus]}`}
                      >
                        {company.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprovalChange(company.id, "승인")}
                          disabled={
                            company.approvalStatus === "승인" ||
                            updatingId === company.id
                          }
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleApprovalChange(company.id, "대기")}
                          disabled={
                            company.approvalStatus === "대기" ||
                            updatingId === company.id
                          }
                          className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          대기로 전환
                        </button>
                        <button
                          onClick={() => handleApprovalChange(company.id, "반려")}
                          disabled={
                            company.approvalStatus === "반려" ||
                            updatingId === company.id
                          }
                          className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          반려
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
