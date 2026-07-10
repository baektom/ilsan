import Link from "next/link";

export default function HostLoginPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>호스트 로그인</h1>
      <p>기업 또는 모집 담당자가 테스트를 등록하고 신청자를 관리하는 공간입니다.</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 400,
          marginTop: 24,
        }}
      >
        <input style={{ padding: 8 }} placeholder="이메일" />
        <input style={{ padding: 8 }} placeholder="비밀번호" type="password" />

        <Link href="/host">로그인하기</Link>
      </div>
    </main>
  );
}