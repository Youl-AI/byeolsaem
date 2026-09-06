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
