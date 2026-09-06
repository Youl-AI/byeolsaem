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
