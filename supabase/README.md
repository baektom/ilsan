# Supabase 적용 순서

1. Supabase Dashboard의 **SQL Editor**를 엽니다.
2. `migrations/20260801_role_accounts_and_host_approval.sql` 전체를 실행합니다.
3. 새 호스트 계정으로 회원가입하면 `profiles.host_approval_status`가 `pending`으로 저장되는지 확인합니다.

관리자 페이지가 완성되기 전에는 SQL Editor에서 아래처럼 승인할 수 있습니다.

```sql
update public.profiles
set host_approval_status = 'approved'
where role = 'host'
  and login_id = '승인할_호스트_아이디';
```

승인 대기 호스트 목록은 아래 쿼리로 확인합니다.

```sql
select id, email, login_id, name, created_at
from public.profiles
where role = 'host'
  and host_approval_status = 'pending'
order by created_at asc;
```

테스터와 호스트는 서로 다른 Supabase Auth 사용자입니다. 따라서 같은 사람이 두 역할을 모두 사용하려면 역할별로 각각 회원가입해야 하며, Supabase Auth의 이메일 고유성 때문에 서로 다른 이메일 주소가 필요합니다.

## 시작페이지 광고 배너

`migrations/20260801_home_banners.sql`도 SQL Editor에서 한 번 실행해야 합니다.
샘플 데이터는 자동으로 추가하지 않으며, `banners` 테이블에 관리자가 등록한
활성 배너만 시작페이지에 표시됩니다.

관리자 페이지에서 사용할 주요 필드는 다음과 같습니다.

- `title`: 배너 제목(필수)
- `description`: 설명
- `image_url`: Supabase Storage 공개 URL 또는 외부 이미지 URL
- `link_url`: 버튼을 눌렀을 때 이동할 주소
- `button_label`: 버튼 문구. 비어 있으면 `자세히 보기`
- `background_color`, `text_color`: 이미지가 없거나 로딩 중일 때 사용할 색상
- `is_active`: 실제 노출 여부
- `display_order`: 작은 숫자가 먼저 노출
- `starts_at`, `ends_at`: 예약 노출 기간. 비워두면 시작/종료 제한 없음

관리자 페이지의 목록 조회·등록·수정·삭제는 `profiles.role = 'admin'`인 사용자만
RLS 정책을 통과합니다. 브라우저 코드에는 절대로 Supabase service role key를 넣지 마세요.

관리자 페이지에서 등록할 때는 아래 형태로 Supabase 클라이언트를 사용하면 됩니다.

```ts
// 관리자 로그인 세션이 있는 브라우저에서 실행합니다.
// 처음에는 is_active: false로 저장해 초안으로 만든 뒤 활성화하는 방식을 권장합니다.
const { error } = await supabase.from("banners").insert({
  title: form.title,
  description: form.description || null,
  image_url: form.imageUrl || null,
  link_url: form.linkUrl || null,
  button_label: form.buttonLabel || null,
  background_color: form.backgroundColor || "#2563eb",
  text_color: form.textColor || "#ffffff",
  placement: "home",
  is_active: false,
  display_order: Number(form.displayOrder) || 0,
  starts_at: form.startsAt || null,
  ends_at: form.endsAt || null,
  created_by: user.id,
});
```
