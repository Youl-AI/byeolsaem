# /natal 결과 화면 재구성 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/natal` 결과 화면을 "이름표 → 원반(그려지는 등장) → 한 줄 → 공유 → 탭바 → 카드"로 재구성하고, 원반 등장·각 인장·타임랩스 모션을 넣는다. 문장은 하나도 지우지 않는다.

**Architecture:** 공유 컴포넌트 넷(`NameTag`·`ResultTabs`·`ReadingCard`·`SkyLapse`)과 유틸 둘(`plainLine`·`onceInSession`)을 먼저 만들고 테스트한 뒤, 마지막 태스크 하나에서 `NatalReading`을 새 구조로 갈아 끼우고 `WheelFigure`를 지운다. 그 마지막 커밋만 되돌리면 옛 화면이 살아난다. 모션은 전부 CSS `@keyframes` + 인라인 `animation-delay`; 곡선은 저장소의 두 토큰만 쓴다.

**Tech Stack:** Next.js 16(정적 내보내기) · React 19 · Tailwind 4 · Vitest 4 · `react-dom/server`(렌더 테스트) · 저장소 엔진(`src/lib/ephemeris.ts`, `chart.ts`, `reading.ts`)

**Spec:** `docs/superpowers/specs/2026-09-06-natal-result-redesign.md`

## Global Constraints

- 문장 삭제 0. 지금 화면의 모든 해석 문장은 새 화면에 남는다(자리만 이동).
- `chart.ascendant === null`이면 이름표 셋째 칸·원반 ASC·하우스 문장 생략. 임의 시각 대입 금지.
- 곡선은 둘만: 그리기 `cubic-bezier(0.33, 1, 0.68, 1)`, 등장·점등 `cubic-bezier(0.16, 1, 0.3, 1)`. 셋째 곡선 금지.
- 애니메이션 속성은 `transform`·`opacity`(+ SVG `stroke-dashoffset`)만. 예외는 `SkyLapse`의 SVG 좌표 갱신 하나.
- "당신을 한 줄로" 텍스트는 어떤 분기에서도 `opacity: 0`으로 시작하지 않는다(LCP 앵커).
- 감소 모드(`prefers-reduced-motion: reduce`)는 dash·이동 제거, opacity 200ms만 남김.
- 소스에 U+FE0E는 `"\uFE0E"` 이스케이프로만 적는다. 파일은 UTF-8 no-BOM.
- 커밋 메시지에 PowerShell here-string(`@'…'@`) 금지, `git add -A` 금지. 커밋 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 마루부리 서브셋에 없는 글자 금지. 확인된 것: `↑ ☉ ☽ ℞ — · °` 있음, `▶` **없음**(재생 단추는 글자 "재생"으로).
- 검증 순서: `npx tsc --noEmit` → `npx vitest run` → `npm run build`(byeolsaem-web) → `npx wrangler deploy`(저장소 루트) → dev-browser 실측.
- 작업 디렉터리: 모든 `npx`·`npm`은 `byeolsaem-web/`에서, `wrangler deploy`와 `git`은 저장소 루트에서.

---

## 파일 구조

| 파일 | 역할 | 태스크 |
|---|---|---|
| `src/content/atoms/life.ts` | `ASC_FACES` 12칸 추가 | 1 |
| `src/test/atoms.test.ts` | `ASC_FACES` 가드 | 1 |
| `src/lib/plain-line.ts` (신규) | 행성 한 줄 문장 조립 + 예외 표 | 2 |
| `src/test/plain-line.test.ts` (신규) | 120쌍 가드·조사 규칙 | 2 |
| `src/lib/once.ts` (신규) | 세션당 한 번 표식(`sessionStorage`) | 3 |
| `src/components/chart/NameTag.tsx` (신규) | 이름표 한 줄 | 4 |
| `src/components/ui/ReadingCard.tsx` (신규) | 카드 한 장 | 5 |
| `src/components/ui/ResultTabs.tsx` (신규) | sticky 탭바 + 스크롤 스파이 | 6 |
| `src/test/result-ui.test.ts` (신규) | NameTag·ReadingCard·ResultTabs 렌더 가드 | 4·5·6 |
| `src/components/ui/AspectBadge.tsx` | 호 등장 모션 `animate` prop | 7 |
| `src/app/globals.css` | 원반·호·카드 keyframes 토큰 | 7·8 |
| `src/components/chart/ChartWheel.tsx` | `entrance` prop | 8 |
| `src/components/solar/SolarScope.tsx` | `entrance` 켜기 | 8 |
| `src/lib/sky-lapse.ts` (신규) | 출생→오늘 361점 샘플·언랩 | 9 |
| `src/test/sky-lapse.test.ts` (신규) | 샘플 가드 | 9 |
| `src/components/chart/SkyLapse.tsx` (신규) | 타임랩스 화면 | 9 |
| `src/components/chart/NatalReading.tsx` | 재구성 | 10 |
| `src/components/chart/WheelFigure.tsx` | **삭제** | 10 |
| `src/app/(night-static)/natal/page.tsx` | 헤더를 `intro`로 넘김 | 10 |
| `docs/todo.md` | 후속(스펙 C·B) 기록 | 11 |

---

### Task 1: `ASC_FACES` — 상승궁 첫인상 12칸

**Files:**
- Modify: `byeolsaem-web/src/content/atoms/life.ts` (SIGN_FACES 블록 바로 아래, 현재 137행 `};` 다음)
- Test: `byeolsaem-web/src/test/atoms.test.ts`

**Interfaces:**
- Produces: `export const ASC_FACES: Record<string, string>` — 키는 `ZodiacSign.key`(aries…pisces), 값은 관형형 구절.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/test/atoms.test.ts`의 import에 `SIGN_FACES, ASC_FACES`를 더한다:

```ts
import { ASC_FACES, SIGN_FACES } from "@/content/atoms/life";
```

`describe("아톰 DB — 빈칸이 없어야 한다", …)` 안, "상승궁과 중천 아톰이 열두 자리를 채운다" 테스트 아래에 추가:

```ts
  /**
   * 상승궁 카드의 첫 줄 "남들이 처음 보는 나는 ___ 사람"의 빈칸.
   * 태양 카드(SIGN_FACES.out)와 같은 자리일 때 두 카드가 같은 말을 하면
   * 안 되므로 문자열이 겹치지 않는지도 본다.
   */
  it("ASC_FACES가 열두 자리를 채우고 태양 얼굴과 겹치지 않는다", () => {
    for (const key of SIGN_KEYS) {
      expect(ASC_FACES[key], key).toBeTruthy();
      expect(ASC_FACES[key].length, key).toBeGreaterThan(3);
      expect(ASC_FACES[key], key).not.toBe(SIGN_FACES[key].out);
    }
    expect(Object.keys(ASC_FACES)).toHaveLength(12);
  });
```

- [ ] **Step 2: 실패 확인**

Run (byeolsaem-web): `npx vitest run src/test/atoms.test.ts`
Expected: FAIL — `"ASC_FACES" is not exported` 또는 `undefined`.

- [ ] **Step 3: 구현**

`src/content/atoms/life.ts`, `SIGN_FACES`의 닫는 `};` 바로 뒤에 추가:

```ts

/**
 * 상승궁의 첫인상 — 상승궁 카드 첫 줄 "남들이 처음 보는 나는 ___ 사람"의 빈칸.
 *
 * SIGN_FACES.out(태양의 겉)과 다른 말이어야 한다. 태양과 상승궁이 같은 자리인
 * 사람은 두 카드를 나란히 보는데, 같은 구절이 두 번 서면 하나가 틀린 것처럼
 * 읽힌다. 결은 ASCENDANT_ATOMS의 첫 문장을 따른다.
 */
export const ASC_FACES: Record<string, string> = {
  aries: "먼저 말을 꺼내는",
  taurus: "느긋해 보이는",
  gemini: "말이 잘 통하는",
  cancer: "낯을 가리는",
  leo: "눈에 잘 띄는",
  virgo: "단정하고 조심스러운",
  libra: "예의가 몸에 붙은",
  scorpio: "속을 잘 안 보이는",
  sagittarius: "거리감이 없는",
  capricorn: "나이보다 어른스러운",
  aquarius: "어딘가 남다른",
  pisces: "부드럽고 순한",
};
```

- [ ] **Step 4: 결 대조**

`src/content/atoms/ascendant.ts`의 `ASCENDANT_ATOMS` 각 항목 첫 문장을 열어 위 12칸과 나란히 읽는다. 방향이 어긋나는 칸(예: 아톰이 "조용히 관찰하는"인데 얼굴이 "먼저 말을 꺼내는")이 있으면 얼굴 쪽을 고친다. 고친 뒤에도 `SIGN_FACES[key].out`과 같은 문자열이 되면 안 된다.

- [ ] **Step 5: 통과 확인 + 폰트**

Run: `npx vitest run src/test/atoms.test.ts src/test/fonts.test.ts`
Expected: PASS. `fonts.test.ts`가 실패하면 `python scripts/subset-maruburi.py` 실행 후 재실행.

- [ ] **Step 6: 커밋**

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/content/atoms/life.ts byeolsaem-web/src/test/atoms.test.ts byeolsaem-web/src/fonts
git commit -m "content(natal): twelve first-impression faces for the ascendant card" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `plainLine` — 행성 카드의 일상어 첫 줄

**Files:**
- Create: `byeolsaem-web/src/lib/plain-line.ts`
- Test: `byeolsaem-web/src/test/plain-line.test.ts`

**Interfaces:**
- Consumes: `PLANET_AREAS`, `HOUSE_AREAS` from `@/content/atoms/life`; `iga(word: string): "이" | "가"` from `@/lib/josa`; `PlanetKey` from `@/lib/planets`; `ZodiacSign` from `@/lib/zodiac`.
- Produces: `plainLine(planet: PlanetKey, house: number | null, sign: ZodiacSign): string`, `PLAIN_OVERRIDES: Partial<Record<string, string>>`(키 `${planet}-${house}`).

- [ ] **Step 1: 실패하는 테스트**

`src/test/plain-line.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HOUSE_AREAS, PLANET_AREAS } from "@/content/atoms/life";
import { PLANETS } from "@/lib/planets";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { PLAIN_OVERRIDES, plainLine } from "@/lib/plain-line";

const virgo = ZODIAC_SIGNS.find((s) => s.key === "virgo")!;

describe("행성 카드 첫 줄", () => {
  it("10행성 × 12하우스가 전부 문장이다", () => {
    let count = 0;
    for (const planet of PLANETS) {
      for (let house = 1; house <= 12; house += 1) {
        const line = plainLine(planet.key, house, virgo);
        expect(line, `${planet.ko} ${house}`).toMatch(/에 있습니다$/);
        expect(line, `${planet.ko} ${house}`).toContain(HOUSE_AREAS[house]);
        count += 1;
      }
    }
    expect(count).toBe(120);
  });

  it("조사는 받침을 본다", () => {
    // "밀어붙이는 힘" 받침 있음 → 이, "마음이 놓이는 자리" 받침 없음 → 가
    expect(plainLine("mars", 1, virgo)).toBe("밀어붙이는 힘이 당신 자신과 첫인상에 있습니다");
    expect(plainLine("moon", 6, virgo)).toBe("마음이 놓이는 자리가 매일의 일과 몸에 있습니다");
  });

  it("하우스가 없으면 자리만 말한다", () => {
    expect(plainLine("mars", null, virgo)).toBe(`${PLANET_AREAS.mars} — 처녀자리`);
  });

  it("예외 표가 있으면 그것을 쓴다", () => {
    const key = "pluto-3" as const;
    const saved = PLAIN_OVERRIDES[key];
    PLAIN_OVERRIDES[key] = "생각하는 방식이 밑바닥부터 다시 짜입니다";
    expect(plainLine("pluto", 3, virgo)).toBe("생각하는 방식이 밑바닥부터 다시 짜입니다");
    if (saved === undefined) delete PLAIN_OVERRIDES[key]; else PLAIN_OVERRIDES[key] = saved;
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/plain-line.test.ts`
Expected: FAIL — `Cannot find module '@/lib/plain-line'`.

- [ ] **Step 3: 구현**

`src/lib/plain-line.ts`:

```ts
import { HOUSE_AREAS, PLANET_AREAS } from "@/content/atoms/life";
import { iga } from "@/lib/josa";
import type { PlanetKey } from "@/lib/planets";
import type { ZodiacSign } from "@/lib/zodiac";

/**
 * 행성 카드의 첫 줄 — 점성술 용어 없이 "무엇이 어디에 있는가".
 *
 * `화성 · 처녀자리 25° · 1하우스`는 처음 온 사람에게 낯선 문자열이다. 그 대신
 * 별이 맡는 것(PLANET_AREAS)과 방의 생활 이름(HOUSE_AREAS)을 조사 하나로 잇는다:
 * "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다". 두 표는 이미 있었고 화면이
 * 안 쓰고 있었다. 새 문장을 쓰지 않는다.
 *
 * 120쌍을 기계적으로 이으면 어색한 조합이 나올 수 있다. 그런 쌍은 두 표의 원문을
 * 고치지 않고 PLAIN_OVERRIDES에 예외로 적는다 — 원문은 다른 화면도 쓴다.
 */
export const PLAIN_OVERRIDES: Partial<Record<`${PlanetKey}-${number}`, string>> = {};

export function plainLine(planet: PlanetKey, house: number | null, sign: ZodiacSign): string {
  const area = PLANET_AREAS[planet];
  // 시각을 모르면 방이 없다 — 자리만 말하고 하우스를 꾸며 넣지 않는다.
  if (house === null) return `${area} — ${sign.ko}`;
  const override = PLAIN_OVERRIDES[`${planet}-${house}`];
  if (override) return override;
  return `${area}${iga(area)} ${HOUSE_AREAS[house]}에 있습니다`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/plain-line.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: 120쌍 눈으로 훑기 (임시 테스트)**

`src/test/zz-temp-plain.test.ts`를 만들어 실행하고 지운다:

```ts
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { PLANETS } from "@/lib/planets";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { plainLine } from "@/lib/plain-line";
it("dump", () => {
  const out: string[] = [];
  for (const p of PLANETS) for (let h = 1; h <= 12; h += 1) out.push(`${p.ko} ${h}H  ${plainLine(p.key, h, ZODIAC_SIGNS[0])}`);
  writeFileSync("C:/tmp/audit/plain-lines.txt", out.join(String.fromCharCode(10)), "utf8");
});
```

Run: `npx vitest run src/test/zz-temp-plain.test.ts && cat /c/tmp/audit/plain-lines.txt && rm src/test/zz-temp-plain.test.ts`

120줄을 읽는다. 어색한 줄(예: "밑바닥의 힘이 말과 가까운 관계에 있습니다")은 `PLAIN_OVERRIDES`에 `"pluto-3": "…"` 형식으로 자연스러운 한 문장을 적는다. 기준: 존댓말 `-습니다`, 20~30자(테스트가 HOUSE_AREAS 원문 포함과 "에 있습니다" 종결을 요구한다), 용어 없음. 예외가 다섯을 넘으면 `HOUSE_AREAS` 원문이 문제이니 멈추고 보고한다.

- [ ] **Step 6: 재확인 + 커밋**

Run: `npx vitest run src/test/plain-line.test.ts src/test/fonts.test.ts`
Expected: PASS.

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/lib/plain-line.ts byeolsaem-web/src/test/plain-line.test.ts byeolsaem-web/src/fonts
git commit -m "feat(natal): plain-language first line for planet cards" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: `onceInSession` — 세션당 한 번

**Files:**
- Create: `byeolsaem-web/src/lib/once.ts`
- Test: `byeolsaem-web/src/test/once.test.ts`

**Interfaces:**
- Produces: `onceInSession(key: string): boolean` — 처음 호출이면 표식을 남기고 `true`, 이미 있으면 `false`. `sessionStorage`가 던지면(사파리 프라이빗) `true`(연출 허용).

- [ ] **Step 1: 실패하는 테스트**

`src/test/once.test.ts` (vitest는 node 환경 — `sessionStorage`를 흉내 낸다):

```ts
import { afterEach, describe, expect, it } from "vitest";
import { onceInSession } from "@/lib/once";

function fakeStorage(throwing = false) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => { if (throwing) throw new Error("denied"); return map.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (throwing) throw new Error("denied"); map.set(k, v); },
  };
}

describe("세션당 한 번", () => {
  afterEach(() => { delete (globalThis as { sessionStorage?: unknown }).sessionStorage; });

  it("처음은 true, 두 번째는 false", () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = fakeStorage();
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(true);
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(false);
  });

  it("저장소가 던지면 연출을 허용한다", () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = fakeStorage(true);
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(true);
  });

  it("저장소가 없으면(서버) true", () => {
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/once.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/once.ts`:

```ts
/**
 * 이 탭에서 처음인가. 등장 연출을 세션당 한 번만 돌리는 데 쓴다.
 *
 * 결과 화면은 하루에 여러 번 열 수 있다. 두 번째부터 다시 그려지는 등장은
 * 연출이 아니라 지연이다. 그래서 첫 방문에만 돌고, 그 뒤는 완성 상태로 뜬다.
 *
 * sessionStorage인 이유는 signMorph.ts와 같다 — 탭 안에서만 유효해야 한다.
 * 저장소 접근이 던지는 환경(사파리 프라이빗 등)에서는 표식을 못 남기니
 * 매번 처음으로 본다. 연출이 한 번 더 도는 쪽이 아예 안 도는 쪽보다 낫다.
 */
export function onceInSession(key: string): boolean {
  try {
    if (typeof sessionStorage === "undefined") return true;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

Run: `npx vitest run src/test/once.test.ts` → PASS.

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/lib/once.ts byeolsaem-web/src/test/once.test.ts
git commit -m "feat(ui): once-per-session marker for entrance motions" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `NameTag` — 이름표 한 줄

**Files:**
- Create: `byeolsaem-web/src/components/chart/NameTag.tsx`
- Test: `byeolsaem-web/src/test/result-ui.test.ts` (신규; 5·6도 여기에 추가)

**Interfaces:**
- Consumes: `ZodiacSign` from `@/lib/zodiac`.
- Produces: `NameTag({ sun, moon, ascendant }: { sun: ZodiacSign; moon: ZodiacSign; ascendant: ZodiacSign | null })`, `nameTagText(sun, moon, ascendant): string` — `"☉ 게자리 · ☽ 물병자리 · ↑ 처녀자리"`(상승궁 없으면 두 항목).

- [ ] **Step 1: 실패하는 테스트**

`src/test/result-ui.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { NameTag, nameTagText } from "@/components/chart/NameTag";

const sign = (key: string) => ZODIAC_SIGNS.find((s) => s.key === key)!;

describe("이름표", () => {
  it("세 기둥을 한 줄로 적는다", () => {
    expect(nameTagText(sign("cancer"), sign("aquarius"), sign("virgo"))).toBe(
      "☉ 게자리 · ☽ 물병자리 · ↑ 처녀자리",
    );
  });
  it("상승궁이 없으면 두 항목", () => {
    expect(nameTagText(sign("cancer"), sign("aquarius"), null)).toBe("☉ 게자리 · ☽ 물병자리");
  });
  it("화면에도 같은 순서로 나온다", () => {
    const html = renderToStaticMarkup(
      createElement(NameTag, { sun: sign("cancer"), moon: sign("aquarius"), ascendant: sign("virgo") }),
    );
    expect(html.indexOf("게자리")).toBeLessThan(html.indexOf("물병자리"));
    expect(html.indexOf("물병자리")).toBeLessThan(html.indexOf("처녀자리"));
    expect(html).toContain('aria-label="태양 게자리, 달 물병자리, 상승궁 처녀자리"');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/result-ui.test.ts` → FAIL (module not found).

- [ ] **Step 3: 구현**

`src/components/chart/NameTag.tsx`:

```tsx
import type { ZodiacSign } from "@/lib/zodiac";

/**
 * 이름표 — 태양·달·상승궁을 한 줄로. Co-Star의 `☉Scorpio ☽Pisces ↑Leo`와 같은
 * 문법이다. 결과에서 남에게 말할 수 있는 한 줄이 이것이고, 공유 카드의 tagline과
 * 같은 세 값을 쓴다.
 *
 * 상승궁이 없으면 셋째 항목이 없다. 시각을 모르면 계산하지 않는다는 원칙 그대로.
 */
export function nameTagText(sun: ZodiacSign, moon: ZodiacSign, ascendant: ZodiacSign | null): string {
  const parts = [`☉ ${sun.ko}`, `☽ ${moon.ko}`];
  if (ascendant) parts.push(`↑ ${ascendant.ko}`);
  return parts.join(" · ");
}

export function NameTag({
  sun,
  moon,
  ascendant,
}: {
  sun: ZodiacSign;
  moon: ZodiacSign;
  ascendant: ZodiacSign | null;
}) {
  const items: [string, string][] = [
    ["☉", sun.ko],
    ["☽", moon.ko],
  ];
  if (ascendant) items.push(["↑", ascendant.ko]);
  const label = [`태양 ${sun.ko}`, `달 ${moon.ko}`, ...(ascendant ? [`상승궁 ${ascendant.ko}`] : [])].join(", ");
  return (
    <p
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-x-2.5 rounded-full border border-gold/40 px-3.5 py-1.5 text-meta text-gold-soft"
    >
      {items.map(([symbol, name], i) => (
        <span key={symbol} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className="mr-1 opacity-50">·</span>}
          <span aria-hidden className="astro-symbol">
            {symbol}
            {"\uFE0E"}
          </span>
          <span>{name}</span>
        </span>
      ))}
    </p>
  );
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

Run: `npx vitest run src/test/result-ui.test.ts src/test/fonts.test.ts` → PASS.

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/components/chart/NameTag.tsx byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(natal): name tag — the three pillars in one line" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `ReadingCard` — 카드 한 장

**Files:**
- Create: `byeolsaem-web/src/components/ui/ReadingCard.tsx`
- Modify: `byeolsaem-web/src/test/result-ui.test.ts`
- Modify: `byeolsaem-web/src/app/globals.css` (카드 진입 토큰)

**Interfaces:**
- Produces: `ReadingCard({ id?, badge, tech, plain, where, index, children })`. `index`는 계단 순서(0부터) — `animation-delay: 60ms × index`. 펼침 상태는 카드가 스스로 갖는다(`useState`). 열린 카드는 `aria-expanded="true"`.
- CSS: `--animate-card-in: card-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both`, `@keyframes card-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }`. 클래스 `.reading-card[data-in="true"] { animation: var(--animate-card-in) }`, 감소 모드에서는 transform 없이 opacity만.

- [ ] **Step 1: 실패하는 테스트**

`src/test/result-ui.test.ts`에 추가(import에 `ReadingCard` 더함):

```ts
import { ReadingCard } from "@/components/ui/ReadingCard";

describe("카드", () => {
  it("용어는 작게 위, 사람 말은 크게 아래, 본문은 접혀 있다", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingCard, {
        badge: "♂",
        tech: "화성 · 처녀자리 25° · 1하우스",
        plain: "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다",
        where: "따져서 이깁니다.",
        index: 3,
      }, createElement("p", null, "따져서 이깁니다. 감정으로 밀지 않고 사실을 정리해 내놓습니다.")),
    );
    expect(html.indexOf("화성 · 처녀자리")).toBeLessThan(html.indexOf("밀어붙이는 힘"));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("animation-delay:180ms");
    // 본문은 DOM에 있다(크롤러용). 접힘은 CSS(grid-rows 0fr)로 한다.
    expect(html).toContain("감정으로 밀지 않고");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/result-ui.test.ts` → FAIL (module not found).

- [ ] **Step 3: CSS 토큰**

`src/app/globals.css`, `--animate-soft-in` 줄(현재 75행) 아래에 추가:

```css
  /* 결과 카드 진입. 섹션이 화면에 들어올 때 60ms 계단으로 따라 올라온다. */
  --animate-card-in: card-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

`@keyframes node-rise` 블록 뒤에 추가:

```css
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 카드는 부모 섹션이 data-in="true"를 켜기 전까지 숨어 있다가 계단으로 뜬다.
   감소 모드는 이동 없이 200ms 스밈만. */
.reading-card {
  opacity: 0;
}
[data-in="true"] > .reading-card {
  animation: var(--animate-card-in);
}
@media (prefers-reduced-motion: reduce) {
  .reading-card {
    transform: none;
  }
  [data-in="true"] > .reading-card {
    animation: soft-in 200ms ease-out both;
  }
}
```

- [ ] **Step 4: 구현**

`src/components/ui/ReadingCard.tsx`:

```tsx
"use client";
import { useId, useState } from "react";

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
 */
export function ReadingCard({
  id,
  badge,
  tech,
  plain,
  where,
  index = 0,
  children,
}: {
  id?: string;
  badge: React.ReactNode;
  tech: string;
  plain: React.ReactNode;
  where: string;
  index?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <article
      id={id}
      className="reading-card relative scroll-mt-28 rounded-xl bg-ink-raised px-4 py-3.5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span aria-hidden className="astro-symbol absolute right-4 top-3 text-base text-gold-soft">
        {badge}
      </span>
      <p className="pr-8 text-[0.72rem] tracking-[0.05em] text-starlight-dim tabular-nums">{tech}</p>
      <p className="mt-0.5 break-keep font-display text-base leading-snug text-starlight">{plain}</p>
      <p className="mt-1 break-keep text-meta text-starlight-dim">{where}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="mt-2 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
      >
        {open ? "접기" : "더 읽기"}
      </button>
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
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
}
```

- [ ] **Step 5: 통과 확인 + 커밋**

Run: `npx vitest run src/test/result-ui.test.ts` → PASS.

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/components/ui/ReadingCard.tsx byeolsaem-web/src/test/result-ui.test.ts byeolsaem-web/src/app/globals.css
git commit -m "feat(ui): reading card — term small, plain words large, body folded" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `ResultTabs` — sticky 탭바

**Files:**
- Create: `byeolsaem-web/src/components/ui/ResultTabs.tsx`
- Modify: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Produces: `ResultTabs({ items }: { items: { id: string; label: string }[] })`. 각 항목은 `<a href="#id">`. 현재 섹션은 `aria-current="location"`. 밑줄은 `left/width transition 300ms cubic-bezier(0.16,1,0.3,1)`. 스크롤 스파이는 `IntersectionObserver`(rootMargin `-40% 0px -55% 0px`) 하나로 `document.getElementById(id)`들을 관찰.

- [ ] **Step 1: 실패하는 테스트**

`src/test/result-ui.test.ts`에 추가:

```ts
import { ResultTabs } from "@/components/ui/ResultTabs";

describe("탭바", () => {
  it("항목마다 앵커 링크가 있고 첫 항목이 현재다", () => {
    const html = renderToStaticMarkup(
      createElement(ResultTabs, {
        items: [
          { id: "overview", label: "한눈에" },
          { id: "planets", label: "별 열 개" },
          { id: "detail", label: "자세히" },
        ],
      }),
    );
    expect(html).toContain('href="#overview"');
    expect(html).toContain('href="#planets"');
    expect(html).toContain('href="#detail"');
    expect(html.match(/aria-current="location"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="결과 구역"');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/result-ui.test.ts` → FAIL.

- [ ] **Step 3: 구현**

`src/components/ui/ResultTabs.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

/**
 * 결과 화면의 구역 탭. 첫 화면 바로 아래에 붙어(sticky) 스크롤을 따라온다.
 *
 * 16Personalities·The Pattern·Co-Star가 전부 긴 결과를 탭으로 쪼갠다. 이 화면은
 * 11,105px인데 붙잡아 주는 것이 없어서 스크롤이 곧 미로였다(2026-09-06 실측).
 *
 * 탭은 링크다. 상태를 따로 갖지 않고 `#id`로 이동하며, 현재 위치는 관찰자가
 * 표시만 한다. 키보드로는 링크를 Tab으로 오가고 Enter로 이동한다.
 *
 * 밑줄은 300ms. 결과를 훑는 동안 여러 번 누르는 자리라 더 길면 손가락보다
 * 늦어진다 — 사용자가 시연을 보고 300ms로 정했다(2026-09-06).
 */
export function ResultTabs({ items }: { items: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(items[0]?.id ?? "");
  const nav = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  // 스크롤 스파이 — 화면 가운데 띠(40%~45%)를 지나는 섹션이 현재다.
  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // 밑줄 위치 — 현재 링크의 자리로.
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLAnchorElement>(`a[href="#${current}"]`);
    if (!el) return;
    setBar({ left: el.offsetLeft, width: el.offsetWidth });
    el.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [current]);

  return (
    <nav
      ref={nav}
      aria-label="결과 구역"
      className="sticky top-0 z-20 -mx-1 flex gap-x-5 overflow-x-auto border-b border-gold/20 bg-ink/95 px-1 pb-2.5 pt-3 text-meta backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={item.id === current ? "location" : undefined}
          className={`relative whitespace-nowrap pb-1 transition-colors duration-200 ${
            item.id === current ? "text-gold-soft" : "text-starlight-dim hover:text-starlight"
          }`}
        >
          {item.label}
        </a>
      ))}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-px bg-gold-soft transition-[left,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ left: bar.left, width: bar.width }}
        />
      )}
    </nav>
  );
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

Run: `npx vitest run src/test/result-ui.test.ts` → PASS.

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/components/ui/ResultTabs.tsx byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(ui): sticky result tabs with scroll spy" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `AspectBadge` — 호가 그어진다

**Files:**
- Modify: `byeolsaem-web/src/components/ui/AspectBadge.tsx`
- Modify: `byeolsaem-web/src/app/globals.css`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Produces: `AspectBadge`에 `animate?: boolean`(기본 false), `delay?: number`(ms, 기본 0) prop. `animate`이면 호/선에 `pathLength="1"` + 클래스 `aspect-arc`, 두 점·기호에 `aspect-dot`, 인라인 `animationDelay`.
- CSS: `--animate-arc-draw: river-draw 300ms cubic-bezier(0.33, 1, 0.68, 1) both`, `--animate-dot-in: dot-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both`.

- [ ] **Step 1: 실패하는 테스트**

`src/test/result-ui.test.ts`에 추가:

```ts
import { AspectBadge } from "@/components/ui/AspectBadge";

describe("각 인장", () => {
  it("animate면 호에 pathLength와 계단 지연이 붙는다", () => {
    const html = renderToStaticMarkup(
      createElement(AspectBadge, { angle: 120, harmony: 1, animate: true, delay: 120 }),
    );
    expect(html).toContain('pathLength="1"');
    expect(html).toContain('class="aspect-arc"');
    expect(html).toContain("animation-delay:120ms");
  });
  it("기본은 정지 그림 그대로", () => {
    const html = renderToStaticMarkup(createElement(AspectBadge, { angle: 120, harmony: 1 }));
    expect(html).not.toContain("pathLength");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/result-ui.test.ts` → FAIL (`pathLength` 없음).

- [ ] **Step 3: CSS**

`globals.css`, `--animate-card-in` 아래:

```css
  /* 각 인장 — 호가 A에서 B까지 그어진다(300ms). 두 점은 등장 곡선. */
  --animate-arc-draw: river-draw 300ms cubic-bezier(0.33, 1, 0.68, 1) both;
  --animate-dot-in: dot-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

`@keyframes card-in` 뒤:

```css
@keyframes dot-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.aspect-arc {
  animation: var(--animate-arc-draw);
}
.aspect-dot {
  transform-box: fill-box;
  transform-origin: center;
  animation: var(--animate-dot-in);
}
@media (prefers-reduced-motion: reduce) {
  .aspect-arc {
    animation: soft-in 200ms ease-out both;
  }
  .aspect-dot {
    animation: soft-in 200ms ease-out both;
  }
}
```

- [ ] **Step 4: 구현**

`AspectBadge.tsx`의 props에 `animate = false`, `delay = 0` 추가하고(타입 `animate?: boolean; delay?: number;`), 그림 부분을 다음으로 바꾼다. 상단 주석 끝에 한 문단 덧붙인다:

```tsx
 * animate이면 호가 A에서 B까지 300ms에 그어지고 점이 뒤따라 뜬다 — 호가 각도
 * 자체라, 그어지는 것이 "이만큼 벌어졌다"의 설명이다. 카드 계단과 같은 delay를 받는다.
```

그림 JSX(`{conj ? (…) : (…)}` 블록)를 다음으로:

```tsx
      {conj ? (
        // 합 — 같은 자리에 겹친다: 한 점과 그 둘레의 작은 링.
        <>
          <circle cx={ax} cy={ay} r={3} fill={stroke} className={animate ? "aspect-dot" : undefined} style={dot(0)} />
          <circle cx={ax} cy={ay} r={6.5} fill="none" stroke={stroke} strokeWidth={1} opacity={0.7} className={animate ? "aspect-dot" : undefined} style={dot(120)} />
        </>
      ) : (
        <>
          {angle === 180 ? (
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.6} {...arc} />
          ) : (
            <path
              d={`M ${ax} ${ay} A ${R} ${R} 0 ${angle > 180 ? 1 : 0} 1 ${bx} ${by}`}
              fill="none"
              stroke={stroke}
              strokeWidth={1.6}
              {...arc}
            />
          )}
          <circle cx={ax} cy={ay} r={2.6} fill={stroke} className={animate ? "aspect-dot" : undefined} style={dot(0)} />
          <circle cx={bx} cy={by} r={2.6} fill={stroke} className={animate ? "aspect-dot" : undefined} style={dot(240)} />
        </>
      )}
```

그리고 `const conj = angle === 0;` 아래에 헬퍼 둘:

```tsx
  // animate일 때만 붙는 속성. 정지 그림(공유 카드 등)은 속성 자체가 없어야 한다.
  const arc = animate ? { pathLength: 1, className: "aspect-arc", style: { animationDelay: `${delay}ms` } } : {};
  const dot = (offset: number) => (animate ? { animationDelay: `${delay + offset}ms` } : undefined);
```

- [ ] **Step 5: 통과 확인 + 커밋**

Run: `npx vitest run src/test/result-ui.test.ts` → PASS. `npx tsc --noEmit` → OK.

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/components/ui/AspectBadge.tsx byeolsaem-web/src/app/globals.css byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(ui): the aspect seal draws its arc on entry" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: `ChartWheel` 등장 — 850ms 안에 그려진다

**Files:**
- Modify: `byeolsaem-web/src/components/chart/ChartWheel.tsx`
- Modify: `byeolsaem-web/src/app/globals.css`
- Modify: `byeolsaem-web/src/components/solar/SolarScope.tsx:105`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Consumes: `onceInSession(key)` from `@/lib/once`.
- Produces: `ChartWheel`에 `entrance?: string | null` prop — 세션 키. 주면 마운트 시 `onceInSession(key)`가 true일 때만 `data-entrance="true"`를 svg에 붙인다(`useState`로 한 번 결정). 내부 요소는 클래스 `wheel-ring`·`wheel-tick`·`wheel-glyph`·`wheel-asp`·`wheel-core`와 인라인 `animationDelay`를 **항상** 갖는다 — CSS는 `svg[data-entrance="true"]` 아래에서만 애니메이션을 켠다.

- [ ] **Step 1: 실패하는 테스트**

`src/test/result-ui.test.ts`에 추가:

```ts
import { ChartWheel } from "@/components/chart/ChartWheel";
import { exampleSky } from "@/lib/example-sky";

describe("원반 등장", () => {
  it("요소마다 계단 클래스와 지연이 붙어 있다", () => {
    const { chart } = exampleSky();
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, entrance: null }));
    expect(html).toContain('class="wheel-ring"');
    expect((html.match(/wheel-tick/g) ?? []).length).toBeGreaterThanOrEqual(24); // 자리 12 + 하우스 12
    expect((html.match(/wheel-glyph/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(html).toContain("animation-delay:300ms"); // 첫 행성
    expect(html).toContain("animation-delay:120ms"); // 첫 눈금
    // 서버 렌더에서는 등장 표식이 없다 — 마운트 후 세션 확인으로 켜진다.
    expect(html).not.toContain('data-entrance="true"');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/result-ui.test.ts` → FAIL.

- [ ] **Step 3: CSS 토큰과 규칙**

`globals.css`, `--animate-dot-in` 아래:

```css
  /* 원반 등장 850ms. 고리→눈금→기호→각 선 순서. 계단은 인라인 delay. */
  --animate-wheel-ring: river-draw 400ms cubic-bezier(0.33, 1, 0.68, 1) both;
  --animate-wheel-tick: soft-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-wheel-glyph: dot-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-wheel-asp: river-draw 300ms cubic-bezier(0.33, 1, 0.68, 1) both;
```

`.aspect-dot` 감소 모드 블록 뒤:

```css
/*
 * 원반 등장 — svg[data-entrance="true"]일 때만 돈다. 클래스와 delay는 항상 있어서
 * 표식만 붙이면 켜진다. 세션당 한 번(lib/once.ts). 감소 모드는 dash·scale 없이
 * 전부 200ms 스밈 한 번.
 */
svg[data-entrance="true"] .wheel-ring {
  animation: var(--animate-wheel-ring);
}
svg[data-entrance="true"] .wheel-tick {
  animation: var(--animate-wheel-tick);
}
svg[data-entrance="true"] .wheel-glyph {
  transform-box: fill-box;
  transform-origin: center;
  animation: var(--animate-wheel-glyph);
}
svg[data-entrance="true"] .wheel-asp {
  animation: var(--animate-wheel-asp);
}
svg[data-entrance="true"] .wheel-core {
  animation: wheel-core 400ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both;
}
@keyframes wheel-core {
  from {
    filter: none;
  }
  to {
    filter: drop-shadow(0 0 6px rgba(227, 197, 104, 0.55));
  }
}
@media (prefers-reduced-motion: reduce) {
  svg[data-entrance="true"] .wheel-ring,
  svg[data-entrance="true"] .wheel-tick,
  svg[data-entrance="true"] .wheel-glyph,
  svg[data-entrance="true"] .wheel-asp {
    animation: soft-in 200ms ease-out both;
  }
  svg[data-entrance="true"] .wheel-core {
    animation: none;
  }
}
```

- [ ] **Step 4: `ChartWheel` 수정**

(a) import 추가: `import { useEffect, useState } from "react";`(기존 `useState` import를 이렇게 바꿈), `import { onceInSession } from "@/lib/once";`.

(b) props에 `entrance = null` 추가, 타입 `entrance?: string | null;` — 주석: `/** 세션 키를 주면 첫 방문에 850ms 등장 모션이 돈다. null이면 정지. */`.

(c) 함수 본문 `const rotation = …` 위에:

```tsx
  // 등장은 마운트 뒤에 결정한다 — 서버 HTML은 완성 상태여야 하고(크롤러),
  // 세션 표식은 브라우저에만 있다.
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (entrance && onceInSession(entrance)) setEntering(true);
  }, [entrance]);
```

(d) `<svg …>`에 `data-entrance={entering ? "true" : undefined}` 추가.

(e) 요소별 클래스·delay. 아래 대로 **기존 속성은 유지하고** 추가만 한다:

- 바깥 고리 첫 `<circle r={OUTER}>`: `className="wheel-ring" pathLength={1} transform={\`rotate(-90 ${CENTER} ${CENTER})\`}`. (dashoffset은 CSS keyframe이 채운다.)
- 자리 띠 `ZODIAC_SIGNS.map` 안의 `<g key={sign.key}>`: `className="wheel-tick" style={{ animationDelay: \`${120 + i * 40}ms\` }}`.
- 하우스 `cusps.map` 안의 `<g key={cusp}>`: `className="wheel-tick" style={{ animationDelay: \`${120 + i * 40}ms\` }}`.
- 어스펙트 `<line key=…>`: 기존 `className` 문자열 앞에 `wheel-asp ` 추가, `pathLength={1}`, `style={{ animationDelay: \`${500 + index * 60}ms\` }}` — `.map((aspect, index) =>`로 인덱스 받기.
- 행성 `<g key={placement.planet} …>`: 기존 `className` 문자열 앞에 `wheel-glyph ` 추가, `style={{ animationDelay: \`${300 + order * 30}ms\` }}`. `order`는 `TIER_RANK` 순(개인→사회→세대): 함수 위에 `const order = new Map(chart.placements.map((p) => [p.planet, 0]));` 대신 다음 한 줄을 `radii` 계산 아래에 둔다:

```tsx
  // 등장 계단 순서 — 개인 → 사회 → 세대(PLANETS 배열 순서가 곧 그 순서다).
  const entranceOrder = new Map(PLANETS.map((p, i) => [p.key, i]));
```

  import에 `PLANETS` 추가(`@/lib/planets`). 행성 `<g>`의 delay는 `${300 + (entranceOrder.get(placement.planet) ?? 0) * 30}ms`.
- 태양·달 기호 `<text>`(행성 그룹 안의 `astro-symbol` text): `placement.planet === "sun" || placement.planet === "moon"`이면 className에 `wheel-core ` 추가.
- ASC `<text>ASC</text>`: className 앞에 `wheel-core wheel-tick ` 추가, `style={{ animationDelay: "600ms" }}`.

(f) `SolarScope.tsx:105`: `<ChartWheel chart={data.chart} />` → `<ChartWheel chart={data.chart} entrance="byeolsaem:wheel-entrance:solar" />`.

- [ ] **Step 5: 통과 확인**

Run: `npx tsc --noEmit && npx vitest run` → 전부 PASS. 기존 `chart.test.ts` 등 회귀 없음.

- [ ] **Step 6: 눈 확인(dev-browser, 선택)**

`npm run build` 후 `npx wrangler deploy`는 Task 11에서 한 번에 한다. 여기서는 로컬 `npm run dev`로 `/solar-return`을 열어 원반이 850ms 안에 그려지는지, 새로고침(같은 세션)에서는 즉시 완성인지 본다.

- [ ] **Step 7: 커밋**

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/components/chart/ChartWheel.tsx byeolsaem-web/src/components/solar/SolarScope.tsx byeolsaem-web/src/app/globals.css byeolsaem-web/src/test/result-ui.test.ts
git commit -m "feat(chart): the wheel draws itself once per session" -m "Ring, ticks, glyphs, aspect lines in that order, 850ms total, on the two easing tokens the site already uses. Solar return gets it for free." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: `SkyLapse` — 태어난 뒤 하늘은

**Files:**
- Create: `byeolsaem-web/src/lib/sky-lapse.ts`
- Create: `byeolsaem-web/src/test/sky-lapse.test.ts`
- Create: `byeolsaem-web/src/components/chart/SkyLapse.tsx`

**Interfaces:**
- Consumes: `planetPosition(body, jd)` from `@/lib/ephemeris`, `toJulianDay(date)`, `Chart` from `@/lib/chart`, `PLANET_BY_KEY` from `@/lib/planets`, `signAtLongitude` from `@/lib/zodiac`.
- Produces (lib): `SLOW_BODIES = ["jupiter","saturn","uranus","neptune","pluto"] as const`, `sampleLapse(chart: Chart, now: Date, steps = 360): LapseSeries` where `LapseSeries = { steps: number; series: Record<SlowBody, number[]>; travel: Record<SlowBody, number>; today: Record<SlowBody, number> }` — `series`는 언랩 누적 황경(첫 값 = 네이탈 황경), `travel`은 바퀴 수, `today`는 0~360 정규화.
- Produces (component): `SkyLapse({ chart, now }: { chart: Chart; now: Date })`.

- [ ] **Step 1: 실패하는 테스트**

`src/test/sky-lapse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { exampleSky } from "@/lib/example-sky";
import { SLOW_BODIES, sampleLapse } from "@/lib/sky-lapse";

describe("태어난 뒤 하늘 — 샘플", () => {
  const { chart } = exampleSky(); // 1995-07-14 09:30 서울
  const lapse = sampleLapse(chart, new Date("2026-09-06T03:00:00Z"));

  it("느린 별 다섯, 361점", () => {
    expect(SLOW_BODIES).toHaveLength(5);
    for (const body of SLOW_BODIES) expect(lapse.series[body]).toHaveLength(361);
  });

  it("첫 점은 네이탈 황경과 같다", () => {
    for (const body of SLOW_BODIES) {
      const natal = chart.placements.find((p) => p.planet === body)!.longitude;
      expect(Math.abs(lapse.series[body][0] - natal)).toBeLessThan(0.01);
    }
  });

  it("언랩 뒤 토성은 한 바퀴 남짓 돌았다", () => {
    // 1995→2026, 31년. 토성 공전 29.5년 → 1.0~1.1바퀴.
    expect(lapse.travel.saturn).toBeGreaterThan(1.0);
    expect(lapse.travel.saturn).toBeLessThan(1.1);
    expect(lapse.travel.jupiter).toBeGreaterThan(2.5);
    expect(lapse.travel.jupiter).toBeLessThan(2.8);
  });

  it("이웃 점의 차가 180도를 넘지 않는다(언랩 검증)", () => {
    for (const body of SLOW_BODIES) {
      const s = lapse.series[body];
      for (let i = 1; i < s.length; i += 1) expect(Math.abs(s[i] - s[i - 1])).toBeLessThan(180);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/sky-lapse.test.ts` → FAIL.

- [ ] **Step 3: lib 구현**

`src/lib/sky-lapse.ts`:

```ts
import type { Chart } from "@/lib/chart";
import { planetPosition, toJulianDay } from "@/lib/ephemeris";

/**
 * 출생 순간부터 오늘까지, 느린 별 다섯의 길.
 *
 * 태양·달·수성·금성·화성은 그리지 않는다 — 31년에 태양 31바퀴, 달 400바퀴라
 * 화면에 원으로 뭉개진다. 목성(12년)·토성(29.5년)·천왕성(84년)·해왕성·명왕성만
 * 남기면 그림이 한 문장을 말한다: 토성이 한 바퀴 돌아 제자리에 왔다.
 *
 * 361점 균등 샘플. 느린 별은 한 스텝(~32일)에 180°를 넘지 않으므로 이웃 차가
 * ±180을 넘으면 360 보정해 누적(언랩)한다. 미리 계산한 표를 두지 않는다 —
 * 같은 엔진을 그 자리에서 부른다.
 */
export const SLOW_BODIES = ["jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
export type SlowBody = (typeof SLOW_BODIES)[number];

export interface LapseSeries {
  steps: number;
  /** 언랩 누적 황경. [0]은 네이탈 황경. */
  series: Record<SlowBody, number[]>;
  /** 돈 바퀴 수. */
  travel: Record<SlowBody, number>;
  /** 오늘 황경 0~360. */
  today: Record<SlowBody, number>;
}

export function sampleLapse(chart: Chart, now: Date, steps = 360): LapseSeries {
  const jd0 = chart.julianDay;
  const jd1 = toJulianDay(now);
  const series = {} as Record<SlowBody, number[]>;
  const travel = {} as Record<SlowBody, number>;
  const today = {} as Record<SlowBody, number>;
  for (const body of SLOW_BODIES) {
    const natal = chart.placements.find((p) => p.planet === body)!.longitude;
    const out: number[] = [natal];
    let acc = natal;
    let last = natal;
    for (let i = 1; i <= steps; i += 1) {
      const lon = planetPosition(body, jd0 + ((jd1 - jd0) * i) / steps).longitude;
      let d = lon - last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      acc += d;
      last = lon;
      out.push(acc);
    }
    series[body] = out;
    travel[body] = (acc - natal) / 360;
    today[body] = ((acc % 360) + 360) % 360;
  }
  return { steps, series, travel, today };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/sky-lapse.test.ts` → PASS.

- [ ] **Step 5: 컴포넌트**

`src/components/chart/SkyLapse.tsx`:

```tsx
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
```

- [ ] **Step 6: 타입·폰트 확인 + 커밋**

Run: `npx tsc --noEmit && npx vitest run src/test/sky-lapse.test.ts src/test/fonts.test.ts` → PASS. (♈~♓ 글리프는 `SIGN_SYMBOL`에 이미 있어 서브셋에 있다.)

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/lib/sky-lapse.ts byeolsaem-web/src/test/sky-lapse.test.ts byeolsaem-web/src/components/chart/SkyLapse.tsx
git commit -m "feat(natal): the sky since you were born — five slow planets, played on demand" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: `NatalReading` 재구성 + `WheelFigure` 삭제

**Files:**
- Modify: `byeolsaem-web/src/components/chart/NatalReading.tsx` (전면)
- Delete: `byeolsaem-web/src/components/chart/WheelFigure.tsx`
- Modify: `byeolsaem-web/src/app/(night-static)/natal/page.tsx`
- Test: `byeolsaem-web/src/test/result-ui.test.ts`

**Interfaces:**
- Consumes: Task 1~9 전부. `ASC_FACES`, `SIGN_FACES`(life.ts), `plainLine`, `NameTag`, `ReadingCard`, `ResultTabs`, `AspectBadge{animate,delay}`, `ChartWheel{entrance}`, `SkyLapse`, `useInView`.
- Produces: `NatalReading({ fallback, intro })` — `intro`는 차트 없을 때만 그린다. `NatalHero({ chart, reading, profile, onSelectPlanet })`를 **별도 export**(렌더 테스트용, 훅 없음).

- [ ] **Step 1: 실패하는 테스트 (첫 화면 순서)**

`src/test/result-ui.test.ts`에 추가:

```ts
import { NatalHero } from "@/components/chart/NatalReading";

describe("첫 화면", () => {
  it("이름표 → 원반 → 한 줄 → 공유 순서", () => {
    const { chart, reading } = exampleSky();
    const html = renderToStaticMarkup(
      createElement(NatalHero, {
        chart,
        reading,
        profile: { date: "1995-07-14", time: "09:30", city: "서울", concern: null },
        onSelectPlanet: () => {},
      }),
    );
    const iTag = html.indexOf('aria-label="태양 게자리');
    const iWheel = html.indexOf("천궁도 원반");
    const iOne = html.indexOf("당신을 한 줄로");
    const iShare = html.indexOf("이 하늘을 카드 한 장으로");
    expect(iTag).toBeGreaterThan(-1);
    expect(iTag).toBeLessThan(iWheel);
    expect(iWheel).toBeLessThan(iOne);
    expect(iOne).toBeLessThan(iShare);
  });
});
```

`profile` 타입은 `BirthProfile`(`@/lib/birth-profile`)의 필드에 맞춘다 — 구현 시 `BirthProfile`에 없는 필드가 있으면 테스트의 객체를 그 타입에 맞게 고친다(`as BirthProfile` 캐스트 금지).

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/result-ui.test.ts` → FAIL (`NatalHero` 없음).

- [ ] **Step 3: `page.tsx` — 헤더를 `intro`로**

`src/app/(night-static)/natal/page.tsx`에서 `<header …>…</header>` 블록을 잘라 상수로 두고 `NatalReading`에 넘긴다:

```tsx
  const intro = (
    <header className="mx-auto max-w-xl text-center">
      <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">NATAL CHART</p>
      <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">
        나의 천궁도
      </h1>
      <p className="mx-auto mt-5 max-w-md break-keep leading-relaxed text-starlight-dim">
        태어난 순간 하늘에 실제로 있었던 것을 계산한 결과입니다. 계산도 풀이도 이
        브라우저 안에서 끝나며, 어디로도 전송되지 않습니다.
      </p>
    </header>
  );
```

`return (` 위에 두고, 본문은:

```tsx
      {/* 헤더는 차트가 없을 때만 — 차트가 있으면 첫 화면 300px을 이름표·원반에
          내준다. SSR 시점에는 profile이 항상 null이라 HTML에는 남는다. */}
      <div className="mt-14">
        <NatalReading intro={intro} fallback={<ExampleSky />} />
      </div>
```

기존 `<header>`와 그 아래 `<div className="mt-14">` 블록을 이걸로 대체. 차트가 있을 때 `<h1>`이 사라지므로 `NatalHero`가 시각적으로 숨긴 `<h1 className="sr-only">나의 천궁도</h1>`을 첫 요소로 둔다(문서 제목 유지).

- [ ] **Step 4: `NatalReading.tsx` 재작성**

파일 전체를 아래 구조로 다시 쓴다. 기존 `BirthRail`, `Section`(id 추가), `scrollToPlacement`, `placementDomId`, `wheelData`, 공유 버튼 셋의 `spec`/`run`/`text`는 **그대로 옮긴다**(내용 변경 없음). 삭제: `WheelFigure` import, `CoreLine`, `PlacementRow`, `PlacementAccordionRow`, `PlacementHead`, `PlacementBody`, `openPlanet` 상태.

새 import:

```tsx
import { useRef } from "react";
import { ASC_FACES, SIGN_FACES } from "@/content/atoms/life";
import { plainLine } from "@/lib/plain-line";
import { ChartWheel, ChartWheelLegend } from "./ChartWheel";
import { NameTag } from "./NameTag";
import { SkyLapse } from "./SkyLapse";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { useInView } from "@/hooks/useInView";
import type { BirthProfile } from "@/lib/birth-profile";
import type { Chart } from "@/lib/chart";
import type { Reading } from "@/lib/reading";
```

`NatalReading` 본문(훅 이후):

```tsx
export function NatalReading({ fallback, intro }: { fallback: React.ReactNode; intro?: React.ReactNode }) {
  const { profile, ready } = useBirthProfile();
  const state = useChart(profile);
  const now = useRef(new Date());

  if (!ready) return <>{intro}{fallback}</>;
  if (!profile) return <>{intro}{fallback}</>;
  if (state?.status === "unknown-place") return <>{intro}<UnknownPlace city={profile.city} /></>;
  if (state?.status !== "ready") return <>{intro}<ChartLoading /></>;

  const { chart, reading } = state;
  const selectPlanet = (planet: PlanetKey) => {
    requestAnimationFrame(() => scrollToPlacement(planet));
  };
  return (
    <div className="grid items-start gap-10 md:grid-cols-[150px_minmax(0,1fr)] md:gap-12">
      <BirthRail date={formatBirthDate(profile.date)} time={profile.time} city={profile.city} concern={reading.lens?.label} />
      <div className="min-w-0">
        <NatalHero chart={chart} reading={reading} profile={profile} onSelectPlanet={selectPlanet} />
        <NatalBody chart={chart} reading={reading} now={now.current} />
      </div>
    </div>
  );
}
```

`NatalHero` (export, 훅 없음):

```tsx
export function NatalHero({
  chart,
  reading,
  profile,
  onSelectPlanet,
}: {
  chart: Chart;
  reading: Reading;
  profile: Pick<BirthProfile, "date">;
  onSelectPlanet: (planet: PlanetKey) => void;
}) {
  const { core } = reading;
  const wheelData = () => ({ /* 기존 wheelData 본문 그대로 — chart, reading 참조 */ });
  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-8">
      <h1 className="sr-only">나의 천궁도</h1>
      <div className="order-2 md:order-1">
        <NameTag sun={core.sun.placement.sign} moon={core.moon.placement.sign} ascendant={core.ascendant?.sign ?? null} />
        {/* LCP 앵커 — 어떤 모션에서도 opacity 0으로 시작하지 않는다. */}
        <div className="mt-5">
          <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">당신을 한 줄로</p>
          <p className="mt-3 max-w-[44ch] break-keep font-display text-xl leading-normal text-starlight md:text-2xl">
            {reading.oneLiner}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="w-full text-meta text-starlight-dim sm:w-auto">이 하늘을 카드 한 장으로 —</span>
          {/* 아래 세 버튼: 기존 288~335행의 SaveCardButton 둘과 KakaoShareButton을 그대로 */}
        </div>
      </div>
      <div className="order-1 mt-6 md:order-2 md:mt-0">
        <ChartWheel chart={chart} spotlight={null} entrance="byeolsaem:wheel-entrance:natal" onSelect={onSelectPlanet} />
      </div>
    </div>
  );
}
```

모바일에서는 원반(`order-1`)이 이름표 위가 아니라 **이름표 아래**여야 한다(스펙 4.1 순서: 이름표 → 원반 → 한 줄 → 공유). 그래서 왼쪽 열을 둘로 가른다 — 이름표를 별도 블록으로 빼서 순서를 `NameTag(order-1)` → `ChartWheel(order-2)` → `한 줄+공유(order-3)`로 두고, `md:`에서는 `NameTag`와 `한 줄+공유`가 왼쪽 열(`md:col-start-1`), 원반이 오른쪽 열(`md:col-start-2 md:row-span-2`)에 오게 `grid-template-rows: auto auto`로 잡는다. 구현자는 이 세 블록에 `order-1/2/3`과 `md:col-start-*`, `md:row-start-*`를 붙여 두 뷰포트에서 각각 위 순서가 나오도록 하고, Step 1 테스트(DOM 순서)가 통과하는지로 확인한다 — DOM 순서는 모바일 순서다.

`NatalBody`:

```tsx
function NatalBody({ chart, reading, now }: { chart: Chart; reading: Reading; now: Date }) {
  const { core } = reading;
  const highlighted = reading.lens ? reading.placements.filter((p) => p.highlighted) : [];
  const rest = highlighted.length > 0 ? reading.placements.filter((p) => !p.highlighted) : reading.placements;
  const tabs = [
    { id: "overview", label: "한눈에" },
    ...(reading.lens && highlighted.length > 0 ? [{ id: "lens", label: `궁금해한 ${reading.lens.label}` }] : []),
    { id: "planets", label: highlighted.length > 0 ? "나머지 별들" : "열 개의 별" },
    ...(reading.aspects.length > 0 ? [{ id: "aspects", label: "별 사이" }] : []),
    { id: "detail", label: "자세히" },
  ];
  return (
    <>
      <div className="mt-10"><ResultTabs items={tabs} /></div>

      <CardSection id="overview" title="한눈에">
        <ReadingCard index={0} badge={<>{"☉"}{"\uFE0E"}</>} tech={`태양 · ${formatPlacement(core.sun.placement)}`}
          plain={<>겉으로는 <b className="font-medium text-gold-soft">{SIGN_FACES[core.sun.placement.sign.key].out}</b> 사람</>}
          where={firstSentence(core.sun.inSign)}>
          <p>{core.sun.inSign}</p>
        </ReadingCard>
        <ReadingCard index={1} badge={<>{"☽"}{"\uFE0E"}</>} tech={`달 · ${formatPlacement(core.moon.placement)}`}
          plain={<>혼자일 때는 <b className="font-medium text-gold-soft">{SIGN_FACES[core.moon.placement.sign.key].in}</b> 사람</>}
          where={firstSentence(core.moon.inSign)}>
          <p>{core.moon.inSign}</p>
        </ReadingCard>
        {core.ascendant ? (
          <ReadingCard index={2} badge="ASC" tech={`상승궁 · ${core.ascendant.sign.ko}`}
            plain={<>남들이 처음 보는 나는 <b className="font-medium text-gold-soft">{ASC_FACES[core.ascendant.sign.key]}</b> 사람</>}
            where={firstSentence(core.ascendant.text)}>
            <p>{core.ascendant.text}</p>
          </ReadingCard>
        ) : (
          <p className="mt-3 max-w-[52ch] break-keep text-guide text-starlight-dim">
            상승궁은 태어난 시각을 알아야 정해집니다. 시각이 4분 어긋나면 1도가 움직이므로, 모르는 채로 채워 넣지 않습니다.
          </p>
        )}
      </CardSection>

      {reading.lens && highlighted.length > 0 && (
        <CardSection id="lens" title={`당신이 궁금해한 ${reading.lens.label}`} intro={reading.lens.summary}>
          {highlighted.map((item, i) => <PlanetCard key={item.planet.key} item={item} index={i} />)}
          {reading.lifework && (
            <div className="mt-6 border-l-2 border-gold/45 pl-4">
              <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">{reading.lifework.text}</p>
              <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">{reading.lifework.basis}</p>
            </div>
          )}
        </CardSection>
      )}
      {!(reading.lens && highlighted.length > 0) && reading.lifework && (
        <CardSection id="lifework" title="평생의 과제 하나">
          <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">{reading.lifework.text}</p>
          <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">{reading.lifework.basis}</p>
        </CardSection>
      )}

      <CardSection id="planets" title={highlighted.length > 0 ? "나머지 별들" : "열 개의 별"}
        intro="별마다 무엇을 맡는지, 그 힘이 삶의 어느 자리에 있는지 한 줄씩. 눌러서 펼치면 그 별의 이야기 전부가 나옵니다.">
        {rest.map((item, i) => <PlanetCard key={item.planet.key} item={item} index={i} />)}
      </CardSection>

      {reading.aspects.length > 0 && (
        <CardSection id="aspects" title="별과 별 사이"
          intro={`두 별이 특정한 각도로 만나면 서로의 작용이 섞입니다. 이것을 어스펙트라고 합니다. 당신 고유의 이야기가 진하게 걸린 것부터 ${reading.aspects.length}개를 골랐습니다.`}>
          {reading.aspects.map((item, i) => (
            <ReadingCard key={`${item.a.key}-${item.b.key}`} index={i}
              badge={<AspectBadge angle={item.aspect.type.angle} harmony={item.aspect.type.harmony} aSymbol={item.a.symbol} bSymbol={item.b.symbol} animate delay={i * 60} className="w-10" />}
              tech={`${item.a.ko} ${item.aspect.type.ko} ${item.b.ko} · 오브 ${item.aspect.orb.toFixed(1)}도 · ${item.strengthKo}`}
              plain={item.headline}
              where={firstSentence(item.body)}>
              <p className="text-gold-soft">{item.theme}</p>
              <p>{item.body}</p>
            </ReadingCard>
          ))}
        </CardSection>
      )}

      <Section id="detail" title="점성술로 자세히">
        <ChartWheelLegend />
        {/* 기존 "이 화면을 읽는 순서" 블록을 여기로 그대로 옮긴다(문구 변경 없음). */}
        {/* 기존 "하늘 전체의 무게" — describeElements 문장 + 원소 눈금 줄을 여기로 그대로 옮긴다. */}
        <h3 className="mt-12 break-keep font-display text-lg text-starlight">태어난 뒤 하늘은</h3>
        <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">
          느린 별 다섯이 태어난 자리에서 오늘까지 얼마나 돌았는지. 재생을 누르면 한 번 돌고 멈춥니다.
        </p>
        <SkyLapse chart={chart} now={now} />
        {/* 기존 timeUnknown 안내 블록을 여기로 그대로 옮긴다. */}
        {/* 기존 "오늘의 하늘 보기 / 올해의 흐름 보기" GoldButton 블록을 여기로 그대로 옮긴다. */}
      </Section>
    </>
  );
}
```

보조 컴포넌트:

```tsx
/** 카드 묶음 섹션. 화면에 들어오면 data-in을 켜서 카드 계단이 시작된다. */
function CardSection({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  const { ref, inView } = useInView<HTMLElement>(0.2);
  return (
    <Section id={id} title={title}>
      {intro && <p className="mb-4 max-w-[52ch] break-keep text-guide text-starlight-dim">{intro}</p>}
      <div ref={ref} data-in={inView ? "true" : "false"} className="space-y-2.5">
        {children}
      </div>
    </Section>
  );
}

function PlanetCard({ item, index }: { item: ReadingPlacement; index: number }) {
  const tech = `${item.planet.ko} · ${formatPlacement(item.placement)}${item.house ? ` · ${item.house.number}하우스` : ""}${item.placement.retrograde ? " · ℞" : ""}`;
  return (
    <ReadingCard id={placementDomId(item.planet.key)} index={index}
      badge={<>{item.planet.symbol}{"\uFE0E"}</>} tech={tech}
      plain={plainLine(item.planet.key, item.house?.number ?? null, item.placement.sign)}
      where={firstSentence(item.inSign)}>
      <p>{item.inSign}</p>
      {item.inHouse && <p>{item.inHouse}</p>}
      {item.planet.tier === "generational" && (
        <p className="text-meta">{item.planet.ko}은 한 별자리에 {item.planet.dwell} 머뭅니다. 같은 무렵에 태어난 사람이 모두 같은 자리를 가지므로, 이 별은 개인보다 세대를 말합니다.</p>
      )}
    </ReadingCard>
  );
}
```

`useInView`의 반환 형태를 확인한다 — `src/hooks/useInView.ts`가 `{ ref, inView }`가 아니라 `[ref, inView]` 배열이면 구조 분해를 그에 맞춘다(GoldThreads.tsx 55행의 사용법을 그대로 따른다).

`Section`에 `id` 추가:

```tsx
function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 scroll-mt-24">
```

`scrollToPlacement`는 카드 `id`(`placementDomId`)로 가므로 그대로 동작한다. 카드는 접힌 채 도착하므로 함수 끝에 그 카드의 `더 읽기` 버튼을 찾아 `aria-expanded="false"`이면 `click()`을 호출하는 두 줄을 더한다:

```ts
  const more = target.querySelector<HTMLButtonElement>('button[aria-expanded="false"]');
  more?.click();
```

- [ ] **Step 5: `WheelFigure` 삭제**

```bash
git rm byeolsaem-web/src/components/chart/WheelFigure.tsx
```

`ChartWheel.tsx`의 `describeSelection`·`WheelSelection`·`onActiveChange`는 다른 사용처가 없어도 **남긴다** — 호버 설명은 `ChartWheel` 자체 기능이다. `SolarScope.tsx` 96~99행 주석의 "WheelFigure" 언급은 "natal의 원반과 같은 짝이다"로 고친다.

- [ ] **Step 6: 전체 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 전부 PASS. 실패하면 이 태스크 안에서 고친다(Task 1~9는 건드리지 않는다).

`fonts.test.ts`가 새 글자(예: "℞"는 이미 있음, "재생" 등 한글은 대개 있음)로 실패하면 `python scripts/subset-maruburi.py`.

- [ ] **Step 7: 빌드**

Run: `npm run build`
Expected: 성공. `out/natal.html`에 `당신을 한 줄로`와 `NATAL CHART` 헤더가 **둘 다** 있는지 확인(SSR은 예시 분기):

```bash
grep -c "NATAL CHART" out/natal.html; grep -c "당신을 한 줄로" out/natal.html
```

Expected: 둘 다 1 이상.

- [ ] **Step 8: 커밋**

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add byeolsaem-web/src/components/chart/NatalReading.tsx "byeolsaem-web/src/app/(night-static)/natal/page.tsx" byeolsaem-web/src/components/solar/SolarScope.tsx byeolsaem-web/src/test/result-ui.test.ts byeolsaem-web/src/fonts
git commit -m "feat(natal): name tag, wheel first, tabs, cards — the result screen for someone who just arrived" -m "Nothing deleted; every sentence moved into a card body or the detail tab. Revert this commit alone to get the previous screen back." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: 배포·실측·기록

**Files:**
- Modify: `docs/todo.md`

- [ ] **Step 1: 배포**

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
npx wrangler deploy 2>&1 | tail -4
```

Expected: `Current Version ID: …`.

- [ ] **Step 2: dev-browser 실측**

스크립트 `/c/tmp/audit/natal-check.js`:

```js
const page = await browser.getPage("natalcheck");
await page.setViewportSize({ width: 390, height: 844 });
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.goto("https://byeolsaem.com/natal", { waitUntil: "domcontentloaded", timeout: 45000 });
// 예시 프로필 심기 → 새로고침
await page.evaluate(() => localStorage.setItem("byeolsaem.birth", JSON.stringify({ date: "1995-07-14", time: "09:30", city: "서울특별시", concern: "work" })));
await page.reload({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1500));
const m = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const y = (el) => el ? Math.round(el.getBoundingClientRect().bottom) : null;
  return {
    tag: y(q('[aria-label^="태양 "]')),
    wheel: y(q('svg[aria-label*="천궁도 원반"]')),
    one: y([...document.querySelectorAll("p")].find(p => p.textContent.trim() === "당신을 한 줄로")),
    share: y([...document.querySelectorAll("span")].find(s => s.textContent.includes("카드 한 장으로"))),
    entrance: !!q('svg[data-entrance="true"]'),
    anims: document.getAnimations().length,
  };
});
console.log(JSON.stringify(m));
await saveScreenshot(await page.screenshot({ fullPage: false }), "natal-after-fold.png");
```

`localStorage` 키 이름은 `src/hooks/useBirthProfile.ts`에서 확인해 맞춘다. Run: `dev-browser run /c/tmp/audit/natal-check.js`.

Expected: `share` ≤ 844(첫 화면 안), `entrance: true`(첫 방문), 스크린샷에서 이름표·원반·한 줄·공유 버튼이 보임. 같은 스크립트를 `reducedMotion: "reduce"`로 한 번 더 — `anims`가 dash 계열 없이 소수.

- [ ] **Step 3: 라우트 전환 회귀**

`/` → `/natal` 링크 클릭 시간을 기존 방식(`performance.now()` 전후)으로 재서 186~252ms 범위인지 확인. 벗어나면 원인을 찾아 이 태스크에서 고친다.

- [ ] **Step 4: `docs/todo.md` 갱신**

"다음에 바로 할 것"에 추가:

```
- [ ] **스펙 B — 산재 모션 다섯** (`docs/superpowers/specs/2026-09-06-scattered-motion.md`). 건마다 커밋 하나.
- [ ] **스펙 C — synastry·today·yearly에 ResultTabs·ReadingCard 적용.** natal에서 만든 컴포넌트 재사용. 첫 화면은 셋 다 이미 그림이 있어 natal보다 작다.
```

"되돌릴지 정할 것"에 추가:

```
- [ ] natal 재구성(`git revert <Task 10 커밋>`) — 애드센스 결과와 반응 보고.
```

- [ ] **Step 5: 커밋·푸시**

```bash
cd /c/Users/hayoul1999.YOUL-HOUSE/Desktop/Github/byeolsaem
git add docs/todo.md
git commit -m "docs(todo): specs B and C queued behind the natal redesign" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

## 자체 점검

**스펙 커버리지:** §4.1 첫 화면(T10 NatalHero, T4 NameTag, T8 entrance) · §4.2 탭바(T6, T10) · §4.3 핵심 카드(T1, T10) · §4.4 렌즈(T10) · §4.5 행성 카드(T2, T5, T10) · §4.6 각 카드(T7, T10) · §4.7 자세히 + WheelFigure 삭제(T9, T10) · §5.2 120쌍 점검(T2 Step 5) · §5.3 ASC_FACES(T1) · §5.4 Section id(T10) · §6 SkyLapse(T9) · §7.1~7.4 모션(T5, T7, T8, T6) · §8 성능·접근성(T10 sr-only h1, aria-*, T11 실측) · §9 테스트(T1·2·4·5·6·7·8·9·10) · §10 검증·커밋 분할(T10 단일 되돌림 커밋, T11).

**플레이스홀더:** T10의 "기존 … 블록을 여기로 그대로 옮긴다" 주석 넷은 원문 위치를 행 번호로 특정했고(288~335 공유, 99~127 읽는 순서, 166~199 무게, 336~351 timeUnknown, 353~365 GoldButton) 내용 변경이 없으므로 복사 지시로 충분하다. `useInView` 반환 형태와 `BirthProfile` 필드, `localStorage` 키는 구현자가 해당 파일에서 확인하도록 파일명을 적었다.

**타입 일관성:** `plainLine(planet, house, sign)` — T2 정의·T10 사용 동일. `ReadingCard{badge,tech,plain,where,index,children,id}` — T5·T10 동일. `ResultTabs{items:{id,label}[]}` — T6·T10 동일. `AspectBadge{animate,delay}` — T7·T10 동일. `ChartWheel{entrance}` — T8·T10·SolarScope 동일. `sampleLapse(chart, now, steps)`·`SLOW_BODIES` — T9 lib·컴포넌트 동일. `onceInSession(key)` — T3·T8 동일.
