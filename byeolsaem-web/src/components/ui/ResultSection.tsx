"use client";
import { useInView } from "@/hooks/useInView";

/**
 * 결과 화면의 구역 — natal에서 만들어 궁합·오늘·한 해가 함께 쓴다(스펙 C §3).
 *
 * 좌측 정렬 섹션. 제목 오른쪽으로 금선이 뻗어 읽는 폭의 끝을 표시한다.
 *
 * `id`는 탭바의 앵커이자 스크롤 스파이의 관찰 대상이다. `scroll-mt-32`(128px)는
 * 머리글 64px + 붙박이 탭바 약 48px을 함께 비운 것 — 앵커로 뛰면 제목이 둘 중
 * 어느 것에도 숨지 않는다. 96px(`scroll-mt-24`)로는 둘의 합에 모자랐다.
 */
export function ResultSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-32">
      <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        {title}
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>
      {children}
    </section>
  );
}

/**
 * 카드 묶음 구역. 화면에 들어오면 data-in을 켜서 카드 계단이 시작된다.
 *
 * 카드는 이 div의 **직계 자식**이어야 한다 — globals.css의 진입 규칙이
 * `[data-in="true"] > .reading-card`라서 중간에 li나 래퍼가 끼면 켜지지 않는다.
 */
export function CardSection({
  id,
  title,
  intro,
  aside,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  /**
   * 카드 위에 서는 그림. 카드 묶음 div 밖에 둔다 — 진입 규칙이 그 div의 직계
   * 자식만 보므로, 안에 넣으면 카드가 아닌 것이 카드 계단에 끼어든다.
   */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <ResultSection id={id} title={title}>
      {intro && (
        <p className="mb-4 max-w-[52ch] break-keep text-guide text-starlight-dim">{intro}</p>
      )}
      {aside}
      <div ref={ref} data-in={inView ? "true" : "false"} className="space-y-2.5">
        {children}
      </div>
    </ResultSection>
  );
}
