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
