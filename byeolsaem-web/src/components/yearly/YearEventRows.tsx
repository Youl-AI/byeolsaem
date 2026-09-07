"use client";
import { useInView } from "@/hooks/useInView";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { toneLabel } from "@/components/ui/ToneBadge";
import { afterFirstSentence, firstSentence } from "@/lib/text";
import type { YearReadingEvent } from "@/lib/yearly-reading";

/**
 * 사건 카드 목록 — 좁은 화면과 감소 모드의 강(§11.5 A단계에서 정한 폴백).
 *
 * 강이 목차이고 풀이는 짚었을 때 나온다(스펙 §6.6). 예전처럼 열다섯 개를 전부
 * 펼쳐 두면 목차와 본문이 같은 내용을 두 번 쌓는다 — 접어 두고 누른 것만 연다.
 * 여닫기는 부모가 쥔다: 강(YearRiver)의 점을 누르면 그 카드가 열리며 스크롤한다.
 *
 * 카드 문법(스펙 C §6.1): 별 표기·날짜·결은 작게 위, 생활 문장의 첫 문장은 크게,
 * 삶의 어느 자리인지가 그 밑, 나머지는 접힌 본문. ●는 관심사에 걸린 날 — 머리글의
 * "금색 고리와 점"의 그 점이다.
 *
 * 카드 key에 연도를 넣는다. 사건 id는 `토성-태양-사각` 꼴이라 연도가 없어서,
 * 두 해에 같은 각도가 있으면 React가 같은 카드로 보고 재사용한다. 래퍼에는 key를
 * 두지 않는다 — useInView의 ref가 붙은 요소가 갈리면 관찰자가 옛 노드를 본다.
 */
export function YearEventRows({
  year,
  events,
  openId,
  onToggle,
}: {
  year: number;
  events: YearReadingEvent[];
  /** 지금 열려 있는 사건. 강의 점을 눌러 열어 줄 수 있도록 부모가 쥔다. */
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  const [frame, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={frame} data-in={inView ? "true" : "false"} className="mt-8 space-y-2.5">
      {events.map((event, i) => {
        const open = event.id === openId;
        const first = event.exact[0];
        return (
          <ReadingCard
            key={`${year}-${event.id}`}
            id={event.id}
            // 계단은 5에서 멈춘다 — 옆의 강은 해를 바꿀 때마다 1800ms에 걸쳐 다시
            // 그려지는데, 목록이 그 뒤로도 계속 계단을 밟으면 강과 따로 노는 화면으로
            // 읽힌다.
            index={Math.min(i, 5)}
            open={open}
            onToggle={() => onToggle(open ? null : event.id)}
            badge={
              <>
                {event.aspectSymbol}
                {"\uFE0E"}
              </>
            }
            meta={
              <>
                {/* 별표는 sr-only 문장(아래 plain)이 같은 말을 하므로 스크린리더에는
                    숨긴다 — 안 그러면 도형 이름과 문장이 겹쳐 두 번 읽힌다. */}
                {event.inLens && <span aria-hidden>● </span>}
                {`${event.moving.ko} ${event.aspectKo} 내 ${event.fixed.ko} · ${first.month}월 ${first.day}일${
                  event.exact.length > 1 ? ` 외 ${event.exact.length - 1}` : ""
                } · ${toneLabel(event.harmony)}`}
              </>
            }
            plain={
              <>
                {firstSentence(event.life)}
                {event.inLens && <span className="sr-only"> 관심사에 걸리는 날입니다.</span>}
              </>
            }
            where={event.area}
          >
            {afterFirstSentence(event.life) && <p>{afterFirstSentence(event.life)}</p>}
            <p>{event.basis}</p>
            <p className="text-meta">
              {event.dateLine} · {event.aspectKo} · {event.countLine} 힘이 도는 기간은 {event.span}입니다.
            </p>
          </ReadingCard>
        );
      })}
    </div>
  );
}
