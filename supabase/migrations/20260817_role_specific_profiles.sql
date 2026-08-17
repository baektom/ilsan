-- 공통 계정과 역할별 정보를 분리합니다.
-- profiles: Auth 사용자 공통 정보
-- account_roles: 보유 역할과 역할별 로그인 아이디
-- tester_profiles / host_profiles: 각 역할에서만 사용하는 정보

create table if not exists public.tester_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  age integer check (age is null or age between 1 and 120),
  region text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  host_type text not null default 'individual'
    check (host_type in ('individual', 'business')),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  business_number text,
  business_name text,
  business_start_date text,
  representative_name text,
  business_verification_status text not null default 'not_applicable'
    check (business_verification_status in ('not_applicable', 'pending', 'verified', 'failed')),
  business_verified_at timestamptz,
  business_verification_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (host_type = 'individual' and business_verification_status = 'not_applicable')
    or host_type = 'business'
  )
);

-- 기존 데이터는 보유 역할을 기준으로 새 역할별 테이블에 복사합니다.
insert into public.tester_profiles (profile_id, age, region, phone)
select profiles.id, profiles.age, profiles.region, profiles.phone
from public.profiles
join public.account_roles on account_roles.profile_id = profiles.id
where account_roles.role = 'tester'
on conflict (profile_id) do update set
  age = excluded.age,
  region = excluded.region,
  phone = excluded.phone;

insert into public.host_profiles (
  profile_id, host_type, approval_status,
  business_number, business_name, business_start_date, representative_name,
  business_verification_status, business_verified_at,
  business_verification_message
)
select
  profiles.id,
  coalesce(profiles.host_type, 'individual'),
  case
    when profiles.host_approval_status in ('pending', 'approved', 'rejected')
      then profiles.host_approval_status
    else 'pending'
  end,
  profiles.business_number,
  profiles.business_name,
  profiles.business_start_date,
  profiles.representative_name,
  case
    when coalesce(profiles.host_type, 'individual') = 'business'
      then coalesce(nullif(profiles.business_verification_status, 'not_applicable'), 'pending')
    else 'not_applicable'
  end,
  profiles.business_verified_at,
  profiles.business_verification_message
from public.profiles
join public.account_roles on account_roles.profile_id = profiles.id
where account_roles.role = 'host'
on conflict (profile_id) do update set
  host_type = excluded.host_type,
  approval_status = excluded.approval_status,
  business_number = excluded.business_number,
  business_name = excluded.business_name,
  business_start_date = excluded.business_start_date,
  representative_name = excluded.representative_name,
  business_verification_status = excluded.business_verification_status,
  business_verified_at = excluded.business_verified_at,
  business_verification_message = excluded.business_verification_message;

alter table public.tester_profiles enable row level security;
alter table public.host_profiles enable row level security;

drop policy if exists "Users can read own tester profile" on public.tester_profiles;
drop policy if exists "Users can update own tester profile" on public.tester_profiles;
drop policy if exists "Users can read own host profile" on public.host_profiles;

create policy "Users can read own tester profile"
on public.tester_profiles for select to authenticated
using (auth.uid() = profile_id);

create policy "Users can update own tester profile"
on public.tester_profiles for update to authenticated
using (
  auth.uid() = profile_id
  and exists (
    select 1 from public.account_roles
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'tester'
  )
)
with check (auth.uid() = profile_id);

create policy "Users can read own host profile"
on public.host_profiles for select to authenticated
using (auth.uid() = profile_id);

-- 기존 profiles 기반 보호·분리 트리거를 역할별 테이블 기준으로 교체합니다.
drop trigger if exists protect_profile_account_fields on public.profiles;
drop function if exists public.protect_profile_account_fields();
drop trigger if exists enforce_business_host_account_role on public.account_roles;
drop trigger if exists enforce_business_host_profile_isolation on public.profiles;
drop function if exists public.enforce_business_host_account_role();
drop function if exists public.enforce_business_host_profile_isolation();

create or replace function public.enforce_business_host_account_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'host' and exists (
    select 1 from public.host_profiles
    where profile_id = new.profile_id
      and host_type = 'business'
  ) then
    raise exception '기업 호스트 계정에는 tester 또는 admin 역할을 연결할 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger enforce_business_host_account_role
before insert or update of profile_id, role
on public.account_roles
for each row execute procedure public.enforce_business_host_account_role();

create or replace function public.enforce_business_host_profile_isolation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.host_type = 'business' and exists (
    select 1 from public.account_roles
    where profile_id = new.profile_id
      and role <> 'host'
  ) then
    raise exception '테스터 또는 관리자 역할이 연결된 계정은 기업 호스트로 변경할 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger enforce_business_host_profile_isolation
before insert or update of host_type
on public.host_profiles
for each row execute procedure public.enforce_business_host_profile_isolation();

-- 역할 연결 시 해당 역할의 상세 프로필도 함께 생성합니다.
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
  if exists (
    select 1 from public.host_profiles
    where profile_id = input_profile_id and host_type = 'business'
  ) then
    raise exception '기업 호스트 계정은 개인 계정 연결 기능을 사용할 수 없습니다.';
  end if;

  insert into public.account_roles (profile_id, role, login_id)
  values (input_profile_id, input_target_role, lower(trim(input_login_id)));

  if input_target_role = 'tester' then
    insert into public.tester_profiles (profile_id)
    values (input_profile_id)
    on conflict (profile_id) do nothing;
  else
    insert into public.host_profiles (profile_id, host_type, approval_status)
    values (input_profile_id, 'individual', 'pending')
    on conflict (profile_id) do nothing;
  end if;

  return case when input_target_role = 'host' then '개인 호스트' else '테스터' end;
end;
$$;

revoke all on function public.link_role_for_profile(uuid, text, text) from public;
grant execute on function public.link_role_for_profile(uuid, text, text) to service_role;

-- 새 가입 시 공통 프로필, 역할, 역할별 상세 프로필을 한 트랜잭션으로 생성합니다.
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

  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  );

  insert into public.account_roles (profile_id, role, login_id)
  values (new.id, requested_role, requested_login_id);

  if requested_role = 'tester' then
    insert into public.tester_profiles (profile_id)
    values (new.id);
  else
    insert into public.host_profiles (
      profile_id, host_type, approval_status,
      business_number, business_name, business_start_date, representative_name,
      business_verification_status
    ) values (
      new.id,
      requested_host_type,
      'pending',
      case when requested_host_type = 'business' then nullif(regexp_replace(new.raw_user_meta_data ->> 'business_number', '\D', '', 'g'), '') end,
      case when requested_host_type = 'business' then nullif(trim(new.raw_user_meta_data ->> 'business_name'), '') end,
      case when requested_host_type = 'business' then nullif(regexp_replace(new.raw_user_meta_data ->> 'business_start_date', '\D', '', 'g'), '') end,
      case when requested_host_type = 'business' then nullif(trim(new.raw_user_meta_data ->> 'representative_name'), '') end,
      case when requested_host_type = 'business' then 'pending' else 'not_applicable' end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 테스트 권한은 host_profiles 승인 상태를 기준으로 판단합니다.
drop policy if exists "Hosts can insert own tests" on public.tests;
drop policy if exists "Hosts can update own tests" on public.tests;
drop policy if exists "Hosts can delete own tests" on public.tests;

create policy "Hosts can insert own tests"
on public.tests for insert to authenticated
with check (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.host_profiles on host_profiles.profile_id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
);

create policy "Hosts can update own tests"
on public.tests for update to authenticated
using (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.host_profiles on host_profiles.profile_id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
)
with check (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.host_profiles on host_profiles.profile_id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
);

create policy "Hosts can delete own tests"
on public.tests for delete to authenticated
using (
  auth.uid() = host_id
  and exists (
    select 1 from public.account_roles
    join public.host_profiles on host_profiles.profile_id = account_roles.profile_id
    where account_roles.profile_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
);

-- 지원서 열람·상태 변경 시에도 역할과 호스트 승인을 함께 확인합니다.
drop policy if exists "Users and hosts can read applications" on public.applications;
drop policy if exists "Hosts can update applications" on public.applications;

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
    join public.host_profiles on host_profiles.profile_id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
);

create policy "Hosts can update applications"
on public.applications for update to authenticated
using (
  exists (
    select 1
    from public.tests
    join public.account_roles on account_roles.profile_id = tests.host_id
    join public.host_profiles on host_profiles.profile_id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
)
with check (
  exists (
    select 1
    from public.tests
    join public.account_roles on account_roles.profile_id = tests.host_id
    join public.host_profiles on host_profiles.profile_id = tests.host_id
    where tests.id = applications.test_id
      and tests.host_id = auth.uid()
      and account_roles.role = 'host'
      and host_profiles.approval_status = 'approved'
  )
);

-- 역할 현황을 한눈에 볼 수 있는 읽기 전용 요약 뷰입니다.
drop view if exists public.account_profile_overview;
create view public.account_profile_overview
with (security_invoker = true)
as
select
  profiles.id,
  profiles.email,
  profiles.name,
  coalesce(
    array_agg(account_roles.role order by account_roles.created_at)
      filter (where account_roles.role is not null),
    array[]::text[]
  ) as roles,
  max(account_roles.login_id) filter (where account_roles.role = 'tester') as tester_login_id,
  max(account_roles.login_id) filter (where account_roles.role = 'host') as host_login_id,
  max(account_roles.login_id) filter (where account_roles.role = 'admin') as admin_login_id,
  profiles.created_at
from public.profiles
left join public.account_roles on account_roles.profile_id = profiles.id
group by profiles.id, profiles.email, profiles.name, profiles.created_at;

-- 이제 profiles에는 실제 공통 정보만 남깁니다.
drop function if exists public.get_email_by_login_id(text);
drop index if exists public.profiles_login_id_global_key;
drop index if exists public.profiles_login_id_unique;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_host_type_check;
alter table public.profiles drop constraint if exists profiles_host_approval_status_check;
alter table public.profiles drop constraint if exists profiles_business_verification_status_check;
alter table public.profiles drop constraint if exists profiles_age_check;

alter table public.profiles
  drop column if exists login_id,
  drop column if exists role,
  drop column if exists host_approval_status,
  drop column if exists host_type,
  drop column if exists business_number,
  drop column if exists business_name,
  drop column if exists business_start_date,
  drop column if exists representative_name,
  drop column if exists business_verification_status,
  drop column if exists business_verified_at,
  drop column if exists business_verification_message,
  drop column if exists age,
  drop column if exists region,
  drop column if exists phone;

notify pgrst, 'reload schema';
