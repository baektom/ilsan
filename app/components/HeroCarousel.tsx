"use client";

import { ReactNode, useRef, useState } from "react";

type HeroCarouselProps = {
  slides: ReactNode[];
  accentColor?: "blue" | "purple";
};

// 홈 상단 히어로 배너를 스와이프/드래그로 넘길 수 있는 캐러셀입니다.
// 화살표는 배너 좌우 중앙에, 굵고 크게 배치합니다.
export default function HeroCarousel({
  slides,
  accentColor = "blue",
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const startXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const goTo = (nextIndex: number) => {
    const total = slides.length;
    setIndex(((nextIndex % total) + total) % total);
  };

  const handleDragStart = (clientX: number) => {
    startXRef.current = clientX;
    draggingRef.current = true;
  };

  const handleDragEnd = (clientX: number) => {
    if (!draggingRef.current || startXRef.current === null) {
      return;
    }

    const diff = clientX - startXRef.current;
    const swipeThreshold = 50;

    if (diff > swipeThreshold) {
      goTo(index - 1);
    } else if (diff < -swipeThreshold) {
      goTo(index + 1);
    }

    draggingRef.current = false;
    startXRef.current = null;
  };

  const cancelDrag = () => {
    draggingRef.current = false;
    startXRef.current = null;
  };

  const arrowClass =
    accentColor === "purple"
      ? "bg-purple-600 hover:bg-purple-700"
      : "bg-blue-600 hover:bg-blue-700";

  const dotActiveClass =
    accentColor === "purple" ? "bg-purple-600" : "bg-blue-600";

  return (
    <div className="relative touch-pan-y select-none overflow-hidden rounded-[36px]">
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onMouseDown={(event) => handleDragStart(event.clientX)}
        onMouseUp={(event) => handleDragEnd(event.clientX)}
        onMouseLeave={cancelDrag}
        onTouchStart={(event) => handleDragStart(event.touches[0].clientX)}
        onTouchEnd={(event) => handleDragEnd(event.changedTouches[0].clientX)}
      >
        {slides.map((slide, slideIndex) => (
          <div key={slideIndex} className="min-h-[520px] w-full shrink-0 md:min-h-[430px]">
            {slide}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="이전 배너"
        className={`absolute left-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full text-3xl font-black text-white shadow-xl transition ${arrowClass}`}
      >
        ‹
      </button>

      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="다음 배너"
        className={`absolute right-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full text-3xl font-black text-white shadow-xl transition ${arrowClass}`}
      >
        ›
      </button>

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            onClick={() => goTo(dotIndex)}
            aria-label={`배너 ${dotIndex + 1}로 이동`}
            className={`h-2.5 rounded-full transition-all ${
              dotIndex === index
                ? `${dotActiveClass} w-7`
                : "w-2.5 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}