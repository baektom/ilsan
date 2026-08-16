"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentAdmin } from "../../lib/admin/auth";
import type { AdminProfile } from "../../lib/admin/types";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";

type GuardStatus = "checking" | "authorized" | "denied";

function AdminFullscreenMessage({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">{text}</p>
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [status, setStatus] = useState<GuardStatus>("checking");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    (async () => {
      const result = await getCurrentAdmin();
      setAdmin(result);
      setStatus(result ? "authorized" : "denied");
    })();
  }, []);

  // 리다이렉트는 렌더링 중이 아니라 이펙트 안에서만 실행합니다.
  // (렌더링 중 router.replace를 직접 호출하면 "Cannot update a component (Router)
  // while rendering a different component (AdminLayout)" 에러가 발생합니다.)
  useEffect(() => {
    if (pathname === "/admin/login") return;
    if (status === "denied") {
      router.replace("/admin/login");
    }
  }, [status, pathname, router]);

  // 로그인 페이지는 가드/셸을 적용하지 않습니다(적용하면 무한 리다이렉트가 됩니다).
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (status === "checking") {
    return <AdminFullscreenMessage text="확인 중..." />;
  }

  if (status === "denied" || !admin) {
    return <AdminFullscreenMessage text="로그인 페이지로 이동 중..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1">
        <AdminHeader admin={admin} onLoggedOut={() => setStatus("denied")} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
