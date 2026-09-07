import { describe, expect, it } from "vitest";
import {
  PLANET_TOUCH,
  RESONANCE_BANDS,
  SYNASTRY_ASPECTS,
  SYNASTRY_HIGHLIGHTS,
  resonanceBand,
} from "@/content/atoms/synastry";
import { pairKey } from "@/content/atoms/aspects";
import { CONCERN_LENSES } from "@/content/atoms/concerns";
import { ASPECT_TYPES, angleBetween, computeChart } from "@/lib/chart";
import { exampleMeeting } from "@/lib/example-sky";
import { PLANETS } from "@/lib/planets";
import { crossAspects, houseOverlay, synastry } from "@/lib/synastry";
import { synastryReading } from "@/lib/synastry-reading";

const SEOUL = { latitude: 37.5665, longitude: 126.978, timezoneOffsetHours: 9 };

const A = computeChart({ date: "1994-10-03", time: "14:20", ...SEOUL });
const B = computeChart({ date: "1991-05-18", time: "07:05", ...SEOUL });
/** 같은 순간에 태어난 두 사람. 두 차트가 완전히 겹친다. */
const TWIN = computeChart({ date: "1994-10-03", time: "14:20", ...SEOUL });
/** 태어난 시각을 모르는 사람. 하우스가 없다. */
const TIMELESS = computeChart({ date: "1991-05-18", time: null, ...SEOUL });

describe("두 하늘이 맺는 각도", () => {
  it("찾아낸 각도가 실제로 그 각도다", () => {
    for (const aspect of crossAspects(A, B)) {
      const mine = A.placements.find((p) => p.planet === aspect.mine)!;
      const theirs = B.placements.find((p) => p.planet === aspect.theirs)!;
      const separation = angleBetween(mine.longitude, theirs.longitude);
      expect(Math.abs(separation - aspect.type.angle)).toBeCloseTo(aspect.orb, 8);
      // 태양·달이 끼면 1도를 더 봐준다.
      expect(aspect.orb).toBeLessThanOrEqual(8);
    }
  });

  it("한 쌍은 한 각도에만 걸린다", () => {
    const seen = new Set<string>();
    for (const aspect of crossAspects(A, B)) {
      const key = `${aspect.mine}-${aspect.theirs}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("방향이 있다 — 내 태양이 그쪽 달에 닿는 것과 그 반대는 다른 항목이다", () => {
    const forward = crossAspects(A, B);
    const backward = crossAspects(B, A);
    // 각도의 수는 같지만(같은 쌍을 반대로 세는 것이므로) 각 항목의 주인이 바뀐다.
    expect(backward).toHaveLength(forward.length);
    for (const aspect of forward) {
      expect(
        backward.some(
          (b) =>
            b.mine === aspect.theirs && b.theirs === aspect.mine && b.type.key === aspect.type.key,
        ),
      ).toBe(true);
    }
  });

  it("같은 무리 안에서는 무게가 실린 것부터 나온다", () => {
    // 차례는 두 단계다 — 이름 붙은 조합이 먼저고, 그 안에서 무게순이다.
    const aspects = crossAspects(A, B);
    for (let i = 1; i < aspects.length; i += 1) {
      if (aspects[i - 1].named !== aspects[i].named) continue;
      expect(aspects[i - 1].strength * aspects[i - 1].weight).toBeGreaterThanOrEqual(
        aspects[i].strength * aspects[i].weight,
      );
    }
  });

  it("세대 행성끼리의 만남은 무게가 가장 낮다", () => {
    const aspects = crossAspects(A, B);
    const generational = aspects.filter(
      (a) =>
        ["uranus", "neptune", "pluto"].includes(a.mine) &&
        ["uranus", "neptune", "pluto"].includes(a.theirs),
    );
    for (const aspect of generational) expect(aspect.weight).toBeLessThanOrEqual(0.05);
  });
});

describe("앞에 세우는 숫자", () => {
  it("이름 붙은 조합의 수가 목록에서 센 것과 같다", () => {
    const result = synastry(A, B);
    const counted = result.aspects.filter(
      (a) => SYNASTRY_HIGHLIGHTS[pairKey(a.mine, a.theirs)] !== undefined,
    ).length;
    expect(result.named).toBe(counted);
  });

  it("이름 붙은 조합이 목록 앞으로 온다", () => {
    // 화면에는 열 개만 세운다. 무게순으로만 자르면 앞의 숫자가 세는 것들이
    // 목록 밖으로 밀려나 "세어 보면 맞는다"는 약속이 깨진다.
    const aspects = crossAspects(A, B);
    const lastNamed = aspects.map((a) => a.named).lastIndexOf(true);
    const firstUnnamed = aspects.map((a) => a.named).indexOf(false);
    if (lastNamed >= 0 && firstUnnamed >= 0) expect(firstUnnamed).toBeGreaterThan(lastNamed);
  });

  it("같은 순간에 태어난 두 사람은 열 개의 별이 모두 겹친다", () => {
    const result = synastry(A, TWIN);
    const conjunctions = result.aspects.filter(
      (a) => a.mine === a.theirs && a.type.key === "conjunction",
    );
    expect(conjunctions).toHaveLength(PLANETS.length);
    for (const aspect of conjunctions) expect(aspect.orb).toBeCloseTo(0, 9);
    expect(result.tightest).toBeCloseTo(0, 9);
  });

  it("열두 조합을 넘길 수 없다는 뜻은 아니다", () => {
    // 조합은 열둘이지만 방향이 있으므로(내 태양 × 그쪽 달, 내 달 × 그쪽 태양)
    // 같은 조합이 두 번 맺힐 수 있다. 화면의 "/ 12"는 조합의 가짓수를 말한다.
    expect(Object.keys(SYNASTRY_HIGHLIGHTS)).toHaveLength(12);
    expect(synastry(A, B).named).toBeGreaterThanOrEqual(0);
  });

  it("흐름·마찰·겹침이 전체를 나눠 갖는다", () => {
    const result = synastry(A, B);
    expect(result.flowing + result.friction + result.overlapping).toBe(result.aspects.length);
  });

  it("어느 값에도 구간 설명이 붙는다", () => {
    for (let value = 0; value <= 24; value += 1) {
      const band = resonanceBand(value);
      expect(band.line.length).toBeGreaterThan(20);
      expect(value).toBeGreaterThanOrEqual(band.min);
    }
    expect(RESONANCE_BANDS[RESONANCE_BANDS.length - 1].min).toBe(0);
  });
});

describe("궁합 아톰", () => {
  it("다섯 각도 모두에 두 사람용 문장이 있다", () => {
    for (const type of ASPECT_TYPES) {
      expect(SYNASTRY_ASPECTS[type.key].headline.length).toBeGreaterThan(4);
      expect(SYNASTRY_ASPECTS[type.key].body.length).toBeGreaterThan(40);
    }
  });

  it("열 개의 별 모두에 관계에서 맡는 자리가 있다", () => {
    for (const planet of PLANETS) {
      expect(PLANET_TOUCH[planet.key].length).toBeGreaterThan(4);
    }
  });
});

describe("궁합 조립", () => {
  it("같은 두 사람이면 같은 글이 나온다", () => {
    expect(JSON.stringify(synastryReading(A, B))).toBe(JSON.stringify(synastryReading(A, B)));
  });

  it("항목마다 만나는 자리와 풀이가 채워진다", () => {
    for (const line of synastryReading(A, B).lines) {
      expect(line.meeting.startsWith("내 ")).toBe(true);
      expect(line.meeting).toContain("그쪽의");
      // '와(과)'로 도망가지 않는다.
      expect(line.meeting).not.toContain("(과)");
      expect(line.body.length).toBeGreaterThan(40);
    }
  });

  it("이름이 붙은 조합에는 그 조합만의 한 줄이 붙는다", () => {
    const twins = synastryReading(A, TWIN);
    // 같은 순간에 태어났으므로 태양-태양, 달-달이 모두 겹쳐 있다.
    const sunSun = twins.lines.find((l) => pairKey(l.mine.key, l.theirs.key) === "sun-sun");
    expect(sunSun?.highlight).not.toBeNull();
  });

  it("앞에 세운 숫자를 목록에서 그대로 셀 수 있다", () => {
    // 화면이 그렇게 약속한다. 열 개에서 자르되, 이름 붙은 것이 열 개를 넘으면
    // 자르는 자리를 뒤로 미룬다.
    for (const pair of [
      [A, B],
      [A, TWIN],
      [B, A],
    ] as const) {
      const reading = synastryReading(pair[0], pair[1]);
      const inList = reading.lines.filter((line) => line.highlight !== null).length;
      expect(inList).toBe(reading.named);
      expect(reading.lines.length).toBeGreaterThanOrEqual(Math.min(10, reading.total));
      expect(reading.chips.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("하우스 오버레이", () => {
  it("상대의 열 개 별이 모두 내 어느 방엔가 든다", () => {
    const overlay = houseOverlay(A, B);
    expect(overlay).toHaveLength(PLANETS.length);
    for (const entry of overlay) {
      expect(entry.house).toBeGreaterThanOrEqual(1);
      expect(entry.house).toBeLessThanOrEqual(12);
    }
  });

  it("방을 정하는 것은 내 차트다 — 상대의 시각은 없어도 된다", () => {
    expect(houseOverlay(A, TIMELESS)).toHaveLength(PLANETS.length);
  });

  it("내 시각을 모르면 방이 아예 없다", () => {
    // 그럴듯한 방 번호를 채워 넣는 것보다 없다고 말하는 편이 낫다.
    expect(houseOverlay(TIMELESS, A)).toEqual([]);
  });

  it("같은 순간에 태어났으면 상대의 별이 내 별과 같은 방에 든다", () => {
    const overlay = houseOverlay(A, TWIN);
    for (const entry of overlay) {
      const own = A.placements.find((p) => p.planet === entry.planet)!;
      expect(entry.house).toBe(own.house);
    }
  });
});

describe("관심사 렌즈", () => {
  it("재물운은 2하우스와 8하우스를 본다", () => {
    const lens = synastryReading(A, B, "재물운").lens!;
    expect(lens.label).toBe("재물운");
    expect(lens.rooms.map((r) => r.number)).toEqual([2, 8]);
    expect(lens.noHouses).toBeNull();
  });

  it("관심사를 고르지 않으면 렌즈도 강조도 없다", () => {
    const reading = synastryReading(A, B);
    expect(reading.lens).toBeNull();
    expect(reading.lines.every((line) => !line.highlighted)).toBe(true);
  });

  it("목록에 없는 이름은 무시한다", () => {
    expect(synastryReading(A, B, "그런운").lens).toBeNull();
  });

  it("걸리는 것이 목록 앞으로 온다", () => {
    const lines = synastryReading(A, B, "연애운").lines;
    const lastHighlighted = lines.map((l) => l.highlighted).lastIndexOf(true);
    const firstPlain = lines.map((l) => l.highlighted).indexOf(false);
    if (lastHighlighted >= 0 && firstPlain >= 0) {
      expect(firstPlain).toBeGreaterThan(lastHighlighted);
    }
  });

  it("관심사를 바꿔도 이름 붙은 조합은 하나도 밀려나지 않는다", () => {
    // 앞에 세운 숫자가 그것을 센 값이다. 차례가 바뀌어도 개수는 그대로여야 한다.
    for (const concern of CONCERN_LENSES.map((l) => l.label)) {
      const reading = synastryReading(A, B, concern);
      const inList = reading.lines.filter((line) => line.highlight !== null).length;
      expect(inList).toBe(reading.named);
    }
  });

  it("내 시각을 모르면 방 대신 왜 없는지를 말한다", () => {
    const lens = synastryReading(TIMELESS, A, "재물운").lens!;
    expect(lens.rooms).toEqual([]);
    expect(lens.noHouses).not.toBeNull();
  });

  it("상대가 시각을 모르면 그 사실을 적는다", () => {
    // 방을 정하는 것은 내 차트지만, 상대의 달은 하루에 13도를 가므로 방 하나를
    // 통째로 건널 수 있다.
    const lens = synastryReading(A, TIMELESS, "재물운").lens!;
    expect(lens.partnerTimeUnknown).not.toBeNull();
    expect(synastryReading(A, B, "재물운").lens!.partnerTimeUnknown).toBeNull();
  });

  it("일곱 관심사 모두에 방과 별이 정의돼 있다", () => {
    for (const lens of CONCERN_LENSES) {
      const view = synastryReading(A, B, lens.label).lens!;
      expect(view.rooms.length).toBe(lens.houses.length);
      for (const room of view.rooms) {
        expect(room.ko.length).toBeGreaterThan(1);
        expect(room.domain.length).toBeGreaterThan(3);
      }
    }
  });

  it("같은 두 사람에 같은 관심사면 같은 글이 나온다", () => {
    expect(JSON.stringify(synastryReading(A, B, "직업운"))).toBe(
      JSON.stringify(synastryReading(A, B, "직업운")),
    );
  });
});

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
