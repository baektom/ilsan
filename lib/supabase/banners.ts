import type { SupabaseClient } from "@supabase/supabase-js";
import type { BannerRow } from "./types";

// 관리자 페이지 연결 안내:
// 관리자는 banners 테이블에 데이터를 추가/수정하고, 일반 사용자는 이 함수로
// 현재 시작페이지에 노출 가능한 배너만 읽습니다. 기간 판정은 DB의 RLS 정책에서도
// 한 번 더 검사하므로 비활성/기간 만료 배너가 일반 사용자에게 노출되지 않습니다.
export async function getActiveHomeBanners(
  supabase: SupabaseClient
): Promise<BannerRow[]> {
  const { data, error } = await supabase
    .from("banners")
    .select(
      "id, title, description, image_url, link_url, button_label, background_color, text_color, placement, is_active, display_order, starts_at, ends_at, created_at, updated_at"
    )
    .eq("placement", "home")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BannerRow[];
}
