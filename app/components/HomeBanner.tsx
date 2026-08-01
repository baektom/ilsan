"use client";

import { useEffect, useState } from "react";
import { getActiveHomeBanners } from "../../lib/supabase/banners";
import { createClient } from "../../lib/supabase/client";
import type { BannerRow } from "../../lib/supabase/types";

export default function HomeBanner() {
  const [supabase] = useState(() => createClient());
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let active = true;

    // 배너 테이블이 아직 생성되지 않았거나 등록된 배너가 없어도
    // 시작페이지 자체는 정상적으로 보이도록 조회 실패를 화면에 표시하지 않습니다.
    void getActiveHomeBanners(supabase)
      .then((data) => {
        if (active) setBanners(data);
      })
      .catch(() => {
        if (active) setBanners([]);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (banners.length < 2) return;

    const intervalId = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[currentIndex] ?? banners[0];
  const hasExternalLink = banner.link_url?.startsWith("http") ?? false;

  const moveBanner = (direction: -1 | 1) => {
    setCurrentIndex(
      (index) => (index + direction + banners.length) % banners.length
    );
  };

  return (
    <section
      aria-label="이벤트 및 광고 배너"
      className="relative mx-auto mb-10 min-h-52 w-full max-w-5xl overflow-hidden rounded-[32px] shadow-xl"
      style={{
        backgroundColor: banner.background_color,
        color: banner.text_color,
      }}
    >
      {banner.image_url && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${banner.image_url})` }}
        />
      )}

      {banner.image_url && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
      )}

      <div className="relative z-10 flex min-h-52 items-center px-8 py-10 pr-16 md:px-12">
        <div className="max-w-2xl text-left">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] opacity-80">
            Event
          </p>
          <h2 className="text-2xl font-black md:text-4xl">{banner.title}</h2>

          {banner.description && (
            <p className="mt-3 max-w-xl text-sm leading-6 opacity-90 md:text-base">
              {banner.description}
            </p>
          )}

          {banner.link_url && (
            <a
              href={banner.link_url}
              target={hasExternalLink ? "_blank" : undefined}
              rel={hasExternalLink ? "noreferrer" : undefined}
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-gray-900 shadow-md transition hover:-translate-y-0.5 hover:bg-gray-100"
            >
              {banner.button_label || "자세히 보기"}
            </a>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => moveBanner(-1)}
            aria-label="이전 배너"
            className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-xl font-bold text-white backdrop-blur hover:bg-black/40"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => moveBanner(1)}
            aria-label="다음 배너"
            className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-xl font-bold text-white backdrop-blur hover:bg-black/40"
          >
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`${index + 1}번째 배너 보기`}
                className={`h-2 rounded-full bg-white transition-all ${
                  index === currentIndex ? "w-7 opacity-100" : "w-2 opacity-50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
