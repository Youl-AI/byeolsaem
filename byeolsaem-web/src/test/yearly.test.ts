import { describe, expect, it } from "vitest";
import { computeChart, longitudeOf } from "@/lib/chart";
import { toJulianDay } from "@/lib/ephemeris";
import { exampleSky } from "@/lib/example-sky";
import { findYearEvents, signSpans, yearRetrogrades, yearStartJd } from "@/lib/yearly";
import { yearBackdrop, yearReading } from "@/lib/yearly-reading";
import { EXACT_COUNT_LINES, JUPITER_YEAR, SATURN_YEAR } from "@/content/atoms/yearly";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

/**
 * 한 해의 하늘도 공개적으로 확인할 수 있는 값으로 검증한다.
 *
 * 목성과 토성이 자리를 옮기는 날짜는 어느 역법서에나 실려 있고, 수성 역행 날짜도
 * 마찬가지다. 계산이 그럴듯해 보이는 것과 맞는 것은 다르다.
 */

const NATAL = computeChart({
  date: "1994-10-03",
  time: "14:20",
  latitude: 37.5665,
  longitude: 126.978,
  timezoneOffsetHours: 9,
});

describe("한 해의 경계", () => {
  it("한국 시간 1월 1일 0시에서 시작한다", () => {
    // 한국의 1월 1일 0시는 세계시로 전해 12월 31일 15시다.
    expect(yearStartJd(2027)).toBeCloseTo(toJulianDay(new Date("2026-12-31T15:00:00Z")), 10);
  });

  it("한 해의 길이가 365일이거나 366일이다", () => {
    expect(yearStartJd(2027) - yearStartJd(2026)).toBeCloseTo(365, 6);
    expect(yearStartJd(2029) - yearStartJd(2028)).toBeCloseTo(366, 6);
  });
});

describe("느린 별의 자리", () => {
  it("2026년 목성은 게자리에서 시작해 6월 30일 사자자리로 옮긴다", () => {
    const spans = signSpans("jupiter", 2026);
    expect(spans).toHaveLength(2);
    expect(spans[0].sign.ko).toBe("게자리");
    expect(spans[0].from).toBeNull();
    expect(spans[1].sign.ko).toBe("사자자리");
    expect(spans[1].from?.month).toBe(6);
    expect(spans[1].from?.day).toBe(30);
  });

  it("2027년 목성은 7월 26일 처녀자리로 옮긴다", () => {
    // RENEWAL_PLAN §5.6이 참고값으로 적어 둔 날짜다.
    const spans = signSpans("jupiter", 2027);
    expect(spans[1].sign.ko).toBe("처녀자리");
    expect(spans[1].from?.month).toBe(7);
    expect(spans[1].from?.day).toBe(26);
  });

  it("2026년 토성은 2월 13일 양자리로 들어간다", () => {
    const spans = signSpans("saturn", 2026);
    expect(spans[0].sign.ko).toBe("물고기자리");
    expect(spans[1].sign.ko).toBe("양자리");
    expect(spans[1].from?.month).toBe(2);
    expect(spans[1].from?.day).toBe(13);
  });

  it("2027년 토성은 한 해 내내 양자리에 머문다", () => {
    const spans = signSpans("saturn", 2027);
    expect(spans).toHaveLength(1);
    expect(spans[0].sign.ko).toBe("양자리");
    expect(spans[0].from).toBeNull();
  });

  it("명왕성은 한 해에 자리를 두 번 넘지 않는다", () => {
    // 한 자리에 20년을 머무는 별이다. 여러 구간이 나오면 경계 판정이 틀린 것이다.
    expect(signSpans("pluto", 2026).length).toBeLessThanOrEqual(2);
  });
});

describe("한 해의 수성 역행", () => {
  it("2026년은 세 번이고 첫 구간이 2월 26일에 시작한다", () => {
    const periods = yearRetrogrades(2026);
    expect(periods).toHaveLength(3);
    const first = new Date(new Date(periods[0].start).getTime() + 9 * 3600_000);
    expect(first.getUTCMonth() + 1).toBe(2);
    expect(first.getUTCDate()).toBe(26);
  });

  it("한 구간은 3주 안팎이다", () => {
    for (const period of yearRetrogrades(2027)) {
      expect(period.days).toBeGreaterThan(17);
      expect(period.days).toBeLessThan(26);
    }
  });

  it("모든 구간이 그 해와 겹친다", () => {
    const start = yearStartJd(2026);
    const end = yearStartJd(2027);
    for (const period of yearRetrogrades(2026)) {
      expect(toJulianDay(new Date(period.start))).toBeLessThan(end);
      expect(toJulianDay(new Date(period.end))).toBeGreaterThanOrEqual(start);
    }
  });
});

describe("정확한 날짜", () => {
  const events = findYearEvents(NATAL, 2027);

  it("날짜 순으로 나온다", () => {
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i].exact[0].at).toBeGreaterThanOrEqual(events[i - 1].exact[0].at);
    }
  });

  it("모든 날짜가 그 해 안에 있다", () => {
    for (const event of events) {
      for (const date of event.exact) {
        expect(date.at).toBeGreaterThanOrEqual(0);
        expect(date.at).toBeLessThanOrEqual(1);
        expect(date.iso.startsWith("2027-")).toBe(true);
      }
    }
  });

  it("한 항목의 날짜는 한 번, 두 번, 또는 세 번이다", () => {
    // 넷 이상이면 ±180도 경계를 넘는 값을 각도가 맞은 것으로 잘못 센 것이다.
    for (const event of events) {
      expect(event.exact.length).toBeGreaterThanOrEqual(1);
      expect(event.exact.length).toBeLessThanOrEqual(3);
      expect(EXACT_COUNT_LINES[event.exact.length]).toBeDefined();
    }
  });

  it("그 날짜에 각도가 실제로 정확하다", () => {
    // 계산의 핵심이다. 찾아낸 날짜의 정오에 두 별의 각도를 다시 재서 확인한다.
    for (const event of events) {
      const natal = NATAL.placements.find((p) => p.planet === event.natal)!;
      for (const date of event.exact) {
        const jd = yearStartJd(2027) + date.at * (yearStartJd(2028) - yearStartJd(2027));
        const separation = Math.abs(
          ((longitudeOf(event.transiting, jd) - natal.longitude + 540) % 360) - 180,
        );
        expect(Math.abs(separation - event.type.angle)).toBeLessThan(0.02);
      }
    }
  });

  it("빠른 별은 여기 오지 않는다", () => {
    // 화성보다 빠른 별은 한 해에 수십 번 각도를 맺는다. 그쪽은 /today가 맡는다.
    const fast = ["sun", "moon", "mercury", "venus", "mars"];
    expect(events.some((e) => fast.includes(e.transiting))).toBe(false);
  });

  it("세대 행성끼리 맺는 각도는 빼놓는다", () => {
    const slow = ["uranus", "neptune", "pluto"];
    expect(events.some((e) => slow.includes(e.transiting) && slow.includes(e.natal))).toBe(false);
  });

  it("한 해의 항목 수가 달력으로 읽을 만하다", () => {
    // 너무 적으면 페이지가 비고, 너무 많으면 달력이 아니라 소음이 된다.
    expect(events.length).toBeGreaterThan(3);
    expect(events.length).toBeLessThan(25);
  });
});

describe("한 해의 조립", () => {
  it("열두 자리 모두에 목성과 토성의 문장이 있다", () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(JUPITER_YEAR[sign.key]?.length).toBeGreaterThan(20);
      expect(SATURN_YEAR[sign.key]?.length).toBeGreaterThan(20);
    }
  });

  it("앞면은 출생 정보 없이 만들어진다", () => {
    const backdrop = yearBackdrop(2026);
    expect(backdrop.year).toBe(2026);
    expect(backdrop.jupiter.every((s) => s.text.length > 20)).toBe(true);
    expect(backdrop.saturn.every((s) => s.text.length > 20)).toBe(true);
    expect(backdrop.retrogrades.length).toBeGreaterThanOrEqual(3);
    expect(backdrop.retrogrades[0].range).toMatch(/^\d+월 \d+일 - \d+월 \d+일$/);
  });

  it("같은 해 같은 차트면 같은 글이 나온다", () => {
    expect(JSON.stringify(yearReading(NATAL, 2027))).toBe(
      JSON.stringify(yearReading(NATAL, 2027)),
    );
  });

  it("상반기와 하반기가 전체를 나눠 갖는다", () => {
    const reading = yearReading(NATAL, 2027);
    expect(reading.halves[0].events.length + reading.halves[1].events.length).toBe(
      reading.events.length,
    );
    expect(reading.chips.length).toBeLessThanOrEqual(3);
    if (reading.events.length === 0) expect(reading.quiet).not.toBeNull();
    else expect(reading.quiet).toBeNull();
  });

  it("항목마다 날짜 줄과 풀이가 채워진다", () => {
    for (const event of yearReading(NATAL, 2027).events) {
      expect(event.dateLine).toMatch(/^\d+월 \d+일/);
      expect(event.headline.length).toBeGreaterThan(5);
      expect(event.body.length).toBeGreaterThan(40);
    }
  });
});

describe("한 해 카드의 재료", () => {
  const { chart } = exampleSky();
  const events = yearReading(chart, 2026, null).events;

  it("머리줄은 자리 · 날짜 · 주기, 근거 셋째 줄은 정확한 날", () => {
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.meta).toMatch(/년에 한 번$|평생 한 번$/);
      expect(e.meta.startsWith(`${e.area} · `)).toBe(true);
      expect(e.basis).toHaveLength(3);
      expect(e.basis[2]).toMatch(/에 정확히 맞습니다\.$|번에 걸쳐 맞습니다\.$/);
      expect(e.plain.includes(e.where)).toBe(false);
      expect([e.meta, e.plain, e.where, e.rest, ...e.basis].join(" ")).not.toMatch(/오차|육분|삼각|사각|대립|순풍|마찰/);
    }
  });
});
