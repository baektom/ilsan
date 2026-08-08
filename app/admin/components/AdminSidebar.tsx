"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "대시보드", icon: "📊" },
  { href: "/admin/users", label: "회원 관리", icon: "👥" },
  { href: "/admin/companies", label: "기업 관리", icon: "🏢" },
  { href: "/admin/tests", label: "테스트 관리", icon: "📋" },
  { href: "/admin/applicants", label: "지원자 통계", icon: "🙋" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-white px-4 py-6 md:block">
      <p className="mb-6 px-2 text-lg font-black text-blue-600">
        모아드림 관리자
      </p>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
