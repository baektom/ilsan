"use client";

import { useRouter } from "next/navigation";
import AuthModal from "../../components/AuthModal";

export default function AdminLoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50">
      <AuthModal
        initialMode="login"
        accountRole="admin"
        allowSignup={false}
        onClose={() => router.push("/")}
        onAuthSuccess={() => router.push("/admin")}
      />
    </main>
  );
}
