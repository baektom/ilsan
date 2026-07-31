import Link from "next/link";

type Props = {
  params: {
    id: string;
  };
};

export default function TestDetailPage({ params }: Props) {
  return (
    <main style={{ padding: 32 }}>
      <h1>베타테스트 상세</h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}
      >
        <p>테스트 ID: {params.id}</p>
        <h2>신규 제품 베타테스터 모집</h2>
        <p>
          제품을 직접 사용해보고 간단한 설문과 후기를 작성하는 테스트입니다.
        </p>

        <ul>
          <li>모집 인원: 30명</li>
          <li>보상: 제품 제공 + 리워드</li>
          <li>진행 방식: 제품 수령 후 후기 제출</li>
        </ul>

        <Link href={`/tests/apply/${params.id}`}>신청하기</Link>
      </div>
    </main>
  );
}