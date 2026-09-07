"use client";
import { useId, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { monthTicks } from "@/lib/year-track";
import type { YearReadingEvent } from "@/lib/yearly-reading";

/**
 * 한 해가 흐르는 강. 노드 하나가 각도가 정확해지는 날이다(스펙 §6.6).
 *
 * 곡선을 손으로 그린 베지에가 아니라 식으로 둔 이유는 노드 자리 때문이다. 노드는
 * 실제 날짜 위에 앉아야 하는데, 임의의 x에서 베지에의 y를 얻으려면 브라우저에게
 * 경로를 재 달라고 해야 하고 그러면 그림이 측정 뒤에야 완성된다. 식이면 서버가
 * 만든 HTML에 이미 제자리에 있다.
 *
 * 폭은 640px 아래로 줄이지 않는다. 좁은 화면에서 통째로 축소하면 노드의 누를
 * 자리가 손가락보다 작아진다 — 대신 강을 옆으로 밀어 본다.
 */

const WIDTH = 960;
const HEIGHT = 210;
const LEFT = 42;
const RIGHT = WIDTH - 42;

/** 두 마루가 어긋나게 겹쳐 규칙적인 파도로 보이지 않게 한다. */
function riverY(t: number): number {
  return 112 - 45 * Math.sin(2 * Math.PI * t) + 17 * Math.sin(4 * Math.PI * t + 0.9);
}

function riverX(t: number): number {
  return LEFT + t * (RIGHT - LEFT);
}

const RIVER_PATH = Array.from({ length: 241 }, (_, i) => {
  const t = i / 240;
  return `${i === 0 ? "M" : "L"}${riverX(t).toFixed(1)} ${riverY(t).toFixed(1)}`;
}).join(" ");

export function YearRiver({
  year,
  events,
  onSelect,
}: {
  year: number;
  events: YearReadingEvent[];
  onSelect: (event: YearReadingEvent) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const gradientId = useId();
  // 강은 마운트가 아니라 **화면에 들어올 때** 그어진다. 이 그림은 페이지 절반
  // 아래에 있어서, 마운트에 맞춰 그으면 사람이 도착하기 전에 끝나 있다.
  const [frame, drawn] = useInView<HTMLDivElement>();

  return (
    <div ref={frame} className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full min-w-[640px]"
        role="img"
        aria-label={`${year}년에 각도가 정확해지는 날 ${events.length}개를 한 해의 흐름 위에 표시한 그림. 같은 내용이 아래 목록에 글로 있습니다.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-gold)" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="var(--color-gold)" stopOpacity="0.6" />
            <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* 달 눈금. 강 아래에 깔아 날짜를 읽을 수 있게 한다. */}
        <g aria-hidden>
          {monthTicks(year).map(({ month, at }) => (
            <g key={month}>
              <line
                x1={riverX(at)}
                x2={riverX(at)}
                y1={HEIGHT - 34}
                y2={HEIGHT - 28}
                stroke="var(--color-gold)"
                strokeOpacity={0.3}
              />
              <text
                x={riverX(at)}
                y={HEIGHT - 12}
                textAnchor="middle"
                className="font-latin"
                fontSize="14"
                fill="var(--color-starlight-dim)"
              >
                {month}
              </text>
            </g>
          ))}
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={HEIGHT - 31}
            y2={HEIGHT - 31}
            stroke="var(--color-gold)"
            strokeOpacity={0.16}
          />
        </g>

        <path
          d={RIVER_PATH}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          pathLength={1}
          className={drawn ? "animate-river-draw" : undefined}
          // 그어지기 전에는 길이 0으로 감춰 둔다. 애니메이션이 붙기 전까지 완성된
          // 선이 놓여 있으면, 화면에 들어오는 순간 그 선이 사라졌다 다시 그어진다.
          style={drawn ? undefined : { strokeDasharray: 1, strokeDashoffset: 1 }}
        />

        {events.map((event) => {
          const first = event.exact[0].at;
          const last = event.exact[event.exact.length - 1].at;
          const isActive = active === event.id;
          return (
            <g key={event.id}>
              {/* 여러 번에 걸쳐 지나가는 항목은 첫 날과 마지막 날 사이를 굵게
                  덧그어 "한 가지 일이 그만큼 이어진다"는 것을 보이게 한다. */}
              {event.exact.length > 1 && (
                <path
                  d={spanPath(first, last)}
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeOpacity={isActive ? 0.55 : 0.28}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )}
              {event.exact.slice(1).map((date) => (
                <circle
                  key={date.iso}
                  cx={riverX(date.at)}
                  cy={riverY(date.at)}
                  r="2.5"
                  fill="var(--color-gold)"
                  fillOpacity="0.55"
                />
              ))}

              <g
                tabIndex={0}
                role="button"
                aria-label={`${event.dateLine} — ${event.moving.ko} ${event.angle === 0 ? "겹침" : `${event.angle}도`} 내 ${event.fixed.ko}`}
                className="cursor-pointer outline-none"
                onClick={() => onSelect(event)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(event);
                  }
                }}
                onMouseEnter={() => setActive(event.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(event.id)}
                onBlur={() => setActive(null)}
              >
                {/* 누를 자리. 점 자체는 6px이라 손가락으로는 닿지 않는다. */}
                <circle cx={riverX(first)} cy={riverY(first)} r="17" fill="transparent" />
                <circle
                  cx={riverX(first)}
                  cy={riverY(first)}
                  r={isActive ? 8 : 5.5}
                  fill={event.harmony > 0 ? "var(--color-gold-soft)" : "var(--color-ink)"}
                  stroke="var(--color-gold)"
                  strokeWidth="1.5"
                  className={`transition-[r] duration-200 ${drawn ? "animate-node-rise" : ""}`}
                  // 선이 그 자리를 지나간 뒤에 뜬다. 강물이 데려다 놓은 것처럼 보인다.
                  style={drawn ? { animationDelay: `${300 + first * 1500}ms` } : { opacity: 0 }}
                />
                {isActive && (
                  <text
                    x={riverX(first)}
                    y={riverY(first) - 18}
                    textAnchor="middle"
                    fontSize="13"
                    fill="var(--color-starlight)"
                  >
                    {event.exact[0].month}월 {event.exact[0].day}일 · {event.moving.ko}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** 강줄기의 한 토막. 겹쳐 그으면 그 구간만 굵어진다. */
function spanPath(from: number, to: number): string {
  const steps = Math.max(2, Math.round((to - from) * 240));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / steps;
    return `${i === 0 ? "M" : "L"}${riverX(t).toFixed(1)} ${riverY(t).toFixed(1)}`;
  }).join(" ");
}
