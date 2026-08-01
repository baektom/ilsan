-- 시작페이지 광고/이벤트 배너 테이블입니다.
-- 샘플 배너는 임의로 넣지 않습니다. 관리자 페이지 또는 SQL Editor에서 등록한
-- 데이터만 시작페이지에 표시됩니다.

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  link_url text,
  button_label text,
  background_color text not null default '#2563eb',
  text_color text not null default '#ffffff',
  placement text not null default 'home'
    check (placement in ('home')),
  is_active boolean not null default false,
  display_order integer not null default 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

comment on table public.banners is
'관리자 페이지에서 등록하고 시작페이지에 노출하는 광고/이벤트 배너';
comment on column public.banners.image_url is
'Supabase Storage 공개 URL 또는 외부 이미지 URL. 이미지가 없으면 배경색으로 표시';
comment on column public.banners.link_url is
'배너 버튼 이동 주소. 내부 주소는 /tests처럼, 외부 주소는 https://로 입력';
comment on column public.banners.is_active is
'true인 배너만 일반 사용자에게 노출';
comment on column public.banners.display_order is
'숫자가 작을수록 먼저 표시';
comment on column public.banners.starts_at is
'null이면 즉시 노출 가능';
comment on column public.banners.ends_at is
'null이면 종료일 없이 계속 노출 가능';

create index if not exists banners_public_display_idx
on public.banners (placement, is_active, display_order, created_at desc);

create or replace function public.set_banner_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_banner_updated_at on public.banners;

create trigger set_banner_updated_at
before update on public.banners
for each row execute procedure public.set_banner_updated_at();

alter table public.banners enable row level security;

drop policy if exists "Anyone can read active banners" on public.banners;
drop policy if exists "Admins can manage banners" on public.banners;

-- 일반 사용자는 활성화되어 있고 현재 노출 기간에 해당하는 배너만 볼 수 있습니다.
create policy "Anyone can read active banners"
on public.banners
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

-- 친구분이 만드는 관리자 페이지에서는 로그인한 사용자의 profiles.role이
-- admin인지 확인한 뒤 banners 테이블에 insert/update/delete하면 됩니다.
-- 이 정책 덕분에 관리자용 service role key를 브라우저에 넣을 필요가 없습니다.
create policy "Admins can manage banners"
on public.banners
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

