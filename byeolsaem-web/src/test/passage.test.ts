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
    // |d| <= 10 안, 10 < |d| <= 50 밖(오브 5), 50 < |d| <= 60 다시 안, 그 뒤 밖(10).
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

  it("목표 황경을 한 번만 지나가면 정점도 하나, 그 위치까지 고정한다", () => {
    // natal 0도, 각 0도 — 목표는 0도 하나뿐. d=0과 d=1 사이에서 지나간다(정확히 d=0.5는
    // 피한다 — jd가 항상 정수라 |d|를 그대로 쓰면 목표를 정수 날짜에 정확히 밟아 부호가
    // 애매해진다).
    const lon: LongitudeAt = (_planet, jd) => (Math.round(jd - TODAY) - 0.5) * 0.1;
    const passage = transitPassage("saturn", 0, 0, TODAY, lon)!;
    expect(Math.round(passage.start!.jd - TODAY)).toBe(-29);
    expect(Math.round(passage.end!.jd - TODAY)).toBe(30);
    expect(passage.peaks.length).toBe(1);
    expect(passage.peaks[0].jd).toBe(TODAY + 0.5);
  });

  it("60도(비대칭 각) — natal±각 두 목표를 다 지나가면 정점이 둘이다", () => {
    // d -2..3에서 +60도 목표를, d 98..103에서 -60도 목표를 지나간다. 그 사이는 두
    // 목표 모두에서 멀리 둔다. 목표 하나만 쓰거나 부호 비교가 뒤집혔다면 정점 개수가
    // 2가 아니게 된다.
    const lon: LongitudeAt = (_planet, jd) => {
      const d = Math.round(jd - TODAY);
      if (d >= -2 && d <= 3) return 60 + (d - 0.5);
      if (d >= 98 && d <= 103) return -60 + (d - 100.5);
      return 0;
    };
    const passage = transitPassage("saturn", 0, 60, TODAY, lon)!;
    expect(Math.round(passage.start!.jd - TODAY)).toBe(-2);
    expect(Math.round(passage.end!.jd - TODAY)).toBe(103);
    expect(passage.peaks.length).toBe(2);
    expect(passage.peaks[0].jd).toBe(TODAY + 0.5);
    expect(passage.peaks[1].jd).toBe(TODAY + 100.5);
  });
});

describe("주기", () => {
  it("공전 주기 / 한 바퀴에 오는 횟수", () => {
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
