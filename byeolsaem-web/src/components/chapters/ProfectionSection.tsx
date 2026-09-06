"use client";
import { useEffect, useState } from "react";
import { HOUSE_BY_NUMBER } from "@/content/atoms/houses";
import { LineDiamond } from "@/components/ui/LineDiamond";
import type { ProfectionYear } from "@/lib/time-lords";
import { SIGN_SYMBOL } from "@/lib/zodiac";

/** "2026-07-14" -> "2026. 7" — 사이트의 날짜 표기 관례(선행 0 없음). */
const yearMonth = (iso: string): string => {
  const [y, m] = iso.split("-");
  return `${y}. ${Number(m)}`;
};

/**
 * 올해의 부적 카드 + 시계 다이얼("시계와 문" 컨셉, 2026-08-27 승인).
 *
 * 프로펙션은 12년에 한 바퀴 도는 시계다 — 12칸 그리드는 그 구조를 숨기고,
 * 다이얼은 그대로 드러낸다. 바깥 링이 열두 자리, 안쪽 숫자가 그 자리가 오는
 * 나이, 바늘이 올해를 가리킨다. 자리·방 설명은 기존 원자를 재사용한다.
 *
 * 계산 결과는 마운트 뒤에야 나타나므로 첫 등장에 짧은 연출을 준다: 카드가
 * 떠오르고, 바늘이 반 시간쯤 뒤에서 돌아와 올해에 멈춘다. reduced-motion에서는
 * 즉시 완성 화면.
 */
export function ProfectionSection({
  profection,
  years,
}: {
  profection: ProfectionYear;
  years: ProfectionYear[];
}) {
  const house = HOUSE_BY_NUMBER[profection.house];
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <section className="mt-4">
      <h2 className="break-keep text-center font-display text-2xl text-starlight">올해의 자리</h2>
      <p className="mt-2 text-center font-latin text-eyebrow tracking-[0.3em] text-starlight-dim">
        ANNUAL PROFECTIONS
      </p>
      <p className="mx-auto mt-6 max-w-[56ch] break-keep text-center text-guide text-starlight-dim">
        생일마다 한 칸씩 도는 12년의 시계입니다. 올해가 어느 자리의 해이고,
        어느 행성이 올해를 주관하는지 — 나이만으로 정해집니다.
      </p>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-10">
        <ProfectionDial years={years} currentAge={profection.age} entered={entered} />

        {/* 올해의 부적 — ArchCard와 같은 이중 프레임과 인장. 형태만 흉내 내면
            헐벗어 보인다(2026-08-27 피드백) — 부적의 격식을 전부 갖춘다. */}
        <div
          className={`w-full max-w-[340px] rounded-t-[176px] rounded-b-xl border border-gold/30 bg-gold/5 p-[7px] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
            entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="relative rounded-t-[169px] rounded-b-lg border border-gold/60 bg-gradient-to-b from-nebula/90 to-ink px-6 pb-9 pt-16 text-center shadow-[0_0_44px_6px_rgba(201,162,39,0.12),inset_0_1px_0_rgba(232,228,216,0.07)]">
            <svg viewBox="0 0 14 14" className="absolute left-1/2 top-5 size-3.5 -translate-x-1/2" aria-hidden>
              <path d="M7 .5 8 4.6l4.5.6L9 8l1 4.5L7 9.9 4 12.5 5 8 1.5 5.2l4.5-.6Z" fill="var(--color-gold-soft)" />
            </svg>
            <p className="font-latin text-eyebrow tabular-nums tracking-[0.3em] text-gold">
              AGE {profection.age} · {yearMonth(profection.from)} – {yearMonth(profection.to)}
            </p>
            <p className="mt-3 break-keep font-display text-3xl text-starlight">
              {profection.sign.ko}의 해
            </p>
            <p className="mt-2 text-meta text-starlight-dim">
              {house.ko} · 올해의 주인 <b className="font-medium text-gold-soft">{profection.lordKo}</b>
            </p>
            <LineDiamond className="mt-6" symbol={SIGN_SYMBOL[profection.sign.key]} />
            <p className="mx-auto mt-5 max-w-[36ch] break-keep text-guide leading-relaxed text-starlight">
              {house.ko}에 불이 들어온 해입니다 — {house.domain}. 올해의 주인이{" "}
              {profection.lordKo}이므로, {profection.lordKo}이 어디를 지나는지가
              올해 트랜짓 읽기의 축이 됩니다.
            </p>
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-meta text-starlight-dim">
        상승의 방이 12시 — 바늘이 올해의 자리를 가리키고, 숫자는 그 자리가 오는 나이입니다
      </p>
    </section>
  );
}

const ASTRO_FONT = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", sans-serif';

/**
 * 12년의 시계. 섹터 순서는 방 번호(1번째 방 = 상승 자리)가 12시에서 시계
 * 방향으로. profectionYears가 주는 12년 창에는 자리마다 나이가 정확히 하나다.
 */
function ProfectionDial({
  years,
  currentAge,
  entered,
}: {
  years: ProfectionYear[];
  currentAge: number;
  entered: boolean;
}) {
  const byHouse = [...years].sort((a, b) => a.house - b.house);
  const curIdx = byHouse.findIndex((y) => y.age === currentAge);
  const C = 180;
  const R_OUT = 172;
  const R_IN = 118;
  const R_AGE = 96;
  const pt = (r: number, deg: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };

  return (
    <svg
      viewBox="0 0 360 360"
      className={`w-[min(360px,88vw)] transition-opacity duration-700 ease-out motion-reduce:opacity-100 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="img"
      aria-label={`프로펙션 다이얼 — 올해는 ${byHouse[curIdx]?.sign.ko}의 해`}
      data-in={entered ? "true" : "false"}
    >
      {byHouse.map((y, i) => {
        const a0 = i * 30 - 15;
        const a1 = i * 30 + 15;
        const [x0, y0] = pt(R_OUT, a0);
        const [x1, y1] = pt(R_OUT, a1);
        const [x2, y2] = pt(R_IN, a1);
        const [x3, y3] = pt(R_IN, a0);
        const cur = i === curIdx;
        const [gx, gy] = pt((R_OUT + R_IN) / 2 + 13, i * 30);
        const [sx, sy] = pt((R_OUT + R_IN) / 2 - 12, i * 30);
        const [ax, ay] = pt(R_AGE, i * 30);
        return (
          <g key={y.age}>
            <path
              d={`M ${x0} ${y0} A ${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${R_IN} ${R_IN} 0 0 0 ${x3} ${y3} Z`}
              className={cur ? "dial-cur" : undefined}
              fill={cur ? "rgba(201,162,39,0.16)" : "rgba(26,31,61,0.35)"}
              stroke={cur ? "var(--color-gold)" : "rgba(201,162,39,0.25)"}
              strokeWidth={cur ? 1.4 : 0.8}
            />
            <text
              x={gx}
              y={gy}
              textAnchor="middle"
              dominantBaseline="central"
              className={cur ? "dial-cur-glyph" : undefined}
              fill={cur ? "var(--color-gold-soft)" : "rgba(227,197,104,0.6)"}
              fontSize={16}
              style={{ fontFamily: ASTRO_FONT }}
            >
              {SIGN_SYMBOL[y.sign.key]}
              {"\uFE0E"}
            </text>
            <text
              x={sx}
              y={sy}
              textAnchor="middle"
              dominantBaseline="central"
              className={cur ? "dial-cur-name" : undefined}
              fill={cur ? "var(--color-starlight)" : "var(--color-starlight-dim)"}
              fontSize={11.5}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {y.sign.ko.replace("자리", "")}
            </text>
            <text
              x={ax}
              y={ay}
              textAnchor="middle"
              dominantBaseline="central"
              fill={cur ? "var(--color-gold-soft)" : "rgba(154,150,168,0.75)"}
              fontSize={12}
              style={{ fontFamily: "var(--font-latin)", letterSpacing: "0.06em" }}
            >
              {y.age}
            </text>
          </g>
        );
      })}

      {/* 바늘 — 첫 등장 때 한 자리 뒤에서 돌아와 올해에 멈춘다. */}
      <g
        className="transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{
          transformOrigin: `${C}px ${C}px`,
          transform: `rotate(${curIdx * 30 - (entered ? 0 : 30)}deg)`,
        }}
      >
        <line
          x1={C}
          y1={C}
          x2={C}
          y2={C - (R_IN - 34)}
          stroke="var(--color-gold-soft)"
          strokeWidth={1.6}
          opacity={0.9}
        />
        <rect
          x={C - 3}
          y={C - (R_IN - 30) - 3}
          width={6}
          height={6}
          transform={`rotate(45 ${C} ${C - (R_IN - 30)})`}
          fill="var(--color-gold-soft)"
        />
      </g>
      <circle cx={C} cy={C} r={3.5} fill="var(--color-gold)" />
      <g className="dial-age">
        <text
          x={C}
          y={C - 22}
          textAnchor="middle"
          fill="var(--color-gold)"
          fontSize={10}
          style={{ fontFamily: "var(--font-latin)", letterSpacing: "0.3em" }}
        >
          AGE
        </text>
        <text
          x={C}
          y={C + 32}
          textAnchor="middle"
          fill="var(--color-starlight)"
          fontSize={30}
          style={{ fontFamily: "var(--font-latin)" }}
        >
          {currentAge}
        </text>
      </g>
    </svg>
  );
}
