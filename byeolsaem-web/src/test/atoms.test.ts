import { describe, expect, it } from "vitest";
import {
  ASPECT_MEANINGS,
  PAIR_READINGS,
  PLANET_PAIR_THEMES,
  pairKey,
  pairTheme,
  modeOf,
  type AspectMode,
} from "@/content/atoms/aspects";
import { ASCENDANT_ATOMS, MIDHEAVEN_ATOMS } from "@/content/atoms/ascendant";
import { ASC_FACES, SIGN_FACES } from "@/content/atoms/life";
import { CONCERN_LENSES, lensFor } from "@/content/atoms/concerns";
import { HOUSES } from "@/content/atoms/houses";
import { PLANET_IN_HOUSE } from "@/content/atoms/planet-in-house";
import { PLANET_IN_SIGN } from "@/content/atoms/planet-in-sign";
import { ASPECT_TYPES, computeChart, type BirthMoment } from "@/lib/chart";
import { PLANETS, TIER_RANK } from "@/lib/planets";
import { firstSentence } from "@/lib/text";
import { EXAMPLE_BIRTH, EXAMPLE_PARTNER_BIRTH, exampleMeeting, exampleSky } from "@/lib/example-sky";
import { assembleReading, describeElements, strengthLabel, tierWeight } from "@/lib/reading";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

const SIGN_KEYS = ZODIAC_SIGNS.map((s) => s.key);

describe("아톰 DB — 빈칸이 없어야 한다", () => {
  /**
   * 조립기는 아톰이 없으면 undefined를 그대로 화면에 내보낸다. 한 칸이라도
   * 비면 어떤 사람의 결과에는 빈 자리가 뜬다는 뜻이므로, 여기서 전수로 센다.
   */
  it("행성 × 별자리가 120칸 모두 차 있다", () => {
    let filled = 0;
    for (const planet of PLANETS) {
      for (const key of SIGN_KEYS) {
        const atom = PLANET_IN_SIGN[planet.key]?.[key];
        expect(atom, `${planet.ko} × ${key}`).toBeTruthy();
        expect(atom.length, `${planet.ko} × ${key}`).toBeGreaterThan(15);
        filled += 1;
      }
    }
    expect(filled).toBe(120);
  });

  it("행성 × 하우스가 120칸 모두 차 있다", () => {
    let filled = 0;
    for (const planet of PLANETS) {
      for (let house = 1; house <= 12; house += 1) {
        const atom = PLANET_IN_HOUSE[planet.key]?.[house];
        expect(atom, `${planet.ko} × ${house}하우스`).toBeTruthy();
        expect(atom.length, `${planet.ko} × ${house}하우스`).toBeGreaterThan(15);
        filled += 1;
      }
    }
    expect(filled).toBe(120);
  });

  it("상승궁과 중천 아톰이 열두 자리를 채운다", () => {
    for (const key of SIGN_KEYS) {
      expect(ASCENDANT_ATOMS[key], key).toBeTruthy();
      expect(MIDHEAVEN_ATOMS[key], key).toBeTruthy();
    }
    expect(Object.keys(ASCENDANT_ATOMS)).toHaveLength(12);
    expect(Object.keys(MIDHEAVEN_ATOMS)).toHaveLength(12);
  });

  /**
   * 상승궁 카드의 첫 줄 "남들이 처음 보는 나는 ___ 사람"의 빈칸.
   * 태양 카드(SIGN_FACES.out)와 같은 자리일 때 두 카드가 같은 말을 하면
   * 안 되므로 문자열이 겹치지 않는지도 본다.
   */
  it("ASC_FACES가 열두 자리를 채우고 태양 얼굴과 겹치지 않는다", () => {
    for (const key of SIGN_KEYS) {
      expect(ASC_FACES[key], key).toBeTruthy();
      expect(ASC_FACES[key].length, key).toBeGreaterThan(3);
      expect(ASC_FACES[key], key).not.toBe(SIGN_FACES[key].out);
    }
    expect(Object.keys(ASC_FACES)).toHaveLength(12);
  });

  it("하우스가 1번부터 12번까지 순서대로 있다", () => {
    expect(HOUSES.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const house of HOUSES) {
      expect(house.domain.length, `${house.number}하우스`).toBeGreaterThan(5);
      expect(house.body.length, `${house.number}하우스`).toBeGreaterThan(40);
    }
  });

  it("어스펙트 다섯 종류가 모두 뜻을 갖는다", () => {
    for (const type of ASPECT_TYPES) {
      expect(ASPECT_MEANINGS[type.key], type.ko).toBeTruthy();
      expect(ASPECT_MEANINGS[type.key].body.length).toBeGreaterThan(40);
    }
  });

  it("각도마다 nuance 꼬리 한 줄이 있다", () => {
    for (const type of ASPECT_TYPES) {
      const { nuance } = ASPECT_MEANINGS[type.key];
      expect(nuance, type.ko).toBeTruthy();
      expect(nuance.length, type.ko).toBeGreaterThan(15);
      expect(nuance.endsWith("."), type.ko).toBe(true);
    }
  });

  it("modeOf가 다섯 각도를 세 모드로 접는다", () => {
    expect(modeOf("conjunction")).toBe("conjunction");
    expect(modeOf("sextile")).toBe("flowing");
    expect(modeOf("trine")).toBe("flowing");
    expect(modeOf("square")).toBe("friction");
    expect(modeOf("opposition")).toBe("friction");
  });

  /**
   * 본문의 주인인 쌍 × 모드 표. 한 칸이라도 비면 그 조합을 가진 사람의 화면에
   * undefined가 뜬다. 길이 하한은 라벨을 되읽는 한 줄짜리가 본문 행세를 하는
   * 것을 막는다.
   */
  it("PAIR_READINGS가 45쌍 × 3모드 = 135칸 모두 차 있다", () => {
    const modes: AspectMode[] = ["conjunction", "flowing", "friction"];
    let filled = 0;
    for (const key of Object.keys(PLANET_PAIR_THEMES)) {
      const entry = PAIR_READINGS[key];
      expect(entry, key).toBeTruthy();
      for (const mode of modes) {
        expect(entry[mode], `${key}/${mode}`).toBeTruthy();
        expect(entry[mode].length, `${key}/${mode}`).toBeGreaterThan(50);
        filled += 1;
      }
    }
    expect(filled).toBe(135);
  });

  /**
   * 기하 어휘 금지(스펙 §7-2). 기하는 headline과 심볼이 이미 말하므로, 본문에
   * 다시 나오면 커뮤니티가 지적한 "용어 설명" 느낌으로 되돌아간다.
   */
  it("PAIR_READINGS 본문에 기하 어휘가 없다", () => {
    const forbidden = ["마주 보", "밀어내", "밀어냅", "반대편", "각도", "어스펙트", "배치", "자리입니다"];
    for (const [key, entry] of Object.entries(PAIR_READINGS)) {
      for (const [mode, paragraph] of Object.entries(entry)) {
        for (const word of forbidden) {
          expect(paragraph.includes(word), `${key}/${mode}: "${word}"`).toBe(false);
        }
      }
    }
  });

  /**
   * 첫 문장은 "다."로 끝나는 완결 서술(스펙 §7-1). 평생의 과제가 firstSentence로
   * 이 문장만 떼어 쓰므로, 어기면 그 화면의 문장이 중간에서 끊긴다.
   */
  it("PAIR_READINGS의 모든 문단이 완결 문장으로 시작한다", () => {
    for (const [key, entry] of Object.entries(PAIR_READINGS)) {
      for (const [mode, paragraph] of Object.entries(entry)) {
        expect(paragraph.indexOf("다."), `${key}/${mode}`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * 열 개의 별에서 나오는 쌍은 45개다. 하나라도 빠지면 그 조합을 가진 사람의
   * 어스펙트 한 줄이 통째로 사라진다.
   */
  it("행성 쌍 45개가 모두 있다", () => {
    const expected = new Set<string>();
    for (let i = 0; i < PLANETS.length; i += 1) {
      for (let j = i + 1; j < PLANETS.length; j += 1) {
        expected.add(pairKey(PLANETS[i].key, PLANETS[j].key));
      }
    }
    expect(expected.size).toBe(45);
    for (const key of expected) {
      expect(PLANET_PAIR_THEMES[key], key).toBeTruthy();
    }
    expect(Object.keys(PLANET_PAIR_THEMES)).toHaveLength(45);
  });

  it("행성 쌍의 키는 순서를 바꿔도 같다", () => {
    expect(pairKey("moon", "sun")).toBe("sun-moon");
    expect(pairTheme("pluto", "venus")).toBe(pairTheme("venus", "pluto"));
  });

  /** 히어로의 관심사 목록과 렌즈가 어긋나면 고른 값이 조용히 무시된다. */
  it("히어로가 내놓는 관심사 일곱 개에 모두 렌즈가 있다", () => {
    const fromHero = ["재물운", "연애운", "직업운", "학업운", "건강운", "대인운", "이동운"];
    for (const label of fromHero) {
      expect(lensFor(label), label).toBeDefined();
    }
    expect(CONCERN_LENSES).toHaveLength(fromHero.length);
    for (const lens of CONCERN_LENSES) {
      expect(lens.houses.length, lens.label).toBeGreaterThan(0);
      expect(lens.planets.length, lens.label).toBeGreaterThan(0);
      for (const house of lens.houses) {
        expect(house).toBeGreaterThanOrEqual(1);
        expect(house).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("조립", () => {
  const moment: BirthMoment = {
    date: "1999-03-21",
    time: "09:30",
    latitude: 37.5665,
    longitude: 126.978,
    timezoneOffsetHours: 9,
  };

  it("모든 자리에 별자리 문장과 하우스 문장이 붙는다", () => {
    const reading = assembleReading(computeChart(moment), "재물운");
    expect(reading.placements).toHaveLength(10);
    for (const item of reading.placements) {
      expect(item.inSign, item.planet.ko).toBeTruthy();
      expect(item.inHouse, item.planet.ko).toBeTruthy();
      expect(item.house, item.planet.ko).not.toBeNull();
    }
    expect(reading.core.ascendant).not.toBeNull();
    expect(reading.core.midheaven).not.toBeNull();
  });

  it("관심사에 걸린 자리가 앞에 온다", () => {
    const reading = assembleReading(computeChart(moment), "연애운");
    expect(reading.lens?.key).toBe("love");
    const firstUnhighlighted = reading.placements.findIndex((p) => !p.highlighted);
    const lastHighlighted = reading.placements.map((p) => p.highlighted).lastIndexOf(true);
    expect(lastHighlighted).toBeLessThan(firstUnhighlighted);
  });

  it("행성 목록은 개인 → 사회 → 세대 순으로 선다", () => {
    // 렌즈 없이 조립하면 highlighted가 전부 false라 tier만이 순서를 정한다.
    const reading = assembleReading(computeChart(moment), null);
    const ranks = reading.placements.map((p) => TIER_RANK[p.planet.tier]);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i], `${reading.placements[i].planet.ko}의 자리`).toBeGreaterThanOrEqual(
        ranks[i - 1],
      );
    }
  });

  it("tier 배정이 스펙 §3과 같다", () => {
    const byTier = (tier: string) =>
      PLANETS.filter((p) => p.tier === tier).map((p) => p.key);
    expect(byTier("personal")).toEqual(["sun", "moon", "mercury", "venus", "mars"]);
    expect(byTier("social")).toEqual(["jupiter", "saturn"]);
    expect(byTier("generational")).toEqual(["uranus", "neptune", "pluto"]);
  });

  it("시각을 모르면 하우스 문장을 붙이지 않는다", () => {
    const reading = assembleReading(computeChart({ ...moment, time: null }), "직업운");
    expect(reading.timeUnknown).toBe(true);
    expect(reading.core.ascendant).toBeNull();
    for (const item of reading.placements) {
      expect(item.inHouse, item.planet.ko).toBeNull();
      expect(item.house, item.planet.ko).toBeNull();
    }
  });

  it("어스펙트마다 두 별의 주제와 각도의 뜻이 함께 붙는다", () => {
    const reading = assembleReading(computeChart(moment));
    expect(reading.aspects.length).toBeGreaterThan(0);
    expect(reading.aspects.length).toBeLessThanOrEqual(6);
    for (const item of reading.aspects) {
      expect(item.theme).toBeTruthy();
      expect(item.headline).toBeTruthy();
      expect(item.body.length).toBeGreaterThan(40);
    }
  });

  it("같은 입력이면 같은 글이 나온다", () => {
    const a = assembleReading(computeChart(moment), "재물운");
    const b = assembleReading(computeChart(moment), "재물운");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("원소 분포를 한 문장으로 말한다", () => {
    expect(describeElements([{ element: "불", count: 6 }, { element: "물", count: 4 }]))
      .toContain("6개가 불에 몰려");
    expect(
      describeElements([
        { element: "불", count: 3 },
        { element: "흙", count: 3 },
        { element: "공기", count: 2 },
        { element: "물", count: 2 },
      ]),
    ).toContain("네 원소가 모두 채워져");
  });

  it("세기 구간이 스펙 §4의 경계에서 갈린다", () => {
    expect(strengthLabel(0.95)).toBe("거의 정확");
    expect(strengthLabel(0.8)).toBe("거의 정확");
    expect(strengthLabel(0.79)).toBe("뚜렷");
    expect(strengthLabel(0.55)).toBe("뚜렷");
    expect(strengthLabel(0.54)).toBe("넓게 걸침");
  });

  it("tierWeight는 순서에 대칭이고 스펙 §3의 값을 낸다", () => {
    expect(tierWeight("personal", "personal")).toBe(1.0);
    expect(tierWeight("personal", "social")).toBe(0.85);
    expect(tierWeight("social", "personal")).toBe(0.85);
    expect(tierWeight("personal", "generational")).toBe(0.7);
    expect(tierWeight("social", "social")).toBe(0.5);
    expect(tierWeight("generational", "social")).toBe(0.35);
    expect(tierWeight("generational", "generational")).toBe(0.15);
  });

  it("개인이 낀 각도가 세대끼리의 각도보다 앞에 선다", () => {
    // 1995-07-14 09:30 서울 — 세대 각도(토성 육분 해왕성, 오브 0.3)가
    // 오브로는 1등이지만 가중치가 끌어내려야 한다.
    const chart = computeChart({
      date: "1995-07-14", time: "09:30",
      latitude: 37.5, longitude: 127.0, timezoneOffsetHours: 9,
    });
    const reading = assembleReading(chart, null);
    const isPersonalPair = reading.aspects.map(
      (x) => x.a.tier === "personal" || x.b.tier === "personal",
    );
    expect(isPersonalPair[0]).toBe(true);
    const firstNonPersonal = isPersonalPair.indexOf(false);
    if (firstNonPersonal !== -1) {
      expect(isPersonalPair.lastIndexOf(true)).toBeLessThan(firstNonPersonal);
    }
  });

  it("aspectLimit은 정렬된 전체 목록의 앞부분을 자른다 — slice가 sort보다 먼저 오면 깨진다", () => {
    const chart = computeChart({
      date: "1995-07-14", time: "09:30",
      latitude: 37.5, longitude: 127.0, timezoneOffsetHours: 9,
    });
    const key = (x: { a: { key: string }; b: { key: string } }) => `${x.a.key}-${x.b.key}`;
    const six = assembleReading(chart, null, 6).aspects.map(key);
    const ten = assembleReading(chart, null, 10).aspects.map(key);
    expect(six).toEqual(ten.slice(0, 6));
  });

  it("어스펙트 본문은 쌍의 문단으로 시작하고 각도의 nuance를 품는다", () => {
    const chart = computeChart({
      date: "1995-07-14", time: "09:30",
      latitude: 37.5, longitude: 127.0, timezoneOffsetHours: 9,
    });
    const reading = assembleReading(chart, null, 10);
    for (const item of reading.aspects) {
      const paragraph = PAIR_READINGS[pairKey(item.a.key, item.b.key)][modeOf(item.aspect.type.key)];
      expect(item.body.startsWith(paragraph), `${item.a.ko}-${item.b.ko}`).toBe(true);
      expect(
        item.body.includes(ASPECT_MEANINGS[item.aspect.type.key].nuance),
        `${item.a.ko}-${item.b.ko}`,
      ).toBe(true);
    }
  });

  /**
   * 예시 하늘(/natal의 정보 없음 화면)이 반쪽으로 렌더되면 안 된다 — 예시가
   * 결과물의 미리보기 역할이므로, 보여주기로 한 네 조각이 전부 있어야 한다.
   * 라벨 문구와 계산 입력이 어긋나는 것도 여기서 잡는다.
   */
  it("예시 하늘은 네 조각을 전부 갖춘다", () => {
    const { reading } = exampleSky();
    expect(reading.oneLiner).toBeTruthy();
    expect(reading.lifework).not.toBeNull();
    expect(reading.core.ascendant).not.toBeNull();
    expect(reading.aspects.length).toBeGreaterThan(0);
    expect(reading.timeUnknown).toBe(false);
    // 화면이 밝히는 문구 ↔ 실제 계산 입력
    expect(EXAMPLE_BIRTH.label).toContain("1995년 7월 14일");
    expect(EXAMPLE_BIRTH.label).toContain("9시 30분");
    expect(EXAMPLE_BIRTH.date).toBe("1995-07-14");
    expect(EXAMPLE_BIRTH.time).toBe("09:30");
  });

  /**
   * 예시 궁합(/synastry의 정보 없음 화면)도 마찬가지다 — 보여주기로 한 세 조각
   * (한 줄, 해 볼 것, 이름 붙은 만남)이 이 고정 커플에서 실제로 나와야 한다.
   * 계산이 바뀌어 어느 하나가 사라지면 화면이 반쪽이 되므로 여기서 잡는다.
   */
  it("예시 궁합은 세 조각을 전부 갖춘다", () => {
    const { reading } = exampleMeeting();
    expect(reading.oneLiner).not.toBeNull();
    expect(reading.advice).not.toBeNull();
    expect(reading.named).toBeGreaterThan(0);
    expect(reading.lines.some((line) => line.highlight)).toBe(true);
    expect(reading.empty).toBeNull();
    expect(EXAMPLE_PARTNER_BIRTH.label).toContain("1997년 4월 19일");
    expect(EXAMPLE_PARTNER_BIRTH.date).toBe("1997-04-19");
  });

  it("평생의 과제는 마찰 문단의 첫 문장으로 시작한다", () => {
    // 1995-07-14 차트에는 화성 대립 토성 마찰이 확실히 있다(astronomy.test.ts와 같은 근거).
    const chart = computeChart({
      date: "1995-07-14", time: "09:30",
      latitude: 37.5, longitude: 127.0, timezoneOffsetHours: 9,
    });
    const reading = assembleReading(chart, null);
    const friction = reading.aspects.find((a) => a.aspect.type.harmony < 0);
    expect(friction).toBeTruthy();
    expect(reading.lifework).toBeTruthy();
    expect(reading.lifework!.text.startsWith(firstSentence(friction!.body))).toBe(true);
    // 라벨 되읽기 시절의 흔적이 남아 있으면 안 된다.
    expect(reading.lifework!.text.includes("계속 부딪힙니다")).toBe(false);
  });

  it("두 행성 모두 개인이 아니면 세대 라벨이 본문에 붙는다", () => {
    const chart = computeChart({
      date: "1995-07-14", time: "09:30",
      latitude: 37.5, longitude: 127.0, timezoneOffsetHours: 9,
    });
    const reading = assembleReading(chart, null, 10);
    const label = "비슷한 시기에 태어난 사람들이 함께 가지는 각도입니다.";
    for (const item of reading.aspects) {
      const bothNonPersonal = item.a.tier !== "personal" && item.b.tier !== "personal";
      expect(item.body.endsWith(label), `${item.a.ko}-${item.b.ko}`).toBe(bothNonPersonal);
    }
  });
});
