"use client";
import React, { useId, useState } from "react";
import { Term } from "./Term";

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
 *
 * 카드는 네 질문에 네 자리로 답한다(스펙 2026-09-08 §3). `meta`는 어디·언제·얼마나
 * 드문가, `plain`은 무슨 일인가, `advice`는 무엇을 하라, `basis`는 왜 이게
 * 나왔나. 별 이름과 각도는 `basis` 세 줄에만 있다 — 겉면은 사람 말만 한다.
 * `basis`의 "하우스"에는 점선 용어를 붙인다. 조립 함수는 문자열만 만들고 감싸는
 * 것은 여기서 한다.
 */
export const ReadingCard: React.FC<
  React.PropsWithChildren<{
    id?: string;
    badge: React.ReactNode;
    meta: React.ReactNode;
    plain: React.ReactNode;
    where: string;
    index?: number;
    defaultOpen?: boolean;
    open?: boolean;
    onToggle?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    advice?: { try: string; hold: string } | null;
    /** 0~1. 느린 별의 통과에만 있다. */
    progress?: { value: number; peaks: number[] } | null;
    basis?: readonly string[] | null;
  }>
> = ({
  id,
  badge,
  meta,
  plain,
  where,
  index = 0,
  defaultOpen = false,
  open,
  onToggle,
  onPointerEnter,
  onPointerLeave,
  advice,
  progress,
  basis,
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
      className="reading-card relative scroll-mt-28 rounded-xl bg-ink-raised px-4 py-3.5"
      id={id}
      style={{ animationDelay: `${index * 60}ms` }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span aria-hidden className="astro-symbol absolute right-4 top-3 text-base text-gold-soft">
        {badge}
      </span>
      <p className="pr-8 text-[0.72rem] tracking-[0.05em] text-starlight-dim tabular-nums">{meta}</p>
      {progress && (
        <div
          aria-hidden
          data-progress={Math.round(progress.value * 100)}
          className="relative mt-1.5 h-0.5 w-full max-w-[52ch] bg-gold/25"
        >
          <div className="h-full bg-gold" style={{ width: `${Math.round(progress.value * 100)}%` }} />
          {progress.peaks.map((p, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-soft"
              style={{ left: `${Math.round(p * 100)}%` }}
            />
          ))}
        </div>
      )}
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
            {advice && (
              <div className="border-l-2 border-gold/45 bg-gold/[0.06] py-3 pl-4 pr-3 text-guide">
                <p>
                  <b className="font-normal text-gold-soft">해 볼 것</b> {advice.try}
                </p>
                <p className="mt-1">
                  <b className="font-normal text-gold-soft">미룰 것</b> {advice.hold}
                </p>
              </div>
            )}
            {children}
            {basis && basis.length > 0 && (
              <div className="border-t border-gold/15 pt-3">
                <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">왜 이게 보이나요</p>
                {basis.map((line, i) => (
                  <p key={i} data-basis-line className="mt-1.5 text-meta">
                    {withHouseTerm(line)}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

/** "7하우스(마주 앉는 관계)"의 '하우스'에 점선 용어를 붙인다. 없으면 그대로. */
function withHouseTerm(line: string): React.ReactNode {
  const at = line.indexOf("하우스");
  if (at === -1) return line;
  return (
    <>
      {line.slice(0, at)}
      <Term name="하우스" />
      {line.slice(at + "하우스".length)}
    </>
  );
}
