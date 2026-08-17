-- 기업 호스트 계정은 테스터·개인 호스트 계정 연결 대상에서 완전히 제외합니다.
-- 기업 호스트는 하나의 독립 Auth 사용자와 host 역할 하나만 가져야 합니다.

do $$
begin
  if exists (
    select 1
    from public.profiles
    join public.account_roles
      on account_roles.profile_id = profiles.id
    where profiles.host_type = 'business'
      and account_roles.role <> 'host'
  ) then
    raise exception '기업 호스트 프로필에 tester 또는 admin 역할이 함께 연결되어 있습니다. 해당 계정을 먼저 분리해 주세요.';
  end if;
end;
$$;

create or replace function public.enforce_business_host_account_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_host_type text;
begin
  select host_type
  into target_host_type
  from public.profiles
  where id = new.profile_id;

  if target_host_type = 'business' and new.role <> 'host' then
    raise exception '기업 호스트 계정에는 tester 또는 admin 역할을 연결할 수 없습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_business_host_account_role
on public.account_roles;

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
    select 1
    from public.account_roles
    where profile_id = new.id
      and role <> 'host'
  ) then
    raise exception '테스터 또는 관리자 역할이 연결된 프로필은 기업 호스트로 변경할 수 없습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_business_host_profile_isolation
on public.profiles;

create trigger enforce_business_host_profile_isolation
before insert or update of host_type
on public.profiles
for each row execute procedure public.enforce_business_host_profile_isolation();

notify pgrst, 'reload schema';

-- 기존 데이터 점검용:
-- select profiles.id, profiles.email, account_roles.role, account_roles.login_id
-- from public.profiles
-- join public.account_roles on account_roles.profile_id = profiles.id
-- where profiles.host_type = 'business' and account_roles.role <> 'host';
