import React from "react";
import { Term } from "./Term";

/**
 * "왜 이게 보이나요" 소제목과 근거 세 줄 — `ReadingCard`와 주간 화면의 `TouchRow`가
 * 함께 쓴다(스펙 §5). 전에는 `WeeklyCard.tsx`의 `TouchRow`가 이 블록을 손으로 다시
 * 써서 하우스 점선 용어(`withHouseTerm`)를 빠뜨리고 있었다 — 다섯 화면이 한 문법을
 * 쓴다는 원칙이 여기서만 두 번째 구현으로 갈라져 있었다. 비어 있으면 아무것도 안
 * 그린다(소제목도 없다, 스펙 §3.1).
 */
export function BasisLines({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="border-t border-gold/15 pt-3">
      <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">왜 이게 보이나요</p>
      {lines.map((line, i) => (
        <p key={i} data-basis-line className="mt-1.5 text-meta">
          {withHouseTerm(line)}
        </p>
      ))}
    </div>
  );
}

/** "7하우스(마주 앉는 관계)"의 '하우스'에 점선 용어를 붙인다. 없으면 그대로. */
export function withHouseTerm(line: string): React.ReactNode {
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
