import Link from "next/link";

const summaryCards = [
  {
    title: "전체 회원",
    value: "1,248",
    description: "이번 달 86명 증가",
    icon: "👥",
    href: "/admin/users",
  },
  {
    title: "등록 기업",
    value: "84",
    description: "승인 대기 5개",
    icon: "🏢",
    href: "/admin/companies",
  },
  {
    title: "진행 중 이벤트",
    value: "27",
    description: "이번 주 4개 종료",
    icon: "📋",
    href: "/admin/events",
  },
  {
    title: "테스터 신청",
    value: "356",
    description: "미처리 신청 32건",
    icon: "🙋",
    href: "/admin/testers",
  },
];

const recentEvents = [
  {
    id: 1,
    title: "신규 모바일 게임 CBT 참가자 모집",
    company: "드림게임즈",
    status: "진행 중",
    applicants: 128,
  },
  {
    id: 2,
    title: "민감성 피부용 스킨케어 체험단",
    company: "뷰티랩",
    status: "승인 대기",
    applicants: 54,
  },
  {
    id: 3,
    title: "AI 학습 도우미 서비스 사용성 테스트",
    company: "에듀테크",
    status: "진행 중",
    applicants: 87,
  },
  {
    id: 4,
    title: "간편결제 앱 신규 기능 테스트",
    company: "페이플러스",
    status: "종료",
    applicants: 203,
  },
];

const recentUsers = [
  {
    id: 1,
    name: "김민지",
    email: "minji@example.com",
    type: "테스터",
    joinedAt: "2026.07.29",
  },
  {
    id: 2,
    name: "이서준",
    email: "seojun@example.com",
    type: "테스터",
    joinedAt: "2026.07.29",
  },
  {
    id: 3,
    name: "뷰티랩",
    email: "admin@beautylab.co.kr",
    type: "기업",
    joinedAt: "2026.07.28",
  },
  {
    id: 4,
    name: "박하늘",
    email: "haneul@example.com",
    type: "테스터",
    joinedAt: "2026.07.28",
  },
];

function getStatusStyle(status: string) {
  if (status === "진행 중") {
    return "bg-green-100 text-green-700";
  }

  if (status === "승인 대기") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-gray-100 text-gray-600";
}

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8 text-gray-900 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold text-blue-600">
              MOADREAM ADMIN
            </p>

            <h1 className="text-3xl font-black">관리자 대시보드</h1>

            <p className="mt-2 text-gray-500">
              모아드림 서비스의 주요 현황을 확인합니다.
            </p>
          </div>

          <Link
            href="/"
            className="w-fit rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold shadow-sm transition hover:bg-gray-100"
          >
            서비스 화면으로 이동
          </Link>
        </header>

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
                <h2 className="text-xl font-bold">최근 등록 이벤트</h2>
                <p className="mt-1 text-sm text-gray-500">
                  최근 등록되거나 변경된 테스트입니다.
                </p>
              </div>

              <Link
                href="/admin/events"
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                전체 보기
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">이벤트</th>
                    <th className="px-6 py-4 font-semibold">기업</th>
                    <th className="px-6 py-4 font-semibold">신청자</th>
                    <th className="px-6 py-4 font-semibold">상태</th>
                  </tr>
                </thead>

                <tbody>
                  {recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-t border-gray-100 text-sm"
                    >
                      <td className="px-6 py-5 font-semibold">{event.title}</td>
                      <td className="px-6 py-5 text-gray-500">
                        {event.company}
                      </td>
                      <td className="px-6 py-5">{event.applicants}명</td>
                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                            event.status,
                          )}`}
                        >
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

            <div className="divide-y divide-gray-100 px-6">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 py-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold">{user.name}</p>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                        {user.type}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm text-gray-500">
                      {user.email}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-gray-400">
                    {user.joinedAt}
                  </span>
                </div>
              ))}
            </div>
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
      </div>
    </main>
  );
}