-- 공고 카드에 조회수/지원자 수를 표시하기 위한 마이그레이션입니다.
-- 이미 SQL Editor에서 수동으로 실행했더라도, if not exists / or replace로
-- 다시 실행해도 안전하도록 작성했습니다.

alter table public.tests
  add column if not exists view_count int4 not null default 0;

alter table public.tests
  add column if not exists applicant_count int4 not null default 0;

-- 상세페이지 조회 시 view_count만 안전하게 올리기 위한 함수입니다.
-- tests 테이블 UPDATE 권한을 테스터에게 넓히지 않기 위해 SECURITY DEFINER로 만듭니다.
create or replace function public.increment_test_view_count(p_test_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tests set view_count = view_count + 1 where id = p_test_id;
$$;

grant execute on function public.increment_test_view_count(uuid) to authenticated, anon;

-- applications 테이블에 지원이 생기거나(insert) 취소되면(delete)
-- 해당 테스트의 applicant_count를 자동으로 맞춰줍니다.
create or replace function public.sync_test_applicant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.tests set applicant_count = applicant_count + 1 where id = new.test_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.tests set applicant_count = greatest(applicant_count - 1, 0) where id = old.test_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_test_applicant_count on public.applications;
create trigger trg_sync_test_applicant_count
after insert or delete on public.applications
for each row execute function public.sync_test_applicant_count();

-- 기존에 이미 쌓여있던 지원 건수를 한 번 반영합니다.
update public.tests t
set applicant_count = (
  select count(*) from public.applications a where a.test_id = t.id
);