"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Chart } from "@/lib/chart";
import { PLANET_BY_KEY } from "@/lib/planets";
import { sampleLapse, SLOW_BODIES, type SlowBody } from "@/lib/sky-lapse";
import { signAtLongitude } from "@/lib/zodiac";

/**
 * 태어난 뒤 하늘은 — 눌러야 돈다.
 *
 * 네이탈 원반은 고정·흐림. 바깥 고리에서 느린 별 다섯이 태어난 자리에서 오늘
 * 자리까지 2.6초에 한 번 돌고 멈춘다. 궤적은 바퀴마다 6px 안으로 들어가 목성
 * 세 바퀴가 겹치지 않는다. 슬라이더로 아무 시점에 세울 수 있다.
 *
 * 자동재생 없음. 첫 화면 원반 등장(850ms)과 겹치지 않도록 "자세히" 안에만 있다.
 * 감소 모드는 끝 상태로 즉시 간다. 계산은 첫 재생 때 한 번(useMemo).
 *
 * 이 컴포넌트는 SVG 좌표를 프레임마다 갱신한다 — transform·opacity 원칙의 유일한
 * 예외. 300px 원 안의 텍스트 다섯과 폴리라인 다섯이라 비용은 없다.
 */
const SIZE = 300;
const C = SIZE / 2;
const R_OUT = 142;
const R_TRAIL = 128;
const R_NATAL = 88;
const DURATION = 2600;
const SIGNS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const COLOR: Record<SlowBody, string> = {
  jupiter: "#e3c568",
  saturn: "#c9a227",
  uranus: "#9fb7d8",
  neptune: "#8fa8c8",
  pluto: "#b09ac8",
};

export function SkyLapse({ chart, now }: { chart: Chart; now: Date }) {
  const asc = chart.ascendant ?? 0;
  // 상승궁을 왼쭉(9시)에 두는 원반 규약. 황경이 늘수록 반시계.
  const pt = (lon: number, r: number) => {
    const a = ((180 + (asc - lon)) * Math.PI) / 180;
    return [C + Math.cos(a) * r, C - Math.sin(a) * r] as const;
  };
  const [armed, setArmed] = useState(false);
  const lapse = useMemo(() => (armed ? sampleLapse(chart, now) : null), [armed, chart, now]);
  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const play = () => {
    setArmed(true);
    cancelAnimationFrame(raf.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    const start = performance.now();
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (ts: number) => {
      const p = Math.min(1, (ts - start) / DURATION);
      setT(ease(p));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    setT(0);
    raf.current = requestAnimationFrame(step);
  };

  const at = (body: SlowBody) => {
    if (!lapse) return chart.placements.find((p) => p.planet === body)!.longitude;
    const s = lapse.series[body];
    const idx = t * lapse.steps;
    const i = Math.min(lapse.steps - 1, Math.floor(idx));
    return s[i] + (s[i + 1] - s[i]) * (idx - i);
  };
  const trail = (body: SlowBody) => {
    if (!lapse) return "";
    const s = lapse.series[body];
    const n = Math.floor(t * lapse.steps);
    let d = "";
    for (let j = 0; j <= n; j += 1) {
      const [x, y] = pt(s[j], R_TRAIL - ((s[j] - s[0]) / 360) * 6);
      d += `${j ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  };

  const years = Math.floor(((now.getTime() - (chart.julianDay - 2440587.5) * 86400000) / 31557600000) * t);
  const satRev = lapse ? (at("saturn") - lapse.series.saturn[0]) / 360 : 0;
  const caption =
    t <= 0
      ? "태어난 순간 — 바깥 고리의 다섯 별이 전부 제자리"
      : `만 ${years}세 · 토성 ${satRev.toFixed(2)}바퀴${satRev > 0.97 && satRev < 1.06 ? " — 토성 리턴" : ""}`;

  return (
    <figure className="mt-8">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label="출생부터 오늘까지 느린 별 다섯의 이동">
        <circle cx={C} cy={C} r={R_OUT} fill="none" stroke="rgba(201,162,39,.45)" />
        <circle cx={C} cy={C} r={112} fill="none" stroke="rgba(201,162,39,.18)" />
        {(chart.houseCusps ?? Array.from({ length: 12 }, (_, i) => i * 30)).map((cusp, i) => {
          const [x1, y1] = pt(cusp, R_OUT);
          const [x2, y2] = pt(cusp, R_OUT * 0.79);
          const [lx, ly] = pt(cusp + 15, R_OUT * 0.9);
          const si = Math.floor((((cusp + 15) % 360) + 360) % 360 / 30);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(201,162,39,.25)" />
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fill="rgba(154,150,168,.5)" className="astro-symbol">
                {SIGNS[si]}
                {"\uFE0E"}
              </text>
            </g>
          );
        })}
        {chart.placements.map((p) => {
          const [x, y] = pt(p.longitude, R_NATAL);
          return (
            <text key={p.planet} x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="rgba(232,228,216,.35)" className="astro-symbol">
              {PLANET_BY_KEY[p.planet].symbol}
              {"\uFE0E"}
            </text>
          );
        })}
        {SLOW_BODIES.map((body) => {
          const [x, y] = pt(at(body), R_TRAIL);
          return (
            <g key={body}>
              <path d={trail(body)} fill="none" stroke={COLOR[body]} strokeWidth={1.2} opacity={0.55} />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fill={COLOR[body]} className="astro-symbol">
                {PLANET_BY_KEY[body].symbol}
                {"\uFE0E"}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={play}
          className="rounded-full border border-gold/45 px-4 py-1.5 text-meta text-gold-soft transition-[transform,background-color] duration-150 hover:bg-gold/10 active:scale-[0.97]"
        >
          재생 — 태어난 뒤 하늘은
        </button>
        <input
          type="range"
          min={0}
          max={360}
          value={Math.round(t * 360)}
          aria-label="출생부터 오늘까지"
          onChange={(e) => {
            setArmed(true);
            cancelAnimationFrame(raf.current);
            setT(Number(e.target.value) / 360);
          }}
          className="w-56 accent-gold-soft"
        />
      </div>
      <figcaption aria-live="polite" className="mt-3 break-keep text-center font-display text-guide text-starlight">
        {caption}
      </figcaption>
      {lapse && (
        <table className="mx-auto mt-6 text-meta tabular-nums text-starlight-dim">
          <thead>
            <tr className="text-eyebrow tracking-[0.12em] text-gold">
              <th className="px-3 py-1 text-left font-normal">별</th>
              <th className="px-3 py-1 text-left font-normal">태어난 자리</th>
              <th className="px-3 py-1 text-left font-normal">오늘 자리</th>
              <th className="px-3 py-1 text-right font-normal">돈 바퀴</th>
            </tr>
          </thead>
          <tbody>
            {SLOW_BODIES.map((body) => {
              const natal = lapse.series[body][0];
              return (
                <tr key={body} className="border-t border-gold/15">
                  <td className="px-3 py-1 text-starlight">{PLANET_BY_KEY[body].ko}</td>
                  <td className="px-3 py-1">{signAtLongitude(natal).ko} {Math.floor(natal % 30)}°</td>
                  <td className="px-3 py-1">{signAtLongitude(lapse.today[body]).ko} {Math.floor(lapse.today[body] % 30)}°</td>
                  <td className="px-3 py-1 text-right">{lapse.travel[body].toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </figure>
  );
}
