-- 테스터/호스트 계정을 역할별로 분리하고 호스트 승인제를 적용합니다.
-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 한 번 실행하세요.

alter table public.profiles
add column if not exists host_approval_status text;

update public.profiles
set host_approval_status = case
  when role = 'host' then 'approved'
  else 'not_applicable'
end
where host_approval_status is null;

alter table public.profiles
alter column host_approval_status set default 'not_applicable';

alter table public.profiles
alter column host_approval_status set not null;

alter table public.profiles
drop constraint if exists profiles_host_approval_status_check;

alter table public.profiles
add constraint profiles_host_approval_status_check
check (
  host_approval_status in ('not_applicable', 'pending', 'approved', 'rejected')
);

-- 같은 로그인 아이디를 테스터와 호스트가 각각 하나씩 가질 수 있게 합니다.
alter table public.profiles
drop constraint if exists profiles_login_id_key;

drop index if exists public.profiles_login_id_key;
drop index if exists public.profiles_role_login_id_key;

create unique index profiles_role_login_id_key
on public.profiles (role, lower(login_id))
where login_id is not null;

-- 새 Auth 사용자의 metadata.role을 고정 계정 역할로 저장합니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'tester');

  if requested_role not in ('tester', 'host') then
    requested_role := 'tester';
  end if;

  insert into public.profiles (
    id, email, name, login_id, role, host_approval_status
  )
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(lower(trim(new.raw_user_meta_data ->> 'login_id')), ''),
    requested_role,
    case when requested_role = 'host' then 'pending' else 'not_applicable' end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 로그인 아이디는 현재 접속하려는 역할 안에서만 조회합니다.
drop function if exists public.get_email_by_login_id(text);

create or replace function public.get_email_by_login_id(
  input_login_id text,
  input_role text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(login_id) = lower(trim(input_login_id))
    and role = input_role
    and input_role in ('tester', 'host')
  limit 1;
$$;

revoke all on function public.get_email_by_login_id(text, text) from public;
grant execute on function public.get_email_by_login_id(text, text)
to anon, authenticated;

-- 일반 사용자는 자신의 역할 또는 승인 상태를 직접 바꿀 수 없습니다.
create or replace function public.protect_profile_account_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.role is distinct from old.role
    or new.host_approval_status is distinct from old.host_approval_status
  ) then
    raise exception '계정 역할과 호스트 승인 상태는 관리자가 변경해야 합니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_account_fields on public.profiles;

create trigger protect_profile_account_fields
before update on public.profiles
for each row execute procedure public.protect_profile_account_fields();

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 승인된 호스트만 테스트를 등록하거나 수정/삭제할 수 있습니다.
drop policy if exists "Hosts can insert own tests" on public.tests;
drop policy if exists "Hosts can update own tests" on public.tests;
drop policy if exists "Hosts can delete own tests" on public.tests;

create policy "Hosts can insert own tests"
on public.tests for insert to authenticated
with check (
  auth.uid() = host_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Hosts can update own tests"
on public.tests for update to authenticated
using (
  auth.uid() = host_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
)
with check (
  auth.uid() = host_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Hosts can delete own tests"
on public.tests for delete to authenticated
using (
  auth.uid() = host_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

-- 지원은 테스터 계정만, 지원자 관리는 승인된 호스트만 가능합니다.
drop policy if exists "Users can insert own applications" on public.applications;
drop policy if exists "Users and hosts can read applications" on public.applications;
drop policy if exists "Hosts can update applications" on public.applications;
drop policy if exists "Users can delete own applications" on public.applications;

create policy "Users can insert own applications"
on public.applications for insert to authenticated
with check (
  auth.uid() = tester_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'tester'
  )
);

create policy "Users and hosts can read applications"
on public.applications for select to authenticated
using (
  (
    auth.uid() = tester_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'tester'
    )
  )
  or exists (
    select 1
    from public.tests
    join public.profiles on profiles.id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Hosts can update applications"
on public.applications for update to authenticated
using (
  exists (
    select 1
    from public.tests
    join public.profiles on profiles.id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
)
with check (
  exists (
    select 1
    from public.tests
    join public.profiles on profiles.id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and profiles.role = 'host'
      and profiles.host_approval_status = 'approved'
  )
);

create policy "Users can delete own applications"
on public.applications for delete to authenticated
using (
  auth.uid() = tester_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'tester'
  )
);

