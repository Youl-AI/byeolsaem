"use client";
import { useLayoutEffect, useState } from "react";
import type { MoonPhaseKey } from "@/lib/moon";
import { moonPath } from "@/lib/moon-path";
import { onceInSession } from "@/lib/once";

/** 신월에서 오늘까지 차오르는 시간. 36프레임 — 보이되 기다리게 하지 않는다. */
const FILL_MS = 600;

/**
 * 오늘의 달. 카드 안 아치에 앉는다.
 *
 * 밝은 면의 비율을 그대로 그린다 — "보름달"이라고 쓰는 대신 실제로 그만큼 밝게
 * 그리면 글을 읽지 않아도 오늘이 어떤 밤인지 보인다. 경로 식은 moon-path.ts.
 *
 * `fill`이 있으면 마운트 뒤 0에서 오늘 값까지 600ms 동안 차오른다(스펙 B §3).
 * 하루 한 번 — 열쇠는 `byeolsaem:moon-fill:<YYYY-MM-DD>`. 위상(초승/그믐 방향)은
 * 보간 중에도 오늘 값 고정이다. transform·opacity 원칙의 유일한 예외로 SVG 좌표를
 * 갱신하는데, 108px 경로 하나라 레이아웃과 무관하다. 공유 카드(moonArt)는 이
 * 컴포넌트를 쓰지 않으므로 정적이다.
 *
 * useLayoutEffect인 이유: 첫 페인트 전에 0으로 내려야 한다. useEffect면 오늘 값이
 * 한 프레임 그려진 뒤 0으로 꺼져 깜박인다.
 */
export function MoonDisc({
  illumination,
  phase,
  fill = null,
}: {
  /** 0(안 보임)~1(가득). */
  illumination: number;
  phase: MoonPhaseKey;
  /** 차오름 연출의 세션 열쇠. null이면 정지 그림. */
  fill?: string | null;
}) {
  const r = 46;
  const [shown, setShown] = useState(illumination);

  useLayoutEffect(() => {
    if (
      !fill ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !onceInSession(fill)
    ) {
      setShown(illumination);
      return;
    }
    setShown(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FILL_MS);
      // 등장 곡선의 큐빅 근사 — 끝에서 부드럽게 멎는다.
      setShown(illumination * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [illumination, fill]);

  const d = moonPath(shown, phase, r);

  return (
    <svg viewBox="0 0 120 120" className="mx-auto mt-4 w-[108px]" aria-hidden>
      {/* 달 전체의 자리. 그늘진 부분도 완전히 사라지지는 않는다. */}
      <circle cx="60" cy="60" r={r} fill="var(--color-nebula)" opacity=".55" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-gold)" strokeWidth=".8" opacity=".35" />

      {d && <path d={d} fill="var(--color-starlight)" opacity=".92" />}

      {/* 가장자리 빛무리. 카드의 금빛과 이어지도록 아주 옅게. */}
      <circle
        cx="60"
        cy="60"
        r={r + 6}
        fill="none"
        stroke="var(--color-gold-soft)"
        strokeWidth="1"
        opacity=".14"
      />
    </svg>
  );
}
