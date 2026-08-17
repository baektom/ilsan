-- 한 명의 Auth 사용자(이메일 1개)가 테스터·개인 호스트·관리자 역할을 함께 가질 수 있게 합니다.
-- 역할마다 로그인 아이디는 별도로 보관하며, 아이디는 서비스 전체에서 중복될 수 없습니다.

create extension if not exists pgcrypto;

-- 다중 역할 프로필은 legacy profiles.role과 무관하게 호스트 정보를 가질 수 있습니다.
alter table public.profiles drop constraint if exists profiles_host_type_check;
alter table public.profiles add constraint profiles_host_type_check
check (host_type is null or host_type in ('individual', 'business'));

create table if not exists public.account_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('tester', 'host', 'admin')),
  login_id text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, role)
);

drop index if exists public.account_roles_login_id_global_key;
create unique index account_roles_login_id_global_key
on public.account_roles (lower(trim(login_id)));

-- 기존 profiles의 단일 역할과 아이디를 새 역할 테이블로 안전하게 옮깁니다.
insert into public.account_roles (profile_id, role, login_id)
select id, role, lower(trim(login_id))
from public.profiles
where role in ('tester', 'host', 'admin')
  and login_id is not null
on conflict (profile_id, role) do nothing;

alter table public.account_roles enable row level security;
drop policy if exists "Users can read own account roles" on public.account_roles;
create policy "Users can read own account roles"
on public.account_roles for select to authenticated
using (auth.uid() = profile_id);

-- 로그인 아이디 중복 확인은 역할 테이블 전체를 기준으로 합니다.
create or replace function public.is_login_id_available(input_login_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.account_roles
    where lower(trim(login_id)) = lower(trim(input_login_id))
  );
$$;

revoke all on function public.is_login_id_available(text) from public;
grant execute on function public.is_login_id_available(text) to anon, authenticated;

-- 역할별 아이디로 같은 Auth 사용자의 이메일을 찾습니다.
create or replace function public.get_email_by_login_id(input_login_id text, input_role text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profiles.email
  from public.account_roles
  join public.profiles on profiles.id = account_roles.profile_id
  where lower(trim(account_roles.login_id)) = lower(trim(input_login_id))
    and account_roles.role = input_role
    and input_role in ('tester', 'host', 'admin')
  limit 1;
$$;

revoke all on function public.get_email_by_login_id(text, text) from public;
grant execute on function public.get_email_by_login_id(text, text) to anon, authenticated;

-- 서버 전용 역할 연결 함수입니다. 역할 추가와 호스트 상태 변경을 한 트랜잭션으로 처리합니다.
create or replace function public.link_role_for_profile(
  input_profile_id uuid,
  input_target_role text,
  input_login_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  required_existing_role text;
  current_host_type text;
begin
  if input_target_role not in ('tester', 'host') then
    raise exception '연결할 수 없는 역할입니다.';
  end if;
  if lower(trim(input_login_id)) !~ '^[a-z0-9_]{4,20}$' then
    raise exception '아이디는 영문 소문자, 숫자, 밑줄로 4~20자 입력해야 합니다.';
  end if;

  required_existing_role := case when input_target_role = 'host' then 'tester' else 'host' end;

  if not exists (
    select 1 from public.account_roles
    where profile_id = input_profile_id and role = required_existing_role
  ) then
    raise exception '연결할 기존 역할 계정이 없습니다.';
  end if;
  if exists (
    select 1 from public.account_roles
    where profile_id = input_profile_id and role = input_target_role
  ) then
    raise exception '이미 해당 역할 아이디가 연결되어 있습니다.';
  end if;

  select host_type into current_host_type
  from public.profiles where id = input_profile_id;
  if current_host_type = 'business' then
    raise exception '기업 호스트 계정은 개인 계정 연결 기능을 사용할 수 없습니다.';
  end if;

  insert into public.account_roles (profile_id, role, login_id)
  values (input_profile_id, input_target_role, lower(trim(input_login_id)));

  if input_target_role = 'host' then
    update public.profiles set
      host_type = 'individual',
      host_approval_status = 'pending',
      business_verification_status = 'not_applicable',
      business_number = null,
      business_name = null,
      business_start_date = null,
      representative_name = null,
      business_verified_at = null,
      business_verification_message = null
    where id = input_profile_id;
  end if;

  return case when input_target_role = 'host' then '개인 호스트' else '테스터' end;
end;
$$;

revoke all on function public.link_role_for_profile(uuid, text, text) from public;
grant execute on function public.link_role_for_profile(uuid, text, text) to service_role;

-- 신규 이메일 가입 시 profiles 1개와 첫 역할 계정 1개를 함께 생성합니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'tester');
  requested_host_type text := new.raw_user_meta_data ->> 'host_type';
  requested_login_id text := nullif(lower(trim(new.raw_user_meta_data ->> 'login_id')), '');
begin
  if requested_role not in ('tester', 'host') then
    requested_role := 'tester';
  end if;
  if requested_role = 'host' and requested_host_type not in ('individual', 'business') then
    requested_host_type := 'individual';
  end if;
  if requested_role <> 'host' then
    requested_host_type := null;
  end if;

  insert into public.profiles (
    id, email, name, login_id, role, host_approval_status, host_type,
    business_number, business_name, business_start_date, representative_name,
    business_verification_status
  ) values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    requested_login_id,
    requested_role,
    case when requested_role = 'host' then 'pending' else 'not_applicable' end,
    requested_host_type,
    case when requested_host_type = 'business' then nullif(regexp_replace(new.raw_user_meta_data ->> 'business_number', '\D', '', 'g'), '') else null end,
    case when requested_host_type = 'business' then nullif(trim(new.raw_user_meta_data ->> 'business_name'), '') else null end,
    case when requested_host_type = 'business' then nullif(regexp_replace(new.raw_user_meta_data ->> 'business_start_date', '\D', '', 'g'), '') else null end,
    case when requested_host_type = 'business' then nullif(trim(new.raw_user_meta_data ->> 'representative_name'), '') else null end,
    case when requested_host_type = 'business' then 'pending' else 'not_applicable' end
  );

  insert into public.account_roles (profile_id, role, login_id)
  values (new.id, requested_role, requested_login_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 테스트 등록 권한: 연결된 호스트 역할 + 승인 상태를 모두 확인합니다.
drop policy if exists "Hosts can insert own tests" on public.tests;
drop policy if exists "Hosts can update own tests" on public.tests;
drop policy if exists "Hosts can delete own tests" on public.tests;

create policy "Hosts can insert own tests"
on public.tests for insert to authenticated
with check (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.profiles on profiles.id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Hosts can update own tests"
on public.tests for update to authenticated
using (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.profiles on profiles.id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
)
with check (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.profiles on profiles.id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Hosts can delete own tests"
on public.tests for delete to authenticated
using (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.profiles on profiles.id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

-- 지원 권한: 연결된 테스터 역할을 확인합니다.
drop policy if exists "Users can insert own applications" on public.applications;
drop policy if exists "Users and hosts can read applications" on public.applications;
drop policy if exists "Hosts can update applications" on public.applications;
drop policy if exists "Users can delete own applications" on public.applications;

create policy "Users can insert own applications"
on public.applications for insert to authenticated
with check (
  auth.uid() = tester_id
  and exists (
    select 1 from public.account_roles
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'tester'
  )
);

create policy "Users and hosts can read applications"
on public.applications for select to authenticated
using (
  (
    auth.uid() = tester_id
    and exists (
      select 1 from public.account_roles
      where account_roles.profile_id = auth.uid()
        and account_roles.role = 'tester'
    )
  )
  or exists (
    select 1
    from public.tests
    join public.account_roles on account_roles.profile_id = tests.host_id
    join public.profiles on profiles.id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Hosts can update applications"
on public.applications for update to authenticated
using (
  exists (
    select 1
    from public.tests
    join public.account_roles on account_roles.profile_id = tests.host_id
    join public.profiles on profiles.id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
)
with check (
  exists (
    select 1
    from public.tests
    join public.account_roles on account_roles.profile_id = tests.host_id
    join public.profiles on profiles.id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and account_roles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Users can delete own applications"
on public.applications for delete to authenticated
using (
  auth.uid() = tester_id
  and exists (
    select 1 from public.account_roles
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'tester'
  )
);

notify pgrst, 'reload schema';
