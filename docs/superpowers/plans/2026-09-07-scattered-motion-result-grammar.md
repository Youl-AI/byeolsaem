# 산재 모션 다섯 + 결과 문법 확장 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 B(산재 모션 다섯: 주간 별길·12년 아치·오늘의 달·역행 띠·달무리)와 스펙 C(궁합·오늘·한 해에 이름표·탭바·카드 문법 적용)를 한 브랜치에서 구현한다. 문장은 하나도 지우지 않는다.

**Architecture:** Task 1~5는 서로 독립인 모션 다섯 — 각각 파일 한둘과 `globals.css` 규칙 몇 줄. Task 6이 natal의 비공개 헬퍼를 공유 컴포넌트로 꺼내고 `ReadingCard`에 선택 prop 셋을 더한다. Task 7~9가 세 화면을 갈아 끼운다. 각 화면 커밋 하나만 되돌리면 그 화면의 옛 모습이 살아난다. 모션은 전부 CSS `@keyframes`/`transition` + `data-in` 게이트; JS는 rAF 보간 둘(달 채움, 숫자 굴림)만.

**Tech Stack:** Next.js 16(정적 내보내기) · React 19 · Tailwind 4 · Vitest 4 · `react-dom/server`(렌더 테스트)

**Spec:** `docs/superpowers/specs/2026-09-06-scattered-motion.md`(스펙 B, Task 1~5) · `docs/superpowers/specs/2026-09-07-result-grammar-synastry-today-yearly.md`(스펙 C, Task 6~9)

## Global Constraints

- 문장 삭제 0. 지금 화면의 모든 해석 문장은 새 화면에 남는다(자리만 이동). 접힌 본문도 DOM에 있다.
- `chart.ascendant === null`이면 이름표 셋째 칸 생략. 임의 시각 대입 금지. 상대(그쪽) 출생 정보는 어디에도 저장하지 않는다.
- 곡선은 둘만: 그리기 `cubic-bezier(0.33, 1, 0.68, 1)`, 등장·점등 `cubic-bezier(0.16, 1, 0.3, 1)`. 예외 하나: 달무리 호흡은 지속 앰비언트라 `ease-in-out`(기존 `lonely-star`·`star-breathe`와 같다).
- 애니메이션 속성은 `transform`·`opacity`(+ SVG `stroke-dashoffset`)만. 예외 둘: 12년 아치 올해 칸 `fill` 전환(path 하나 1회), 오늘의 달 `<path d>` 갱신(rAF 600ms).
- LCP 앵커("두 사람의 한 줄", "올해의 한 줄", 오늘 앞면 `phaseLine`)는 어떤 분기에서도 `opacity: 0`으로 시작하지 않는다.
- 감소 모드(`prefers-reduced-motion: reduce`): 그리기·계단·보간 제거, opacity 200ms 이하만 남김. 지속 모션(호흡)은 정지.
- 등장은 세션/하루 한 번: `onceInSession(key)`(`src/lib/once.ts`). 열쇠 형식 — 달 `byeolsaem:moon-fill:<YYYY-MM-DD>`, 역행 띠 `byeolsaem:retro-roll:<YYYY-MM-DD>`.
- 탭바 `items`는 `useMemo`. 카드는 `data-in` 부모의 **직계 자식**(`[data-in="true"] > .reading-card`). 구역은 `scroll-mt-32`.
- 소스에 U+FE0E는 `"\uFE0E"` 이스케이프로만 적는다. 파일은 UTF-8 **no-BOM**(파일 쓰기는 Edit/Write 도구로만; 커밋 전 `head -c 3 <file> | od -c`로 BOM 없음 확인).
- 커밋 메시지에 PowerShell here-string(`@'…'@`) 금지, `git add -A` 금지 — 파일을 이름으로 add. 커밋 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 마루부리 서브셋에 없는 글자 금지. 있음: `↑ ☉ ☽ ℞ — · ° ✦ ●`. `▶` 없음.
- 검증 순서(태스크마다): `npx tsc --noEmit` → `npx vitest run`. 마지막 태스크에서 `npm run build`.
- 작업 디렉터리: 모든 `npx`·`npm`은 `byeolsaem-web/`에서, `git`은 저장소(워크트리) 루트에서.

---

## 파일 구조

| 파일 | 역할 | 태스크 |
|---|---|---|
| `src/components/weekly/WeekPath.tsx` | `useInView` + `data-in`, 선 draw·정거장 계단 클래스 | 1 |
| `src/components/weekly/WeeklyCard.tsx` | `entered` 상태 제거 | 1 |
| `src/app/globals.css` | `--animate-week-draw`, `.week-*` / `.dial-*` / `.hero-halo` 규칙, `halo-breathe` keyframes | 1·2·5 |
| `src/components/chapters/ProfectionSection.tsx` | 다이얼 `data-in`, 올해 칸·라벨·나이 클래스 | 2 |
| `src/lib/moon-path.ts` (신규) | `moonPath(illumination, phase, r)` | 3 |
| `src/test/moon-path.test.ts` (신규) | 빈 경로·리팩터 회귀 | 3 |
| `src/components/today/MoonDisc.tsx` | `fill` 열쇠 prop, rAF 600ms 차오름 | 3 |
| `src/components/today/TodayCard.tsx` | `MoonDisc fill=…`, `RetroBand live=…`, `TodayBody` 사용 | 3·4·8 |
| `src/lib/retro-roll.ts` (신규) | `retroNumber`, `rollStart` | 4 |
| `src/test/retro-roll.test.ts` (신규) | 같은 값·상태 전환·굴림 시작 | 4 |
| `src/components/today/SkyNow.tsx` | `RetroBand` 굴림, `PlanetsNow`·`ComingMoons` `id` | 4·6 |
| `src/components/hero/Moon.tsx` | `breathing` prop, `.hero-halo` | 5 |
| `src/components/hero/HeroSequence.tsx` | `breathing={scene === "arrival"}` | 5 |
| `src/components/ui/ResultSection.tsx` (신규) | `ResultSection`·`CardSection` (natal에서 이동) | 6 |
| `src/components/chart/NatalReading.tsx` | 비공개 `Section`·`CardSection` 제거, import | 6 |
| `src/components/ui/ReadingCard.tsx` | `defaultOpen`·`open`/`onToggle`·`onPointerEnter/Leave` | 6 |
| `src/components/chart/NameTag.tsx` | `chartPillars(chart)` | 6 |
| `src/components/synastry/CompositeSection.tsx` | `id` prop | 6 |
| `src/test/result-ui.test.ts` | 카드 prop·`chartPillars`·세 화면 렌더 가드 | 6·7·8·9 |
| `src/components/synastry/SynastryReading.tsx` | `SynastryHero`·`SynastryBody`, 카드, 탭 | 7 |
| `src/components/today/TodayCard.tsx` | `TodayBody`, `TransitCard`, 탭 | 8 |
| `src/components/yearly/YearEventRows.tsx` | 카드 | 9 |
| `src/components/yearly/YearScope.tsx` | `flow` 상승, 탭(비-flow), 구역 id | 9 |
| `docs/todo.md`, 두 스펙 | 구현 기록 | 10 |

---

### Task 1: 주간 별길 — 선이 그어지고 정거장이 켜진다

**Files:**
- Modify: `byeolsaem-web/src/components/weekly/WeekPath.tsx`
- Modify: `byeolsaem-web/src/components/weekly/WeeklyCard.tsx`
- Modify: `byeolsaem-web/src/app/globals.css`

**Interfaces:**
- Consumes: `useInView<T>(threshold)` → `[ref, inView]` (`src/hooks/useInView.ts`), `--animate-node-rise`(420ms), `.star-breathe`.
- Produces: `WeekPath` props에서 `entered` 제거(`{ weekStart, events, touches, now }`).

**결정(스펙 B §1과 다른 점):** 선은 `scaleX` 대신 SVG `pathLength=1` + `stroke-dashoffset` 그리기(`river-draw`)로 긋는다. 이 저장소의 SVG 선 그리기 문법이 전부 그것이고(`.aspect-arc`, `.wheel-ring`), `<line>`에 `transform-box: fill-box`를 걸면 높이 0인 bbox 위에서 원점을 재야 해 브라우저마다 갈린다. 곡선은 그리기 토큰, 1000ms. 트리거는 스펙대로 `useInView`(지금 `WeeklyCard`가 마운트 두 프레임 뒤에 켜는 `entered`는 화면 밖에서 끝나 버린다).

- [ ] **Step 1: `globals.css`에 토큰과 규칙 추가**

`@theme` 블록의 `--animate-wheel-asp: …;` 줄 바로 아래에:

```css
  --animate-week-draw: river-draw 1000ms cubic-bezier(0.33, 1, 0.68, 1) both;
```

`svg .wheel-core {` 규칙 블록 **앞**(카드·인장 규칙 다음)에:

```css
/* 주간 별길 — 선이 그어지고 정거장이 차례로 켜진다(홈 TimePath와 같은 문법,
   스펙 B §1). 선은 pathLength=1 dash 그리기, 정거장은 node-rise 계단. 오늘
   정거장의 숨쉬는 링은 등장이 끝난 뒤(1200ms)부터 숨쉬고, 그 전에는 첫
   키프레임(옅음)에 머문다(backwards). 감소 모드: 전부 완성 상태. */
.week-line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
[data-in="true"] .week-line {
  animation: var(--animate-week-draw);
}
.week-stop {
  opacity: 0;
}
[data-in="true"] .week-stop {
  animation: var(--animate-node-rise);
}
[data-in="true"] .week-today-ring {
  animation-delay: 1200ms;
  animation-fill-mode: backwards;
}
@media (prefers-reduced-motion: reduce) {
  .week-line {
    stroke-dashoffset: 0;
  }
  [data-in="true"] .week-line {
    animation: none;
  }
  .week-stop {
    opacity: 1;
  }
  [data-in="true"] .week-stop {
    animation: none;
    animation-delay: 0ms !important;
  }
}
```

- [ ] **Step 2: `WeekPath.tsx` — 트리거를 `useInView`로, 클래스 부착**

import에 `import { useInView } from "@/hooks/useInView";` 추가. props에서 `entered: boolean` 제거. 컴포넌트 본문:

```tsx
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
  const days = useMemo<DayCell[]>(() => { /* 지금 그대로 */ }, [weekStart, events, touches, now]);

  const label = "이번 주 별길 — 길 위는 하늘의 사건, 길 아래는 내 차트에 닿는 각";
  return (
    <div
      ref={frame}
      data-in={inView ? "true" : "false"}
      className="transition-opacity duration-700 ease-out motion-reduce:opacity-100 motion-reduce:transition-none"
      style={{ transitionDelay: "150ms", opacity: inView ? 1 : 0 }}
    >
```

`HorizontalPath`의 가로선(`<line x1={X0 - 18} … />`)에 `pathLength={1} className="week-line"`, `VerticalPath`의 세로선(`<line x1={LINE} …/>`)에도 같은 두 속성.

각 요일 `<g key={d.dow} textAnchor="middle">`(가로) / `<g key={d.dow}>`(세로)에 `className="week-stop" style={{ animationDelay: `${250 + 110 * i}ms` }}` 추가.

오늘 링 `<circle … className="star-breathe" />` 둘 다 `className="star-breathe week-today-ring"`.

가로 그림의 "내 차트에 닿는 각" 추(`{d.touches.length > 0 && (<> <line …/> {circles} <text …/> </>)}`)의 `<>…</>`를 `<g className="week-stop" style={{ animationDelay: `${310 + 110 * i}ms` }}>…</g>`로 바꾼다(정거장 + 60ms). 세로 그림의 추 `<text>`에도 같은 `className`/`style`.

- [ ] **Step 3: `WeeklyCard.tsx` — `entered` 제거**

```tsx
  // 별길의 첫 등장 연출 — 마운트 두 프레임 뒤에 페이드인.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
```
이 블록을 지우고, `<WeekPath …>`의 `entered={entered}` 줄을 지운다. `useEffect`·`useState`는 다른 곳에서 여전히 쓰이므로 import는 그대로.

- [ ] **Step 4: 확인 · 커밋**

`byeolsaem-web`에서 `npx tsc --noEmit && npx vitest run` (403 통과 유지). 세 파일 BOM 확인.

```bash
git add byeolsaem-web/src/components/weekly/WeekPath.tsx byeolsaem-web/src/components/weekly/WeeklyCard.tsx byeolsaem-web/src/app/globals.css
git commit -m "feat(weekly): the week path draws itself when it comes into view"
```

---

### Task 2: 12년 아치 — 올해 칸만 켜진다

**Files:**
- Modify: `byeolsaem-web/src/components/chapters/ProfectionSection.tsx`
- Modify: `byeolsaem-web/src/app/globals.css`

**결정:** 올해 칸의 최종 색은 지금 값(`rgba(201,162,39,0.16)`, 테두리 `var(--color-gold)`)을 유지한다 — 스펙 B §2의 `rgba(227,197,104,.18)`은 시연판 근사치였다. 전환은 `fill` 0 → 0.16, 400ms 등장 곡선, 500ms 지연. 나이 마커는 다이얼 중앙의 `AGE`+숫자 묶음.

- [ ] **Step 1: `globals.css` 규칙 추가** (Task 1의 `.week-*` 블록 아래)

```css
/* 12년 아치 — 올해 칸만 켜진다(스펙 B §2). fill 전환은 컴포지터 밖이지만 path
   하나 1회라 허용. 스타일시트의 fill이 프레젠테이션 속성을 이기므로 JSX의 fill
   값은 그대로 두고 클래스만 얹는다. 열두 칸 순차 점등은 하지 않는다 — 칸의
   순서는 정보가 아니다. */
.dial-cur,
.dial-cur-glyph,
.dial-cur-name {
  transition: fill 400ms cubic-bezier(0.16, 1, 0.3, 1) 500ms;
}
.dial-cur {
  fill: rgba(201, 162, 39, 0.16);
}
.dial-cur-glyph {
  fill: var(--color-gold-soft);
}
.dial-cur-name {
  fill: var(--color-starlight);
}
[data-in="false"] .dial-cur {
  fill: rgba(201, 162, 39, 0);
}
[data-in="false"] .dial-cur-glyph {
  fill: rgba(227, 197, 104, 0.6);
}
[data-in="false"] .dial-cur-name {
  fill: var(--color-starlight-dim);
}
.dial-age {
  opacity: 0;
}
[data-in="true"] .dial-age {
  animation: var(--animate-node-rise);
  animation-delay: 700ms;
}
@media (prefers-reduced-motion: reduce) {
  .dial-cur,
  .dial-cur-glyph,
  .dial-cur-name {
    transition: none;
  }
  .dial-age {
    opacity: 1;
  }
  [data-in="true"] .dial-age {
    animation: none;
    animation-delay: 0ms !important;
  }
}
```

- [ ] **Step 2: `ProfectionSection.tsx` — 클래스 부착**

`ProfectionDial`의 `<svg …>`에 `data-in={entered ? "true" : "false"}` 추가.

칸 `<path d=… fill={cur ? …} …>`에 `className={cur ? "dial-cur" : undefined}`.
기호 `<text x={gx} …>`(SIGN_SYMBOL을 그리는 것)에 `className={cur ? "dial-cur-glyph" : undefined}`.
이름 `<text x={sx} …>`(`y.sign.ko.replace("자리", "")`)에 `className={cur ? "dial-cur-name" : undefined}`.

중앙의 두 `<text>`(`AGE`와 `{currentAge}`)를 `<g className="dial-age">…</g>`로 감싼다. 중심 `<circle cx={C} cy={C} r={3.5} …/>`는 밖에 둔다.

- [ ] **Step 3: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`. BOM 확인.

```bash
git add byeolsaem-web/src/components/chapters/ProfectionSection.tsx byeolsaem-web/src/app/globals.css
git commit -m "feat(chapters): only this year's room lights up on the dial"
```

---

### Task 3: 오늘의 달 — 신월에서 오늘까지 차오름

**Files:**
- Create: `byeolsaem-web/src/lib/moon-path.ts`
- Create: `byeolsaem-web/src/test/moon-path.test.ts`
- Modify: `byeolsaem-web/src/components/today/MoonDisc.tsx`
- Modify: `byeolsaem-web/src/components/today/TodayCard.tsx` (132행 `<MoonDisc …/>`)

**Interfaces:**
- Produces: `moonPath(illumination: number, phase: MoonPhaseKey, r = 46): string` — 비율 ≤ 0.01이면 `""`.
- Produces: `MoonDisc` prop `fill?: string | null` — 차오름 연출의 세션 열쇠. `null`(기본)이면 정지 그림. `ChartWheel`의 `entrance?: string | null`과 같은 계약.

**결정:** `TodayCard`는 `now`를 알기 전(`initialSky`, 빌드 시점 하늘)에는 `fill={null}`을 준다. 마운트 직후 `now`가 잡히며 하늘이 오늘 값으로 바뀌는데, 그 전에 연출을 시작하면 빌드 날짜 값으로 한 번, 오늘 값으로 또 한 번 돈다.

- [ ] **Step 1: 실패하는 테스트** — `src/test/moon-path.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { moonPath } from "@/lib/moon-path";

describe("달의 밝은 면 경로", () => {
  it("비율 0(과 0.01 이하)은 빈 경로", () => {
    expect(moonPath(0, "new")).toBe("");
    expect(moonPath(0.01, "waxing-crescent")).toBe("");
  });

  it("MoonDisc의 옛 식과 같은 문자열(리팩터 회귀)", () => {
    const r = 46;
    // 차오르는 배(k<0): 바깥 호 1, 안쪽 호도 1.
    const illum = 0.62;
    const k = 1 - 2 * illum;
    const rx = Math.abs(k) * r;
    expect(moonPath(illum, "waxing-gibbous")).toBe(
      `M 60 ${60 - r} A ${r} ${r} 0 0 1 60 ${60 + r} A ${rx} ${r} 0 0 1 60 ${60 - r} Z`,
    );
    // 기우는 초승(k>0, 바깥 호 0): 안쪽 호는 1 - 0 = 1.
    const thin = 0.2;
    const kt = 1 - 2 * thin;
    expect(moonPath(thin, "waning-crescent")).toBe(
      `M 60 ${60 - r} A ${r} ${r} 0 0 0 60 ${60 + r} A ${Math.abs(kt) * r} ${r} 0 0 1 60 ${60 - r} Z`,
    );
  });

  it("반지름을 바꾸면 경로도 따라간다", () => {
    expect(moonPath(1, "full", 10)).toContain("A 10 10 0 0");
  });
});
```

`npx vitest run src/test/moon-path.test.ts` → 모듈 없음으로 실패해야 한다.

- [ ] **Step 2: `src/lib/moon-path.ts`**

```ts
import type { MoonPhaseKey } from "@/lib/moon";

/**
 * 달의 밝은 면 — 카드의 MoonDisc가 그린다. 비율을 그대로 그리는 것이 이 사이트의
 * 약속이다: "보름달"이라고 쓰는 대신 실제로 그만큼 밝게 그린다.
 *
 * 초승과 그믐은 같은 비율이라도 밝은 쪽이 반대다. 위상 이름으로 어느 쪽인지
 * 가른다 — 비율만으로는 알 수 없다.
 *
 * 함수로 따로 둔 것은 차오름 연출 때문이다(스펙 B §3). 0에서 오늘 값까지 36프레임
 * 동안 같은 식을 되풀이 부르므로, 컴포넌트 안에 두면 렌더와 식이 섞인다.
 */
const WAXING = new Set<MoonPhaseKey>([
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
]);

export function moonPath(illumination: number, phase: MoonPhaseKey, r = 46): string {
  if (illumination <= 0.01) return "";
  // 밝은 부분의 안쪽 경계는 타원이다. 반달에서 폭이 0이 되고, 그 전후로 부호가
  // 뒤집히며 볼록에서 오목으로 바뀐다.
  const k = 1 - 2 * illumination;
  const rx = Math.abs(k) * r;
  // 스윕 방향: 차오르는 달은 오른쪽이 밝다.
  const outer = WAXING.has(phase) ? 1 : 0;
  // 명암 경계 타원의 방향. 초승(k>0)은 밝은 쪽으로 볼록해 실낱이 되고, 보름
  // 쪽(k<0)은 어두운 쪽으로 볼록해 반원 너머까지 차오른다. 이 부호가 뒤집혀
  // 있으면 96%가 실낱로, 보름이 빈 원으로 그려진다(2026-08-26 실측).
  const inner = k >= 0 ? 1 - outer : outer;
  return `M 60 ${60 - r} A ${r} ${r} 0 0 ${outer} 60 ${60 + r} A ${rx} ${r} 0 0 ${inner} 60 ${60 - r} Z`;
}
```

`npx vitest run src/test/moon-path.test.ts` → 통과. 위상 키가 `src/lib/moon.ts`의 `MOON_PHASES`와 다르면(예: `"full"`이 `"full-moon"`) 테스트의 키를 그쪽에 맞춘다 — 식은 바꾸지 않는다.

- [ ] **Step 3: `MoonDisc.tsx` 전체 교체**

```tsx
"use client";
import { useLayoutEffect, useState } from "react";
import type { MoonPhaseKey } from "@/lib/moon";
import { moonPath } from "@/lib/moon-path";
import { onceInSession } from "@/lib/once";

/** 신월에서 오늘까지 차오르는 시간. 36프레임 — 보이되 기다리게 하지 않는다. */
const FILL_MS = 600;

/**
 * 오늘의 달. 카드 안 아치에 앉는다.
 *
 * 밝은 면의 비율을 그대로 그린다 — "보름달"이라고 쓰는 대신 실제로 그만큼 밝게
 * 그리면 글을 읽지 않아도 오늘이 어떤 밤인지 보인다. 경로 식은 moon-path.ts.
 *
 * `fill`이 있으면 마운트 뒤 0에서 오늘 값까지 600ms 동안 차오른다(스펙 B §3).
 * 하루 한 번 — 열쇠는 `byeolsaem:moon-fill:<YYYY-MM-DD>`. 위상(초승/그믐 방향)은
 * 보간 중에도 오늘 값 고정이다. transform·opacity 원칙의 유일한 예외로 SVG 좌표를
 * 갱신하는데, 108px 경로 하나라 레이아웃과 무관하다. 공유 카드(moonArt)는 이
 * 컴포넌트를 쓰지 않으므로 정적이다.
 *
 * useLayoutEffect인 이유: 첫 페인트 전에 0으로 내려야 한다. useEffect면 오늘 값이
 * 한 프레임 그려진 뒤 0으로 꺼져 깜박인다.
 */
export function MoonDisc({
  illumination,
  phase,
  fill = null,
}: {
  /** 0(안 보임)~1(가득). */
  illumination: number;
  phase: MoonPhaseKey;
  /** 차오름 연출의 세션 열쇠. null이면 정지 그림. */
  fill?: string | null;
}) {
  const r = 46;
  const [shown, setShown] = useState(illumination);

  useLayoutEffect(() => {
    if (
      !fill ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !onceInSession(fill)
    ) {
      setShown(illumination);
      return;
    }
    setShown(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FILL_MS);
      // 등장 곡선의 큐빅 근사 — 끝에서 부드럽게 멎는다.
      setShown(illumination * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [illumination, fill]);

  const d = moonPath(shown, phase, r);

  return (
    <svg viewBox="0 0 120 120" className="mx-auto mt-4 w-[108px]" aria-hidden>
      {/* 달 전체의 자리. 그늘진 부분도 완전히 사라지지는 않는다. */}
      <circle cx="60" cy="60" r={r} fill="var(--color-nebula)" opacity=".55" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-gold)" strokeWidth=".8" opacity=".35" />

      {d && <path d={d} fill="var(--color-starlight)" opacity=".92" />}

      {/* 가장자리 빛무리. 카드의 금빛과 이어지도록 아주 옅게. */}
      <circle
        cx="60"
        cy="60"
        r={r + 6}
        fill="none"
        stroke="var(--color-gold-soft)"
        strokeWidth="1"
        opacity=".14"
      />
    </svg>
  );
}
```

- [ ] **Step 4: `TodayCard.tsx` — 열쇠 넘기기**

`<MoonDisc illumination={sky.moon.illumination} phase={sky.moon.phase.key} />`를:

```tsx
              <MoonDisc
                illumination={sky.moon.illumination}
                phase={sky.moon.phase.key}
                /* 마운트 전(빌드 시점 하늘)에는 정지 — now가 잡혀 오늘 값이 된 뒤 한 번만 차오른다. */
                fill={now ? `byeolsaem:moon-fill:${dateKey(sky.date)}` : null}
              />
```

파일 상단(컴포넌트 밖)에 헬퍼:

```tsx
/** `2026-09-07` 꼴 — 하루 한 번 연출의 열쇠에 쓴다. */
function dateKey(date: { year: number; month: number; day: number }): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
```

- [ ] **Step 5: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`(+3). BOM 확인 네 파일.

```bash
git add byeolsaem-web/src/lib/moon-path.ts byeolsaem-web/src/test/moon-path.test.ts byeolsaem-web/src/components/today/MoonDisc.tsx byeolsaem-web/src/components/today/TodayCard.tsx
git commit -m "feat(today): the moon fills from new to tonight, once a day"
```

---

### Task 4: 역행 띠 — 어제 값에서 오늘 값으로

**Files:**
- Create: `byeolsaem-web/src/lib/retro-roll.ts`
- Create: `byeolsaem-web/src/test/retro-roll.test.ts`
- Modify: `byeolsaem-web/src/components/today/SkyNow.tsx` (`RetroBand`)
- Modify: `byeolsaem-web/src/components/today/TodayCard.tsx` (86행 `<RetroBand now={clockNow} />`)

**Interfaces:**
- Consumes: `RetrogradeStatus`, `retrogradeStatus`, `kstParts` (`src/lib/retrograde-clock.ts`), `onceInSession`.
- Produces: `retroNumber(status): number | null`, `rollStart(yesterday, today): number | null`; `RetroBand` prop `live: boolean`.

**결정:** `RetroBand`는 `now`가 빌드 시각(`builtAt`)인 동안 굴리지 않는다(`live={now !== null}`) — Task 3과 같은 이유.

- [ ] **Step 1: 실패하는 테스트** — `src/test/retro-roll.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { retroNumber, rollStart } from "@/lib/retro-roll";
import type { RetrogradePeriod } from "@/lib/retrograde-clock";

const period: RetrogradePeriod = {
  start: "2026-10-01T00:00:00Z",
  end: "2026-10-22T00:00:00Z",
  startLongitude: 200,
  endLongitude: 190,
  days: 21,
  arc: 10,
};

describe("역행 띠의 숫자 굴림", () => {
  it("어제 49, 오늘 48이면 49에서 시작한다", () => {
    expect(
      rollStart(
        { state: "direct", next: period, daysUntil: 49 },
        { state: "direct", next: period, daysUntil: 48 },
      ),
    ).toBe(49);
  });

  it("값이 같으면 굴리지 않는다", () => {
    expect(
      rollStart(
        { state: "retrograde", period, daysLeft: 12 },
        { state: "retrograde", period, daysLeft: 12 },
      ),
    ).toBeNull();
  });

  it("상태가 바뀌면(경계를 넘으면) 굴리지 않는다", () => {
    expect(
      rollStart(
        { state: "direct", next: period, daysUntil: 1 },
        { state: "retrograde", period, daysLeft: 21 },
      ),
    ).toBeNull();
  });

  it("모르는 상태는 숫자가 없다", () => {
    expect(retroNumber({ state: "unknown" })).toBeNull();
    expect(rollStart({ state: "unknown" }, { state: "unknown" })).toBeNull();
  });
});
```

`npx vitest run src/test/retro-roll.test.ts` → 모듈 없음으로 실패.

- [ ] **Step 2: `src/lib/retro-roll.ts`**

```ts
import type { RetrogradeStatus } from "@/lib/retrograde-clock";

/** 띠가 보여 주는 숫자 하나 — 역행 중이면 남은 날, 아니면 다음까지의 날. 모르면 null. */
export function retroNumber(status: RetrogradeStatus): number | null {
  if (status.state === "retrograde") return status.daysLeft;
  if (status.state === "direct") return status.daysUntil;
  return null;
}

/**
 * 어제 값에서 오늘 값으로 굴릴 수 있으면 어제 값, 아니면 null(굴리지 않는다).
 *
 * 시연판의 "0→N 카운트업"은 하지 않는다 — 숫자가 실제로 변한 만큼만 움직여야
 * 상태 표시다(스펙 B §4). 상태가 다르면(어제는 역행 전, 오늘은 역행 중) 두 숫자가
 * 다른 것을 세고 있으므로 굴리지 않고, 같은 값이면 움직일 것이 없다.
 */
export function rollStart(yesterday: RetrogradeStatus, today: RetrogradeStatus): number | null {
  if (yesterday.state !== today.state) return null;
  const from = retroNumber(yesterday);
  const to = retroNumber(today);
  if (from === null || to === null || from === to) return null;
  return from;
}
```

`npx vitest run src/test/retro-roll.test.ts` → 통과.

- [ ] **Step 3: `SkyNow.tsx` — `RetroBand` 굴림**

import 변경:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/ui/Link";
import { nextLunations } from "@/lib/lunation";
import { onceInSession } from "@/lib/once";
import { PLANET_BY_KEY } from "@/lib/planets";
import { mercuryRetrogrades } from "@/lib/retrograde";
import { formatKstMonthDay, kstParts, retrogradeStatus } from "@/lib/retrograde-clock";
import { retroNumber, rollStart } from "@/lib/retro-roll";
```

`RetroBand` 전체:

```tsx
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
```

`RetroBand` 기존 본문의 `d:` 필드(`D-${status.daysLeft}` 등)는 위와 같이 `D-{shown ?? target}` 한 곳으로 합쳐진다. `text` 문장 둘은 글자 하나 바꾸지 않는다.

- [ ] **Step 4: `TodayCard.tsx`** — `<RetroBand now={clockNow} />` → `<RetroBand now={clockNow} live={now !== null} />`

- [ ] **Step 5: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`(+4). BOM 확인.

```bash
git add byeolsaem-web/src/lib/retro-roll.ts byeolsaem-web/src/test/retro-roll.test.ts byeolsaem-web/src/components/today/SkyNow.tsx byeolsaem-web/src/components/today/TodayCard.tsx
git commit -m "feat(today): the retrograde countdown rolls from yesterday's number"
```

---

### Task 5: 달무리 호흡 — 홈 히어로

**Files:**
- Modify: `byeolsaem-web/src/components/hero/Moon.tsx`
- Modify: `byeolsaem-web/src/components/hero/HeroSequence.tsx` (264행 `<Moon className={MOON_POSITION[scene]} />`)
- Modify: `byeolsaem-web/src/app/globals.css`

**결정(스펙 B §5와 다른 점):** 스펙은 "스크롤이 시작되면 ScrollTrigger에서 멈춘다"고 썼지만 `HeroSequence`에는 ScrollTrigger가 없다 — 달은 단추를 눌러 의식이 시작될 때 GSAP Flip으로 옮겨진다. 그래서 **`scene === "arrival"`일 때만 숨쉬고**, 의식이 시작되면 `animation: none`으로 정지한다(멈춤이 아니라 제거 — `paused`는 커진 채로 얼어붙을 수 있다). Flip은 바깥 `#hero-moon`의 transform을, 호흡은 그 안 링 div의 transform을 만지므로 같은 속성을 다투지 않지만, 무대가 바뀌는 동안 배경이 계속 움직일 이유도 없다.

- [ ] **Step 1: `globals.css`**

`@theme` 블록 `--animate-week-draw` 아래에:

```css
  --animate-halo-breathe: halo-breathe 3.4s ease-in-out infinite;
```

`.dial-*` 블록 아래에:

```css
/* 홈 히어로의 달무리 호흡(스펙 B §5). 바깥 링만 숨쉬고 안쪽 동심원은 정지.
   lonely-star와 같은 3.4s. 도착 장면(arrival)에서만 — 의식이 시작되어 달이
   Flip으로 옮겨지는 동안에는 애니메이션을 떼어 링을 원래 크기로 돌려 둔다.
   배경 별하늘(three.js 자전)과 지속 모션이 둘이 되는 것은 브레인스토밍에서
   짚었고 사용자가 시연을 본 뒤 넣기로 정했다. */
@keyframes halo-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.18);
    opacity: 0.5;
  }
}
.hero-halo[data-breathing="true"] {
  animation: var(--animate-halo-breathe);
}
@media (prefers-reduced-motion: reduce) {
  .hero-halo[data-breathing="true"] {
    animation: none;
  }
}
```

- [ ] **Step 2: `Moon.tsx`**

```tsx
// 히어로의 달 — 채워진 원반이 아니라 "달무리(halo)"다.
// 얇은 금색 테두리 + 은은한 발광 + 안쪽 작은 동심원 하나뿐이라 배경 별하늘이
// 안쪽으로 그대로 비쳐 보인다. absolute 배치는 부모(HeroSequence의 section)를 기준으로 하고,
// id="hero-moon"은 GSAP 장면 전환이 이동 애니메이션 대상으로 참조한다.
//
// breathing이면 바깥 링이 3.4초에 한 번 숨쉰다(globals.css .hero-halo). 도착
// 장면에서만 켠다 — 의식이 시작되면 HeroSequence가 끈다.
export function Moon({ className = "", breathing = false }: { className?: string; breathing?: boolean }) {
  return (
    <div id="hero-moon" className={`pointer-events-none absolute ${className}`} aria-hidden>
      <div className="relative">
        <div
          className="hero-halo size-[260px] rounded-full border border-gold/50 md:size-[400px]"
          data-breathing={breathing ? "true" : "false"}
          style={{
            boxShadow: `0 0 90px 14px color-mix(in srgb, var(--color-gold) 16%, transparent), inset 0 0 60px color-mix(in srgb, var(--color-gold) 12%, transparent)`,
          }}
        />
        <div className="absolute inset-[18%] rounded-full border border-gold/25" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `HeroSequence.tsx`** — `<Moon className={MOON_POSITION[scene]} />` → `<Moon className={MOON_POSITION[scene]} breathing={scene === "arrival"} />`

- [ ] **Step 4: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`. BOM 확인.

```bash
git add byeolsaem-web/src/components/hero/Moon.tsx byeolsaem-web/src/components/hero/HeroSequence.tsx byeolsaem-web/src/app/globals.css
git commit -m "feat(home): the halo breathes until the ritual begins"
```

---

### Task 6: 공유 컴포넌트 — 구역·카드 prop·세 기둥 읽기·앵커 id

**Files:**
- Create: `byeolsaem-web/src/components/ui/ResultSection.tsx`
- Modify: `byeolsaem-web/src/components/chart/NatalReading.tsx` (비공개 `CardSection`·`Section` 제거)
- Modify: `byeolsaem-web/src/components/ui/ReadingCard.tsx`
- Modify: `byeolsaem-web/src/components/chart/NameTag.tsx`
- Modify: `byeolsaem-web/src/components/today/SkyNow.tsx` (`PlanetsNow`·`ComingMoons`)
- Modify: `byeolsaem-web/src/components/synastry/CompositeSection.tsx`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces (Produces):**
- `ResultSection({ id?, title, children })`, `CardSection({ id, title, intro?, children })` — natal의 것과 본문 동일.
- `ReadingCard` 추가 prop: `defaultOpen?: boolean`(기본 false), `open?: boolean`(주면 부모가 쥔다), `onToggle?: () => void`, `onPointerEnter?: () => void`, `onPointerLeave?: () => void`.
- `chartPillars(chart: Chart): { sun: ZodiacSign; moon: ZodiacSign; ascendant: ZodiacSign | null }`.
- `PlanetsNow({ sky, id? })`, `ComingMoons({ now, id? })`, `CompositeSection({ mine, theirs, id? })` — `id`가 있으면 그 요소에 붙고 `scroll-mt-32`.

- [ ] **Step 1: 실패하는 테스트** — `src/test/result-ui.test.ts`에 추가

import에 `chartPillars`를 더하고(`import { NameTag, chartPillars, nameTagText } from "@/components/chart/NameTag";`) 아래 블록을 파일 끝에:

```ts
describe("카드 prop", () => {
  const base = {
    badge: "♂",
    tech: "화성 · 처녀자리 25° · 1하우스",
    plain: "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다",
    where: "따져서 이깁니다.",
  };
  it("defaultOpen이면 처음부터 펼쳐져 있다", () => {
    const html = renderToStaticMarkup(createElement(ReadingCard, { ...base, defaultOpen: true }, createElement("p", null, "본문")));
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(">접기<");
    expect(html).toContain("grid-rows-[1fr]");
  });
  it("open을 주면 부모가 쥔다 — defaultOpen보다 우선", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingCard, { ...base, defaultOpen: true, open: false, onToggle: () => {} }, createElement("p", null, "본문")),
    );
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("세 기둥 읽기", () => {
  it("예시 하늘의 태양은 게자리, 상승궁이 있다", () => {
    const { chart } = exampleSky();
    const pillars = chartPillars(chart);
    expect(pillars.sun.key).toBe("cancer");
    expect(pillars.ascendant).not.toBeNull();
  });
  it("시각을 모르면 상승궁 자리는 null", () => {
    const { chart } = exampleSky();
    expect(chartPillars({ ...chart, ascendant: null }).ascendant).toBeNull();
  });
});
```

`npx vitest run src/test/result-ui.test.ts` → `chartPillars` 없음 등으로 실패.

- [ ] **Step 2: `src/components/ui/ResultSection.tsx`**

```tsx
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
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <ResultSection id={id} title={title}>
      {intro && (
        <p className="mb-4 max-w-[52ch] break-keep text-guide text-starlight-dim">{intro}</p>
      )}
      <div ref={ref} data-in={inView ? "true" : "false"} className="space-y-2.5">
        {children}
      </div>
    </ResultSection>
  );
}
```

- [ ] **Step 3: `NatalReading.tsx` — 헬퍼 제거, import**

import에 `import { CardSection, ResultSection } from "@/components/ui/ResultSection";` 추가. 파일 아래쪽의 `function CardSection(…)`과 `function Section(…)` 두 정의(각각 위 주석 블록 포함)를 지운다. `NatalBody` 안의 `<Section id="detail" title="점성술로 자세히">` → `<ResultSection id="detail" title="점성술로 자세히">`, 짝인 `</Section>` → `</ResultSection>`. `useInView` import는 `NatalReading`에 남는 다른 사용이 없으면 함께 지운다(`npx tsc --noEmit`이 알려 준다).

- [ ] **Step 4: `ReadingCard.tsx`**

```tsx
"use client";
import React, { useId, useState } from "react";

/**
 * 결과 카드 한 장 — The Pattern의 카드 문법.
 *
 * 위에 작게 용어(`화성 · 처녀자리 25° · 1하우스`), 아래 크게 사람 말("밀어붙이는
 * 힘이 첫인상에 있습니다"), 그 아래 그 별의 첫 문장, 오른쪽 위 글리프. 점성술
 * 용어가 제목이 아니라 꼬리표다. "더 읽기"를 누르면 지금 화면의 본문이 그대로
 * 나온다 — 문장은 하나도 지우지 않았고 자리만 접혀 있다.
 *
 * 본문은 접혀 있어도 DOM에 있다. 크롤러가 보는 글은 줄지 않는다. 접힘은 기존
 * 아코디언과 같은 grid-template-rows 0fr→1fr 300ms.
 *
 * 진입 계단은 부모가 `data-in="true"`를 켤 때 시작한다(globals.css .reading-card).
 * index × 60ms 뒤에 각자 뜬다.
 *
 * 여닫기는 기본으로 카드가 스스로 쥔다. `open`을 주면 부모가 쥔다(한 해의 강 점이
 * 카드를 열어 주는 계약). `defaultOpen`은 처음부터 펼쳐 두는 카드(궁합의 이름 붙은
 * 조합). 포인터 진입/이탈은 궁합의 금실 밝히기가 쓴다 — 스펙 C §3.
 */
export const ReadingCard: React.FC<
  React.PropsWithChildren<{
    id?: string;
    badge: React.ReactNode;
    tech: string;
    plain: React.ReactNode;
    where: string;
    index?: number;
    defaultOpen?: boolean;
    open?: boolean;
    onToggle?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
  }>
> = ({
  id,
  badge,
  tech,
  plain,
  where,
  index = 0,
  defaultOpen = false,
  open,
  onToggle,
  onPointerEnter,
  onPointerLeave,
  children,
}) => {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const isOpen = open ?? selfOpen;
  const toggle = () => {
    if (onToggle) onToggle();
    if (open === undefined) setSelfOpen((v) => !v);
  };
  const bodyId = useId();
  return (
    <article
      id={id}
      className="reading-card relative scroll-mt-28 rounded-xl bg-ink-raised px-4 py-3.5"
      style={{ animationDelay: `${index * 60}ms` }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span aria-hidden className="astro-symbol absolute right-4 top-3 text-base text-gold-soft">
        {badge}
      </span>
      <p className="pr-8 text-[0.72rem] tracking-[0.05em] text-starlight-dim tabular-nums">{tech}</p>
      <p className="mt-0.5 break-keep font-display text-base leading-snug text-starlight">{plain}</p>
      <p className="mt-1 break-keep text-meta text-starlight-dim">{where}</p>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}
        className="mt-2 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
      >
        {isOpen ? "접기" : "더 읽기"}
      </button>
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-w-[52ch] space-y-2 break-keep pt-3 leading-relaxed text-starlight-dim">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
};
```

- [ ] **Step 5: `NameTag.tsx` — `chartPillars`**

import를 `import type { Chart } from "@/lib/chart"; import { signAtLongitude, type ZodiacSign } from "@/lib/zodiac";`로 바꾸고 `nameTagText` 위에:

```tsx
/**
 * 차트에서 세 기둥의 별자리를 읽는다. 궁합이 나와 그쪽의 이름표를 같은 함수로
 * 만든다(스펙 C §3). 상승궁은 `chart.ascendant`가 null이면 null — 시각을 모르면
 * 계산하지 않는다는 원칙 그대로.
 */
export function chartPillars(chart: Chart): {
  sun: ZodiacSign;
  moon: ZodiacSign;
  ascendant: ZodiacSign | null;
} {
  const sun = chart.placements.find((p) => p.planet === "sun")!.sign;
  const moon = chart.placements.find((p) => p.planet === "moon")!.sign;
  return {
    sun,
    moon,
    ascendant: chart.ascendant === null ? null : signAtLongitude(chart.ascendant),
  };
}
```

- [ ] **Step 6: 앵커 id 셋**

`SkyNow.tsx`:
- `export function PlanetsNow({ sky }: { sky: TodaySky })` → `export function PlanetsNow({ sky, id }: { sky: TodaySky; id?: string })`, 그 `<section className="mt-16">` → `<section id={id} className="mt-16 scroll-mt-32">`.
- `export function ComingMoons({ now }: { now: Date })` → `({ now, id }: { now: Date; id?: string })`, 그 `<div className="mt-8 max-w-[52ch] border-l-2 border-gold/40 pl-5">` → `<div id={id} className="mt-8 max-w-[52ch] scroll-mt-32 border-l-2 border-gold/40 pl-5">`.

`CompositeSection.tsx`: `({ mine, theirs }: { mine: Chart; theirs: Chart })` → `({ mine, theirs, id }: { mine: Chart; theirs: Chart; id?: string })`, `<section className="mt-16">` → `<section id={id} className="mt-16 scroll-mt-32">`.

- [ ] **Step 7: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`(+4, 전부 통과). BOM 확인 일곱 파일.

```bash
git add byeolsaem-web/src/components/ui/ResultSection.tsx byeolsaem-web/src/components/chart/NatalReading.tsx byeolsaem-web/src/components/ui/ReadingCard.tsx byeolsaem-web/src/components/chart/NameTag.tsx byeolsaem-web/src/components/today/SkyNow.tsx byeolsaem-web/src/components/synastry/CompositeSection.tsx byeolsaem-web/src/test/result-ui.test.ts
git commit -m "refactor(ui): the result grammar leaves natal — sections, card props, pillars"
```

---

### Task 7: 궁합 — 이름표·금실·한 줄·공유, 그 아래 탭과 카드

**Files:**
- Modify: `byeolsaem-web/src/components/synastry/SynastryReading.tsx`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Consumes: Task 6 전부, `AspectBadge`, `ASPECT_TYPES`(`src/lib/chart.ts`), `toneLabel`, `GoldThreads`, `exampleMeeting()`(`src/lib/example-sky.ts`, `{ mine, theirs, reading }`), `EXAMPLE_BIRTH.date`.
- Produces: `export function SynastryHero({ mine, theirs, reading, profile, activeId })`, `export function SynastryBody({ mine, theirs, reading, chosen, onPick, onActive })`.

- [ ] **Step 1: 실패하는 테스트** — `result-ui.test.ts`에 추가

import 추가: `import { SynastryBody, SynastryHero } from "@/components/synastry/SynastryReading";`, `exampleSky` import 줄을 `import { EXAMPLE_BIRTH, exampleMeeting, exampleSky } from "@/lib/example-sky";`로.

파일 상단(`const sign = …` 아래)에 헬퍼:

```ts
/** 탭바의 모든 앵커가 같은 HTML 안의 구역 id를 가리킨다 — natal 최종 리뷰가 미뤄 둔 검사. */
function expectTabsResolve(html: string) {
  const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  expect(targets.length).toBeGreaterThan(0);
  for (const id of targets) expect(html).toContain(`id="${id}"`);
}
```

파일 끝에:

```ts
describe("궁합 첫 화면", () => {
  it("나·그쪽 이름표 → 금실 → 두 사람의 한 줄 → 공유 순서", () => {
    const { mine, theirs, reading } = exampleMeeting();
    const html = renderToStaticMarkup(
      createElement(SynastryHero, { mine, theirs, reading, profile: { date: EXAMPLE_BIRTH.date }, activeId: null }),
    );
    const tags = [...html.matchAll(/aria-label="태양 /g)].map((m) => m.index!);
    expect(tags).toHaveLength(2);
    const iThreads = html.indexOf("<svg", tags[1]);
    const iOne = html.indexOf("두 사람의 한 줄");
    const iShare = html.indexOf("두 하늘을 카드 한 장으로");
    expect(tags[0]).toBeLessThan(tags[1]);
    expect(tags[1]).toBeLessThan(iThreads);
    expect(iThreads).toBeLessThan(iOne);
    expect(iOne).toBeLessThan(iShare);
  });
  it("탭의 앵커마다 같은 id의 구역이 있다", () => {
    const { mine, theirs, reading } = exampleMeeting();
    const html = renderToStaticMarkup(
      createElement(SynastryBody, { mine, theirs, reading, chosen: null, onPick: () => {}, onActive: () => {} }),
    );
    expectTabsResolve(html);
    // 이름 붙은 조합은 펼쳐져 있고 나머지는 접혀 있다.
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
  });
});
```

`npx vitest run src/test/result-ui.test.ts` → export 없음으로 실패.

- [ ] **Step 2: `SynastryReading.tsx` 재구성**

import 정리 — 제거: `ToneBadge`. 추가:

```tsx
import type { BirthProfile } from "@/lib/birth-profile";
import { ASPECT_TYPES, computeChart, type Chart } from "@/lib/chart";
import { AspectBadge } from "@/components/ui/AspectBadge";
import { NameTag, chartPillars } from "@/components/chart/NameTag";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { CardSection, ResultSection } from "@/components/ui/ResultSection";
import { toneLabel } from "@/components/ui/ToneBadge";
```
(`computeChart, type Chart`는 기존 import 줄에 `ASPECT_TYPES`만 더하는 것.)

`SynastryReading` 안에서 `const [openLineId, setOpenLineId] = useState<string | null>(null);`와 그 주석을 지운다. `{partner && theirChart && reading && (<>…</>)}` 블록을 아래로 교체:

```tsx
        {partner && theirChart && reading && (
          <>
            <SynastryHero
              mine={myChart}
              theirs={theirChart}
              reading={reading}
              profile={profile}
              activeId={activeId}
            />
            <SynastryBody
              mine={myChart}
              theirs={theirChart}
              reading={reading}
              chosen={chosen}
              onPick={setConcern}
              onActive={setActiveId}
            />

            <div className="mt-8">
              <InviteButton profile={profile} />
            </div>

            {/* 상대의 생년월일을 방금 받았으니 그 사람의 태양궁을 이미 안다.
                일반 메뉴 대신 그 자리로 보낸다 — 열두 장을 이미 써 두었고,
                "그 사람은 어떤 사람인가"가 궁합 다음에 오는 물음이다. */}
            <PartnerRoom date={partner.date} />

            <p className="mt-14 max-w-[52ch] break-keep text-meta text-starlight-dim">
              상대의 정보는 어디에도 저장되지 않았습니다. 계산은 이 브라우저 안에서
              끝났고, 새로고침하면 사라집니다.
            </p>
          </>
        )}
```

`PartnerRoom` 정의 앞에 두 컴포넌트를 추가한다:

```tsx
/**
 * 첫 화면 — 나·그쪽 이름표, 금실, 두 사람의 한 줄, 공유(스펙 C §4.1).
 *
 * 이름표는 계산된 차트에서 읽을 뿐 어디에도 쓰지 않는다. 상승궁은 각자 따로 —
 * 한쪽만 시각을 몰라도 그쪽 이름표만 두 칸이다. "두 사람의 한 줄"이 이 화면의
 * LCP 앵커라 등장 클래스를 붙이지 않는다.
 */
export function SynastryHero({
  mine,
  theirs,
  reading,
  profile,
  activeId,
}: {
  mine: Chart;
  theirs: Chart;
  reading: SynastryReadingData;
  profile: Pick<BirthProfile, "date">;
  activeId: string | null;
}) {
  const me = chartPillars(mine);
  const them = chartPillars(theirs);
  return (
    <div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div>
          <p className="mb-1.5 text-meta text-starlight-dim">나</p>
          <NameTag sun={me.sun} moon={me.moon} ascendant={me.ascendant} />
        </div>
        <div>
          <p className="mb-1.5 text-meta text-starlight-dim">그쪽</p>
          <NameTag sun={them.sun} moon={them.moon} ascendant={them.ascendant} />
        </div>
      </div>

      <div className="mt-6">
        <GoldThreads mine={mine} theirs={theirs} lines={reading.lines} activeId={activeId} />
      </div>

      {reading.oneLiner && (
        <>
          {/* 두 사람의 한 줄 — 숫자보다 먼저, 이 관계가 어떤 짝인지부터(B안). */}
          <div className="mt-8">
            <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">두 사람의 한 줄</p>
            <p className="mt-3 max-w-[44ch] break-keep font-display text-2xl leading-normal text-starlight">
              {reading.oneLiner}
            </p>
            {reading.advice && (
              <div className="mt-6 max-w-[52ch] border-l-2 border-gold/45 bg-gold/[0.06] py-4 pl-5 pr-4">
                <p className="break-keep text-guide">
                  <b className="font-normal text-gold-soft">해 볼 것</b>{" "}
                  <span className="text-starlight-dim">{reading.advice.try}</span>
                </p>
                <p className="mt-2 break-keep text-guide">
                  <b className="font-normal text-gold-soft">버릴 것</b>{" "}
                  <span className="text-starlight-dim">{reading.advice.hold}</span>
                </p>
              </div>
            )}
          </div>

          {/* 궁합 결과도 밖으로 나갈 통로가 있어야 한다(정찰 ⑧). 그림은 내
              태양 별자리 성좌 — 상대의 정보는 카드에도 남기지 않는다. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="w-full text-meta text-starlight-dim sm:w-auto">
              두 하늘을 카드 한 장으로 —
            </span>
            <SaveCardButton
              filename={`byeolsaem-synastry-${profile.date.replaceAll("-", "")}.png`}
              spec={() => ({
                name: "두 사람의 하늘",
                latin: "TWO SKIES",
                range: formatBirthDate(profile.date),
                symbol: SIGN_SYMBOL[getSunSign(profile.date).key],
                tagline: firstSentence(reading.oneLiner!),
                art: signArt(getSunSign(profile.date)),
              })}
            />
            <KakaoShareButton
              text={`두 사람의 하늘 — ${firstSentence(reading.oneLiner)}`}
              path="/synastry"
              imagePath="/og/synastry.png"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** 각 이름(`line.aspectKey`)에서 각도를 — 인장이 그릴 벌어짐. */
function aspectAngle(key: string): number {
  return ASPECT_TYPES.find((t) => t.key === key)?.angle ?? 0;
}

/**
 * 첫 화면 아래의 읽는 구간. 탭 넷 — 한눈에, {렌즈}으로, 닿는 자리, 세 번째 하늘
 * (스펙 C §4.2). 만남은 카드다(§4.3): 용어는 작게 위, 이 만남의 이름은 크게 아래,
 * 두 자리가 만나는 생활 문장이 그 밑, 본문은 접혀 있다. 이름 붙은 조합(✦)은
 * 처음부터 펼쳐져 있다 — 아래 안내문이 그렇게 말한다.
 */
export function SynastryBody({
  mine,
  theirs,
  reading,
  chosen,
  onPick,
  onActive,
}: {
  mine: Chart;
  theirs: Chart;
  reading: SynastryReadingData;
  chosen: string | null;
  onPick: (concern: string) => void;
  onActive: (id: string | null) => void;
}) {
  // ResultTabs의 관찰자가 items 정체성에 걸려 있다 — 매 렌더 새 배열을 주면
  // 스크롤 스파이가 매번 다시 붙는다.
  const tabs = useMemo(
    () => [
      { id: "overview", label: "한눈에" },
      ...(reading.empty
        ? []
        : [
            { id: "lens", label: reading.lens ? `${reading.lens.label}으로` : "무엇을 볼까요" },
            { id: "lines", label: "닿는 자리" },
          ]),
      { id: "composite", label: "세 번째 하늘" },
    ],
    [reading.empty, reading.lens],
  );

  return (
    // 탭바와 그 아래 전부가 한 상자 안에 있어야 한다 — sticky는 자기 컨테이닝
    // 블록 밖으로 못 나간다.
    <div className="mt-10">
      <ResultTabs items={tabs} />

      <ResultSection id="overview" title="한눈에">
        <Resonance reading={reading} />
        {reading.empty ? (
          <p className="mt-10 max-w-[52ch] break-keep leading-relaxed text-starlight">
            {reading.empty}
          </p>
        ) : (
          <div className="mt-10 flex flex-wrap gap-2.5">
            {reading.chips.map((chip) => (
              <TalismanChip key={chip.label} symbol={chip.symbol} label={chip.label} />
            ))}
          </div>
        )}
      </ResultSection>

      {!reading.empty && (
        <>
          <LensSection id="lens" lens={reading.lens} chosen={chosen} onPick={onPick} />

          <CardSection
            id="lines"
            title="두 하늘이 닿는 자리"
            intro={`${chosen ? `${chosen}에 걸리는 것을 앞에 두고, ` : ""}이름이 붙어 있는 조합과 무게가 실린 것부터 ${reading.lines.length}개입니다. 이름 붙은 조합(✦)은 펼쳐 두었고 나머지는 눌러서 엽니다. 한 줄에 커서를 올리면 위 그림에서 그 실이 밝아집니다.`}
          >
            {reading.lines.map((line, i) => (
              <ReadingCard
                key={line.id}
                index={i}
                defaultOpen={line.highlight !== null}
                onPointerEnter={() => onActive(line.id)}
                onPointerLeave={() => onActive(null)}
                badge={
                  <AspectBadge
                    angle={aspectAngle(line.aspectKey)}
                    harmony={line.harmony}
                    aSymbol={line.mine.symbol}
                    bSymbol={line.theirs.symbol}
                    animate
                    delay={i * 60}
                    className="w-8"
                  />
                }
                tech={`${line.highlighted ? "✦ " : ""}내 ${line.mine.ko} ${line.aspectKo} 그쪽 ${line.theirs.ko} · 오차 ${line.orb.toFixed(1)}도 · ${toneLabel(line.harmony)}`}
                plain={
                  <>
                    {line.headline}
                    {line.highlighted && <span className="sr-only"> 고른 관심사에 걸리는 항목입니다.</span>}
                  </>
                }
                where={line.meeting}
              >
                <p>{line.body}</p>
                {line.highlight && (
                  <p className="border-l-2 border-gold/40 pl-4 text-starlight">{line.highlight}</p>
                )}
              </ReadingCard>
            ))}
          </CardSection>
        </>
      )}

      <CompositeSection id="composite" mine={mine} theirs={theirs} />
    </div>
  );
}
```

`LensSection`에 `id` prop: 시그니처를 `({ id, lens, chosen, onPick }: { id: string; lens: LensView | null; … })`로, `<section className="mt-16">` → `<section id={id} className="mt-16 scroll-mt-32">`. 안의 문장은 그대로.

`LineRow`·`LineHead`·`CollapsedLineRow` 세 함수와 그 위 주석 블록(탭 순서 설명 포함)을 지운다 — 그 문장들은 카드의 `tech`/`plain`/`where`/본문으로 전부 옮겨졌다(`ToneBadge`의 순풍·마찰·겹침은 `toneLabel`로).

- [ ] **Step 3: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`(+2). `import { m } from "motion/react"`·`MotionScope`는 `LensSection`이 여전히 쓴다. BOM 확인.

```bash
git add byeolsaem-web/src/components/synastry/SynastryReading.tsx byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(synastry): two name tags, the threads, one line, then tabs and cards"
```

---

### Task 8: 오늘 — 뒤집은 뒤 탭과 카드

**Files:**
- Modify: `byeolsaem-web/src/components/today/TodayCard.tsx`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Consumes: `TodayBack`, `TodayTransit`, `todayBack`, `todaySky`, Task 6의 `PlanetsNow id`·`ComingMoons id`·`CardSection`.
- Produces: `export function TodayBody({ back, sky, now }: { back: TodayBack | null; sky: TodaySky; now: Date })`.

- [ ] **Step 1: 실패하는 테스트** — `result-ui.test.ts`에 추가

import: `import { TodayBody } from "@/components/today/TodayCard";`, `import { todaySky } from "@/lib/today";`, `import { todayBack } from "@/lib/today-reading";`.

```ts
describe("오늘의 결과 구간", () => {
  const when = new Date("2026-09-07T03:00:00Z");
  it("뒤집은 뒤: 탭의 앵커마다 같은 id의 구역이 있다", () => {
    const { chart } = exampleSky();
    const sky = todaySky(when);
    const back = todayBack(sky, chart, null);
    const html = renderToStaticMarkup(createElement(TodayBody, { back, sky, now: when }));
    expectTabsResolve(html);
    expect(html).toContain('href="#today-transits"');
    expect(html).toContain('href="#today-planets"');
    expect(html).toContain('href="#today-moons"');
  });
  it("뒤집기 전에는 탭이 없고 열 개의 별·다가오는 달만 있다", () => {
    const sky = todaySky(when);
    const html = renderToStaticMarkup(createElement(TodayBody, { back: null, sky, now: when }));
    expect(html).not.toContain('aria-label="결과 구역"');
    expect(html).toContain("오늘의 하늘, 열 개의 별");
    expect(html).toContain("다가오는 달");
  });
});
```

`npx vitest run src/test/result-ui.test.ts` → export 없음으로 실패.

- [ ] **Step 2: `TodayCard.tsx`**

import 변경 — 제거: `ToneBadge`. 추가:

```tsx
import { useEffect, useMemo, useState } from "react";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { CardSection } from "@/components/ui/ResultSection";
import { toneLabel } from "@/components/ui/ToneBadge";
import { afterFirstSentence, firstSentence } from "@/lib/text";
import { todayBack, todayFront, type TodayBack, type TodayTransit } from "@/lib/today-reading";
```

`TodayCard` 반환부에서

```tsx
        {flipped && back && <TransitList back={back} />}

        {/* 열 행성 자리표 — 계산은 이미 있었고 화면만 없었다(정찰 ①). */}
        <PlanetsNow sky={sky} />
        {/* 다가오는 삭망(정찰 ⑨). 달 카드의 흐름을 이어받는 자리. */}
        <ComingMoons now={clockNow} />
```
를

```tsx
        <TodayBody back={flipped ? back : null} sky={sky} now={clockNow} />
```
로 바꾼다.

`TransitList`와 `TransitItem`을 지우고 아래 셋을 넣는다:

```tsx
/**
 * 카드 아래의 읽는 구간(스펙 C §5.1).
 *
 * 뒤집기 전(back이 null)에는 지금과 같이 열 개의 별과 다가오는 달만 — 탭 둘로
 * 탭바를 세울 이유가 없다. 뒤집으면 탭바가 서고 트랜짓이 카드로 갈린다. 탭바와
 * 다섯 구역이 한 div 안에 있어야 sticky가 산다.
 */
export function TodayBody({
  back,
  sky,
  now,
}: {
  back: TodayBack | null;
  sky: TodaySky;
  now: Date;
}) {
  const hasLens = (back?.lensTransits.length ?? 0) > 0;
  // ResultTabs의 관찰자가 items 정체성에 걸려 있다.
  const tabs = useMemo(
    () =>
      back
        ? [
            { id: "today-transits", label: "건드리는 자리" },
            ...(!back.quiet && hasLens && back.lensLabel
              ? [{ id: "today-lens", label: `궁금해한 ${back.lensLabel}` }]
              : []),
            ...(!back.quiet && back.otherTransits.length > 0
              ? [{ id: "today-others", label: hasLens ? "그 밖의 하늘" : "오늘의 각" }]
              : []),
            { id: "today-planets", label: "열 개의 별" },
            { id: "today-moons", label: "다가오는 달" },
          ]
        : [],
    [back, hasLens],
  );

  if (!back) {
    return (
      <>
        {/* 열 행성 자리표 — 계산은 이미 있었고 화면만 없었다(정찰 ①). */}
        <PlanetsNow sky={sky} />
        {/* 다가오는 삭망(정찰 ⑨). 달 카드의 흐름을 이어받는 자리. */}
        <ComingMoons now={now} />
      </>
    );
  }

  return (
    <div className="mt-16">
      <ResultTabs items={tabs} />
      <TransitList back={back} hasLens={hasLens} />
      <PlanetsNow id="today-planets" sky={sky} />
      <ComingMoons id="today-moons" now={now} />
    </div>
  );
}

/**
 * 뒷면의 조립 순서는 B안(2026-08-14 승인): 오늘의 한 줄 → 당신이 궁금해한 영역 →
 * 해 볼 것/미룰 것 → 그 밖의 하늘. 본문은 생활 언어가 맡고 별 이야기는 근거
 * 줄(basis)로 내려간다. 트랜짓은 카드다(스펙 C §5.2) — 계단은 카드 계단이 맡으므로
 * 예전 블록별 prompt-in 지연(120·200·280ms)은 뺐다. 첫 블록의 prompt-in 하나만
 * 뒤집는 순간의 등장으로 남긴다.
 */
function TransitList({ back, hasLens }: { back: TodayBack; hasLens: boolean }) {
  return (
    <>
      {/* scroll-mt로 머리글과 탭바 아래 여유를 남긴다 — 뒤집는 순간 여기로 데려온다. */}
      <section id="today-transits" className="mt-16 scroll-mt-32">
        <h2 className="animate-prompt-in mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
          오늘 하늘이 건드리는 자리
          <span aria-hidden className="h-px flex-1 bg-gold/25" />
        </h2>

        {back.quiet ? (
          <p className="max-w-[52ch] break-keep text-guide text-starlight">{back.quiet}</p>
        ) : (
          <>
            {back.headline && (
              <div className="animate-prompt-in">
                <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">오늘의 한 줄</p>
                <p className="mt-3 max-w-[44ch] break-keep font-display text-2xl leading-normal text-starlight">
                  {back.headline}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2.5">
              {back.chips.map((chip) => (
                <TalismanChip key={chip.label} symbol={chip.symbol} label={chip.label} />
              ))}
            </div>

            {back.advice && (
              <div className="mt-10 max-w-[52ch] border-l-2 border-gold/45 bg-gold/[0.06] py-4 pl-5 pr-4">
                <p className="break-keep text-guide">
                  <b className="font-normal text-gold-soft">해 볼 것</b>{" "}
                  <span className="text-starlight-dim">{back.advice.try}</span>
                </p>
                <p className="mt-2 break-keep text-guide">
                  <b className="font-normal text-gold-soft">미룰 것</b>{" "}
                  <span className="text-starlight-dim">{back.advice.hold}</span>
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {!back.quiet && hasLens && back.lensLabel && (
        <CardSection id="today-lens" title={`당신이 궁금해한 ${back.lensLabel}`}>
          {back.lensTransits.map((t, i) => (
            <TransitCard key={`${t.moving.key}-${t.fixed.key}-${t.aspectKo}`} t={t} index={i} />
          ))}
        </CardSection>
      )}

      {!back.quiet && back.otherTransits.length > 0 && (
        <CardSection id="today-others" title={hasLens ? "그 밖의 하늘" : "오늘의 각"}>
          {back.otherTransits.map((t, i) => (
            <TransitCard key={`${t.moving.key}-${t.fixed.key}-${t.aspectKo}`} t={t} index={i} />
          ))}
        </CardSection>
      )}

      <p className="mt-10 max-w-[52ch] break-keep text-meta text-starlight-dim">
        오늘 하늘은 한국 시간 정오를 기준으로 계산했습니다. 달은 하루에 13도를 움직이므로
        이른 아침과 늦은 밤은 이 값과 조금 다릅니다.
      </p>
    </>
  );
}

/**
 * 트랜짓 한 장. 옛 TransitItem의 모든 것이 자리만 바꿔 들어 있다 — 별 표기와
 * 오차·결·기간은 용어 줄로, 생활 문장의 첫 문장은 크게, 건드려지는 자리의 생활
 * 이름은 그 밑, 나머지 문장과 근거는 접힌 본문으로.
 */
function TransitCard({ t, index }: { t: TodayTransit; index: number }) {
  return (
    <ReadingCard
      index={index}
      badge={
        <>
          {t.aspectSymbol}
          {"\uFE0E"}
        </>
      }
      tech={`오늘의 ${t.moving.ko} ${t.aspectKo} 내 ${t.fixed.ko} · 오차 ${t.orb.toFixed(1)}도 · ${toneLabel(t.harmony)} · 약 ${t.span}`}
      plain={firstSentence(t.life)}
      where={t.area}
    >
      {afterFirstSentence(t.life) && <p>{afterFirstSentence(t.life)}</p>}
      <p>{t.basis}</p>
    </ReadingCard>
  );
}
```

`flip()`의 스크롤 목표 `today-transits`는 그대로 살아 있다.

- [ ] **Step 3: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`(+2). BOM 확인.

```bash
git add byeolsaem-web/src/components/today/TodayCard.tsx byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(today): after the flip, tabs and cards instead of a stacked list"
```

---

### Task 9: 한 해 — 사건 카드, 좁은 화면의 탭

**Files:**
- Modify: `byeolsaem-web/src/components/yearly/YearEventRows.tsx` (전체 교체)
- Modify: `byeolsaem-web/src/components/yearly/YearScope.tsx`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Consumes: `yearReading(natal, year, concern)`, `YearReadingEvent`, `pinCapable`, Task 6.
- Produces: `YearEventRows` 시그니처 불변(`{ year, events, openId, onToggle }`); `PersonalYear` prop `flow: boolean` 추가(비공개).

- [ ] **Step 1: 실패하는 테스트** — `result-ui.test.ts`에 추가

import: `import { YearEventRows } from "@/components/yearly/YearEventRows";`, `import { yearReading } from "@/lib/yearly-reading";`.

```ts
describe("한 해의 사건 카드", () => {
  it("사건마다 카드 하나, openId인 카드만 펼쳐져 있고, 카드 id는 사건 id", () => {
    const { chart } = exampleSky();
    const events = yearReading(chart, 2026, null).events;
    expect(events.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      createElement(YearEventRows, { year: 2026, events, openId: events[0].id, onToggle: () => {} }),
    );
    expect(html.match(/aria-expanded=/g)).toHaveLength(events.length);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html).toContain(`id="${events[0].id}"`);
    expect(html).toContain("힘이 도는 기간은");
  });
});
```

`npx vitest run src/test/result-ui.test.ts` → 옛 `ul > li` 렌더는 `aria-expanded` 수는 맞을 수 있으나 `class="reading-card`가 없다 — 위 검사에 `expect(html).toContain('class="reading-card');`를 더해 확실히 실패시킨다.

- [ ] **Step 2: `YearEventRows.tsx` 전체 교체**

```tsx
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
            index={i}
            open={open}
            onToggle={() => onToggle(open ? null : event.id)}
            badge={
              <>
                {event.aspectSymbol}
                {"\uFE0E"}
              </>
            }
            tech={`${event.inLens ? "● " : ""}${event.moving.ko} ${event.aspectKo} 내 ${event.fixed.ko} · ${first.month}월 ${first.day}일${
              event.exact.length > 1 ? ` 외 ${event.exact.length - 1}` : ""
            } · ${toneLabel(event.harmony)}`}
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
```

- [ ] **Step 3: `YearScope.tsx` — `flow` 상승, 탭, 구역 id**

import 추가: `import { ResultTabs } from "@/components/ui/ResultTabs";`

`YearScope`:

```tsx
export function YearScope({ backdrops }: { backdrops: YearBackdrop[] }) {
  const [year, setYear] = useState(backdrops[0].year);
  // 넓은 화면 + 감소 모드 아님 → 붙박인 가로 강(YearFlow). 아니면 접힌 카드 목록.
  // 마운트 뒤에 정한다 — 서버 HTML에는 탭이 없어야 하이드레이션이 어긋나지 않는다.
  // null은 "아직 모른다".
  const [flow, setFlow] = useState<boolean | null>(null);
  useEffect(() => setFlow(pinCapable()), []);

  // (기존 wanted useEffect 그대로)

  const current = backdrops.find((b) => b.year === year) ?? backdrops[0];

  // 좁은 화면과 감소 모드의 탭 둘(스펙 C §6.2). 핀 무대 경로에는 두지 않는다 —
  // 무대가 sticky top-0 h-screen이라 탭바(sticky top-16)와 겹친다.
  const tabs = useMemo(
    () => [
      { id: `year-${current.year}`, label: `${current.year}년, 모두에게` },
      { id: "personal-year", label: "당신의 날짜" },
    ],
    [current.year],
  );

  return (
    <div className="grid items-start gap-10 md:grid-cols-[150px_minmax(0,1fr)] md:gap-12">
      <YearRail backdrops={backdrops} year={current.year} onPick={setYear} />

      <div className="min-w-0">
        {flow === false && <ResultTabs items={tabs} />}
        {backdrops.map((backdrop) => (
          <BackdropSection
            key={backdrop.year}
            backdrop={backdrop}
            hidden={backdrop.year !== current.year}
          />
        ))}
        <PersonalYear year={current.year} flow={flow === true} />
      </div>
    </div>
  );
}
```

`BackdropSection`: `<section hidden={hidden} aria-labelledby={`year-${backdrop.year}`}>` → `<section id={`year-${backdrop.year}`} hidden={hidden} className="scroll-mt-32" aria-labelledby={`year-${backdrop.year}-title`}>`, 그 `<h2 id={`year-${backdrop.year}`}` → `<h2 id={`year-${backdrop.year}-title`}`. 탭바 바로 아래 첫 구역이므로 `<section>`에 `mt-10`도 더한다(`className="mt-10 scroll-mt-32"`) — 탭바와 제목이 붙지 않게.

`PersonalYear`: 시그니처 `({ year, flow }: { year: number; flow: boolean })`. 안의 `const [flow] = useState(() => pinCapable());`와 그 위 주석 블록을 지운다(`pinCapable` import는 `YearScope`가 쓴다). 네 갈래의 `<section className="mt-20 border-t border-gold/15 pt-12">` 전부 → `<section id="personal-year" className="mt-20 scroll-mt-32 border-t border-gold/15 pt-12">`.

- [ ] **Step 4: 확인 · 커밋**

`npx tsc --noEmit && npx vitest run`(+1). BOM 확인.

```bash
git add byeolsaem-web/src/components/yearly/YearEventRows.tsx byeolsaem-web/src/components/yearly/YearScope.tsx byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(yearly): event cards, and tabs where the river is not pinned"
```

---

### Task 10: 빌드 · 문서

**Files:**
- Modify: `docs/todo.md`
- Modify: `docs/superpowers/specs/2026-09-06-scattered-motion.md`
- Modify: `docs/superpowers/specs/2026-09-07-result-grammar-synastry-today-yearly.md`

- [ ] **Step 1: 빌드**

`byeolsaem-web`에서 `npm run build` — 정적 내보내기가 끝나야 한다(경고는 보고에 적는다). 실패하면 원인을 보고하고 멈춘다.

- [ ] **Step 2: `docs/todo.md`**

"다음에 바로 할 것"의 스펙 B·C 두 항목을 `[x]`로 바꾸고 각 끝에 ` — 2026-09-07 구현(브랜치 scattered-motion-result-grammar)`을 붙인다. "살펴볼 만한 것"에 추가:

```
- [ ] **한 해 핀 무대 경로의 탭바.** 넓은 화면 + 감소 모드 아님에서는 `YearFlow`의
      무대가 `sticky top-0 h-screen`이라 탭바(`sticky top-16`)와 겹쳐 두지 않았다.
      무대 위 48px을 비우고 탭을 얹을지, 그 화면은 스크롤이 목차라 그대로 둘지 판단.
- [ ] **궁합 카드 → 금실 밝히기의 거리.** 금실이 첫 화면으로 올라가 카드 목록과
      한 화면 넘게 떨어졌다. 커서를 올려도 실이 밝아지는 것이 보이지 않으면
      카드 옆에 작은 금실 축소판을 두거나 연결을 뺀다.
```

"natal 재구성 배포" 항목의 설명 끝에 `이 브랜치(스펙 B·C)도 같은 배포에 실린다.`를 붙인다.

- [ ] **Step 3: 스펙 B에 "## 8. 구현 기록"** 추가

```markdown
## 8. 구현 기록 (2026-09-07)

- §1 주간 별길: 선은 `scaleX` 대신 `pathLength=1` + `stroke-dashoffset`(그리기 토큰, 1000ms) — 이 저장소의 SVG 선 그리기 문법 그대로. `<line>`에 `transform-box: fill-box`는 높이 0 bbox 위에서 원점을 재야 해 피했다. 트리거는 `useInView`(0.25)로 바꾸고 `WeeklyCard`의 rAF `entered`를 지웠다.
- §2 12년 아치: 최종 색은 기존 값 유지(`rgba(201,162,39,0.16)`). 나이 마커 = 다이얼 중앙 `AGE`+숫자.
- §3 오늘의 달: `MoonDisc` prop은 `fill?: string | null`(세션 열쇠) — `ChartWheel`의 `entrance`와 같은 계약. `TodayCard`는 `now`를 안 뒤에만 열쇠를 준다(빌드 시점 하늘로 한 번, 오늘로 한 번 도는 것을 막는다). 경로 식은 `src/lib/moon-path.ts`.
- §4 역행 띠: `RetroBand` prop `live`(같은 이유). 굴림 판정은 `src/lib/retro-roll.ts`.
- §5 달무리: `HeroSequence`에는 ScrollTrigger가 없다 — 달은 단추로 시작하는 Flip이 옮긴다. `scene === "arrival"`에서만 숨쉬고 의식이 시작되면 `animation: none`(paused가 아니라 제거 — 커진 채 얼어붙지 않게).
```

- [ ] **Step 4: 스펙 C에 "## 10. 구현 기록"** 추가

```markdown
## 10. 구현 기록 (2026-09-07)

- §3: `ResultSection`·`CardSection`은 `src/components/ui/ResultSection.tsx`. `ReadingCard`의 `open`은 `defaultOpen`보다 우선한다(부모가 쥐면 카드는 스스로 바꾸지 않는다).
- §5.1: 렌즈가 없을 때 나머지 트랜짓 구역의 라벨은 "오늘의 각" — 이 스펙이 새로 넣은 유일한 낱말.
- §6.2: 한 해 탭은 `flow === false`(마운트 뒤 판정)에서만 선다. 서버 HTML에는 없다.
```

- [ ] **Step 5: 커밋**

```bash
git add docs/todo.md docs/superpowers/specs/2026-09-06-scattered-motion.md docs/superpowers/specs/2026-09-07-result-grammar-synastry-today-yearly.md
git commit -m "docs: record how the five motions and the result grammar landed"
```
