import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { koreaOffsetHours } from "@/lib/coordinates";
import { computeChart } from "@/lib/chart";

/**
 * 1987·1988년 한국의 서머타임. 그 두 해에 태어난 사람이 기록에 적힌 시각을
 * 그대로 넣으면 시간대가 한 시간 어긋나고, 상승궁이 반 자리쯤 밀린다.
 */
describe("한국 표준시", () => {
  it("서머타임 밖은 언제나 +9", () => {
    expect(koreaOffsetHours("1986-07-01", "12:00")).toBe(9);
    expect(koreaOffsetHours("1987-04-01", "12:00")).toBe(9);
    expect(koreaOffsetHours("1987-11-01", "12:00")).toBe(9);
    expect(koreaOffsetHours("1989-07-01", "12:00")).toBe(9);
    expect(koreaOffsetHours("1995-07-14", "09:30")).toBe(9);
  });

  it("1987년 구간(5월 10일 02시 ~ 10월 11일 03시)은 +10", () => {
    expect(koreaOffsetHours("1987-05-10", "01:59")).toBe(9);
    expect(koreaOffsetHours("1987-05-10", "02:00")).toBe(10);
    expect(koreaOffsetHours("1987-07-01", "12:00")).toBe(10);
    expect(koreaOffsetHours("1987-10-11", "02:59")).toBe(10);
    expect(koreaOffsetHours("1987-10-11", "03:00")).toBe(9);
  });

  it("1988년 구간(5월 8일 02시 ~ 10월 9일 03시)은 +10", () => {
    expect(koreaOffsetHours("1988-05-08", "01:59")).toBe(9);
    expect(koreaOffsetHours("1988-05-08", "02:00")).toBe(10);
    expect(koreaOffsetHours("1988-09-17", "20:30")).toBe(10);
    expect(koreaOffsetHours("1988-10-09", "02:59")).toBe(10);
    expect(koreaOffsetHours("1988-10-09", "03:00")).toBe(9);
  });

  it("시각을 모르면 그날 정오로 판정한다", () => {
    expect(koreaOffsetHours("1987-07-01", null)).toBe(10);
    expect(koreaOffsetHours("1987-05-10", null)).toBe(10); // 정오는 이미 서머타임
    expect(koreaOffsetHours("1987-10-11", null)).toBe(9); // 정오는 이미 끝난 뒤
    expect(koreaOffsetHours("1987-04-01", null)).toBe(9);
  });

  it("서머타임 시각으로 계산한 차트는 +9로 계산한 것과 다르다", () => {
    const moment = {
      date: "1987-07-01",
      time: "05:00",
      latitude: 37.5665,
      longitude: 126.978,
    };
    const corrected = computeChart({
      ...moment,
      timezoneOffsetHours: koreaOffsetHours(moment.date, moment.time),
    });
    const naive = computeChart({ ...moment, timezoneOffsetHours: 9 });
    expect(corrected.ascendant).not.toBe(null);
    // 한 시간이면 상승궁이 약 15도 움직인다 — 반 자리 남짓.
    const gap = Math.abs(corrected.ascendant! - naive.ascendant!);
    expect(gap).toBeGreaterThan(10);
    expect(gap).toBeLessThan(25);
  });
});

/**
 * 보정은 차트를 만드는 자리마다 걸려야 한다. 한 화면만 고정 +9로 남으면 같은
 * 사람의 상승궁이 화면마다 달라진다 — 화면을 다 열어 보기 전에는 안 보인다.
 */
describe("서머타임 보정이 빠진 자리", () => {
  const SOURCE = join(import.meta.dirname, "..", "components");

  function files(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) files(path, found);
      else if (path.endsWith(".ts") || path.endsWith(".tsx")) found.push(path);
    }
    return found;
  }

  it("화면은 고정 오프셋을 직접 넘기지 않는다", () => {
    const offenders = files(SOURCE).filter((path) =>
      readFileSync(path, "utf8").includes("timezoneOffsetHours: KOREA_UTC_OFFSET_HOURS"),
    );
    expect(offenders).toEqual([]);
  });
});
