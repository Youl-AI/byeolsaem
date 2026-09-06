"use client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/ui/Link";
import { nextLunations } from "@/lib/lunation";
import { onceInSession } from "@/lib/once";
import { PLANET_BY_KEY } from "@/lib/planets";
import { mercuryRetrogrades } from "@/lib/retrograde";
import { formatKstMonthDay, kstParts, retrogradeStatus } from "@/lib/retrograde-clock";
import { retroNumber, rollStart } from "@/lib/retro-roll";
import type { TodaySky } from "@/lib/today";
import { SIGN_SYMBOL, ZODIAC_SIGNS } from "@/lib/zodiac";

/**
 * 오늘 하늘의 나머지 — 열 행성의 자리표, 다가오는 삭망, 역행 카운트다운.
 *
 * 열 행성은 todaySky()가 이미 다 계산하는데 화면에는 달과 수성 역행 여부만
 * 나가고 있었다(정찰 2026-08-22). 첫 방문자에게도, "오늘 금성 어디"를 검색해
 * 온 사람에게도 여기가 답이 된다.
 *
 * 전부 시각을 쓰지 않는 정오 기준 값이라 개인 정보 없이 누구에게나 같다 —
 * 앞면 카드와 같은 원칙이다.
 */

const DAY_MS = 86400000;
/** 어제 값→오늘 값. 한 칸 움직이는 데 300ms — 손가락보다 늦지 않다. */
const ROLL_MS = 300;

/** 역행까지/역행 끝까지 카운트다운 띠. 사이트 전체에서 유일한 "내일 또 볼 숫자". */
export function RetroBand({ now, live }: { now: Date; /** now가 방문자의 지금인가(빌드 시각이 아닌가). 굴림은 그때만. */ live: boolean }) {
  const { status, yesterday } = useMemo(() => {
    // 앞뒤로 넉넉히 — 진행 중인 구간을 놓치지 않으려면 과거도 조금 본다.
    const from = new Date(now.getTime() - 120 * DAY_MS);
    const to = new Date(now.getTime() + 540 * DAY_MS);
    const periods = mercuryRetrogrades(from, to);
    return {
      status: retrogradeStatus(periods, now),
      yesterday: retrogradeStatus(periods, new Date(now.getTime() - DAY_MS)),
    };
  }, [now]);

  // 훅은 이른 return보다 앞에 — 모르는 상태여도 호출 순서는 같아야 한다.
  const target = retroNumber(status);
  const shown = useRoll(live ? rollStart(yesterday, status) : null, target, now);

  if (status.state === "unknown" || target === null) return null;

  const line =
    status.state === "retrograde"
      ? { text: `수성 역행 중 — ${formatKstMonthDay(status.period.end)}에 끝납니다` }
      : { text: `다음 수성 역행 — ${formatKstMonthDay(status.next.start)}부터` };

  return (
    // 상자가 아니라 금선 두 줄 사이의 한 행 — 이 사이트의 구획 문법 그대로다.
    <Link
      href="/retrograde"
      className="group mb-10 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y border-gold/20 py-3.5 transition-colors hover:border-gold/45"
    >
      <span className="astro-symbol text-gold-soft" aria-hidden>
        ☿
      </span>
      {/* tabular-nums — 굴리는 동안 폭이 흔들리지 않는다. */}
      <span className="font-display text-lg tabular-nums text-gold-soft">D-{shown ?? target}</span>
      <span className="break-keep text-guide text-starlight-dim">{line.text}</span>
      <span className="ml-auto text-meta text-gold-soft transition-transform group-hover:translate-x-1 motion-reduce:translate-x-0">
        자세히 →
      </span>
    </Link>
  );
}

/**
 * 어제 값에서 오늘 값으로 300ms에 굴린다(스펙 B §4). 하루 첫 방문에만 —
 * 열쇠 `byeolsaem:retro-roll:<YYYY-MM-DD>`. start가 null이면(굴릴 것이 없으면)
 * rAF를 시작하지 않는다. 감소 모드는 오늘 값 즉시.
 */
function useRoll(start: number | null, target: number | null, now: Date): number | null {
  const [value, setValue] = useState<number | null>(target);

  useEffect(() => {
    if (start === null || target === null) {
      setValue(target);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const p = kstParts(now.toISOString());
    const key = `byeolsaem:retro-roll:${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    if (!onceInSession(key)) {
      setValue(target);
      return;
    }
    setValue(start);
    const t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ROLL_MS);
      // 등장 곡선의 큐빅 근사. 정수만 — 반 칸은 없다.
      setValue(Math.round(start + (target - start) * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, target, now]);

  return value;
}

const ASTRO_FONT = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", sans-serif';

/**
 * 오늘의 하늘 띠 — 360도를 한 줄로 펴고 열 별을 실제 도수 위치에 앉힌다.
 * 표는 수치를, 띠는 몰림·빈 하늘·역행(링)·달의 이동을 맡는다(감사 2026-08-28).
 * 매일 오는 페이지라 모션 없이 정적으로만.
 */
function SkyBand({ sky }: { sky: TodaySky }) {
  const W = 720;
  const X0 = 10;
  const SPAN = W - 20;
  const TOP = 30;
  const BOT = 66;
  const xOf = (lon: number): number => X0 + (SPAN * (((lon % 360) + 360) % 360)) / 360;
  // 붙어 있는 별은 위 줄로 밀어 겹침을 푼다.
  const sorted = [...sky.placements].sort((a, b) => a.longitude - b.longitude);
  const rows: number[] = [];
  const placed = sorted.map((p) => {
    const x = xOf(p.longitude);
    let row = 0;
    while (rows[row] !== undefined && x - rows[row] < 15) row += 1;
    rows[row] = x;
    return { ...p, x, y: row === 0 ? 52 : 52 - 14 * row };
  });
  return (
    <div className="mt-6 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} 96`}
        className="min-w-[640px]"
        role="img"
        aria-label="오늘의 하늘 띠 — 열 별이 열두 자리 위 실제 위치에 놓여 있습니다"
      >
        <g stroke="rgba(201,162,39,0.25)">
          <line x1={X0} y1={TOP} x2={X0 + SPAN} y2={TOP} />
          <line x1={X0} y1={BOT} x2={X0 + SPAN} y2={BOT} />
          {Array.from({ length: 13 }, (_, i) => {
            const x = X0 + (SPAN * i) / 12;
            return <line key={i} x1={x} y1={TOP} x2={x} y2={BOT} />;
          })}
        </g>
        {ZODIAC_SIGNS.map((sign, i) => (
          <text
            key={sign.key}
            x={X0 + (SPAN * (i + 0.5)) / 12}
            y={82}
            textAnchor="middle"
            fill="rgba(154,150,168,0.8)"
            fontSize={9.5}
            style={{ fontFamily: ASTRO_FONT }}
          >
            {SIGN_SYMBOL[sign.key]}
            {"︎"}
          </text>
        ))}
        {placed.map((p) => {
          const planet = PLANET_BY_KEY[p.planet];
          const moon = p.planet === "moon";
          return (
            <g key={p.planet}>
              {p.retrograde && (
                <circle cx={p.x} cy={p.y - 4} r={8.5} fill="none" stroke="rgba(227,197,104,0.45)" strokeWidth={0.8} />
              )}
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                fill={moon ? "var(--color-gold-soft)" : "var(--color-starlight)"}
                fontSize={12}
                style={{ fontFamily: ASTRO_FONT }}
              >
                {planet.symbol}
                {"︎"}
              </text>
              {moon && (
                // 띠 밖으로 밀리거나 왼쪽 범례와 겹치지 않게 가장자리를 죈다.
                <text x={Math.min(Math.max(p.x, 100), W - 40)} y={16} textAnchor="middle" fill="var(--color-gold-soft)" fontSize={9.5}>
                  오늘의 달
                </text>
              )}
            </g>
          );
        })}
        <text x={X0} y={16} fill="rgba(154,150,168,0.7)" fontSize={9}>
          링 = 역행 중
        </text>
      </svg>
    </div>
  );
}

/** 열 행성이 오늘 어느 자리에 있는가. 역행 중인 별은 그렇게 말한다. */
export function PlanetsNow({ sky, id }: { sky: TodaySky; id?: string }) {
  return (
    <section id={id} className="mt-16 scroll-mt-32">
      <h2 className="mb-2 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        오늘의 하늘, 열 개의 별
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>
      <p className="max-w-[52ch] break-keep text-meta text-starlight-dim">
        정오 기준의 자리입니다. 달만 하루에 13도씩 움직여 저녁에는 한 걸음 더 가
        있습니다.
      </p>
      <SkyBand sky={sky} />
      <ul className="mt-6 grid gap-x-10 gap-y-0 sm:grid-cols-2">
        {sky.placements.map((p) => {
          const planet = PLANET_BY_KEY[p.planet];
          return (
            <li
              key={p.planet}
              className="flex items-baseline gap-3 border-t border-gold/12 py-2.5"
            >
              <span className="astro-symbol w-5 text-gold-soft" aria-hidden>
                {planet.symbol}
              </span>
              <span className="w-12 text-guide text-starlight">{planet.ko}</span>
              <span className="text-guide text-starlight-dim">
                {p.sign.ko} {Math.floor(p.degree)}도
              </span>
              {p.retrograde && (
                <span className="ml-auto text-meta tracking-[0.14em] text-gold-soft">역행</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 다가오는 삭망 — 칼럼이 시키는 "신월에 세우고 보름에 돌아보기"의 실제 날짜. */
export function ComingMoons({ now, id }: { now: Date; id?: string }) {
  const { newMoon, fullMoon } = useMemo(() => nextLunations(now), [now]);
  // 먼저 오는 쪽을 앞에 — "다음"이라는 말의 상식.
  const ordered = [newMoon, fullMoon].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  return (
    <div id={id} className="mt-8 max-w-[52ch] scroll-mt-32 border-l-2 border-gold/40 pl-5">
      <p className="text-meta tracking-[0.18em] text-gold">다가오는 달</p>
      {ordered.map((l) => (
        <p key={l.kind} className="mt-2 break-keep text-guide text-starlight">
          {l.kind === "new" ? "다음 신월" : "다음 보름"} —{" "}
          <b className="font-normal text-gold-soft">{formatKstMonthDay(l.date)}</b>
          <span className="text-starlight-dim"> · {l.signKo}</span>
        </p>
      ))}
      <p className="mt-2 break-keep text-meta text-starlight-dim">
        신월에 시작한 일은 보름에 한 번 돌아보게 됩니다.
      </p>
    </div>
  );
}
