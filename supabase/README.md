# Supabase 적용 순서

기존 `profiles`, `tests`, `applications` 테이블이 만들어진 프로젝트를 기준으로 합니다. Supabase Dashboard의 **SQL Editor**에서 아래 파일을 순서대로 한 번씩 실행합니다.

1. `migrations/20260801_role_accounts_and_host_approval.sql`
2. `migrations/20260803_account_identity_and_host_types.sql`
3. `migrations/20260803_linked_role_accounts.sql`
4. 과거 배너 SQL을 실행했다면 `migrations/20260803_remove_home_banners.sql`

세 번째 SQL부터 계정은 다음 구조를 사용합니다.

- `auth.users`: 한 사람의 이메일 인증과 비밀번호를 담당합니다.
- `profiles`: 한 사람의 공통 프로필과 호스트 검증 정보를 저장합니다.
- `account_roles`: 테스터·호스트·관리자 역할과 역할별 로그인 아이디를 저장합니다.
- 한 프로필은 `tester`, `host`, `admin` 역할을 동시에 가질 수 있습니다.
- 역할별 로그인 아이디는 서로 달라야 하며 서비스 전체에서 중복될 수 없습니다.
- 동일 인물이 개인 테스터와 개인 호스트 역할을 연결하면 이메일 인증과 비밀번호는 하나를 공유합니다.
- 기업 호스트는 개인 역할 연결 대상에서 제외하고 별도 이메일 계정으로 가입합니다.

## 기존 계정에 역할 연결

회원가입 화면 아래의 작은 `기존 모아드림 테스터/호스트 가입 이력이 있나요?` 버튼을 사용합니다. 기존 역할 아이디와 비밀번호로 본인임을 확인한 뒤 새 역할 아이디를 입력합니다.

- 기존 테스터 → 개인 호스트 역할 추가
- 기존 개인 호스트 → 테스터 역할 추가
- 이메일 인증은 기존 Auth 사용자에서 이미 완료했으므로 다시 발송하지 않습니다.
- 개인 호스트 역할을 추가하면 `host_approval_status = 'pending'`이며 관리자 승인 후 활동합니다.
- 두 역할이 연결된 뒤에는 테스터·호스트 전환 시 로그아웃하지 않고 같은 세션으로 바로 이동합니다.
- 반대 역할이 아직 없을 때만 해당 역할의 회원가입·기존 계정 연결 화면을 엽니다.

## 개인 호스트 승인

관리자 화면이 완성되기 전에는 SQL Editor에서 역할별 아이디를 찾아 승인합니다.

```sql
update public.profiles
set host_approval_status = 'approved'
where id = (
  select profile_id
  from public.account_roles
  where role = 'host'
    and login_id = '승인할_호스트_아이디'
);
```

## 관리자 역할 추가

관리자는 공개 회원가입으로 만들지 않습니다. 기존 테스터 또는 호스트 프로필에 별도의 관리자 아이디를 추가할 수 있으며, 그러면 세 역할을 동시에 보유할 수도 있습니다.

```sql
insert into public.account_roles (profile_id, role, login_id)
select profile_id, 'admin', '새_관리자_로그인_아이디'
from public.account_roles
where login_id = '기존_테스터_또는_호스트_아이디'
on conflict (profile_id, role) do nothing;
```

이후 `/admin/login`에서 새 관리자 아이디와 기존 계정 비밀번호로 로그인합니다. 관리자 페이지를 확장할 때는 화면 검사뿐 아니라 관리 대상 테이블의 RLS에도 `account_roles.role = 'admin'` 조건을 추가해야 합니다.

## 국세청 사업자등록 확인 API

1. 공공데이터포털에서 **국세청_사업자등록정보 진위확인 및 상태조회 서비스** 활용신청을 합니다.
2. 발급된 일반 인증키를 로컬 `.env.local`과 배포 서버에만 저장합니다. Encoding/Decoding 형태를 모두 처리합니다.
3. 실제 키는 Git에 커밋하면 안 됩니다.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NTS_BUSINESS_API_KEY=...
```

기업 호스트가 이메일 인증 후 처음 호스트 홈에 접속하면 `/api/business/verify`가 국세청의 진위확인과 상태조회를 요청합니다. 브라우저에는 국세청 키나 Supabase service role 키가 노출되지 않습니다.
