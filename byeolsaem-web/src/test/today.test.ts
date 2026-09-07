import { describe, expect, it } from "vitest";
import { computeChart } from "@/lib/chart";
import { toJulianDay } from "@/lib/ephemeris";
import { exampleSky } from "@/lib/example-sky";
import { afterFirstSentence } from "@/lib/text";
import { findTransits, noonJulianDay, todaySky } from "@/lib/today";
import { describeTransit, todayBack, todayFront } from "@/lib/today-reading";
import { lensFor } from "@/content/atoms/concerns";
import { fillLife, TRANSIT_LIFE } from "@/content/atoms/life";
import { MOON_PHASE_LINES } from "@/content/atoms/today";
import { MOON_PHASES } from "@/lib/moon";

/**
 * 오늘의 하늘은 공개적으로 확인할 수 있는 값으로 검증한다. 계산이 그럴듯해
 * 보이는 것과 맞는 것은 다르다.
 */

/** 서울에서 태어난 사람 하나. 트랜짓 검사의 기준으로만 쓴다. */
const NATAL = computeChart({
  date: "1994-10-03",
  time: "14:20",
  latitude: 37.5665,
  longitude: 126.978,
  timezoneOffsetHours: 9,
});

describe("오늘의 하늘", () => {
  it("같은 한국 날짜 안에서는 몇 시에 열든 같은 하늘이다", () => {
    // 한국 날짜가 바뀌는 순간은 15:00 UTC다. 아래 셋은 모두 한국 8월 12일이다.
    const justAfterMidnight = noonJulianDay(new Date("2026-08-11T16:00:00Z"));
    const afternoon = noonJulianDay(new Date("2026-08-12T05:30:00Z"));
    const lateNight = noonJulianDay(new Date("2026-08-12T14:00:00Z"));
    expect(afternoon).toBe(justAfterMidnight);
    expect(lateNight).toBe(justAfterMidnight);

    // 그리고 그 값은 8월 12일 한국 정오(= 03:00 UTC)다.
    expect(afternoon).toBeCloseTo(toJulianDay(new Date("2026-08-12T03:00:00Z")), 10);

    // 날짜가 바뀌면 정확히 1이 는다.
    expect(noonJulianDay(new Date("2026-08-12T15:00:00Z")) - afternoon).toBeCloseTo(1, 10);
  });

  it("한국 날짜로 하루를 센다", () => {
    // UTC로는 아직 8월 11일이지만 한국 시간으로는 12일 새벽 1시다.
    const sky = todaySky(new Date("2026-08-11T16:00:00Z"));
    expect(sky.date.month).toBe(8);
    expect(sky.date.day).toBe(12);
  });

  /*
   * 아래 두 검사는 실제로 일어난 사건을 쓴다. 다만 todaySky는 그 순간이 아니라
   * 그 날짜의 한국 정오로 스냅한다(하루 동안 같은 카드여야 하므로). 사건과 정오
   * 사이가 최대 반나절이고 달은 하루에 13도를 가므로, 각도는 몇 도까지 벌어질 수
   * 있다. 그래서 각도 자체보다 **위상 판정**을 본다 — 페이지가 쓰는 것도 그것이다.
   */
  it("2024년 4월 8일 개기일식이 있던 날은 삭이다", () => {
    const sky = todaySky(new Date("2024-04-08T18:17:00Z"));
    const separation = Math.abs(
      ((sky.moon.longitude - sky.sun.longitude + 540) % 360) - 180,
    );
    expect(separation).toBeLessThan(8);
    expect(sky.moon.phase.key).toBe("new");
    expect(sky.moon.illumination).toBeLessThan(0.02);
  });

  it("2025년 3월 14일 개기월식이 있던 날은 보름이다", () => {
    const sky = todaySky(new Date("2025-03-14T06:58:00Z"));
    const opposition = Math.abs(
      ((sky.moon.longitude - sky.sun.longitude + 540) % 360) - 180,
    );
    expect(180 - opposition).toBeLessThan(8);
    expect(sky.moon.phase.key).toBe("full");
    expect(sky.moon.illumination).toBeGreaterThan(0.98);
  });

  it("달은 하루에 12~15도쯤 움직인다", () => {
    const first = todaySky(new Date("2026-08-12T03:00:00Z"));
    const second = todaySky(new Date("2026-08-13T03:00:00Z"));
    const step = ((second.moon.longitude - first.moon.longitude + 360) % 360);
    expect(step).toBeGreaterThan(11);
    expect(step).toBeLessThan(16);
  });

  it("열 개의 별을 모두 담고 하우스는 비운다", () => {
    const sky = todaySky(new Date("2026-08-12T03:00:00Z"));
    expect(sky.placements).toHaveLength(10);
    // 오늘의 하늘에는 태어난 곳이 없으므로 하우스도 없다.
    expect(sky.placements.every((p) => p.house === null)).toBe(true);
  });
});

describe("트랜짓", () => {
  it("세대 행성은 움직이는 쪽에 넣지 않는다", () => {
    const sky = todaySky(new Date("2026-08-12T03:00:00Z"));
    const transits = findTransits(sky, NATAL, 20);
    expect(transits.some((t) => ["uranus", "neptune", "pluto"].includes(t.transiting))).toBe(false);
  });

  it("오차가 작은 것부터 나온다", () => {
    const sky = todaySky(new Date("2026-08-12T03:00:00Z"));
    const transits = findTransits(sky, NATAL, 20);
    for (let i = 1; i < transits.length; i += 1) {
      expect(transits[i - 1].strength).toBeGreaterThanOrEqual(transits[i].strength);
    }
  });

  it("달이 아닌 별의 오차는 3도를 넘지 않는다", () => {
    const sky = todaySky(new Date("2026-08-12T03:00:00Z"));
    for (const t of findTransits(sky, NATAL, 40)) {
      expect(t.orb).toBeLessThanOrEqual(t.transiting === "moon" ? 6 : 3);
    }
  });

  it("하루가 다르면 대체로 다른 하늘이 나온다", () => {
    // 오브를 좁게 잡은 이유가 이것이다. 며칠 내내 같은 목록이면 "오늘"이 아니다.
    const a = todaySky(new Date("2026-08-12T03:00:00Z"));
    const b = todaySky(new Date("2026-08-19T03:00:00Z"));
    const key = (t: { transiting: string; natal: string; type: { key: string } }) =>
      `${t.transiting}-${t.natal}-${t.type.key}`;
    const first = new Set(findTransits(a, NATAL, 4).map(key));
    const second = findTransits(b, NATAL, 4).map(key);
    expect(second.every((k) => first.has(k))).toBe(false);
  });
});

describe("오늘의 카드 조립", () => {
  it("여덟 위상 모두에 문장이 있다", () => {
    for (const phase of MOON_PHASES) {
      expect(MOON_PHASE_LINES[phase.key]).toBeDefined();
      expect(MOON_PHASE_LINES[phase.key].line.length).toBeGreaterThan(20);
    }
  });

  it("앞면은 출생 정보 없이도 만들어진다", () => {
    const front = todayFront(todaySky(new Date("2026-08-12T03:00:00Z")));
    expect(front.dateLine).toBe("8월 12일 수요일");
    expect(front.phaseLine.length).toBeGreaterThan(20);
    expect(front.illumination).toBeGreaterThanOrEqual(0);
    expect(front.illumination).toBeLessThanOrEqual(100);
  });

  it("같은 날 같은 차트면 같은 글이 나온다", () => {
    const sky = todaySky(new Date("2026-08-12T03:00:00Z"));
    expect(JSON.stringify(todayBack(sky, NATAL))).toBe(
      JSON.stringify(todayBack(sky, NATAL)),
    );
  });

  it("트랜짓이 있으면 칩은 세 개를 넘지 않는다", () => {
    const sky = todaySky(new Date("2026-08-12T03:00:00Z"));
    const back = todayBack(sky, NATAL);
    expect(back.chips.length).toBeLessThanOrEqual(3);
    const count = back.lensTransits.length + back.otherTransits.length;
    if (count === 0) expect(back.quiet).not.toBeNull();
    else expect(back.quiet).toBeNull();
  });
});

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
      const text = [t.meta, t.plain, t.where, t.rest, t.caption, ...t.basis].join(" ");
      expect(text).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
    }
  });

  it("TRANSIT_LIFE는 모두 두 문장 이상이다 — where가 plain으로 새지 않는 전제", () => {
    // describeTransit의 where는 life의 둘째 문장이 없을 때만 근거 첫 줄로
    // 대신한다. 이 전제가 깨지면(문장이 하나로 줄면) plain을 그대로 반복하게
    // 되므로, 문장 개수 자체를 여기서 지킨다 — 문구가 아니라 개수만 본다.
    for (const tone of Object.keys(TRANSIT_LIFE) as (keyof typeof TRANSIT_LIFE)[]) {
      for (const planet of Object.keys(TRANSIT_LIFE[tone]) as (keyof (typeof TRANSIT_LIFE)[typeof tone])[]) {
        const life = fillLife(TRANSIT_LIFE[tone][planet], "어떤 자리", "며칠");
        expect(afterFirstSentence(life).length).toBeGreaterThan(0);
      }
    }
  });
});
