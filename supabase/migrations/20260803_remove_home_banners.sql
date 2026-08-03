-- 홈 광고 배너 기능을 제거합니다. 기존 데이터도 함께 삭제되므로 필요하면 먼저 백업하세요.
drop table if exists public.banners cascade;
drop function if exists public.set_banner_updated_at();
notify pgrst, 'reload schema';
