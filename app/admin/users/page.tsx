"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminUsers } from "../../../lib/admin/api";
import type { AdminUserRow } from "../../../lib/admin/types";

type RoleFilter = "전체" | "tester" | "host";

const roleLabel: Record<"tester" | "host", string> = {
  tester: "테스터",
  host: "호스트",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("전체");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    (async () => {
      const result = await fetchAdminUsers();

      if (!result.ok) {
        setMessage(result.message);
        setLoading(false);
        return;
      }

      setUsers(result.data ?? []);
      setLoading(false);
    })();
  }, []);

  const visibleUsers = useMemo(() => {
    return users.filter((user) => {
      const roleMatched = roleFilter === "전체" || user.role === roleFilter;

      const keyword = searchText.trim().toLowerCase();
      const searchMatched =
        keyword.length === 0 ||
        (user.name ?? "").toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        (user.loginId ?? "").toLowerCase().includes(keyword);

      return roleMatched && searchMatched;
    });
  }, [users, roleFilter, searchText]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">USERS</p>
        <h1 className="text-2xl font-black text-gray-900">회원 관리</h1>
        <p className="mt-2 text-sm text-gray-500">
          가입한 테스터/호스트 계정을 조회합니다. (현재 mock 데이터)
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="이름, 이메일, 로그인 아이디로 검색"
          className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />

        <div className="flex gap-2">
          {(["전체", "tester", "host"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                roleFilter === role
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {role === "전체" ? role : roleLabel[role]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-gray-500">불러오는 중...</p>
        ) : visibleUsers.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            {message || "조건에 맞는 회원이 없습니다."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">이름</th>
                  <th className="px-6 py-4 font-semibold">로그인 아이디</th>
                  <th className="px-6 py-4 font-semibold">이메일</th>
                  <th className="px-6 py-4 font-semibold">역할</th>
                  <th className="px-6 py-4 font-semibold">가입일</th>
                </tr>
              </thead>

              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-6 py-4 font-semibold">
                      {user.name ?? "이름 미설정"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.loginId ? `@${user.loginId}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                        {roleLabel[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(user.createdAt)}
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
