"use client";
import { useEffect, useState } from "react";
import { ASPECT_TYPES, formatPlacement, houseOf, type Chart } from "@/lib/chart";
import { HOUSES } from "@/content/atoms/houses";
import { onceInSession } from "@/lib/once";
import { PLANET_BY_KEY, PLANETS, type PlanetKey } from "@/lib/planets";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

/**
 * 천궁도 원반.
 *
 * 배치를 그대로 옮긴 그림이다. 바깥 띠는 열두 별자리, 그 안쪽은 하우스 경계,
 * 원 안의 선은 어스펙트다. 어느 것도 장식이 아니라 계산 결과다.
 *
 * 상승궁이 왼쪽(9시 방향)에 오도록 돌려 놓는다. 태어난 순간 동쪽 지평선에
 * 떠오르던 점이 상승궁이므로, 지평선을 가로선으로 놓으면 위가 하늘, 아래가
 * 땅이 된다. 황경은 그 지평선에서 반시계 방향으로 늘어난다 — 종이 위의 관습이
 * 아니라 하늘이 실제로 도는 방향이다.
 *
 * 태어난 시각을 모르면 상승궁이 없다. 그때는 양자리 0도를 왼쪽에 두고 하우스
 * 층을 통째로 비운다.
 *
 * 별 기호는 눌러 볼 수 있다. 기호만 봐서는 무엇인지 알 수 없고, 아래 본문까지
 * 내려가야 알 수 있다면 그림과 설명이 따로 노는 것이다(RENEWAL_PLAN §11.3).
 */

const SIZE = 480;
const CENTER = SIZE / 2;
const OUTER = 232;
const SIGN_BAND = 26;
const HOUSE_RING = OUTER - SIGN_BAND - 8;
const PLANET_RING = HOUSE_RING - 26;
const ASPECT_RING = PLANET_RING - 26;

function pointAt(longitude: number, rotation: number, radius: number) {
  // 화면 각도: 상승궁이 180도(왼쪽)에 오고 황경이 늘수록 반시계로 간다.
  const angle = (180 + (longitude - rotation)) * (Math.PI / 180);
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER - Math.sin(angle) * radius,
  };
}

export interface WheelSelection {
  planet: PlanetKey;
  /** 한 줄 설명. 원반 옆에 그대로 붙일 수 있는 형태로 만들어 내보낸다. */
  headline: string;
  detail: string;
}

/** 원반 밖(스크롤 투어)에서 밝힐 수 있는 대상. 행성 열 개 또는 상승궁. */
export type WheelSpotlight = PlanetKey | "ascendant";

/** 짚은 별의 한 줄 설명. 원반 안팎(호버, 스크롤 투어)이 같은 문장을 쓴다. */
export function describeSelection(chart: Chart, planet: PlanetKey): WheelSelection {
  const placement = chart.placements.find((p) => p.planet === planet)!;
  const body = PLANET_BY_KEY[planet];
  const house = chart.houseCusps
    ? HOUSES[houseOf(placement.longitude, chart.houseCusps) - 1]
    : null;
  return {
    planet,
    headline: `${body.ko} · ${formatPlacement(placement)}${
      house ? ` · ${house.number}하우스` : ""
    }`,
    detail: house ? `${body.governs} — ${house.ko}(${house.domain})에서.` : `${body.governs}.`,
  };
}

export function ChartWheel({
  chart,
  onSelect,
  onActiveChange,
  spotlight = null,
  entrance = null,
}: {
  chart: Chart;
  /** 기호를 눌렀을 때. 아래 본문의 그 별 자리로 데려가는 데 쓴다. */
  onSelect?: (planet: PlanetKey) => void;
  /** 커서를 올리거나 초점이 갔을 때. 옆에 설명을 띄우는 데 쓴다. */
  onActiveChange?: (selection: WheelSelection | null) => void;
  /**
   * 스크롤 투어가 밝히는 대상. 손이 짚은 별(active)이 있으면 그쪽이 이긴다 —
   * 기계가 정한 차례보다 사람이 지금 보고 있는 것이 먼저다.
   */
  spotlight?: WheelSpotlight | null;
  /** 세션 키를 주면 첫 방문에 850ms 등장 모션이 돈다. null이면 정지. */
  entrance?: string | null;
}) {
  // 등장은 마운트 뒤에 결정한다 — 서버 HTML은 완성 상태여야 하고(크롤러),
  // 세션 표식은 브라우저에만 있다.
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (entrance && onceInSession(entrance)) setEntering(true);
  }, [entrance]);

  const rotation = chart.ascendant ?? 0;
  const cusps = chart.houseCusps;
  const [active, setActive] = useState<PlanetKey | null>(null);
  /** 기호·어스펙트를 밝히는 기준. 호버가 우선이고 없으면 투어의 차례를 따른다. */
  const focus = active ?? (spotlight !== "ascendant" ? spotlight : null);
  const ascLit = active === null && spotlight === "ascendant";

  // 같은 자리에 두 별이 겹치면 기호가 포개져 읽을 수 없다. 황경이 가까운 것부터
  // 묶어 반지름을 조금씩 벌린다.
  const sorted = [...chart.placements].sort((a, b) => a.longitude - b.longitude);
  const radii = new Map<string, number>();
  let cluster = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const gap = previous ? sorted[i].longitude - previous.longitude : 999;
    cluster = gap < 9 ? cluster + 1 : 0;
    radii.set(sorted[i].planet, PLANET_RING - (cluster % 3) * 21);
  }

  // 등장 계단 순서 — 개인 → 사회 → 세대(PLANETS 배열 순서가 곧 그 순서다).
  const entranceOrder = new Map(PLANETS.map((p, i) => [p.key, i]));

  const describe = (planet: PlanetKey) => describeSelection(chart, planet);

  const enter = (planet: PlanetKey) => {
    setActive(planet);
    onActiveChange?.(describe(planet));
  };
  const leave = () => {
    setActive(null);
    onActiveChange?.(null);
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto w-full max-w-[min(92vw,480px)]"
      // 각 행성이 tabIndex를 가진 손잡이라 이 원반은 그림 하나가 아니라 묶음이다.
      // role="img"로 두면 "초점 갈 자식을 가진 이미지"가 되어 규격에 어긋난다.
      role="group"
      aria-label="태어난 순간의 행성 배치를 그린 천궁도 원반"
      data-entrance={entering ? "true" : undefined}
    >
      {/* 별자리 띠 */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={OUTER}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="1"
        opacity=".5"
        className="wheel-ring"
        pathLength={1}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
      <circle cx={CENTER} cy={CENTER} r={OUTER - SIGN_BAND} fill="none" stroke="var(--color-gold)" strokeWidth="1" opacity=".35" />

      {ZODIAC_SIGNS.map((sign, i) => {
        const start = i * 30;
        const edge = pointAt(start, rotation, OUTER);
        const inner = pointAt(start, rotation, OUTER - SIGN_BAND);
        const label = pointAt(start + 15, rotation, OUTER - SIGN_BAND / 2);
        return (
          <g key={sign.key} className="wheel-tick" style={{ animationDelay: `${120 + i * 40}ms` }}>
            <line x1={edge.x} y1={edge.y} x2={inner.x} y2={inner.y} stroke="var(--color-gold)" strokeWidth=".7" opacity=".4" />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill="var(--color-gold-soft)"
              opacity=".85"
            >
              {sign.ko.replace("자리", "")}
            </text>
          </g>
        );
      })}

      {/* 하우스 경계. 시각을 모르면 이 층이 통째로 없다. */}
      {cusps && (
        <>
          <circle cx={CENTER} cy={CENTER} r={HOUSE_RING} fill="none" stroke="var(--color-starlight)" strokeWidth=".6" opacity=".2" />
          {cusps.map((cusp, i) => {
            const outer = pointAt(cusp, rotation, OUTER - SIGN_BAND);
            const inner = pointAt(cusp, rotation, ASPECT_RING);
            // 1하우스(상승궁)와 10하우스(중천)는 굵게. 이 둘이 차트의 축이다.
            const axis = i === 0 || i === 9;
            // 투어가 상승궁 차례일 때 지평선(1하우스 경계)이 앞으로 나온다.
            const horizonLit = ascLit && i === 0;
            const number = pointAt(cusp + 15, rotation, HOUSE_RING - 11);
            return (
              <g key={cusp} className="wheel-tick" style={{ animationDelay: `${120 + i * 40}ms` }}>
                <line
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke={horizonLit ? "var(--color-gold-soft)" : axis ? "var(--color-gold)" : "var(--color-starlight)"}
                  strokeWidth={horizonLit ? 2 : axis ? 1.3 : 0.5}
                  opacity={horizonLit ? 1 : axis ? 0.75 : 0.18}
                  className="transition-[stroke-width,opacity,stroke,fill,font-size] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
                <text
                  x={number.x}
                  y={number.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fill="var(--color-starlight-dim)"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </>
      )}

      {/* 어스펙트. 두 별을 잇는 선이고, 정확한 각도에 가까울수록 진하다.
          별 하나가 짚어지면 그 별에 걸린 선만 남기고 나머지는 물러난다 —
          "이 별이 무엇과 이어져 있는가"가 그림에서 바로 보여야 한다. */}
      {chart.aspects.slice(0, 14).map((aspect, index) => {
        const a = chart.placements.find((p) => p.planet === aspect.a)!;
        const b = chart.placements.find((p) => p.planet === aspect.b)!;
        const from = pointAt(a.longitude, rotation, ASPECT_RING);
        const to = pointAt(b.longitude, rotation, ASPECT_RING);
        const harmonious = aspect.type.harmony > 0;
        const touched = focus === aspect.a || focus === aspect.b;
        const base = 0.15 + aspect.strength * 0.45;
        return (
          <line
            key={`${aspect.a}-${aspect.b}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={harmonious ? "var(--color-gold-soft)" : "var(--color-starlight-dim)"}
            strokeWidth={aspect.type.key === "conjunction" ? 0 : touched ? 1.6 : 0.9}
            opacity={focus ? (touched ? 0.95 : base * 0.25) : base}
            pathLength={1}
            style={{ animationDelay: `${500 + index * 60}ms` }}
            className="wheel-asp transition-[stroke-width,opacity,stroke,fill,font-size] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
        );
      })}
      <circle cx={CENTER} cy={CENTER} r={ASPECT_RING} fill="none" stroke="var(--color-starlight)" strokeWidth=".5" opacity=".14" />

      {/* 열 개의 별 */}
      {chart.placements.map((placement) => {
        const radius = radii.get(placement.planet) ?? PLANET_RING;
        const at = pointAt(placement.longitude, rotation, radius);
        const tick = pointAt(placement.longitude, rotation, OUTER - SIGN_BAND - 3);
        const planet = PLANET_BY_KEY[placement.planet];
        const lit = focus === placement.planet;
        const house = cusps ? HOUSES[houseOf(placement.longitude, cusps) - 1] : null;
        return (
          <g
            key={placement.planet}
            tabIndex={0}
            role="button"
            aria-label={`${planet.ko}, ${formatPlacement(placement)}${
              house ? `, ${house.number}하우스` : ""
            }. ${planet.governs}. 누르면 아래 설명으로 갑니다.`}
            onMouseEnter={() => enter(placement.planet)}
            onMouseLeave={leave}
            onFocus={() => enter(placement.planet)}
            onBlur={leave}
            onClick={() => onSelect?.(placement.planet)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(placement.planet);
              }
            }}
            className="wheel-glyph cursor-pointer outline-none [&:focus-visible>circle:first-of-type]:stroke-gold-soft"
            style={{ animationDelay: `${300 + (entranceOrder.get(placement.planet) ?? 0) * 30}ms` }}
          >
            {/* 손가락과 커서가 닿는 범위. 기호보다 넉넉해야 모바일에서 눌린다. */}
            <circle cx={at.x} cy={at.y} r="18" fill="transparent" stroke="transparent" strokeWidth="1.5" />
            <line
              x1={tick.x}
              y1={tick.y}
              x2={at.x}
              y2={at.y}
              stroke="var(--color-gold)"
              strokeWidth=".5"
              opacity={lit ? 0.85 : 0.3}
              className="transition-opacity duration-300"
            />
            {lit && (
              <circle
                cx={at.x}
                cy={at.y}
                r="15"
                fill="none"
                stroke="var(--color-gold-soft)"
                strokeWidth="1"
                opacity=".8"
              />
            )}
            <circle cx={at.x} cy={at.y} r="11" fill="var(--color-ink)" opacity=".85" />
            <text
              x={at.x}
              y={at.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="14"
              fill={lit ? "var(--color-gold-soft)" : "var(--color-starlight)"}
              className={`${
                placement.planet === "sun" || placement.planet === "moon" ? "wheel-core " : ""
              }astro-symbol transition-colors duration-300`}
            >
              {planet.symbol}
            </text>
            {placement.retrograde && (
              <text
                x={at.x + 11}
                y={at.y + 9}
                textAnchor="middle"
                fontSize="8"
                fill="var(--color-gold-soft)"
              >
                R
              </text>
            )}
          </g>
        );
      })}

      {/* 지평선의 두 끝. 왼쪽이 상승궁이다. */}
      {chart.ascendant !== null && (
        <>
          {ascLit && (
            <circle
              cx={CENTER - OUTER + SIGN_BAND}
              cy={CENTER}
              r="15"
              fill="none"
              stroke="var(--color-gold-soft)"
              strokeWidth="1"
              opacity=".8"
            />
          )}
          <text
            x={CENTER - OUTER - 2}
            y={CENTER - 8}
            textAnchor="start"
            fontSize={ascLit ? 12 : 10}
            fill={ascLit ? "var(--color-gold-soft)" : "var(--color-gold)"}
            letterSpacing="1"
            style={{ animationDelay: "600ms" }}
            className="wheel-core wheel-tick transition-[stroke-width,opacity,stroke,fill,font-size] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            ASC
          </text>
        </>
      )}
    </svg>
  );
}

/**
 * 원반 옆 범례.
 *
 * 예전에는 각도 이름을 글로만 나열했다. "육분 60도 · 사각 90도"를 읽어도 원반의
 * 어느 선이 그것인지 알 수 없다 — 이름과 그림이 이어지지 않으면 범례가 아니다.
 * 그래서 각 항목에 그 자리에서 실제로 쓰는 획을 함께 그린다.
 *
 * 목록은 <dl>이 아니라 <ul>이다. 뜻으로만 보면 용어와 설명이니 <dl>이 맞지만,
 * <dl>의 자식으로 허용되는 것은 <dt>/<dd>와 그 둘만 감싼 <div> 하나뿐이다.
 * 여기처럼 획 그림과 글을 두 칸으로 나누려면 <div>가 한 겹 더 필요해져 규격을
 * 벗어난다(2026-09-04 axe 검사에서 definition-list·dlitem 위반으로 잡혔다).
 * 목록이라는 뼈대는 <ul>로도 그대로 전해지므로 이쪽을 택했다.
 */
export function ChartWheelLegend() {
  return (
    <ul className="space-y-3 text-guide text-starlight">
      <LegendRow swatch={<BandSwatch />} term="바깥 띠">
        열두 별자리. 하늘을 30도씩 나눈 것입니다.
      </LegendRow>
      <LegendRow swatch={<HouseSwatch />} term="안쪽 칸과 번호">
        열두 하우스. 굵은 두 선이 이 차트의 축입니다 — 왼쪽이 상승궁, 위가 중천.
      </LegendRow>
      <LegendRow swatch={<AspectSwatch harmony />} term="금색 선">
        {aspectNames(1)}. 두 별의 힘이 서로 흘러 들어갑니다.
      </LegendRow>
      <LegendRow swatch={<AspectSwatch />} term="흐린 선">
        {aspectNames(-1)}. 두 별이 서로를 밀어 마찰이 생깁니다.
      </LegendRow>
      <LegendRow swatch={<RetrogradeSwatch />} term="기호 옆 R">
        그때 그 행성이 역행 중이었다는 표시입니다.
      </LegendRow>
    </ul>
  );
}

function aspectNames(harmony: number): string {
  return ASPECT_TYPES.filter((t) => t.harmony === harmony)
    .map((t) => `${t.ko} ${t.angle}도`)
    .join(" · ");
}

function LegendRow({
  swatch,
  term,
  children,
}: {
  swatch: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[34px_minmax(0,1fr)] items-start gap-x-3">
      <span className="pt-1" aria-hidden>
        {swatch}
      </span>
      <span className="min-w-0">
        <span className="font-display text-starlight">{term}</span>
        <span className="break-keep text-starlight-dim"> — {children}</span>
      </span>
    </li>
  );
}

/* 아래 네 도해는 원반에서 쓰는 획을 그대로 잘라 온 것이다. 굵기·색·투명도가
   달라지면 범례가 가리키는 것이 원반의 무엇인지 알 수 없게 된다. */

function BandSwatch() {
  return (
    <svg viewBox="0 0 34 18" className="w-full" aria-hidden>
      <path d="M2 15 A15 15 0 0 1 32 15" fill="none" stroke="var(--color-gold)" strokeWidth="1" opacity=".5" />
      <path d="M6 15 A11 11 0 0 1 28 15" fill="none" stroke="var(--color-gold)" strokeWidth="1" opacity=".35" />
      <line x1="17" y1="0" x2="17" y2="4" stroke="var(--color-gold)" strokeWidth=".7" opacity=".4" />
    </svg>
  );
}

function HouseSwatch() {
  return (
    <svg viewBox="0 0 34 18" className="w-full" aria-hidden>
      <path d="M4 16 A13 13 0 0 1 30 16" fill="none" stroke="var(--color-starlight)" strokeWidth=".6" opacity=".2" />
      <line x1="4" y1="16" x2="10" y2="16" stroke="var(--color-gold)" strokeWidth="1.3" opacity=".75" />
      <line x1="17" y1="3" x2="17" y2="9" stroke="var(--color-gold)" strokeWidth="1.3" opacity=".75" />
      <line x1="26" y1="8" x2="22" y2="12" stroke="var(--color-starlight)" strokeWidth=".5" opacity=".35" />
    </svg>
  );
}

function AspectSwatch({ harmony = false }: { harmony?: boolean }) {
  const stroke = harmony ? "var(--color-gold-soft)" : "var(--color-starlight-dim)";
  return (
    <svg viewBox="0 0 34 18" className="w-full" aria-hidden>
      <line x1="4" y1="13" x2="30" y2="5" stroke={stroke} strokeWidth="1.2" opacity={harmony ? 0.85 : 0.5} />
      <circle cx="4" cy="13" r="2.6" fill="var(--color-starlight)" opacity=".8" />
      <circle cx="30" cy="5" r="2.6" fill="var(--color-starlight)" opacity=".8" />
    </svg>
  );
}

function RetrogradeSwatch() {
  return (
    <svg viewBox="0 0 34 18" className="w-full" aria-hidden>
      <circle cx="14" cy="9" r="7" fill="var(--color-ink)" stroke="var(--color-starlight)" strokeWidth=".6" opacity=".85" />
      <text x="14" y="9" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="var(--color-starlight)">
        ♄
      </text>
      <text x="24" y="14" textAnchor="middle" fontSize="8" fill="var(--color-gold-soft)">
        R
      </text>
    </svg>
  );
}
