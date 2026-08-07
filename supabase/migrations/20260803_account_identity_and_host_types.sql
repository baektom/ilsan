-- 계정 역할 분리, 전체 로그인 아이디 중복 방지, 기업/개인 호스트 정보를 추가합니다.
-- 기존 20260801 마이그레이션을 실행한 뒤 이 파일을 SQL Editor에서 한 번 실행하세요.

alter table public.profiles add column if not exists host_type text;
alter table public.profiles add column if not exists business_number text;
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists business_start_date text;
alter table public.profiles add column if not exists representative_name text;
alter table public.profiles add column if not exists business_verification_status text;
alter table public.profiles add column if not exists business_verified_at timestamptz;
alter table public.profiles add column if not exists business_verification_message text;

update public.profiles
set host_type = 'individual'
where role = 'host' and host_type is null;

update public.profiles
set business_verification_status = case
  when role = 'host' and host_type = 'business' then 'pending'
  else 'not_applicable'
end
where business_verification_status is null;

alter table public.profiles
alter column business_verification_status set default 'not_applicable';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
check (role in ('tester', 'host', 'admin'));

alter table public.profiles drop constraint if exists profiles_host_type_check;
alter table public.profiles add constraint profiles_host_type_check
check (
  (role = 'host' and host_type in ('individual', 'business'))
  or (role <> 'host' and host_type is null)
);

alter table public.profiles drop constraint if exists profiles_business_verification_status_check;
alter table public.profiles add constraint profiles_business_verification_status_check
check (business_verification_status in ('not_applicable', 'pending', 'verified', 'failed'));

-- 같은 아이디는 역할과 관계없이 서비스 전체에서 한 번만 사용할 수 있습니다.
do $$
begin
  if exists (
    select 1 from public.profiles
    where login_id is not null
    group by lower(trim(login_id))
    having count(*) > 1
  ) then
    raise exception '중복 login_id가 있습니다. 중복 계정을 먼저 정리한 뒤 다시 실행하세요.';
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_login_id_key;
drop index if exists public.profiles_login_id_key;
drop index if exists public.profiles_login_id_unique;
drop index if exists public.profiles_role_login_id_key;
drop index if exists public.profiles_login_id_global_key;

create unique index profiles_login_id_global_key
on public.profiles (lower(trim(login_id)))
where login_id is not null;

create or replace function public.is_login_id_available(input_login_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(trim(login_id)) = lower(trim(input_login_id))
  );
$$;

revoke all on function public.is_login_id_available(text) from public;
grant execute on function public.is_login_id_available(text) to anon, authenticated;

create or replace function public.get_email_by_login_id(input_login_id text, input_role text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles
  where lower(trim(login_id)) = lower(trim(input_login_id))
    and role = input_role
    and input_role in ('tester', 'host', 'admin')
  limit 1;
$$;

revoke all on function public.get_email_by_login_id(text, text) from public;
grant execute on function public.get_email_by_login_id(text, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'tester');
  requested_host_type text := new.raw_user_meta_data ->> 'host_type';
begin
  -- 관리자 계정은 공개 회원가입으로 생성하지 않습니다.
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
    nullif(lower(trim(new.raw_user_meta_data ->> 'login_id')), ''),
    requested_role,
    case when requested_role = 'host' then 'pending' else 'not_applicable' end,
    requested_host_type,
    case when requested_host_type = 'business' then nullif(regexp_replace(new.raw_user_meta_data ->> 'business_number', '\D', '', 'g'), '') else null end,
    case when requested_host_type = 'business' then nullif(trim(new.raw_user_meta_data ->> 'business_name'), '') else null end,
    case when requested_host_type = 'business' then nullif(regexp_replace(new.raw_user_meta_data ->> 'business_start_date', '\D', '', 'g'), '') else null end,
    case when requested_host_type = 'business' then nullif(trim(new.raw_user_meta_data ->> 'representative_name'), '') else null end,
    case when requested_host_type = 'business' then 'pending' else 'not_applicable' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.protect_profile_account_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.login_id is distinct from old.login_id
    or new.role is distinct from old.role
    or new.host_approval_status is distinct from old.host_approval_status
    or new.host_type is distinct from old.host_type
    or new.business_number is distinct from old.business_number
    or new.business_name is distinct from old.business_name
    or new.business_start_date is distinct from old.business_start_date
    or new.representative_name is distinct from old.representative_name
    or new.business_verification_status is distinct from old.business_verification_status
    or new.business_verified_at is distinct from old.business_verified_at
    or new.business_verification_message is distinct from old.business_verification_message
  ) then
    raise exception '계정 역할과 호스트 검증 정보는 서버 또는 관리자만 변경할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_account_fields on public.profiles;
create trigger protect_profile_account_fields
before update on public.profiles
for each row execute procedure public.protect_profile_account_fields();

notify pgrst, 'reload schema';
