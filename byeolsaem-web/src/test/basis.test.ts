import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { angleLabel, basisLines } from "@/lib/basis";

const base = { tense: "transit" as const, a: "saturn" as const, b: "uranus" as const, angle: 60, orb: 0.3, house: 7 };

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      collectSourceFiles(path, found);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(path);
    }
  }
  return found;
}

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

describe("각 라벨 — angleLabel", () => {
  it("0도는 겹침, 그 외는 숫자+도", () => {
    expect(angleLabel(0)).toBe("겹침");
    expect(angleLabel(60)).toBe("60도");
  });

  it("소스 트리 어디에도 손으로 만든 각===0?겹침 삼항연산자가 남아 있지 않다", () => {
    const root = join(import.meta.dirname, "..");
    const offenders: string[] = [];
    for (const path of collectSourceFiles(root)) {
      if (path.endsWith("basis.ts")) continue; // angleLabel 자신의 정의
      const text = readFileSync(path, "utf8");
      if (/===\s*0\s*\?\s*"겹침"/.test(text)) offenders.push(path);
    }
    expect(offenders, offenders.join(", ")).toEqual([]);
  });
});
