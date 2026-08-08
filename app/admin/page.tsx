"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminCompanies,
  fetchAdminTests,
  fetchAdminUsers,
  fetchApplicantStats,
} from "../../lib/admin/api";
import type {
  AdminCompanyRow,
  AdminTestRow,
  AdminUserRow,
  ApplicantStats,
} from "../../lib/admin/types";

const roleLabel: Record<AdminUserRow["role"], string> = {
  tester: "테스터",
  host: "기업",
};

const testStatusStyle: Record<AdminTestRow["status"], string> = {
  모집중: "bg-green-100 text-green-700",
  마감: "bg-gray-100 text-gray-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function byCreatedAtDesc<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [tests, setTests] = useState<AdminTestRow[]>([]);
  const [applicantStats, setApplicantStats] = useState<ApplicantStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    (async () => {
      const [usersResult, companiesResult, testsResult, statsResult] =
        await Promise.all([
          fetchAdminUsers(),
          fetchAdminCompanies(),
          fetchAdminTests(),
          fetchApplicantStats(),
        ]);

      const failed = [usersResult, companiesResult, testsResult, statsResult].find(
        (result) => !result.ok
      );

      if (failed) {
        setErrorMessage(failed.message);
        setLoading(false);
        return;
      }

      setUsers(usersResult.data ?? []);
      setCompanies(companiesResult.data ?? []);
      setTests(testsResult.data ?? []);
      setApplicantStats(statsResult.data ?? null);
      setLoading(false);
    })();
  }, []);

  const pendingCompanyCount = useMemo(
    () => companies.filter((company) => company.approvalStatus === "대기").length,
    [companies]
  );

  const activeTestCount = useMemo(
    () => tests.filter((test) => test.status === "모집중").length,
    [tests]
  );

  const closedTestCount = useMemo(
    () => tests.filter((test) => test.status === "마감").length,
    [tests]
  );

  const waitingApplicationCount =
    applicantStats?.byStatus.find((item) => item.status === "대기")?.count ?? 0;

  const recentTests = useMemo(() => byCreatedAtDesc(tests).slice(0, 4), [tests]);
  const recentUsers = useMemo(() => byCreatedAtDesc(users).slice(0, 4), [users]);

  const summaryCards = [
    {
      title: "전체 회원",
      value: `${users.length}명`,
      description: `테스터 ${users.filter((user) => user.role === "tester").length}명 · 기업 ${users.filter((user) => user.role === "host").length}명`,
      icon: "👥",
      href: "/admin/users",
    },
    {
      title: "등록 기업",
      value: `${companies.length}개`,
      description: `승인 대기 ${pendingCompanyCount}개`,
      icon: "🏢",
      href: "/admin/companies",
    },
    {
      title: "진행 중 테스트",
      value: `${activeTestCount}개`,
      description: `마감 ${closedTestCount}개`,
      icon: "📋",
      href: "/admin/tests",
    },
    {
      title: "테스터 신청",
      value: `${applicantStats?.totalApplications ?? 0}건`,
      description: `대기 ${waitingApplicationCount}건`,
      icon: "🙋",
      href: "/admin/applicants",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">DASHBOARD</p>
        <h1 className="text-2xl font-black text-gray-900">관리자 대시보드</h1>
        <p className="mt-2 text-sm text-gray-500">
          모아드림 서비스의 주요 현황을 확인합니다. (현재 mock 데이터)
        </p>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
          불러오는 중...
        </div>
      ) : errorMessage ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
          {errorMessage}
        </div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-500">
                    {card.title}
                  </span>

                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                    {card.icon}
                  </span>
                </div>

                <p className="text-3xl font-black">{card.value}</p>

                <p className="mt-2 text-sm text-gray-500">{card.description}</p>
              </Link>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">최근 등록 테스트</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    최근 등록되거나 변경된 테스트입니다.
                  </p>
                </div>

                <Link
                  href="/admin/tests"
                  className="text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  전체 보기
                </Link>
              </div>

              {recentTests.length === 0 ? (
                <p className="p-8 text-center text-gray-500">
                  아직 등록된 테스트가 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-gray-50 text-sm text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">테스트</th>
                        <th className="px-6 py-4 font-semibold">기업</th>
                        <th className="px-6 py-4 font-semibold">신청자</th>
                        <th className="px-6 py-4 font-semibold">상태</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentTests.map((test) => (
                        <tr key={test.id} className="border-t border-gray-100 text-sm">
                          <td className="px-6 py-5 font-semibold">{test.title}</td>
                          <td className="px-6 py-5 text-gray-500">
                            {test.companyName ?? "등록 호스트"}
                          </td>
                          <td className="px-6 py-5">{test.applicantCount}명</td>
                          <td className="px-6 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${testStatusStyle[test.status]}`}
                            >
                              {test.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">최근 가입 회원</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    최근 생성된 계정입니다.
                  </p>
                </div>

                <Link
                  href="/admin/users"
                  className="text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  전체 보기
                </Link>
              </div>

              {recentUsers.length === 0 ? (
                <p className="p-8 text-center text-gray-500">
                  아직 가입한 회원이 없습니다.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 px-6">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-4 py-5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold">
                            {user.name ?? "이름 미설정"}
                          </p>

                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                            {roleLabel[user.role]}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-gray-500">
                          {user.email}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-gray-400">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white shadow-lg">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-semibold text-blue-100">
                  관리자 빠른 작업
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  공지사항을 작성하거나 승인 대기 항목을 확인하세요.
                </h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/notices"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  공지사항 작성
                </Link>

                <Link
                  href="/admin/companies"
                  className="rounded-xl border border-white/40 px-5 py-3 text-sm font-bold transition hover:bg-white/10"
                >
                  기업 승인 확인
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
