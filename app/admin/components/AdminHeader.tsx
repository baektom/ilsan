"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminLogout } from "../../../lib/admin/auth";
import type { AdminProfile } from "../../../lib/admin/types";

type AdminHeaderProps = {
  admin: AdminProfile;
  onLoggedOut: () => void;
};

export default function AdminHeader({ admin, onLoggedOut }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await adminLogout();
    onLoggedOut();
    router.push("/admin/login");
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs font-semibold text-gray-400">MOADREAM ADMIN</p>
        <p className="text-sm font-bold text-gray-700">
          {admin.name ?? "관리자"} · {admin.email}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          서비스 화면으로 이동
        </Link>

        <button
          onClick={handleLogout}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
