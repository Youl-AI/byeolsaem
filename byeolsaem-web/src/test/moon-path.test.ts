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
