const applicants = [
  {
    id: 1,
    name: "김민지",
    test: "신규 화장품 베타테스터 모집",
    status: "대기중",
  },
  {
    id: 2,
    name: "이준호",
    test: "모바일 게임 CBT 참여자 모집",
    status: "대기중",
  },
];

export default function ApplicantsPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>신청자 확인</h1>

      <div style={{ marginTop: 24 }}>
        {applicants.map((applicant) => (
          <div
            key={applicant.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <h2>{applicant.name}</h2>
            <p>신청 테스트: {applicant.test}</p>
            <p>상태: {applicant.status}</p>

            <div style={{ display: "flex", gap: 8 }}>
              <button>수락</button>
              <button>거절</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}