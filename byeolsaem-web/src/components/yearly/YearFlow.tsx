"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { angleLabel } from "@/lib/basis";
import { refreshOnBodyGrowth } from "@/lib/pin";
import { ToneBadge } from "@/components/ui/ToneBadge";
import {
  TRACK_HEIGHT,
  TRACK_PATH,
  TRACK_WIDTH,
  centerFraction,
  maxShift,
  monthTicks,
  pickEventIndex,
  trackSpanPath,
  trackX,
  trackY,
} from "@/lib/year-track";
import type { YearReadingEvent } from "@/lib/yearly-reading";

gsap.registerPlugin(ScrollTrigger);

/**
 * 붙박인 무대 위를 한 해가 가로로 흐른다(스펙 §6.6, §11.5 A단계 확정 시안 2).
 *
 * 세로 스크롤이 강을 왼쪽으로 민다. 노드가 화면 중앙선을 지나면 그 사건의
 * 풀이가 강 아래 카드에 갈린다 — 강이 목차이고 풀이는 짚었을 때 나온다는
 * 스펙의 구조를, 짚는 손 대신 스크롤이 대신하는 것이다. 예전처럼 사건 15개를
 * 전부 펼쳐 세로로 쌓지 않으므로(실측 7.4화면의 정체) 페이지가 짧아진다.
 *
 * 이 컴포넌트는 넓은 화면 + 감소 모드 아님에서만 마운트된다(PersonalYear가
 * 고른다). 좁은 화면과 감소 모드는 접힌 목록(YearEventRows)으로 내려앉는다.
 *
 * 무대 고정은 CSS sticky가 한다. ScrollTrigger의 pin(스페이서 삽입)보다 지형
 * 변화가 없어, 출생 정보를 읽은 뒤에야 그려지는 이 페이지에서 어긋날 것이
 * 하나 적다. ScrollTrigger는 구간 진행률만 잰다.
 */
export function YearFlow({ year, events }: { year: number; events: YearReadingEvent[] }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const riverRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  /** 진행 막대의 폭. 스크롤마다 재면 핫패스에 레이아웃 읽기가 들어가므로
      ScrollTrigger가 새로 잴 때(생성·리사이즈)만 갱신한다. */
  const barWidth = useRef(0);
  const gradientId = useId();

  const [active, setActive] = useState(-1);
  const [month, setMonth] = useState(1);

  useLayoutEffect(() => {
    const zone = zoneRef.current;
    const clip = clipRef.current;
    const track = trackRef.current;
    const river = riverRef.current;
    if (!zone || !clip || !track || !river) return;

    const context = gsap.context(() => {
      const shift = () => maxShift(clip.clientWidth);

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: zone,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.25,
          invalidateOnRefresh: true,
          onRefresh: () => {
            barWidth.current = barRef.current?.clientWidth ?? 0;
          },
          onUpdate: (self) => {
            if (fillRef.current) {
              // width가 아니라 scaleX — 스크롤마다 도는 핫패스에서 width는 매번
              // 레이아웃을 다시 계산시킨다. ReadingProgress와 같은 이유·같은 방식.
              fillRef.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
            }
            if (dotRef.current) {
              // 채움의 끝을 따라가는 점. 막대를 scaleX로 늘이므로 점을 그 안에
              // 두면 같이 납작해진다 — 그래서 형제로 두고 따로 옮긴다.
              const x = (barWidth.current * self.progress).toFixed(1);
              dotRef.current.style.transform = `translate(calc(${x}px - 50%), -50%)`;
            }
            // 카드·달 표기는 화면에 실제로 보이는 위치(눅어진 x)를 따른다.
            // 진행률(스크럽 전 값)을 쓰면 강은 아직 안 왔는데 글이 먼저 바뀐다.
            const shown = -Number(gsap.getProperty(track, "x"));
            const centerT = centerFraction(shown, clip.clientWidth);
            setActive(pickEventIndex(centerT, events));
            setMonth(Math.min(12, Math.max(1, 1 + Math.floor(centerT * 12))));
          },
        },
      });

      timeline.to(track, { x: () => -shift(), ease: "none", duration: 1 }, 0);
      // 강물 선이 트랙과 같은 속도로 그어진다. 이미 다 그어진 강을 미는 것이
      // 아니라 스크롤이 강을 그리며 간다. 조금 일찍(0.87) 다 그어지는 것은
      // 마지막 구간에서 읽는 선이 강 끝을 넘어서기 때문이다.
      timeline.fromTo(
        river,
        { strokeDasharray: 1, strokeDashoffset: 1 },
        { strokeDashoffset: 0, ease: "none", duration: 0.87 },
        0,
      );

      const stopWatching = refreshOnBodyGrowth(() => ScrollTrigger.refresh());
      return () => stopWatching();
    }, zone);

    return () => context.revert();
  }, [events]);

  const current = active >= 0 ? events[active] : null;

  // 한 사건에 화면 4할쯤의 스크롤을 준다. 사건이 적은 해는 짧게 끝난다.
  const zoneHeight = `${Math.max(220, 120 + events.length * 40)}vh`;

  return (
    <div ref={zoneRef} className="relative" style={{ height: zoneHeight }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center">
        {/* 핀 구간이 길어 섹션 제목이 화면 밖으로 나가 있다. 지금 무엇을 보고
            있는지 무대 안에서 계속 말해 준다. */}
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">THE RIVER</p>
        <p className="mt-2 font-display text-lg text-starlight">
          {year}년, 당신의 날짜
          <span className="ml-3 text-guide font-normal text-starlight-dim">
            스크롤을 내리면 해가 흐릅니다
          </span>
        </p>
        <div ref={clipRef} className="mt-4 w-full overflow-hidden">
          <div ref={trackRef} className="flex will-change-transform">
            <svg
              viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
              width={TRACK_WIDTH}
              height={TRACK_HEIGHT}
              className="flex-none"
              role="img"
              aria-label={`${year}년에 각도가 정확해지는 날 ${events.length}개를 한 해의 흐름 위에 표시한 그림. 스크롤을 내리면 각 날짜의 풀이가 아래에 글로 나옵니다.`}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="var(--color-gold)" stopOpacity="0.2" />
                  <stop offset="0.5" stopColor="var(--color-gold)" stopOpacity="0.65" />
                  <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* 달 눈금 */}
              <g aria-hidden>
                {monthTicks(year).map(({ month: m, at }) => (
                  <g key={m}>
                    <line
                      x1={trackX(at)}
                      x2={trackX(at)}
                      y1={TRACK_HEIGHT - 34}
                      y2={TRACK_HEIGHT - 28}
                      stroke="var(--color-gold)"
                      strokeOpacity={0.3}
                    />
                    <text
                      x={trackX(at)}
                      y={TRACK_HEIGHT - 10}
                      textAnchor="middle"
                      className="font-latin"
                      fontSize="14"
                      fill="var(--color-starlight-dim)"
                    >
                      {m}
                    </text>
                  </g>
                ))}
                <line
                  x1={trackX(0)}
                  x2={trackX(1)}
                  y1={TRACK_HEIGHT - 31}
                  y2={TRACK_HEIGHT - 31}
                  stroke="var(--color-gold)"
                  strokeOpacity={0.16}
                />
              </g>

              <path
                ref={riverRef}
                d={TRACK_PATH}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="1.5"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
              />

              {events.map((event, index) => {
                const first = event.exact[0].at;
                const last = event.exact[event.exact.length - 1].at;
                const isActive = index === active;
                return (
                  <g key={event.id}>
                    {event.exact.length > 1 && (
                      <path
                        d={trackSpanPath(first, last)}
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
                        cx={trackX(date.at)}
                        cy={trackY(date.at)}
                        r="2.5"
                        fill="var(--color-gold)"
                        fillOpacity="0.55"
                      />
                    ))}
                    <circle
                      cx={trackX(first)}
                      cy={trackY(first)}
                      r={isActive ? 9 : 5.5}
                      fill={event.harmony > 0 ? "var(--color-gold-soft)" : "var(--color-ink)"}
                      stroke="var(--color-gold)"
                      strokeWidth="1.5"
                      className="transition-[r] duration-200"
                    />
                    {/* 관심사에 걸린 날은 금색 고리를 하나 더 두른다(머리글이 이 표시를 가리킨다). */}
                    {event.inLens && (
                      <circle
                        cx={trackX(first)}
                        cy={trackY(first)}
                        r={isActive ? 13 : 9.5}
                        fill="none"
                        stroke="var(--color-gold)"
                        strokeOpacity="0.65"
                        strokeWidth="1"
                        className="transition-[r] duration-200"
                      />
                    )}
                    <text
                      x={trackX(first)}
                      y={trackY(first) - 18}
                      textAnchor="middle"
                      fontSize="13"
                      fill="var(--color-starlight)"
                      opacity={isActive ? 1 : 0}
                      className="transition-opacity duration-200"
                    >
                      {event.exact[0].month}월 {event.exact[0].day}일 · {event.moving.ko}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 중앙선을 지난 사건의 풀이. 높이를 미리 잡아 두어 카드가 갈릴 때
            강과 진행 막대가 오르내리지 않게 한다. 카드에 진입 연출은 없다 —
            스크럽이 지나가며 초당 몇 번씩 바뀌는 자리라, 키프레임을 붙이면
            완주하지 못하고 계속 재시작해 깜빡인다(모션 감사 2026-08-22). */}
        <div className="mt-8 min-h-[240px]" aria-live="polite">
          {current ? (
            <div key={current.id} className="border-l-2 border-gold-soft pl-5">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-lg text-starlight">
                  <span className="astro-symbol">{current.moving.symbol}</span> {current.moving.ko}
                  <span className="mx-2 astro-symbol text-gold-soft">{current.aspectSymbol}</span>내{" "}
                  <span className="astro-symbol">{current.fixed.symbol}</span> {current.fixed.ko}
                </span>
                {/* 별 표기 옆 주석 — 건드려지는 자리의 생활 이름 + 강도 */}
                <span className="break-keep text-meta text-starlight-dim">— {current.area}</span>
                <ToneBadge harmony={current.harmony} />
                <span className="text-meta text-gold-soft">{current.dateLine}</span>
              </p>
              <p className="mt-3 max-w-[52ch] break-keep leading-relaxed text-starlight">
                {current.life}
              </p>
              <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">
                {current.caption}
              </p>
              <p className="mt-2 text-meta text-starlight-dim">
                {angleLabel(current.angle)} · {current.countLine} 힘이 도는 기간은{" "}
                {current.span}입니다.
              </p>
            </div>
          ) : (
            <p className="max-w-[52ch] break-keep text-guide text-starlight-dim">
              스크롤을 내리면 해가 흐릅니다. 점이 가운데를 지날 때마다 그날의 풀이가
              여기 나타납니다.
            </p>
          )}
        </div>

        {/* 한 해의 어디쯤인가.
            양 끝은 1월과 12월로 고정하고 점만 움직인다. 예전에는 왼쪽이 지금 달을
            따라 바뀌었는데, 자가 함께 움직이면 눈금을 읽을 수 없다 — 끝까지 내려간
            사람에게는 "12월 —— 12월"이 되어 고장으로 보이기까지 했다(2026-09-04). */}
        <div className="mt-6">
          <p className="text-meta text-starlight-dim">{month}월 어름을 지나는 중</p>
          <div className="mt-2 flex items-center gap-3 text-meta text-starlight-dim">
            <span className="w-8 flex-none">1월</span>
            <span ref={barRef} className="relative h-px flex-1 bg-gold/20">
              <span ref={fillRef} className="absolute inset-0 block origin-left bg-gold" style={{ transform: "scaleX(0)" }} />
              <span
                ref={dotRef}
                aria-hidden
                className="absolute left-0 top-1/2 block size-1.5 rounded-full bg-gold"
                style={{ transform: "translate(-50%, -50%)" }}
              />
            </span>
            <span className="w-8 flex-none text-right">12월</span>
          </div>
        </div>
      </div>
    </div>
  );
}
