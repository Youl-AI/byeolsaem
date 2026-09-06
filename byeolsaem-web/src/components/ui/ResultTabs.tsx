"use client";
import { useEffect, useRef, useState } from "react";

/**
 * 결과 화면의 구역 탭. 첫 화면 바로 아래에 붙어(sticky) 스크롤을 따라온다.
 *
 * 16Personalities·The Pattern·Co-Star가 전부 긴 결과를 탭으로 쪼갠다. 이 화면은
 * 11,105px인데 붙잡아 주는 것이 없어서 스크롤이 곧 미로였다(2026-09-06 실측).
 *
 * 탭은 링크다. 상태를 따로 갖지 않고 `#id`로 이동하며, 현재 위치는 관찰자가
 * 표시만 한다. 키보드로는 링크를 Tab으로 오가고 Enter로 이동한다.
 *
 * 밑줄은 300ms. 결과를 훑는 동안 여러 번 누르는 자리라 더 길면 손가락보다
 * 늦어진다 — 사용자가 시연을 보고 300ms로 정했다(2026-09-06).
 */
export function ResultTabs({ items }: { items: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(items[0]?.id ?? "");
  const nav = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  // 스크롤 스파이 — 화면 가운데 띠(40%~45%)를 지나는 섹션이 현재다.
  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // 밑줄 위치 — 현재 링크의 자리로.
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLAnchorElement>(`a[href="#${current}"]`);
    if (!el) return;
    setBar({ left: el.offsetLeft, width: el.offsetWidth });
    el.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [current]);

  return (
    <nav
      ref={nav}
      aria-label="결과 구역"
      className="sticky top-0 z-20 -mx-1 flex gap-x-5 overflow-x-auto border-b border-gold/20 bg-ink/95 px-1 pb-2.5 pt-3 text-meta backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={item.id === current ? "location" : undefined}
          className={`relative whitespace-nowrap pb-1 transition-colors duration-200 ${
            item.id === current ? "text-gold-soft" : "text-starlight-dim hover:text-starlight"
          }`}
        >
          {item.label}
        </a>
      ))}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-px bg-gold-soft transition-[left,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ left: bar.left, width: bar.width }}
        />
      )}
    </nav>
  );
}
