"use client";
import { useMemo } from "react";
import type { CalendarEvent } from "@/lib/calendar-events";
import { eventTitle } from "@/lib/calendar-copy";
import { kstParts } from "@/lib/retrograde-clock";
import type { WeeklyTouch } from "@/lib/weekly-reading";
import { useInView } from "@/hooks/useInView";

const DAY_MS = 86400000;
const DOW_KO = ["월", "화", "수", "목", "금", "토", "일"];

/** 5각 별 path — 챕터스의 별길과 같은 꼴. */
function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const rad = ((i * 36 - 90) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)} ${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

interface DayCell {
  dow: string;
  monthDay: string;
  events: CalendarEvent[];
  touches: WeeklyTouch[];
  isToday: boolean;
}

/**
 * 일주일의 별길 — 챕터스가 쓰는 "선 위의 별" 문법을 일주일에 적용한다.
 * 길 위 = 하늘의 사건(삭망·역행은 별, 인그레스는 금색 점), 길 아래 = 내 차트에
 * 닿는 각(매달린 추), 오늘 = 숨쉬는 이중 링. 아래 목록들이 이 그림의 각주가 된다.
 */
export function WeekPath({
  weekStart,
  events,
  touches,
  now,
}: {
  weekStart: string;
  events: CalendarEvent[];
  touches: WeeklyTouch[] | null;
  now: Date | null;
}) {
  // 화면에 들어올 때 그어진다. 마운트에 맞춰 그으면 스크롤로 내려오는 동안
  // 끝나 버려 아무도 그어지는 것을 보지 못한다(GoldThreads와 같은 이유).
  const [frame, inView] = useInView<HTMLDivElement>(0.25);
  const days = useMemo<DayCell[]>(() => {
    const startMs = Date.parse(weekStart);
    const idxOf = (iso: string): number =>
      Math.min(6, Math.max(0, Math.floor((Date.parse(iso) - startMs) / DAY_MS)));
    const todayIdx = now ? Math.floor((now.getTime() - startMs) / DAY_MS) : -1;
    return Array.from({ length: 7 }, (_, i) => {
      const p = kstParts(new Date(startMs + i * DAY_MS).toISOString());
      return {
        dow: DOW_KO[i],
        monthDay: `${p.month}/${p.day}`,
        events: events.filter((ev) => idxOf(ev.date) === i),
        touches: (touches ?? []).filter((t) => idxOf(t.date) === i),
        isToday: i === todayIdx,
      };
    });
  }, [weekStart, events, touches, now]);

  const label = "이번 주 별길 — 길 위는 하늘의 사건, 길 아래는 내 차트에 닿는 각";
  return (
    <div
      ref={frame}
      data-in={inView ? "true" : "false"}
      className="transition-opacity duration-700 ease-out motion-reduce:opacity-100 motion-reduce:transition-none"
      style={{ transitionDelay: "150ms", opacity: inView ? 1 : 0 }}
    >
      <HorizontalPath days={days} label={label} className="hidden w-full sm:block" />
      <VerticalPath days={days} label={label} className="w-full max-w-[340px] sm:hidden" />
      <p className="mt-1 text-center text-meta text-starlight-dim sm:mt-0">
        길 위가 하늘의 사건, 길 아래가 내 별에 닿는 각도입니다
      </p>
    </div>
  );
}

function HorizontalPath({ days, label, className }: { days: DayCell[]; label: string; className: string }) {
  const W = 900;
  const LINE = 88;
  const X0 = 64;
  const X1 = W - 64;
  const x = (i: number): number => X0 + ((X1 - X0) * i) / 6;
  // 추 목록이 긴 날에 맞춰 아래 여백을 늘린다.
  const maxT = Math.max(0, ...days.map((d) => d.touches.length));
  const H = 168 + (maxT > 1 ? 14 : 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={label}>
      <line
        x1={X0 - 18}
        y1={LINE}
        x2={X1 + 18}
        y2={LINE}
        stroke="rgba(227,197,104,0.5)"
        strokeWidth={1.4}
        pathLength={1}
        className="week-line"
      />
      {days.map((d, i) => {
        const cx = x(i);
        const hasBig = d.events.some((ev) => ev.kind !== "ingress" && ev.kind !== "moon-ingress");
        const hasEvent = d.events.length > 0;
        return (
          <g key={d.dow} textAnchor="middle" className="week-stop" style={{ animationDelay: `${250 + 110 * i}ms` }}>
            {/* 요일과 날짜 — 길 바로 위 */}
            <text x={cx} y={LINE - 46} fill={d.isToday ? "var(--color-gold-soft)" : "rgba(154,150,168,0.85)"} fontSize={11.5} style={{ fontVariantNumeric: "tabular-nums" }}>
              {d.monthDay} {d.dow}
            </text>
            {/* 정거장 — 사건 있는 날은 별, 없는 날은 흐린 점 */}
            {hasBig ? (
              <path d={starPath(cx, LINE, 7.5)} fill="var(--color-gold)" />
            ) : (
              <circle cx={cx} cy={LINE} r={hasEvent ? 4 : 2.4} fill={hasEvent ? "var(--color-gold-soft)" : "rgba(232,228,216,0.4)"} />
            )}
            {d.isToday && (
              <circle cx={cx} cy={LINE} r={11} fill="none" stroke="var(--color-gold-soft)" strokeWidth={1.1} className="star-breathe week-today-ring" />
            )}
            {/* 사건 이름 — 길 위 */}
            {d.events.map((ev, j) => (
              <text key={ev.kind + ev.date} x={cx} y={LINE - 24 - j * 15} fill="var(--color-gold-soft)" fontSize={12} style={{ fontFamily: "var(--font-display)" }}>
                {eventTitle(ev)}
              </text>
            ))}
            {/* 내 차트에 닿는 각 — 길 아래 매달린 추 */}
            {d.touches.length > 0 && (
              <g className="week-stop" style={{ animationDelay: `${310 + 110 * i}ms` }}>
                <line x1={cx} y1={LINE + (hasBig ? 9 : 5)} x2={cx} y2={LINE + 32} stroke="rgba(154,150,168,0.5)" strokeWidth={1} />
                {d.touches.slice(0, 3).map((_, j) => (
                  <circle key={j} cx={cx} cy={LINE + 38 + j * 11} r={2.6} fill="rgba(232,228,216,0.75)" />
                ))}
                <text x={cx} y={LINE + 46 + Math.min(d.touches.length, 3) * 11} fill="rgba(154,150,168,0.9)" fontSize={10.5}>
                  {d.touches[0].movingKo}–{d.touches[0].fixedKo} {d.touches[0].angle === 0 ? "겹침" : `${d.touches[0].angle}°`}
                  {d.touches.length > 1 ? ` 외 ${d.touches.length - 1}` : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function VerticalPath({ days, label, className }: { days: DayCell[]; label: string; className: string }) {
  const W = 340;
  const ROW = 64;
  const H = 28 + days.length * ROW;
  const LINE = 26;
  const y = (i: number): number => 34 + i * ROW;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={label}>
      <line
        x1={LINE}
        y1={y(0) - 14}
        x2={LINE}
        y2={y(6) + 14}
        stroke="rgba(227,197,104,0.5)"
        strokeWidth={1.4}
        pathLength={1}
        className="week-line"
      />
      {days.map((d, i) => {
        const cy = y(i);
        const hasBig = d.events.some((ev) => ev.kind !== "ingress" && ev.kind !== "moon-ingress");
        const hasEvent = d.events.length > 0;
        return (
          <g key={d.dow} className="week-stop" style={{ animationDelay: `${250 + 110 * i}ms` }}>
            {hasBig ? (
              <path d={starPath(LINE, cy, 7)} fill="var(--color-gold)" />
            ) : (
              <circle cx={LINE} cy={cy} r={hasEvent ? 4 : 2.4} fill={hasEvent ? "var(--color-gold-soft)" : "rgba(232,228,216,0.4)"} />
            )}
            {d.isToday && (
              <circle cx={LINE} cy={cy} r={10.5} fill="none" stroke="var(--color-gold-soft)" strokeWidth={1.1} className="star-breathe week-today-ring" />
            )}
            <text x={LINE + 22} y={cy - 8} fill={d.isToday ? "var(--color-gold-soft)" : "rgba(154,150,168,0.85)"} fontSize={11} style={{ fontVariantNumeric: "tabular-nums" }}>
              {d.monthDay} {d.dow}
            </text>
            {d.events.length > 0 && (
              <text x={LINE + 22} y={cy + 8} fill="var(--color-gold-soft)" fontSize={12.5} style={{ fontFamily: "var(--font-display)" }}>
                {d.events.map((ev) => eventTitle(ev)).join(" · ")}
              </text>
            )}
            {d.touches.length > 0 && (
              <text
                x={LINE + 22}
                y={cy + (d.events.length > 0 ? 24 : 8)}
                fill="rgba(154,150,168,0.9)"
                fontSize={10.5}
                className="week-stop"
                style={{ animationDelay: `${310 + 110 * i}ms` }}
              >
                {d.touches[0].movingKo}–{d.touches[0].fixedKo} {d.touches[0].angle === 0 ? "겹침" : `${d.touches[0].angle}°`}
                {d.touches.length > 1 ? ` 외 ${d.touches.length - 1}` : ""}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
