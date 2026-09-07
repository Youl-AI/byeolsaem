# 카드의 네 층 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다섯 결과 화면(오늘·한 해·주간·천궁도·궁합)의 카드가 네 질문(무슨 일인가 · 언제까지인가 · 무엇을 하라 · 왜 이게 나왔나)에 네 자리로 답하게 하고, 점성술 용어를 겉면에서 걷어 접힘 안 세 줄짜리 근거로 내린다.

**Architecture:** 순수 함수 둘을 새로 둔다 — `lib/basis.ts`(근거 세 줄 조립)와 `lib/passage.ts`(느린 별의 통과 기간·정점·진행·주기). `ReadingCard`가 `meta`·`advice`·`progress`·`basis` 슬롯을 얻는다. 화면마다 자기 `*-reading.ts`에서 그 값을 만들어 카드에 넘긴다. 컴포넌트는 문장을 조립하지 않는다.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Vitest(`renderToStaticMarkup` + 순수 함수, DOM 환경 없음) · Tailwind 4

**Spec:** `docs/superpowers/specs/2026-09-08-reading-card-grammar-design.md`

## Global Constraints

- 화면 어디에도 `합`·`육분`·`사각`·`삼각`·`대립`·`순풍`·`마찰`·`오차`를 쓰지 않는다. 각은 숫자(`60도`)로 말한다. 예외: 구역 소개문(`intro`)과 `/method`·칼럼은 가르치는 자리라 그대로 둔다.
- 근거는 **정확히 세 줄.** `basisLines()`의 반환 타입이 `[string, string, string]`이다.
- `where`는 문장이다. `plain`에 글자 그대로 들어 있으면 테스트가 실패한다.
- `TRANSIT_LIFE`·`TRANSIT_ADVICE`·`ASPECT_MEANINGS`·`HOUSE_AREAS`·`PLANET_AREAS`·`SYNASTRY_ASPECTS`의 문장은 고치지 않는다. 자리만 옮긴다.
- 문장 삭제 0. 지금 카드가 보여 주던 문자열은 전부 어딘가에 남는다.
- 조사는 `@/lib/josa`의 `iga`·`eun`·`eul`·`gwa`만 쓴다. 새 조사 함수를 만들지 않는다.
- DOM 테스트 환경(jsdom 등)을 들이지 않는다.
- 커밋 메시지는 영어 산문, 마지막 줄 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 모든 명령은 `byeolsaem-web/`에서 실행한다. 검사 셋: `npx tsc --noEmit && npx vitest run`.
- 파일 쓰기는 UTF-8, LF. PowerShell `Set-Content`는 쓰지 않는다(BOM·CRLF).

---

## 파일 지도

| 파일 | 역할 | 태스크 |
|---|---|---|
| `src/lib/basis.ts` (새) | 근거 세 줄. 입력은 별 키·각도·오브·하우스·렌즈·정점 라벨. 출력은 문자열 셋 | 1 |
| `src/lib/passage.ts` (새) | 느린 별의 통과 기간(시작·끝), 정점들, 진행도, 주기 라벨, 날짜 표기 | 2 |
| `src/lib/yearly.ts` | `refineCrossing`을 export | 2 |
| `src/content/atoms/glossary.ts` (새) | `GLOSSARY` 7항목 — `Term.tsx`에서 옮겨 온다 | 3 |
| `src/components/ui/Term.tsx` (이동) | `components/chart/Term.tsx`에서 옮긴다 | 3 |
| `src/components/ui/ReadingCard.tsx` | `tech`→`meta`, `advice`·`progress`·`basis` 슬롯 | 4 |
| `src/lib/today-reading.ts` + `src/components/today/TodayCard.tsx` | 오늘 | 5 |
| `src/lib/yearly-reading.ts` + `src/components/yearly/YearEventRows.tsx` | 한 해 | 6 |
| `src/lib/weekly-reading.ts` + `src/components/weekly/WeeklyCard.tsx` (+ `WeekPath.tsx`) | 주간 | 7 |
| `src/lib/reading.ts` + `src/components/chart/NatalReading.tsx` | 천궁도 | 8 |
| `src/lib/synastry-reading.ts` + `src/components/synastry/SynastryReading.tsx` | 궁합 | 9 |
| `src/test/result-ui.test.ts` | 불변식 둘(where ⊄ plain, 금지어 없음) | 10 |
| `docs/superpowers/records/2026-09-07-result-screens.md`, `docs/todo.md` | 기록 | 10 |

---

### Task 1: 근거 세 줄 — `lib/basis.ts`

**Files:**
- Create: `src/lib/basis.ts`
- Test: `src/test/basis.test.ts`

**Interfaces:**
- Consumes: `iga`·`eun`·`eul`·`gwa` from `@/lib/josa`; `HOUSE_AREAS`·`PLANET_AREAS` from `@/content/atoms/life`; `PLANET_BY_KEY`·`PlanetKey` from `@/lib/planets`
- Produces:
  ```ts
  export type BasisTense = "transit" | "natal" | "synastry";
  export interface BasisInput {
    tense: BasisTense;
    a: PlanetKey;            // 움직이는 별 / 첫 별 / 내 별
    b: PlanetKey;            // 내 별 / 둘째 별 / 그쪽 별
    angle: number;           // 0 · 60 · 90 · 120 · 180
    orb: number | null;      // null이면 "정확히 맞는 날" 갈래(한 해)
    house: number | null;    // b가 든 하우스. 시각 모르면 null
    lens?: string | null;    // 걸린 관심사 라벨. 없으면 null
    peakLabel?: string | null;   // 오늘 이후 첫 정점 "10월 3일". 느린 별에만
    peakPassed?: boolean;        // 정점이 전부 지났는가
    exactLabels?: string[];      // 한 해 전용 — 정확한 날들
  }
  export function basisLines(input: BasisInput): [string, string, string];
  ```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// src/test/basis.test.ts
import { describe, expect, it } from "vitest";
import { basisLines } from "@/lib/basis";

const base = { tense: "transit" as const, a: "saturn" as const, b: "uranus" as const, angle: 60, orb: 0.3, house: 7 };

describe("근거 세 줄", () => {
  it("언제나 세 줄이다", () => {
    expect(basisLines(base)).toHaveLength(3);
  });

  it("트랜짓 — 무엇이 무엇과, 왜 이 자리, 얼마나 진한가", () => {
    expect(basisLines(base)).toEqual([
      "지금 하늘의 토성이 내 천왕성과 60도를 이룹니다.",
      "그 천왕성이 7하우스(마주 앉는 관계)에 있습니다.",
      "0.3도 차이라 지금이 가장 진합니다.",
    ]);
  });

  it("조사가 앞말의 받침을 따른다", () => {
    const [first] = basisLines({ ...base, a: "moon", b: "venus" });
    expect(first).toBe("지금 하늘의 달이 내 금성과 60도를 이룹니다.");
    const [, second] = basisLines({ ...base, b: "moon", house: null });
    expect(second).toBe("그 달이 마음이 놓이는 자리를 맡고 있습니다.");
  });

  it("0도는 '겹칩니다'", () => {
    expect(basisLines({ ...base, angle: 0 })[0]).toBe("지금 하늘의 토성이 내 천왕성과 겹칩니다.");
  });

  it("시각을 모르면 둘째 줄이 별의 자리로 간다", () => {
    expect(basisLines({ ...base, house: null })[1]).toBe("그 천왕성이 예고 없이 흔들리는 자리를 맡고 있습니다.");
  });

  it("관심사에 걸리면 둘째 줄 뒤에 한 문장이 붙는다", () => {
    expect(basisLines({ ...base, lens: "연애운" })[1]).toBe(
      "그 천왕성이 7하우스(마주 앉는 관계)에 있습니다. 연애운이 보는 자리입니다.",
    );
    expect(basisLines({ ...base, lens: null })[1]).not.toContain("보는 자리");
  });

  it("오브 1도 이상 — 정점이 남았으면 그 날짜, 지났으면 지났다고, 둘 다 없으면 옅다", () => {
    expect(basisLines({ ...base, orb: 2.4, peakLabel: "10월 3일" })[2]).toBe("2.4도 남았습니다 — 10월 3일에 가장 진합니다.");
    expect(basisLines({ ...base, orb: 2.4, peakLabel: null, peakPassed: true })[2]).toBe("2.4도 차이라 가장 진한 때는 지났습니다.");
    expect(basisLines({ ...base, orb: 2.4 })[2]).toBe("2.4도 차이라 아직 옅습니다.");
  });

  it("한 해 — 오브 대신 정확한 날들", () => {
    expect(basisLines({ ...base, orb: null, exactLabels: ["3월 14일"] })[2]).toBe("3월 14일에 정확히 맞습니다.");
    expect(basisLines({ ...base, orb: null, exactLabels: ["3월 14일", "7월 2일", "11월 30일"] })[2]).toBe(
      "3월 14일 · 7월 2일 · 11월 30일, 세 번에 걸쳐 맞습니다.",
    );
  });

  it("natal 시제", () => {
    expect(basisLines({ ...base, tense: "natal", a: "sun", b: "moon", angle: 90, orb: 1.2, house: 4 })).toEqual([
      "태어날 때 태양과 달이 90도였습니다.",
      "그 달이 4하우스(집과 마음의 바닥)에 있습니다.",
      "1.2도 차이라 뚜렷한 배선입니다.",
    ]);
    expect(basisLines({ ...base, tense: "natal", angle: 0, orb: 3.5 })[0]).toBe("태어날 때 토성과 천왕성이 한자리에 겹쳐 있었습니다.");
    expect(basisLines({ ...base, tense: "natal", orb: 3.5 })[2]).toBe("3.5도 차이라 옅은 배선입니다.");
  });

  it("궁합 시제 — 그쪽 별이 내 하우스에", () => {
    expect(basisLines({ ...base, tense: "synastry", a: "sun", b: "moon", angle: 120, orb: 0.8, house: 7 })).toEqual([
      "내 태양이 그쪽 달과 120도를 이룹니다.",
      "그쪽 달이 내 7하우스(마주 앉는 관계)에 있습니다.",
      "0.8도 차이라 뚜렷한 만남입니다.",
    ]);
    expect(basisLines({ ...base, tense: "synastry", b: "moon", house: null })[1]).toBe("그쪽 달이 마음이 놓이는 자리를 맡고 있습니다.");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/basis.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/basis"`

- [ ] **Step 3: 구현한다**

```ts
// src/lib/basis.ts
import { HOUSE_AREAS, PLANET_AREAS } from "@/content/atoms/life";
import { eul, gwa, iga } from "./josa";
import { PLANET_BY_KEY, type PlanetKey } from "./planets";

/**
 * 근거 세 줄 — "왜 이게 보이나요"에 답하는 문장.
 *
 * 카드 겉면은 사람 말만 하고, 별 이름·각도·하우스는 여기로 내려온다. 세 줄은
 * 세 질문에 하나씩 답한다: 무엇이 무엇과 / 왜 이 자리인가 / 얼마나 진한가.
 * 넷째 줄은 없다 — 늘리고 싶은 것은 머리줄로 올리거나 버린다.
 *
 * 각은 이름이 아니라 숫자로 말한다. "육분"을 가르치는 것보다 "60도"라고 쓰는 편이
 * 싸다. 조립은 결정론이다 — 같은 입력이면 같은 문장이다.
 */

export type BasisTense = "transit" | "natal" | "synastry";

export interface BasisInput {
  tense: BasisTense;
  /** 움직이는 별(트랜짓) · 첫 별(natal) · 내 별(궁합). */
  a: PlanetKey;
  /** 내 별(트랜짓) · 둘째 별(natal) · 그쪽 별(궁합). */
  b: PlanetKey;
  /** 0 · 60 · 90 · 120 · 180 */
  angle: number;
  /** null이면 오브 대신 정확한 날들로 말한다(한 해). */
  orb: number | null;
  /** b가 든 하우스. 궁합은 그쪽 별이 든 내 하우스. 시각을 모르면 null. */
  house: number | null;
  lens?: string | null;
  /** 오늘 이후 첫 정점의 표기 — "10월 3일". 느린 별에만. */
  peakLabel?: string | null;
  peakPassed?: boolean;
  /** 한 해 전용 — 정확한 날들의 표기. */
  exactLabels?: string[];
}

const COUNT_KO = ["", "한", "두", "세", "네", "다섯"] as const;

function firstLine(tense: BasisTense, a: string, b: string, angle: number): string {
  if (tense === "natal") {
    return angle === 0
      ? `태어날 때 ${a}${gwa(a)} ${b}${iga(b)} 한자리에 겹쳐 있었습니다.`
      : `태어날 때 ${a}${gwa(a)} ${b}${iga(b)} ${angle}도였습니다.`;
  }
  const head = tense === "synastry" ? `내 ${a}${iga(a)} 그쪽 ${b}${gwa(b)}` : `지금 하늘의 ${a}${iga(a)} 내 ${b}${gwa(b)}`;
  return angle === 0 ? `${head} 겹칩니다.` : `${head} ${angle}도를 이룹니다.`;
}

function secondLine(tense: BasisTense, bKey: PlanetKey, b: string, house: number | null, lens: string | null | undefined): string {
  const subject = tense === "synastry" ? `그쪽 ${b}${iga(b)}` : `그 ${b}${iga(b)}`;
  const place =
    house === null
      ? `${PLANET_AREAS[bKey]}${eul(PLANET_AREAS[bKey])} 맡고 있습니다.`
      : `${tense === "synastry" ? "내 " : ""}${house}하우스(${HOUSE_AREAS[house]})에 있습니다.`;
  const line = `${subject} ${place}`;
  return lens ? `${line} ${lens}${iga(lens)} 보는 자리입니다.` : line;
}

function thirdLine(input: BasisInput): string {
  const { tense, orb } = input;
  if (orb === null) {
    const labels = input.exactLabels ?? [];
    if (labels.length <= 1) return `${labels[0] ?? "올해"}에 정확히 맞습니다.`;
    return `${labels.join(" · ")}, ${COUNT_KO[labels.length] ?? labels.length}번에 걸쳐 맞습니다.`;
  }
  const o = orb.toFixed(1);
  if (tense === "natal") return `${o}도 차이라 ${orb < 2 ? "뚜렷한" : "옅은"} 배선입니다.`;
  if (tense === "synastry") return `${o}도 차이라 ${orb < 2 ? "뚜렷한" : "옅은"} 만남입니다.`;
  if (orb < 1) return `${o}도 차이라 지금이 가장 진합니다.`;
  if (input.peakLabel) return `${o}도 남았습니다 — ${input.peakLabel}에 가장 진합니다.`;
  if (input.peakPassed) return `${o}도 차이라 가장 진한 때는 지났습니다.`;
  return `${o}도 차이라 아직 옅습니다.`;
}

export function basisLines(input: BasisInput): [string, string, string] {
  const a = PLANET_BY_KEY[input.a].ko;
  const b = PLANET_BY_KEY[input.b].ko;
  return [
    firstLine(input.tense, a, b, input.angle),
    secondLine(input.tense, input.b, b, input.house, input.lens),
    thirdLine(input),
  ];
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/test/basis.test.ts`
Expected: PASS — 10 tests

- [ ] **Step 5: 커밋**

```bash
git add src/lib/basis.ts src/test/basis.test.ts
git commit -F - <<'EOF'
feat(lib): assemble the three-line basis for a reading card

The "why am I seeing this" block every result card will carry: what meets
what, why it lands in this area, and how exact it is. Aspects are named by
angle, not by their Korean names, and the particles follow the planet name.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 2: 통과 기간·정점·진행·주기 — `lib/passage.ts`

**Files:**
- Modify: `src/lib/yearly.ts:80` — `function refineCrossing` 앞에 `export`
- Create: `src/lib/passage.ts`
- Test: `src/test/passage.test.ts`

**Interfaces:**
- Consumes: `longitudeOf` from `@/lib/chart`; `fromJulianDay`·`norm180` from `@/lib/ephemeris`; `refineCrossing` from `@/lib/yearly`; `findTransits`·`todaySky` (테스트에서); `exampleSky` (테스트에서)
- Produces:
  ```ts
  export const PASSAGE_ORB = 3;
  export const SLOW_MOVERS: readonly PlanetKey[]; // jupiter saturn uranus neptune pluto
  export interface PassageDate { jd: number; year: number; month: number; day: number }
  export interface Passage {
    start: PassageDate | null;   // 탐색 범위(±400일) 안에서 못 찾으면 null
    end: PassageDate | null;
    peaks: PassageDate[];        // 날짜순
    progress: number | null;     // 0~1, 양끝이 있을 때만
  }
  export type LongitudeAt = (planet: PlanetKey, jd: number) => number;
  export function transitPassage(mover: PlanetKey, natalLongitude: number, angle: number, todayJd: number, longitudeAt?: LongitudeAt): Passage | null;
  export function recurrenceLabel(mover: PlanetKey, angle: number): string | null; // "15년에 한 번" · "평생 한 번" · 빠른 별이면 null
  export function formatPassageDate(date: PassageDate, todayYear: number): string; // "10월 3일" · 해가 다르면 "2027년 1월 8일"
  export function passageRange(passage: Passage, todayYear: number): string; // "9월 2일 – 11월 14일" · 한쪽 없으면 "9월 2일부터" / "11월 14일까지"
  ```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// src/test/passage.test.ts
import { describe, expect, it } from "vitest";
import { exampleSky } from "@/lib/example-sky";
import { findTransits, todaySky } from "@/lib/today";
import {
  formatPassageDate,
  passageRange,
  recurrenceLabel,
  transitPassage,
  type LongitudeAt,
} from "@/lib/passage";

const TODAY = 2461291.5; // 임의의 기준일. 합성 경도 함수만 쓰는 테스트에서.

/** 오브가 |lon|이 되도록 natal 0도·각 0도로 두고, 날짜별 경도를 손으로 준다. */
function synthetic(orbAt: (daysFromToday: number) => number): LongitudeAt {
  return (_planet, jd) => orbAt(Math.round(jd - TODAY));
}

describe("통과 기간", () => {
  it("예시 차트의 토성 트랜짓 — 시작 < 오늘 < 끝, 정점이 그 사이, 진행이 0~1", () => {
    const { chart } = exampleSky();
    const sky = todaySky(new Date("2026-09-07T03:00:00Z"));
    const saturn = findTransits(sky, chart, 40).find((t) => t.transiting === "saturn" || t.transiting === "jupiter");
    expect(saturn).toBeDefined();
    const natal = chart.placements.find((p) => p.planet === saturn!.natal)!;
    const passage = transitPassage(saturn!.transiting, natal.longitude, saturn!.type.angle, sky.julianDay);
    expect(passage).not.toBeNull();
    expect(passage!.start).not.toBeNull();
    expect(passage!.end).not.toBeNull();
    expect(passage!.start!.jd).toBeLessThan(sky.julianDay);
    expect(passage!.end!.jd).toBeGreaterThan(sky.julianDay);
    expect(passage!.peaks.length).toBeGreaterThan(0);
    for (const p of passage!.peaks) {
      expect(p.jd).toBeGreaterThanOrEqual(passage!.start!.jd - 1);
      expect(p.jd).toBeLessThanOrEqual(passage!.end!.jd + 1);
    }
    expect(passage!.progress).toBeGreaterThanOrEqual(0);
    expect(passage!.progress).toBeLessThanOrEqual(1);
  });

  it("빠른 별은 null", () => {
    for (const p of ["moon", "mercury", "venus", "sun", "mars"] as const) {
      expect(transitPassage(p, 0, 0, TODAY)).toBeNull();
    }
  });

  it("역행으로 잠깐 벗어났다 120일 안에 돌아오면 한 통과로 잇는다", () => {
    // |d| ≤ 10 안, 10 < |d| ≤ 50 밖(오브 5), 50 < |d| ≤ 60 다시 안, 그 뒤 밖(10).
    const lon = synthetic((d) => (Math.abs(d) <= 10 ? 0 : Math.abs(d) <= 50 ? 5 : Math.abs(d) <= 60 ? 0 : 10));
    const passage = transitPassage("saturn", 0, 0, TODAY, lon)!;
    expect(Math.round(passage.start!.jd - TODAY)).toBe(-60);
    expect(Math.round(passage.end!.jd - TODAY)).toBe(60);
    expect(passage.progress).toBeCloseTo(0.5, 2);
  });

  it("빈틈이 120일을 넘으면 끊는다", () => {
    const lon = synthetic((d) => (Math.abs(d) <= 10 ? 0 : Math.abs(d) <= 160 ? 5 : 0));
    const passage = transitPassage("saturn", 0, 0, TODAY, lon)!;
    expect(Math.round(passage.start!.jd - TODAY)).toBe(-10);
    expect(Math.round(passage.end!.jd - TODAY)).toBe(10);
  });

  it("400일 안에 끝을 못 찾으면 그쪽은 null이고 진행도 null", () => {
    const lon = synthetic(() => 0);
    const passage = transitPassage("pluto", 0, 0, TODAY, lon)!;
    expect(passage.start).toBeNull();
    expect(passage.end).toBeNull();
    expect(passage.progress).toBeNull();
  });
});

describe("주기", () => {
  it("공전 주기 ÷ 한 바퀴에 오는 횟수", () => {
    expect(recurrenceLabel("saturn", 60)).toBe("15년에 한 번");
    expect(recurrenceLabel("saturn", 0)).toBe("29년에 한 번");
    expect(recurrenceLabel("jupiter", 0)).toBe("12년에 한 번");
    expect(recurrenceLabel("jupiter", 120)).toBe("6년에 한 번");
    expect(recurrenceLabel("uranus", 90)).toBe("42년에 한 번");
    expect(recurrenceLabel("uranus", 180)).toBe("평생 한 번");
    expect(recurrenceLabel("pluto", 60)).toBe("평생 한 번");
    expect(recurrenceLabel("moon", 0)).toBeNull();
  });
});

describe("날짜 표기", () => {
  const d = (year: number, month: number, day: number) => ({ jd: 0, year, month, day });
  it("같은 해면 월일, 다른 해면 연도부터", () => {
    expect(formatPassageDate(d(2026, 10, 3), 2026)).toBe("10월 3일");
    expect(formatPassageDate(d(2027, 1, 8), 2026)).toBe("2027년 1월 8일");
  });
  it("범위 — 양끝, 한쪽만", () => {
    expect(passageRange({ start: d(2026, 9, 2), end: d(2026, 11, 14), peaks: [], progress: 0.4 }, 2026)).toBe("9월 2일 – 11월 14일");
    expect(passageRange({ start: d(2026, 9, 2), end: null, peaks: [], progress: null }, 2026)).toBe("9월 2일부터");
    expect(passageRange({ start: null, end: d(2026, 11, 14), peaks: [], progress: null }, 2026)).toBe("11월 14일까지");
    expect(passageRange({ start: null, end: null, peaks: [], progress: null }, 2026)).toBe("");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/passage.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/passage"`

- [ ] **Step 3: `refineCrossing`을 내보낸다**

`src/lib/yearly.ts:80`의 `function refineCrossing(` → `export function refineCrossing(`. 다른 것은 손대지 않는다.

- [ ] **Step 4: 구현한다**

```ts
// src/lib/passage.ts
import { longitudeOf } from "./chart";
import { fromJulianDay, norm180 } from "./ephemeris";
import type { PlanetKey } from "./planets";
import { refineCrossing } from "./yearly";

/**
 * 느린 별의 통과 — 언제 시작해 언제 끝나고 언제 가장 진한가.
 *
 * `/today`는 오브를 재고 `/yearly`는 정확한 날을 구한다. 이 파일은 그 둘 사이다:
 * 오늘 걸려 있는 느린 별의 각이 언제부터 언제까지 걸려 있는지를 오늘에서 앞뒤로
 * 하루씩 걸어 찾는다. 역행으로 잠깐 벗어났다 돌아오는 것은 한 통과로 친다 —
 * 토성이면 아홉 달, 정확한 날이 셋까지 나온다.
 *
 * 빠른 별에는 쓰지 않는다. 몇 시간짜리에 날짜를 붙이면 과장이 된다.
 */

/** `/today`의 TRANSIT_ORB와 같은 값. 여기서 갈리면 카드의 기간과 목록의 기준이 어긋난다. */
export const PASSAGE_ORB = 3;
export const SLOW_MOVERS: readonly PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
/** 이보다 긴 빈틈은 다른 통과다. 토성의 역행 고리는 넉 달을 넘지 않는다. */
const MERGE_GAP_DAYS = 120;
const SEARCH_DAYS = 400;
/** 하루 사이 이만큼 뛰면 ±180 경계를 넘은 것이지 정점이 아니다(yearly.ts와 같다). */
const WRAP_GUARD = 30;

export interface PassageDate {
  jd: number;
  year: number;
  month: number;
  day: number;
}

export interface Passage {
  start: PassageDate | null;
  end: PassageDate | null;
  peaks: PassageDate[];
  progress: number | null;
}

export type LongitudeAt = (planet: PlanetKey, jd: number) => number;

function kstDate(jd: number): PassageDate {
  const kst = new Date(fromJulianDay(jd).getTime() + 9 * 3600_000);
  return { jd, year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate() };
}

/** 오늘에서 한 방향으로 걸어 통과의 끝을 찾는다. `dir`은 -1(과거) 또는 +1(미래). */
function edge(orbAt: (jd: number) => number, todayJd: number, dir: -1 | 1): number | null {
  let lastIn = todayJd;
  let gap = 0;
  for (let i = 1; i <= SEARCH_DAYS; i += 1) {
    const jd = todayJd + dir * i;
    if (orbAt(jd) <= PASSAGE_ORB) {
      lastIn = jd;
      gap = 0;
    } else {
      gap += 1;
      if (gap > MERGE_GAP_DAYS) return lastIn;
    }
  }
  return null;
}

export function transitPassage(
  mover: PlanetKey,
  natalLongitude: number,
  angle: number,
  todayJd: number,
  longitudeAt: LongitudeAt = longitudeOf,
): Passage | null {
  if (!SLOW_MOVERS.includes(mover)) return null;

  const orbAt = (jd: number) => Math.abs(Math.abs(norm180(longitudeAt(mover, jd) - natalLongitude)) - angle);
  const startJd = edge(orbAt, todayJd, -1);
  const endJd = edge(orbAt, todayJd, 1);

  // 정점 — 목표 황경(natal ± angle)을 지나는 순간. yearly.ts와 같은 방법이다.
  const lo = startJd ?? todayJd - SEARCH_DAYS;
  const hi = endJd ?? todayJd + SEARCH_DAYS;
  const targets = angle === 0 || angle === 180 ? [natalLongitude + angle] : [natalLongitude + angle, natalLongitude - angle];
  const peaks: PassageDate[] = [];
  for (const target of targets) {
    const offset = (jd: number) => norm180(longitudeAt(mover, jd) - target);
    let previous = offset(lo);
    for (let jd = lo + 1; jd <= hi; jd += 1) {
      const current = offset(jd);
      const crossed = Math.sign(current) !== Math.sign(previous) && Math.abs(current - previous) < WRAP_GUARD;
      previous = current;
      if (!crossed) continue;
      // 합성 경도 함수를 쓸 때도 refineCrossing이 실제 longitudeOf를 부르지 않게, 여기서 직접 좁힌다.
      peaks.push(kstDate(longitudeAt === longitudeOf ? refineCrossing(mover, target, jd - 1, jd) : jd - 0.5));
    }
  }
  peaks.sort((a, b) => a.jd - b.jd);

  const progress =
    startJd !== null && endJd !== null && endJd > startJd
      ? Math.min(1, Math.max(0, (todayJd - startJd) / (endJd - startJd)))
      : null;

  return {
    start: startJd === null ? null : kstDate(startJd),
    end: endJd === null ? null : kstDate(endJd),
    peaks,
    progress,
  };
}

/** 공전 주기(년). 느린 별만. */
const ORBIT_YEARS: Partial<Record<PlanetKey, number>> = {
  jupiter: 11.86,
  saturn: 29.46,
  uranus: 84.0,
  neptune: 164.8,
  pluto: 248,
};

/** 84년 이상이면 "평생 한 번" — 천왕성의 합·대립부터. */
export function recurrenceLabel(mover: PlanetKey, angle: number): string | null {
  const years = ORBIT_YEARS[mover];
  if (!years) return null;
  const perCycle = angle === 0 || angle === 180 ? 1 : 2;
  const every = Math.round(years / perCycle);
  return every >= 84 ? "평생 한 번" : `${every}년에 한 번`;
}

export function formatPassageDate(date: PassageDate, todayYear: number): string {
  const md = `${date.month}월 ${date.day}일`;
  return date.year === todayYear ? md : `${date.year}년 ${md}`;
}

export function passageRange(passage: Passage, todayYear: number): string {
  const { start, end } = passage;
  if (start && end) return `${formatPassageDate(start, todayYear)} – ${formatPassageDate(end, todayYear)}`;
  if (start) return `${formatPassageDate(start, todayYear)}부터`;
  if (end) return `${formatPassageDate(end, todayYear)}까지`;
  return "";
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run src/test/passage.test.ts src/test/yearly.test.ts`
Expected: PASS — passage 9 tests, yearly 기존 테스트 그대로

- [ ] **Step 6: 커밋**

```bash
git add src/lib/passage.ts src/lib/yearly.ts src/test/passage.test.ts
git commit -F - <<'EOF'
feat(lib): the passage of a slow transit — start, end, peaks, progress

/yearly already finds the exact moments; /today only measured the orb. This
walks a day at a time from today in both directions to find where the orb
opens and closes, merges the retrograde loop into one passage, and reuses
yearly's bisection for the peaks. Fast movers return null on purpose.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 3: 용어집을 아톰으로, `Term`을 `ui/`로

**Files:**
- Create: `src/content/atoms/glossary.ts`
- Move: `src/components/chart/Term.tsx` → `src/components/ui/Term.tsx`
- Modify: `src/components/chart/NatalReading.tsx:26` import, `src/components/ephemeris/EphemerisLegend.tsx` import
- Test: `src/test/result-ui.test.ts` (한 케이스 추가)

**Interfaces:**
- Produces: `GLOSSARY` (`content/atoms/glossary.ts`), `type TermName = keyof typeof GLOSSARY`; `Term` from `@/components/ui/Term` — props `{ name: TermName }` 그대로

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/result-ui.test.ts` 끝에:

```ts
import { Term } from "@/components/ui/Term";
import { GLOSSARY } from "@/content/atoms/glossary";

describe("용어", () => {
  it("점선 용어를 누르면 나오는 정의가 아톰의 것이다", () => {
    const html = renderToStaticMarkup(createElement(Term, { name: "하우스" }));
    expect(html).toContain(GLOSSARY.하우스);
    expect(html).toContain('aria-expanded="false"');
  });
});
```
(import 두 줄은 파일 맨 위 import 묶음에 넣는다.)

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/result-ui.test.ts`
Expected: FAIL — `Failed to resolve import "@/components/ui/Term"`

- [ ] **Step 3: 아톰을 만들고 파일을 옮긴다**

```ts
// src/content/atoms/glossary.ts
/**
 * 점성술 용어의 한 줄 정의. `Term`이 점선 밑줄 아래 펼친다.
 *
 * 다섯 결과 화면이 함께 쓰므로 컴포넌트가 아니라 아톰이다. 항목을 늘리기 전에
 * 그 말을 화면에서 지울 수 있는지 먼저 본다 — 가르치는 것보다 지우는 것이 싸다.
 */
export const GLOSSARY = {
  상승궁:
    "태어난 순간 동쪽 지평선에 막 떠오르던 별자리. 남들이 처음 보는 나의 겉모습을 말합니다.",
  하우스:
    "하늘을 열둘로 나눈 방. 별자리가 '어떻게'라면 하우스는 '어디서'입니다 — 일터인지 집인지 관계 안인지.",
  어스펙트: "두 별이 이루는 각도. 특정 각도에서 두 별의 작용이 서로 섞입니다.",
  오브: "정확한 각도에서 얼마나 벗어났는지. 작을수록 그 각도의 성질이 뚜렷합니다.",
  역행:
    "행성이 하늘에서 거꾸로 가는 것처럼 보이는 기간. 실제로 거꾸로 도는 것이 아니라, 지구가 안쪽 궤도에서 추월하며 생기는 착시입니다.",
  중천: "태어난 순간 하늘 꼭대기에 있던 지점. 사회에서 도달하려는 자리를 말합니다.",
  홀사인:
    "하우스를 나누는 방식 중 하나. 상승궁이 든 별자리 전체가 1하우스가 되고, 다음 별자리가 차례로 2, 3하우스가 됩니다.",
} as const;

export type TermName = keyof typeof GLOSSARY;
```

기존 `Term.tsx`의 `GLOSSARY` 문자열을 위와 글자 하나 다르지 않게 옮긴다(`git show HEAD:byeolsaem-web/src/components/chart/Term.tsx`로 대조).

```bash
git mv src/components/chart/Term.tsx src/components/ui/Term.tsx
```

`src/components/ui/Term.tsx`에서:
- `const GLOSSARY = { ... } as const;` 블록과 그 위 주석을 지우고 `import { GLOSSARY, type TermName } from "@/content/atoms/glossary";`를 추가
- `export function Term({ name }: { name: keyof typeof GLOSSARY })` → `export function Term({ name }: { name: TermName })`

import 경로 둘:
- `src/components/chart/NatalReading.tsx`: `import { Term } from "./Term";` → `import { Term } from "@/components/ui/Term";`
- `src/components/ephemeris/EphemerisLegend.tsx`: `Term` import를 `@/components/ui/Term`으로

- [ ] **Step 4: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add -A src/content/atoms/glossary.ts src/components/ui/Term.tsx src/components/chart/Term.tsx src/components/chart/NatalReading.tsx src/components/ephemeris/EphemerisLegend.tsx src/test/result-ui.test.ts
git commit -F - <<'EOF'
refactor: move the glossary to an atom and Term to ui

Five screens are about to use the dotted-underline term, so it no longer
belongs under chart/. The definitions move to content/atoms/glossary.ts
unchanged.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 4: `ReadingCard` — `meta`·`advice`·`progress`·`basis`

**Files:**
- Modify: `src/components/ui/ReadingCard.tsx`
- Modify: `src/test/result-ui.test.ts` — 기존 `tech:` 셋을 `meta:`로, 새 케이스 셋
- Modify(컴파일만): `tech=`를 쓰는 다섯 파일 — 이 태스크에서는 **이름만** `meta=`로 바꾼다. 내용은 화면 태스크에서 바꾼다: `src/components/chart/NatalReading.tsx:287,309,327,420,564`, `src/components/synastry/SynastryReading.tsx:414`, `src/components/today/TodayCard.tsx:358`, `src/components/yearly/YearEventRows.tsx:57`

**Interfaces:**
- Produces:
  ```ts
  // ReadingCard props (바뀐 것만)
  meta: React.ReactNode;                                   // tech의 새 이름
  advice?: { try: string; hold: string } | null;           // 접힘 안 첫머리
  progress?: { value: number; peaks: number[] } | null;    // 머리줄 아래 막대. 0~1
  basis?: readonly string[] | null;                        // 접힘 안 맨 아래 "왜 이게 보이나요"
  ```
- 둘째 근거 줄에 `하우스`가 있으면 `Term`으로 감싼다. 조립 함수는 문자열만 만들고 컴포넌트가 감싼다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/result-ui.test.ts`의 `describe("카드", …)` 안에 추가하고, 파일 전체에서 `tech:` → `meta:` (세 곳):

```ts
  it("근거가 있으면 접힘 안 맨 아래에 세 줄, 하우스에 점선", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingCard,
        {
          badge: "♄",
          meta: "마주 앉는 관계 · 9월 2일 – 11월 14일 · 15년에 한 번",
          plain: "관계가 단단해지는 몇 달입니다.",
          where: "여기서 만든 것은 오래 남습니다.",
          basis: [
            "지금 하늘의 토성이 내 천왕성과 60도를 이룹니다.",
            "그 천왕성이 7하우스(마주 앉는 관계)에 있습니다.",
            "0.3도 차이라 지금이 가장 진합니다.",
          ],
        },
        createElement("p", null, "본문"),
      ),
    );
    expect(html).toContain("왜 이게 보이나요");
    expect(html.match(/data-basis-line/g)).toHaveLength(3);
    expect(html.indexOf("본문")).toBeLessThan(html.indexOf("왜 이게 보이나요"));
    expect(html).toContain(">하우스</button>"); // Term
  });

  it("해 볼 것·미룰 것은 접힘 안 첫머리", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingCard,
        { badge: "♄", meta: "m", plain: "p.", where: "w.", advice: { try: "정리", hold: "덮기" } },
        createElement("p", null, "본문"),
      ),
    );
    expect(html.indexOf("해 볼 것")).toBeLessThan(html.indexOf("본문"));
    expect(html).toContain("정리");
    expect(html).toContain("덮기");
  });

  it("진행 막대는 머리줄 아래, 값과 정점이 백분율로", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingCard, { badge: "♄", meta: "m", plain: "p.", where: "w.", progress: { value: 0.4, peaks: [0.55] } }),
    );
    expect(html).toContain('data-progress="40"');
    expect(html).toContain("left:55%");
    const none = renderToStaticMarkup(createElement(ReadingCard, { badge: "♄", meta: "m", plain: "p.", where: "w." }));
    expect(none).not.toContain("data-progress");
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/result-ui.test.ts`
Expected: FAIL — 새 세 케이스. (`meta:`로 바꾼 기존 케이스는 `tech`가 아직 필수라 tsc는 깨지지만 vitest는 돈다.)

- [ ] **Step 3: 구현한다**

`src/components/ui/ReadingCard.tsx` 전체를 아래로 바꾼다. 문서 주석의 첫 문단들은 그대로 두고 마지막 문단만 갈아 끼운다.

```tsx
"use client";
import React, { useId, useState } from "react";
import { Term } from "./Term";

/**
 * 결과 카드 한 장 — The Pattern의 카드 문법.
 *
 * (기존 주석 첫 세 문단 그대로)
 *
 * 카드는 네 질문에 네 자리로 답한다(스펙 2026-09-08 §3). `meta`는 어디·언제·얼마나
 * 드문가, `plain`은 무슨 일인가, `advice`는 무엇을 하라, `basis`는 왜 이게
 * 나왔나. 별 이름과 각도는 `basis` 세 줄에만 있다 — 겉면은 사람 말만 한다.
 * `basis`의 "하우스"에는 점선 용어를 붙인다. 조립 함수는 문자열만 만들고 감싸는
 * 것은 여기서 한다.
 */
export const ReadingCard: React.FC<
  React.PropsWithChildren<{
    id?: string;
    badge: React.ReactNode;
    meta: React.ReactNode;
    plain: React.ReactNode;
    where: string;
    index?: number;
    defaultOpen?: boolean;
    open?: boolean;
    onToggle?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    advice?: { try: string; hold: string } | null;
    /** 0~1. 느린 별의 통과에만 있다. */
    progress?: { value: number; peaks: number[] } | null;
    basis?: readonly string[] | null;
  }>
> = ({
  id,
  badge,
  meta,
  plain,
  where,
  index = 0,
  defaultOpen = false,
  open,
  onToggle,
  onPointerEnter,
  onPointerLeave,
  advice,
  progress,
  basis,
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
      <p className="pr-8 text-[0.72rem] tracking-[0.05em] text-starlight-dim tabular-nums">{meta}</p>
      {progress && (
        <div
          aria-hidden
          data-progress={Math.round(progress.value * 100)}
          className="relative mt-1.5 h-0.5 w-full max-w-[52ch] bg-gold/25"
        >
          <div className="h-full bg-gold" style={{ width: `${Math.round(progress.value * 100)}%` }} />
          {progress.peaks.map((p, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-soft"
              style={{ left: `${Math.round(p * 100)}%` }}
            />
          ))}
        </div>
      )}
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
            {advice && (
              <div className="border-l-2 border-gold/45 bg-gold/[0.06] py-3 pl-4 pr-3 text-guide">
                <p>
                  <b className="font-normal text-gold-soft">해 볼 것</b> {advice.try}
                </p>
                <p className="mt-1">
                  <b className="font-normal text-gold-soft">미룰 것</b> {advice.hold}
                </p>
              </div>
            )}
            {children}
            {basis && basis.length > 0 && (
              <div className="border-t border-gold/15 pt-3">
                <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">왜 이게 보이나요</p>
                {basis.map((line, i) => (
                  <p key={i} data-basis-line className="mt-1.5 text-meta">
                    {withHouseTerm(line)}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

/** "7하우스(마주 앉는 관계)"의 '하우스'에 점선 용어를 붙인다. 없으면 그대로. */
function withHouseTerm(line: string): React.ReactNode {
  const at = line.indexOf("하우스");
  if (at === -1) return line;
  return (
    <>
      {line.slice(0, at)}
      <Term name="하우스" />
      {line.slice(at + "하우스".length)}
    </>
  );
}
```

다섯 사용처의 `tech=` → `meta=` (내용은 그대로). `src/components/chart/NatalReading.tsx:560`의 지역 변수 `const tech = …`도 `const meta = …`로.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/ui/ReadingCard.tsx src/components/chart/NatalReading.tsx src/components/synastry/SynastryReading.tsx src/components/today/TodayCard.tsx src/components/yearly/YearEventRows.tsx src/test/result-ui.test.ts
git commit -F - <<'EOF'
feat(ui): give ReadingCard the four slots of the new grammar

tech becomes meta, and the card gains advice (top of the fold), progress
(a bar under the meta line for slow passages), and basis (the three-line
"why am I seeing this" at the bottom, with the dotted term on 하우스). The
five call sites only rename the prop here; each screen fills the slots in
its own commit.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 5: 오늘 — `TransitCard`

**Files:**
- Modify: `src/lib/today-reading.ts` — `TodayTransit`에 필드 추가, `describe`가 채운다, `describeTransit` export
- Modify: `src/components/today/TodayCard.tsx:348-366` `TransitCard`; `toneLabel` import 제거
- Test: `src/test/today.test.ts`(데이터), `src/test/result-ui.test.ts`(렌더)

**Interfaces:**
- Consumes: `basisLines` (Task 1), `transitPassage`·`recurrenceLabel`·`passageRange`·`formatPassageDate`·`SLOW_MOVERS` (Task 2), `TRANSIT_ADVICE` from `@/content/atoms/life`
- Produces:
  ```ts
  // TodayTransit에 더해지는 필드
  angle: number;
  house: number | null;
  meta: string;                                        // 머리줄
  plain: string;                                       // life의 첫 문장
  where: string;                                       // life의 둘째 문장. 없으면 basis 첫 줄을 사람 말로 — 아래 참고
  rest: string;                                        // life의 셋째 문장부터. 없으면 ""
  caption: string;                                     // 옛 basis 문자열(pairTheme — headline). 이름만 바뀐다
  advice: { try: string; hold: string };
  basis: [string, string, string];
  progress: { value: number; peaks: number[] } | null;
  export function describeTransit(transit: Transit, natal: Chart, lens: ConcernLens | null, sky: TodaySky): TodayTransit;
  ```
  `TodayTransit.basis`의 **옛 뜻**(테마 — 헤드라인 문자열)은 `caption`으로 이름이 바뀐다. `TodayBody`/`TransitCard` 밖에서 `t.basis`를 쓰는 곳은 없다(grep으로 확인한다).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/today.test.ts` 끝에:

```ts
import { exampleSky } from "@/lib/example-sky";
import { describeTransit } from "@/lib/today-reading";
import { lensFor } from "@/content/atoms/concerns";

describe("오늘 카드의 재료", () => {
  const { chart } = exampleSky();
  const sky = todaySky(new Date("2026-09-07T03:00:00Z"));
  const all = findTransits(sky, chart, 40);

  it("느린 별 — 머리줄에 자리·기간·주기, 진행 막대, 근거 세 줄", () => {
    const slow = all.find((t) => t.transiting === "saturn" || t.transiting === "jupiter")!;
    const t = describeTransit(slow, chart, null, sky);
    expect(t.meta).toMatch(/^.+ · .+ · .+년에 한 번$/);
    expect(t.progress).not.toBeNull();
    expect(t.basis).toHaveLength(3);
    expect(t.basis[0]).toMatch(/^지금 하늘의 .+이 내 .+과 (\d+도를 이룹니다|겹칩니다)\.$/);
    expect(t.advice.try.length).toBeGreaterThan(0);
  });

  it("빠른 별 — 머리줄은 자리 · 기간 말, 막대 없음", () => {
    const moon = all.find((t) => t.transiting === "moon")!;
    const t = describeTransit(moon, chart, null, sky);
    expect(t.meta).toBe(`${t.area} · 반나절`);
    expect(t.progress).toBeNull();
  });

  it("where는 plain에 들어 있지 않은 문장이다", () => {
    for (const raw of all.slice(0, 8)) {
      const t = describeTransit(raw, chart, null, sky);
      expect(t.where.endsWith(".")).toBe(true);
      expect(t.plain.includes(t.where)).toBe(false);
    }
  });

  it("관심사에 걸리면 근거 둘째 줄에 그 말이 붙는다", () => {
    const lens = lensFor("연애운")!;
    const hit = all.find((raw) => describeTransit(raw, chart, lens, sky).inLens);
    expect(hit).toBeDefined();
    expect(describeTransit(hit!, chart, lens, sky).basis[1]).toContain("연애운이 보는 자리입니다.");
  });

  it("금지어가 없다", () => {
    for (const raw of all.slice(0, 8)) {
      const t = describeTransit(raw, chart, null, sky);
      const text = [t.meta, t.plain, t.where, t.rest, ...t.basis].join(" ");
      expect(text).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/today.test.ts`
Expected: FAIL — `describeTransit` is not exported

- [ ] **Step 3: `today-reading.ts`를 고친다**

import에 더한다:
```ts
import { basisLines } from "./basis";
import {
  formatPassageDate,
  passageRange,
  recurrenceLabel,
  SLOW_MOVERS,
  transitPassage,
} from "./passage";
import { afterFirstSentence, firstSentence } from "./text";
```
(`TRANSIT_ADVICE`는 이미 import되어 있다.)

`TodayTransit` 인터페이스에서 `basis: string;`을 지우고 아래를 더한다:
```ts
  angle: number;
  house: number | null;
  /** 머리줄 — 어디 · 언제 · 얼마나 드문가. */
  meta: string;
  /** life의 첫 문장. */
  plain: string;
  /** life의 둘째 문장. 카드 겉면 둘째 줄이다 — 자리 이름을 반복하지 않는다. */
  where: string;
  /** life의 셋째 문장부터. 없으면 "". */
  rest: string;
  /** 두 별의 주제 — "지키려는 구조와 그것을 깨려는 충동 — 서로 도울 수 있습니다". 옛 basis. */
  caption: string;
  advice: { try: string; hold: string };
  basis: [string, string, string];
  progress: { value: number; peaks: number[] } | null;
```

`describe` 함수를 아래로 바꾸고 `export function describeTransit`으로 이름을 바꾼다(`todayBack` 안의 호출도 `describeTransit(transit, natal, lens, sky)`로):

```ts
export function describeTransit(transit: Transit, natal: Chart, lens: ConcernLens | null, sky: TodaySky): TodayTransit {
  const moving = PLANET_BY_KEY[transit.transiting];
  const fixed = PLANET_BY_KEY[transit.natal];
  const meaning = ASPECT_MEANINGS[transit.type.key];
  const frame = TRANSIT_FRAMES[transit.transiting];
  const theme = pairTheme(transit.transiting, transit.natal);
  const span = frame?.span ?? "며칠";
  const area = areaOf(natal, transit.natal);
  const placement = natal.placements.find((p) => p.planet === transit.natal)!;
  const house = placement.house;
  const inLens = lens ? matchesLens(natal, transit.natal, lens) : false;

  const life = fillLife(TRANSIT_LIFE[toneOf(transit.type.harmony)][transit.transiting], area, span);
  const plain = firstSentence(life);
  const tail = afterFirstSentence(life);
  // life는 두 문장이 기본이다. 둘째 문장이 겉면 둘째 줄이 되고, 셋째부터는 접힌다.
  const where = firstSentence(tail) || tail || plain;
  const rest = firstSentence(tail) ? afterFirstSentence(tail) : "";

  const slow = SLOW_MOVERS.includes(transit.transiting);
  const passage = slow ? transitPassage(transit.transiting, placement.longitude, transit.type.angle, sky.julianDay) : null;
  const nextPeak = passage?.peaks.find((p) => p.jd >= sky.julianDay) ?? null;
  const peakLabel = nextPeak ? formatPassageDate(nextPeak, sky.date.year) : null;
  const peakPassed = !!passage && passage.peaks.length > 0 && !nextPeak;

  const range = passage ? passageRange(passage, sky.date.year) : "";
  const every = recurrenceLabel(transit.transiting, transit.type.angle);
  const meta = slow ? [area, range, every].filter(Boolean).join(" · ") : `${area} · ${span}`;

  const progress =
    passage && passage.progress !== null && passage.start && passage.end
      ? {
          value: passage.progress,
          peaks: passage.peaks.map((p) => (p.jd - passage.start!.jd) / (passage.end!.jd - passage.start!.jd)),
        }
      : null;

  return {
    moving,
    fixed,
    aspectKo: transit.type.ko,
    aspectSymbol: transit.type.symbol,
    orb: transit.orb,
    harmony: transit.type.harmony,
    span,
    area,
    life,
    caption: theme ? `${theme} — ${meaning.headline}` : meaning.headline,
    inLens,
    angle: transit.type.angle,
    house,
    meta,
    plain,
    where,
    rest,
    advice: TRANSIT_ADVICE[transit.transiting],
    basis: basisLines({
      tense: "transit",
      a: transit.transiting,
      b: transit.natal,
      angle: transit.type.angle,
      orb: transit.orb,
      house,
      lens: inLens && lens ? lens.label : null,
      peakLabel,
      peakPassed,
    }),
    progress,
  };
}
```

`todayBack` 안: `const transits = found.map((transit) => describeTransit(transit, natal, lens, sky));`

- [ ] **Step 4: `TransitCard`를 고친다**

`src/components/today/TodayCard.tsx:348-366`:

```tsx
function TransitCard({ t, index }: { t: TodayTransit; index: number }) {
  return (
    <ReadingCard
      index={index}
      badge={
        <>
          {t.aspectSymbol}
          {"︎"}
        </>
      }
      meta={t.meta}
      progress={t.progress}
      plain={t.plain}
      where={t.where}
      advice={t.advice}
      basis={t.basis}
    >
      {/* 두 별의 주제 — natal의 각 카드가 theme를 금색으로 두는 것과 같은 자리. */}
      <p className="text-gold-soft">{t.caption}</p>
      {t.rest && <p>{t.rest}</p>}
    </ReadingCard>
  );
}
```

`import { toneLabel } from "@/components/ui/ToneBadge";` 줄을 지운다(이 파일의 유일한 사용처가 사라진다). `firstSentence`·`afterFirstSentence` import도 이 파일에서 더 쓰이지 않으면 지운다(다른 곳에서 쓰면 둔다 — `grep -n "firstSentence" src/components/today/TodayCard.tsx`).

- [ ] **Step 5: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS. `result-ui.test.ts`의 오늘 테스트(탭·`오늘의 각`·quiet)는 그대로 통과해야 한다.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/today-reading.ts src/components/today/TodayCard.tsx src/test/today.test.ts
git commit -F - <<'EOF'
feat(today): the transit card answers four questions in four places

The meta line now says where, when, and how rare; the second line is the
sentence that used to be folded rather than a repeat of the area name; the
advice sits at the top of the fold; and the astrology — planets, angle,
house, orb — lives in three lines at the bottom. Slow movers get their
passage dates and a progress bar from lib/passage.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 6: 한 해 — `YearEventRows`

**Files:**
- Modify: `src/lib/yearly-reading.ts` — `YearReadingEvent`에 `meta`·`plain`·`where`·`rest`·`caption`·`advice`·`basisLines` 추가(옛 `basis` → `caption`)
- Modify: `src/components/yearly/YearEventRows.tsx`
- Test: `src/test/yearly.test.ts`

**Interfaces:**
- Consumes: `basisLines` (Task 1), `recurrenceLabel` (Task 2), `TRANSIT_ADVICE`
- Produces: `YearReadingEvent` 필드 —
  ```ts
  meta: string;              // `${area} · ${dateLine} · ${recurrence}`
  plain: string; where: string; rest: string;
  caption: string;           // 옛 basis (theme — headline)
  advice: { try: string; hold: string };
  basis: [string, string, string];   // 셋째 줄은 "정확한 날들" 갈래 (orb: null)
  ```
  `YearReadingEvent.basis`의 옛 뜻(문자열)은 `caption`이 된다. `headline` 필드는 그대로 둔다(강·머리글이 쓴다).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/yearly.test.ts` 끝에:

```ts
import { exampleSky } from "@/lib/example-sky";
import { yearReading } from "@/lib/yearly-reading";

describe("한 해 카드의 재료", () => {
  const { chart } = exampleSky();
  const events = yearReading(chart, 2026, null).events;

  it("머리줄은 자리 · 날짜 · 주기, 근거 셋째 줄은 정확한 날", () => {
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.meta).toMatch(/년에 한 번$|평생 한 번$/);
      expect(e.meta.startsWith(`${e.area} · `)).toBe(true);
      expect(e.basis).toHaveLength(3);
      expect(e.basis[2]).toMatch(/에 정확히 맞습니다\.$|번에 걸쳐 맞습니다\.$/);
      expect(e.plain.includes(e.where)).toBe(false);
      expect([e.meta, e.plain, e.where, e.rest, ...e.basis].join(" ")).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/yearly.test.ts`
Expected: FAIL — `e.meta` is undefined

- [ ] **Step 3: `yearly-reading.ts`를 고친다**

import에 `import { basisLines } from "./basis";`, `import { recurrenceLabel } from "./passage";`, `import { afterFirstSentence, firstSentence } from "./text";`를 더한다. `TRANSIT_ADVICE`를 `@/content/atoms/life` import에 더한다.

`YearReadingEvent`에서 `basis: string;`을 지우고:
```ts
  meta: string;
  plain: string;
  where: string;
  rest: string;
  /** 두 별의 주제 — 옛 basis. */
  caption: string;
  advice: { try: string; hold: string };
  basis: [string, string, string];
```

`describe(event, natal, lens)` 반환 객체에서 `basis: theme ? … : meaning.headline,` 줄을 지우고, 함수 본문에 더한다:

```ts
  const placement = natal.placements.find((p) => p.planet === event.natal)!;
  const inLens = lens ? matchesLens(natal, event.natal, lens) : false;
  const life = fillLife(TRANSIT_LIFE[toneOf(event.type.harmony)][event.transiting], area, span.replace(/^그 무렵 /, ""));
  const plain = firstSentence(life);
  const tail = afterFirstSentence(life);
  const where = firstSentence(tail) || tail || plain;
  const rest = firstSentence(tail) ? afterFirstSentence(tail) : "";
  const dateLine = event.exact.map(formatYearDate).join(" · ");
  const every = recurrenceLabel(event.transiting, event.type.angle);
```

반환 객체에 (기존 `life:` 계산은 `life` 변수로, `inLens:`는 `inLens` 변수로 바꾸고):
```ts
    meta: [area, dateLine, every].filter(Boolean).join(" · "),
    plain,
    where,
    rest,
    caption: theme ? `${theme} — ${meaning.headline}` : meaning.headline,
    advice: TRANSIT_ADVICE[event.transiting],
    basis: basisLines({
      tense: "transit",
      a: event.transiting,
      b: event.natal,
      angle: event.type.angle,
      orb: null,
      house: placement.house,
      lens: inLens && lens ? lens.label : null,
      exactLabels: event.exact.map(formatYearDate),
    }),
```

`yearly-reading.ts` 안에서 옛 `event.basis`를 읽는 곳이 있으면(`grep -n "\.basis" src/lib/yearly-reading.ts src/components/yearly/*.tsx`) `caption`으로 바꾼다.

- [ ] **Step 4: `YearEventRows.tsx`를 고친다**

`tech`(이제 `meta`) 블록을:
```tsx
            meta={
              <>
                {event.inLens && <span aria-hidden>● </span>}
                {event.meta}
              </>
            }
            plain={
              <>
                {event.plain}
                {event.inLens && <span className="sr-only"> 관심사에 걸리는 날입니다.</span>}
              </>
            }
            where={event.where}
            advice={event.advice}
            basis={event.basis}
          >
            <p className="text-gold-soft">{event.caption}</p>
            {event.rest && <p>{event.rest}</p>}
            <p className="text-meta">
              {event.dateLine} · {event.countLine} 힘이 도는 기간은 {event.span}입니다.
            </p>
          </ReadingCard>
```
`toneLabel`·`afterFirstSentence`·`firstSentence` import를 지운다. `const first = event.exact[0];`가 더 쓰이지 않으면 지운다.

- [ ] **Step 5: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS. `result-ui.test.ts`의 "한 해의 사건 카드"는 `힘이 도는 기간은`을 여전히 찾는다.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/yearly-reading.ts src/components/yearly/YearEventRows.tsx src/test/yearly.test.ts
git commit -F - <<'EOF'
feat(yearly): event cards on the new grammar

Same four slots as /today. The exact dates it already computed become the
third basis line, and the recurrence joins the meta line.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 7: 주간 — `TouchRow`

**Files:**
- Modify: `src/lib/weekly-reading.ts:95-150` — `WeeklyTouch`에 `angle`·`basis` 추가, `text`에서 각 이름 제거, `aspectKo` 제거
- Modify: `src/components/weekly/WeeklyCard.tsx:16-56` `TouchRow`
- Modify: `src/components/weekly/WeekPath.tsx` — `aspectKo`를 쓰는 라벨을 `${angle}°`로 (`grep -n "aspectKo" src/components/weekly/*.tsx`로 찾는다)
- Test: `src/test/weekly.test.ts`

**Interfaces:**
- Consumes: `basisLines` (Task 1)
- Produces: `WeeklyTouch` — `aspectKo: string` 제거, `angle: number`·`basis: [string, string, string]` 추가. `text`는 `"{요일}요일 — 하늘의 {A}이 내 {B}과 {n}도를 이룹니다."` / 0도면 `"… 내 {B}과 겹칩니다."`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/weekly.test.ts` 끝에(기존 테스트가 `aspectKo`나 `육분`을 단언하면 그 단언은 지운다 — `grep -n "aspectKo\|육분\|삼각" src/test/weekly.test.ts`):

```ts
import { exampleSky } from "@/lib/example-sky";
import { weeklyPersonal } from "@/lib/weekly-reading";

describe("주간 — 내 차트에 닿는 각", () => {
  it("줄마다 각도 숫자와 근거 세 줄, 각 이름은 없다", () => {
    const { chart } = exampleSky();
    // 2026-09-07 월요일 0시 KST
    const touches = weeklyPersonal(new Date("2026-09-06T15:00:00Z"), chart);
    expect(touches.length).toBeGreaterThan(0);
    for (const t of touches) {
      expect(t.text).toMatch(/(\d+도를 이룹니다|겹칩니다)\.$/);
      expect(t.basis).toHaveLength(3);
      expect([t.text, t.detail, ...t.basis].join(" ")).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
      expect(typeof t.angle).toBe("number");
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/weekly.test.ts`
Expected: FAIL — `t.basis` is undefined

- [ ] **Step 3: `weekly-reading.ts`를 고친다**

`import { basisLines } from "./basis";` 추가.

`WeeklyTouch`에서 `aspectKo: string;`을 지우고:
```ts
  /** 별길 그림의 라벨에 쓰는 각도 숫자. */
  angle: number;
  basis: [string, string, string];
```

`weeklyPersonal`의 `touch` 생성부를:
```ts
          const fixedKo = planetKo.get(fixed.planet) ?? fixed.planet;
          const meets = type.angle === 0 ? "겹칩니다" : `${type.angle}도를 이룹니다`;
          const touch: WeeklyTouch = {
            date: at.toISOString(),
            dowKo,
            // natal 별 이름 10개는 전부 받침으로 끝나므로 "과"가 항상 맞다.
            text: `${dowKo}요일 — 하늘의 ${moving.ko}이 내 ${fixedKo}과 ${meets}.`,
            movingKo: moving.ko,
            fixedKo,
            angle: type.angle,
            detail: `하늘의 ${moving.ko} — ${TRANSIT_SKY[moving.key]}. 내 ${fixedKo} — ${TRANSIT_SELF[fixed.planet]}. ${TRANSIT_FRAME[type.key]}`,
            basis: basisLines({
              tense: "transit",
              a: moving.key,
              b: fixed.planet,
              angle: type.angle,
              orb,
              house: fixed.house,
            }),
          };
```

`src/components/weekly/WeekPath.tsx`(또는 `aspectKo`를 읽는 파일)에서 `${t.movingKo}–${t.fixedKo} ${t.aspectKo}` 꼴을 `${t.movingKo}–${t.fixedKo} ${t.angle === 0 ? "겹침" : `${t.angle}°`}`로 바꾼다.

- [ ] **Step 4: `TouchRow`를 고친다**

`src/components/weekly/WeeklyCard.tsx:48-52`의 펼침 안을:
```tsx
        <div className="overflow-hidden">
          <div className="max-w-[48ch] break-keep pb-4 pl-6 text-meta leading-relaxed text-starlight-dim">
            <p>{touch.detail}</p>
            <p className="mt-3 font-latin text-eyebrow tracking-[0.2em] text-gold">왜 이게 보이나요</p>
            {touch.basis.map((line, i) => (
              <p key={i} data-basis-line className="mt-1.5">
                {line}
              </p>
            ))}
          </div>
        </div>
```
(주간은 `Term`을 붙이지 않는다 — 카드가 아니라 목록 줄이고, 여기의 `하우스`까지 점선을 달면 한 줄에 점선이 둘이 된다. 스펙 §6 4행의 "같은 세 줄만".)

- [ ] **Step 5: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/weekly-reading.ts src/components/weekly/WeeklyCard.tsx src/components/weekly/WeekPath.tsx src/test/weekly.test.ts
git commit -F - <<'EOF'
feat(weekly): personal touches name the angle and carry the basis

The row text says "60도를 이룹니다" instead of the aspect's Korean name, and
the fold gains the same three basis lines as the cards. TouchRow keeps its
own shape; only the fold changes.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 8: 천궁도 — 각 카드

**Files:**
- Modify: `src/lib/reading.ts:37-47` `ReadingAspect`에 `meta`·`basis` 추가; 만드는 곳에서 채운다(`grep -n "strengthKo" src/lib/reading.ts`)
- Modify: `src/components/chart/NatalReading.tsx:405-427` 각 카드
- Test: `src/test/result-ui.test.ts`

**Interfaces:**
- Consumes: `basisLines` (Task 1), `HOUSE_AREAS`·`PLANET_AREAS`
- Produces: `ReadingAspect.meta: string` (두 별이 앉은 자리의 생활 이름 — `"당신 자신과 첫인상 · 마주 앉는 관계"`, 같으면 하나), `ReadingAspect.basis: [string, string, string]` (natal 시제, `house`는 `b`의 하우스)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/result-ui.test.ts`에:

```ts
describe("천궁도 각 카드", () => {
  it("겉면에 별 표기가 없고 근거 세 줄이 natal 시제다", () => {
    const { chart, reading } = exampleSky();
    expect(reading.aspects.length).toBeGreaterThan(0);
    for (const item of reading.aspects) {
      expect(item.meta).not.toMatch(/오브|육분|삼각|사각|대립|순풍|마찰|합\b/);
      expect(item.basis[0]).toMatch(/^태어날 때 .+ (\d+도였습니다|한자리에 겹쳐 있었습니다)\.$/);
      expect(item.basis[2]).toMatch(/배선입니다\.$/);
    }
    void chart;
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/result-ui.test.ts`
Expected: FAIL — `item.meta` is undefined

- [ ] **Step 3: `reading.ts`를 고친다**

`ReadingAspect`에:
```ts
  /** 머리줄 — 두 별이 앉은 자리의 생활 이름. */
  meta: string;
  basis: [string, string, string];
```

`ReadingAspect`를 만드는 함수(strengthKo를 채우는 그 자리)에서, `chart.placements`로 두 별의 하우스를 찾아:
```ts
  const at = (key: PlanetKey) => chart.placements.find((p) => p.planet === key)!;
  const areaOf = (key: PlanetKey) => {
    const h = at(key).house;
    return h === null ? PLANET_AREAS[key] : HOUSE_AREAS[h];
  };
  const areaA = areaOf(aspect.a);
  const areaB = areaOf(aspect.b);
  const meta = areaA === areaB ? areaA : `${areaA} · ${areaB}`;
  const basis = basisLines({
    tense: "natal",
    a: aspect.a,
    b: aspect.b,
    angle: aspect.type.angle,
    orb: aspect.orb,
    house: at(aspect.b).house,
  });
```
그 함수가 `chart`를 받지 않으면 시그니처에 `chart: Chart`를 더하고 호출부(`assembleReading`)에서 넘긴다. import: `basisLines`, `HOUSE_AREAS`·`PLANET_AREAS`(이미 import돼 있으면 그대로).

- [ ] **Step 4: 각 카드를 고친다**

`NatalReading.tsx:420` 부근:
```tsx
              meta={item.meta}
              plain={item.headline}
              where={firstSentence(item.body)}
              basis={item.basis}
            >
              <p className="text-gold-soft">{item.theme}</p>
              {afterFirstSentence(item.body) && <p>{afterFirstSentence(item.body)}</p>}
            </ReadingCard>
```
`toneLabel` import를 지운다(이 파일의 유일한 사용처였다). `item.strengthKo`는 더 이상 화면에 안 나온다 — 필드는 둔다(`lifework` 등 다른 곳이 쓸 수 있다; `grep -n strengthKo src`로 확인하고 아무도 안 쓰면 지운다).

- [ ] **Step 5: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/reading.ts src/components/chart/NatalReading.tsx src/test/result-ui.test.ts
git commit -F - <<'EOF'
feat(natal): aspect cards drop the notation line for the three-line basis

The meta line names the two life areas the planets sit in; the orb, the
aspect name, and the tone label move into the basis in natal tense.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 9: 궁합 — 만남 카드

**Files:**
- Modify: `src/lib/synastry-reading.ts:99-122` `describe`, `SynastryLine`에 `house`·`basis` 추가; `synastryReading`이 `roomOf`를 `describe`에 넘긴다
- Modify: `src/components/synastry/SynastryReading.tsx:414-434`
- Test: `src/test/synastry.test.ts`

**Interfaces:**
- Consumes: `basisLines` (Task 1); `houseOverlay(mine, theirs)` — 그쪽 별 → 내 하우스(이미 `roomOf`로 계산돼 있다)
- Produces: `SynastryLine.house: number | null` (그쪽 별이 든 내 하우스), `SynastryLine.basis: [string, string, string]` (궁합 시제). `meeting`은 머리줄로 올라간다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/test/synastry.test.ts` 끝에:

```ts
import { exampleMeeting } from "@/lib/example-sky";

describe("궁합 카드의 재료", () => {
  it("근거 세 줄이 궁합 시제고 겉면에 각 이름이 없다", () => {
    const { reading } = exampleMeeting();
    expect(reading.lines.length).toBeGreaterThan(0);
    for (const line of reading.lines) {
      expect(line.basis).toHaveLength(3);
      expect(line.basis[0]).toMatch(/^내 .+이 그쪽 .+과 (\d+도를 이룹니다|겹칩니다)\.$/);
      expect(line.basis[1]).toMatch(/^그쪽 .+(내 \d+하우스\(.+\)에 있습니다|을 맡고 있습니다|를 맡고 있습니다)\.$/);
      expect(line.basis[2]).toMatch(/만남입니다\.$/);
      expect([line.meeting, line.headline, line.body].join(" ")).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/test/synastry.test.ts`
Expected: FAIL — `line.basis` is undefined

- [ ] **Step 3: `synastry-reading.ts`를 고친다**

`import { basisLines } from "./basis";` 추가. `SynastryLine`에:
```ts
  /** 그쪽 별이 든 내 하우스. 내 시각을 모르면 null. */
  house: number | null;
  basis: [string, string, string];
```

`describe(aspect, highlighted)` → `describe(aspect, highlighted, house)`:
```ts
function describe(aspect: CrossAspect, highlighted: boolean, house: number | null): SynastryLine {
  // (기존 본문 그대로, 반환 객체에 두 필드 추가)
    house,
    basis: basisLines({
      tense: "synastry",
      a: aspect.mine,
      b: aspect.theirs,
      angle: aspect.type.angle,
      orb: aspect.orb,
      house,
    }),
```
`synastryReading` 안에서 `describe(…)`를 부르는 곳에 `roomOf.get(aspect.theirs) ?? null`을 세 번째 인자로 넘긴다(`grep -n "describe(" src/lib/synastry-reading.ts`).

- [ ] **Step 4: 카드를 고친다**

`SynastryReading.tsx:414-434`:
```tsx
                meta={
                  <>
                    {line.highlighted && <span aria-hidden>✦ </span>}
                    {line.meeting}
                  </>
                }
                plain={
                  <>
                    {line.headline}
                    {line.highlighted && <span className="sr-only"> 고른 관심사에 걸리는 항목입니다.</span>}
                  </>
                }
                where={firstSentence(line.body)}
                basis={line.basis}
              >
                {afterFirstSentence(line.body) && <p>{afterFirstSentence(line.body)}</p>}
                {line.highlight && (
                  <p className="border-l-2 border-gold/40 pl-4 text-starlight">{line.highlight}</p>
                )}
              </ReadingCard>
```
`toneLabel` import를 지운다. `firstSentence`·`afterFirstSentence`가 import돼 있지 않으면 `@/lib/text`에서 가져온다.

- [ ] **Step 5: 통과를 확인한다**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 0, 모두 PASS. `result-ui.test.ts`의 궁합 테스트(`aria-expanded` 둘 다 있음, 금실 축소판)는 그대로.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/synastry-reading.ts src/components/synastry/SynastryReading.tsx src/test/synastry.test.ts
git commit -F - <<'EOF'
feat(synastry): meeting cards on the new grammar

The meeting phrase becomes the meta line, the first sentence of the body
becomes the second line, and the basis speaks in synastry tense — my planet
to theirs, their planet in my house.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 10: 불변식 둘, 기록, 실측

**Files:**
- Modify: `src/test/result-ui.test.ts` — 카드 HTML을 훑는 불변식 둘
- Modify: `docs/superpowers/records/2026-09-07-result-screens.md`, `docs/todo.md`
- Modify: `byeolsaem-web/src/components/ui/ToneBadge.tsx` — `toneLabel`을 아무도 안 쓰면 지운다(`grep -rn toneLabel src`)

- [ ] **Step 1: 불변식 테스트를 쓴다**

`src/test/result-ui.test.ts`에 헬퍼와 describe:

```ts
/** 카드 하나의 plain·where — ReadingCard가 쓰는 클래스가 유일한 출처다. */
function cardsOf(html: string): { plain: string; where: string; all: string }[] {
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
  return [...html.matchAll(/<article class="reading-card[\s\S]*?<\/article>/g)].map((m) => {
    const card = m[0];
    const plain = card.match(/<p class="mt-0\.5 break-keep font-display[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const where = card.match(/<p class="mt-1 break-keep text-meta[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "";
    return { plain: strip(plain), where: strip(where), all: strip(card) };
  });
}

describe("카드 문법 불변식 — 다섯 화면", () => {
  const when = new Date("2026-09-07T03:00:00Z");
  const screens = (): [string, string][] => {
    const { chart, reading } = exampleSky();
    const { mine, theirs, reading: meet } = exampleMeeting();
    const sky = todaySky(when);
    return [
      ["오늘", renderToStaticMarkup(createElement(TodayBody, { back: todayBack(sky, chart, "연애운"), sky, now: when }))],
      ["한 해", renderToStaticMarkup(createElement(YearEventRows, { year: 2026, events: yearReading(chart, 2026, null).events, openId: null, onToggle: () => {} }))],
      ["천궁도", renderToStaticMarkup(createElement(NatalBody, { chart, reading, now: when }))],
      ["궁합", renderToStaticMarkup(createElement(SynastryBody, { mine, theirs, reading: meet, chosen: null, activeId: null, onPick: () => {}, onActive: () => {} }))],
    ];
  };

  it("where는 plain 안에 글자 그대로 들어 있지 않다", () => {
    for (const [name, html] of screens()) {
      const cards = cardsOf(html);
      expect(cards.length, name).toBeGreaterThan(0);
      for (const c of cards) {
        expect(c.where.length, `${name}: ${c.plain}`).toBeGreaterThan(0);
        expect(c.plain.includes(c.where), `${name}: "${c.where}" ⊂ "${c.plain}"`).toBe(false);
      }
    }
  });

  it("카드 안에 각 이름·결 이름·오차가 없다", () => {
    for (const [name, html] of screens()) {
      for (const c of cardsOf(html)) {
        expect(c.all, name).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
      }
    }
  });
});
```

`NatalBody`는 `src/components/chart/NatalReading.tsx:248`에 `function NatalBody({ chart, reading, now }: { chart: Chart; reading: Reading; now: Date })`로 있고 export돼 있지 않다 — 앞에 `export`를 붙인다. 테스트 파일 import에 `NatalBody`를 더한다(`import { NatalBody, NatalHero } from "@/components/chart/NatalReading";`). 주간은 카드가 아니라(`TouchRow`) 이 불변식 밖이다 — Task 7의 테스트가 같은 금지어를 본다.

- [ ] **Step 2: 실행해 통과를 확인한다**

Run: `npx vitest run src/test/result-ui.test.ts`
Expected: PASS. 실패하면 그 화면의 `where` 선택이 틀린 것이다 — 테스트를 고치지 말고 그 화면 태스크의 `where`를 고친다.

- [ ] **Step 3: 죽은 코드를 치운다**

`grep -rn "toneLabel" src --include=*.ts --include=*.tsx` — `ToneBadge.tsx` 안에서만 나오면 `toneLabel` 함수를 지운다. `ToneBadge` 컴포넌트 자체는 다른 곳이 쓰면 둔다.

- [ ] **Step 4: 기록을 고친다**

`docs/superpowers/records/2026-09-07-result-screens.md`:
- §1의 "**카드의 `where`에는 앞의 줄표를 붙이지 않는다.** 옛 목록은 `— {area}`였다. natal이 세운 표기를 셋이 따른다." 뒤에 한 문장: `2026-09-08부터는 where가 명사가 아니라 문장이다 — 스펙 2026-09-08-reading-card-grammar-design.md.`
- §2 표 끝에 행: `| 카드 문법 (2026-09-08) | 오늘 토성 카드: 머리줄 "{자리} · {기간} · {n}년에 한 번", 막대 data-progress, 접힘 안 "왜 이게 보이나요" 세 줄, 하우스 점선 · 달 카드: 막대 없음 · 카드 다섯 화면에 오차·육분·순풍 없음 |` — 값은 Step 6의 실측으로 채운다.

`docs/todo.md`의 "오늘 화면 구역 제목 셋이 컴포넌트 안에 있다" 항목 아래에: `카드 문법은 2026-09-08에 다시 세웠다(스펙 reading-card-grammar). 구역 제목 셋은 그대로 남아 있다.`

- [ ] **Step 5: 빌드**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과, `out/` 생성

- [ ] **Step 6: 실측**

루트에서 `npx serve byeolsaem-web/out -l 4173`을 띄우고 dev-browser로:
1. `localStorage.setItem("byeolsaem.birth.v1", JSON.stringify({ date: "1995-07-14", time: "09:30", city: "서울특별시 강남구", concern: "연애운" }))` 뒤 `/today/` 새로고침, 카드 뒤집기
2. 390×844와 1280×900에서 잰다: 토성(또는 목성) 카드가 있으면 `[data-progress]`의 값과 폭, 정점 점의 `left`; 접힌 카드 높이(근거는 접힘 안이라 접힌 높이가 이전과 같아야 한다 — 이전 값은 기록 §2에 없으므로 이번 값을 적는다); "더 읽기"를 누른 뒤 "왜 이게 보이나요"와 점선 `하우스` 버튼이 보이는지
3. `/yearly/`·`/natal/`·`/synastry/`(상대 1997-04-19 20:10 부산)에서 카드 하나씩 펼쳐 근거 세 줄과 점선 확인
4. 스크린샷 넷을 기록 §2에 적은 값과 함께 남긴다

- [ ] **Step 7: 커밋**

```bash
git add src/test/result-ui.test.ts src/components/ui/ToneBadge.tsx docs/superpowers/records/2026-09-07-result-screens.md docs/todo.md
git commit -F - <<'EOF'
test: pin the card grammar across the five result screens

Two invariants over the rendered cards: the second line is never a
substring of the first, and no card carries an aspect name, a tone label,
or "오차". The record notes what was measured after the rebuild.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

## 자가 검토

**스펙 대조**
- §3.1 슬롯 — Task 4 ✓ · §3.2 세 줄 규칙 전 갈래 — Task 1 ✓ · §3.3 머리줄 화면별 — Task 5(오늘 둘), 6(한 해), 8(천궁도), 9(궁합) ✓, 주간은 머리줄 없음 ✓ · §3.4 advice — Task 4 슬롯, 5·6에서 채움 ✓ · §4.1~4.4 — Task 2 ✓ · §4.5 useMemo — 오늘·한 해 모두 기존 `useMemo` 안에서 `todayBack`/`yearReading`이 돌므로 추가 작업 없음 ✓ · §5 — Task 3 + Task 4의 `withHouseTerm` ✓ · §6 순서 — Task 5→9 ✓ · §7 테스트 — Task 1·2·5·6·7·8·9·10 ✓ · §8 하지 않는 것 — 아톰 문장 무수정, 빠른 별 날짜 없음, 용어집 7개, TouchRow 유지, 뒷면 상단 무수정 ✓
- 스펙 §3의 예시 `where` "급하게 정한 것은 다시 돌아옵니다"는 아톰 문장을 새로 쓰는 것이라 §8과 부딪힌다. 계획은 **life의 둘째 문장**을 `where`로 쓴다. 스펙 예시가 아니라 스펙 §8이 이긴다.
- 스펙 §3에 없던 것: 옛 `basis` 문자열(테마 — 헤드라인)을 `caption`으로 남긴다. 문장 삭제 0을 지키기 위해서다. natal이 `theme`을 금색으로 두는 자리와 같다.

**플레이스홀더** — 없음. Task 10의 `NatalBody`는 실제 시그니처(`:248`, `{ chart, reading, now }`)를 확인해 적었다.

**타입 일치** — `basisLines` 반환 `[string, string, string]`을 `TodayTransit`·`YearReadingEvent`·`WeeklyTouch`·`ReadingAspect`·`SynastryLine` 모두 같은 타입으로 받고, `ReadingCard.basis`는 `readonly string[] | null`이라 전부 들어간다. `progress`는 `{ value: number; peaks: number[] }`로 Task 4·5에서 같다. `Passage.progress`(number | null)와 카드의 `progress`(객체)는 이름이 같지만 층이 다르다 — Task 5에서 변환한다.
