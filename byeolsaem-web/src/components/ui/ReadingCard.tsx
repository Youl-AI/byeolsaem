"use client";
import React, { useId, useState } from "react";

/**
 * 결과 카드 한 장 — The Pattern의 카드 문법.
 *
 * 위에 작게 용어(`화성 · 처녀자리 25° · 1하우스`), 아래 크게 사람 말("밀어붙이는
 * 힘이 첫인상에 있습니다"), 그 아래 그 별의 첫 문장, 오른쪽 위 글리프. 점성술
 * 용어가 제목이 아니라 꼬리표다. "더 읽기"를 누르면 지금 화면의 본문이 그대로
 * 나온다 — 문장은 하나도 지우지 않았고 자리만 접혀 있다.
 *
 * 본문은 접혀 있어도 DOM에 있다. 크롤러가 보는 글은 줄지 않는다. 접힘은 기존
 * 아코디언과 같은 grid-template-rows 0fr→1fr 300ms.
 *
 * 진입 계단은 부모가 `data-in="true"`를 켤 때 시작한다(globals.css .reading-card).
 * index × 60ms 뒤에 각자 뜬다.
 *
 * 여닫기는 기본으로 카드가 스스로 쥔다. `open`을 주면 부모가 쥔다(한 해의 강 점이
 * 카드를 열어 주는 계약). `defaultOpen`은 처음부터 펼쳐 두는 카드(궁합의 이름 붙은
 * 조합). 포인터 진입/이탈은 궁합의 금실 밝히기가 쓴다 — 스펙 C §3.
 */
export const ReadingCard: React.FC<
  React.PropsWithChildren<{
    id?: string;
    badge: React.ReactNode;
    tech: string;
    plain: React.ReactNode;
    where: string;
    index?: number;
    defaultOpen?: boolean;
    open?: boolean;
    onToggle?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
  }>
> = ({
  id,
  badge,
  tech,
  plain,
  where,
  index = 0,
  defaultOpen = false,
  open,
  onToggle,
  onPointerEnter,
  onPointerLeave,
  children,
}) => {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const isOpen = open ?? selfOpen;
  const toggle = () => {
    if (onToggle) onToggle();
    if (open === undefined) setSelfOpen((v) => !v);
  };
  const bodyId = useId();
  return (
    <article
      id={id}
      className="reading-card relative scroll-mt-28 rounded-xl bg-ink-raised px-4 py-3.5"
      style={{ animationDelay: `${index * 60}ms` }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span aria-hidden className="astro-symbol absolute right-4 top-3 text-base text-gold-soft">
        {badge}
      </span>
      <p className="pr-8 text-[0.72rem] tracking-[0.05em] text-starlight-dim tabular-nums">{tech}</p>
      <p className="mt-0.5 break-keep font-display text-base leading-snug text-starlight">{plain}</p>
      <p className="mt-1 break-keep text-meta text-starlight-dim">{where}</p>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}
        className="mt-2 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
      >
        {isOpen ? "접기" : "더 읽기"}
      </button>
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-w-[52ch] space-y-2 break-keep pt-3 leading-relaxed text-starlight-dim">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
};
