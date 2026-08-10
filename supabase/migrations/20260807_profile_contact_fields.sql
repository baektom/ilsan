-- 테스터 프로필 저장 및 지원서 자동입력에 사용하는 공통 연락처 필드입니다.
-- 이미 컬럼이 존재하는 환경에서도 다시 실행할 수 있도록 if not exists를 사용합니다.
alter table public.profiles
  add column if not exists age integer,
  add column if not exists region text,
  add column if not exists phone text;

-- 잘못된 나이가 저장되지 않도록 허용 범위를 제한합니다.
alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check
  check (age is null or age between 1 and 120);
