import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { NameTag, chartPillars, nameTagText } from "@/components/chart/NameTag";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { AspectBadge } from "@/components/ui/AspectBadge";
import { ChartWheel } from "@/components/chart/ChartWheel";
import { NatalHero } from "@/components/chart/NatalReading";
import { EXAMPLE_BIRTH, exampleMeeting, exampleSky } from "@/lib/example-sky";
import { afterFirstSentence } from "@/lib/text";
import { YearEventRows } from "@/components/yearly/YearEventRows";
import { yearBackdrop, yearReading } from "@/lib/yearly-reading";
import { SynastryBody, SynastryHero } from "@/components/synastry/SynastryReading";
import { TodayBody } from "@/components/today/TodayCard";
import { todaySky } from "@/lib/today";
import { todayBack } from "@/lib/today-reading";
import { QUIET_DAY } from "@/content/atoms/today";
import { YearScope, yearTabs } from "@/components/yearly/YearScope";
import { Term } from "@/components/ui/Term";
import { GLOSSARY } from "@/content/atoms/glossary";

/** 탭바 안의 앵커 수. 본문의 다른 조각 링크에 휘둘리지 않는다. */
function tabCount(html: string): number {
  const bar = html.match(/aria-label="결과 구역"[\s\S]*?<\/nav>/);
  return bar ? (bar[0].match(/href="#/g) ?? []).length : 0;
}

const sign = (key: string) => ZODIAC_SIGNS.find((s) => s.key === key)!;

/** 탭바의 모든 앵커가 같은 HTML 안의 구역 id를 가리킨다 — natal 최종 리뷰가 미뤄 둔 검사. */
function expectTabsResolve(html: string) {
  const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  expect(targets.length).toBeGreaterThan(0);
  for (const id of targets) expect(html).toContain(`id="${id}"`);
}

describe("이름표", () => {
  it("세 기둥을 한 줄로 적는다", () => {
    expect(nameTagText(sign("cancer"), sign("aquarius"), sign("virgo"))).toBe(
      "☉ 게자리 · ☽ 물병자리 · ↑ 처녀자리",
    );
  });
  it("상승궁이 없으면 두 항목", () => {
    expect(nameTagText(sign("cancer"), sign("aquarius"), null)).toBe("☉ 게자리 · ☽ 물병자리");
  });
  it("화면에도 같은 순서로 나온다", () => {
    const html = renderToStaticMarkup(
      createElement(NameTag, { sun: sign("cancer"), moon: sign("aquarius"), ascendant: sign("virgo") }),
    );
    expect(html.indexOf("게자리")).toBeLessThan(html.indexOf("물병자리"));
    expect(html.indexOf("물병자리")).toBeLessThan(html.indexOf("처녀자리"));
    expect(html).toContain('aria-label="태양 게자리, 달 물병자리, 상승궁 처녀자리"');
  });
});

describe("카드", () => {
  it("용어는 작게 위, 사람 말은 크게 아래, 본문은 접혀 있다", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingCard, {
        badge: "♂",
        meta: "화성 · 처녀자리 25° · 1하우스",
        plain: "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다",
        where: "따져서 이깁니다.",
        index: 3,
      }, createElement("p", null, "따져서 이깁니다. 감정으로 밀지 않고 사실을 정리해 내놓습니다.")),
    );
    expect(html.indexOf("화성 · 처녀자리")).toBeLessThan(html.indexOf("밀어붙이는 힘"));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("animation-delay:180ms");
    // 본문은 DOM에 있다(크롤러용). 접힘은 CSS(grid-rows 0fr)로 한다.
    expect(html).toContain("감정으로 밀지 않고");
  });

  it("둘째 줄(where)의 첫 문장을 본문에서 반복하지 않는다", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingCard,
        {
          badge: "♂",
          meta: "화성 · 처녀자리 25° · 1하우스",
          plain: "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다",
          where: "A다.",
          index: 3,
        },
        createElement("p", null, afterFirstSentence("A다. B다.")),
      ),
    );
    expect(html).toContain("B다.");
    expect(html).not.toContain("A다. B다.");
  });

  it("근거가 있으면 접힘 안 맨 아래에 세 줄, 하우스에 점선", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingCard,
        {
          badge: "♄",
          meta: "마주 앉는 관계 · 9월 2일 – 11월 14일 · 15년에 한 번",
          plain: "관계가 단단해지는 몇 달입니다.",
          where: "여기서 만든 것은 오래 남습니다.",
          basis: [
            "지금 하늘의 토성이 내 천왕성과 60도를 이룹니다.",
            "그 천왕성이 7하우스(마주 앉는 관계)에 있습니다.",
            "0.3도 차이라 지금이 가장 진합니다.",
          ],
        },
        createElement("p", null, "본문"),
      ),
    );
    expect(html).toContain("왜 이게 보이나요");
    expect(html.match(/data-basis-line/g)).toHaveLength(3);
    expect(html.indexOf("본문")).toBeLessThan(html.indexOf("왜 이게 보이나요"));
    expect(html).toContain(">하우스</button>"); // Term
  });

  it("해 볼 것·미룰 것은 접힘 안 첫머리", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingCard,
        { badge: "♄", meta: "m", plain: "p.", where: "w.", advice: { try: "정리", hold: "덮기" } },
        createElement("p", null, "본문"),
      ),
    );
    expect(html.indexOf("해 볼 것")).toBeLessThan(html.indexOf("본문"));
    expect(html).toContain("정리");
    expect(html).toContain("덮기");
  });

  it("진행 막대는 머리줄 아래, 값과 정점이 백분율로", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingCard, { badge: "♄", meta: "m", plain: "p.", where: "w.", progress: { value: 0.4, peaks: [0.55] } }),
    );
    expect(html).toContain('data-progress="40"');
    expect(html).toContain("left:55%");
    const none = renderToStaticMarkup(createElement(ReadingCard, { badge: "♄", meta: "m", plain: "p.", where: "w." }));
    expect(none).not.toContain("data-progress");
  });
});

describe("첫 문장 빼기", () => {
  it("첫 문장을 떼고 나머지만 남긴다", () => {
    expect(
      afterFirstSentence(
        "지키는 것으로 자기를 증명합니다. 내 사람이라 부를 수 있는 범위를 넓히며 삽니다.",
      ),
    ).toBe("내 사람이라 부를 수 있는 범위를 넓히며 삽니다.");
  });
  it("한 문장뿐이면 빈 문자열", () => {
    expect(afterFirstSentence("한 문장뿐입니다.")).toBe("");
  });
  it("마침표가 없으면 빈 문자열", () => {
    expect(afterFirstSentence("마침표 없음")).toBe("");
  });
});

describe("탭바", () => {
  it("항목마다 앵커 링크가 있고 첫 항목이 현재다", () => {
    const html = renderToStaticMarkup(
      createElement(ResultTabs, {
        items: [
          { id: "overview", label: "한눈에" },
          { id: "planets", label: "별 열 개" },
          { id: "detail", label: "자세히" },
        ],
      }),
    );
    expect(html).toContain('href="#overview"');
    expect(html).toContain('href="#planets"');
    expect(html).toContain('href="#detail"');
    expect(html.match(/aria-current="location"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="결과 구역"');
  });
});

describe("각 인장", () => {
  it("animate면 호에 pathLength와 계단 지연이 붙는다", () => {
    const html = renderToStaticMarkup(
      createElement(AspectBadge, { angle: 120, harmony: 1, animate: true, delay: 120 }),
    );
    expect(html).toContain('pathLength="1"');
    expect(html).toContain('class="aspect-arc"');
    expect(html).toContain("animation-delay:120ms");
  });
  it("기본은 정지 그림 그대로", () => {
    const html = renderToStaticMarkup(createElement(AspectBadge, { angle: 120, harmony: 1 }));
    expect(html).not.toContain("pathLength");
  });
});

describe("원반 등장", () => {
  it("요소마다 계단 클래스와 지연이 붙어 있다", () => {
    const { chart } = exampleSky();
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, entrance: null }));
    expect(html).toContain('class="wheel-ring"');
    expect((html.match(/wheel-tick/g) ?? []).length).toBeGreaterThanOrEqual(24); // 자리 12 + 하우스 12
    expect((html.match(/wheel-glyph/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(html).toContain("animation-delay:300ms"); // 첫 행성
    expect(html).toContain("animation-delay:120ms"); // 첫 눈금
    // 서버 렌더에서는 등장 표식이 없다 — 마운트 후 세션 확인으로 켜진다.
    expect(html).not.toContain('data-entrance="true"');
  });
});

describe("첫 화면", () => {
  it("이름표 → 원반 → 한 줄 → 공유 순서", () => {
    const { chart, reading } = exampleSky();
    const html = renderToStaticMarkup(
      createElement(NatalHero, {
        chart,
        reading,
        profile: { date: "1995-07-14" },
        onSelectPlanet: () => {},
      }),
    );
    const iH1 = html.indexOf("나의 천궁도");
    const iTag = html.indexOf('aria-label="태양 게자리');
    const iWheel = html.indexOf("천궁도 원반");
    const iOne = html.indexOf("당신을 한 줄로");
    const iShare = html.indexOf("이 하늘을 카드 한 장으로");
    // 페이지 헤더가 접히면 이 sr-only h1이 문서 제목을 대신한다 — 첫 요소여야 한다.
    expect(iH1).toBeGreaterThan(-1);
    expect(html).toContain('<h1 class="sr-only">나의 천궁도</h1>');
    expect(iH1).toBeLessThan(iTag);
    expect(iTag).toBeGreaterThan(-1);
    expect(iTag).toBeLessThan(iWheel);
    expect(iWheel).toBeLessThan(iOne);
    expect(iOne).toBeLessThan(iShare);
  });
});

describe("카드 prop", () => {
  const base = {
    badge: "♂",
    meta: "화성 · 처녀자리 25° · 1하우스",
    plain: "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다",
    where: "따져서 이깁니다.",
  };
  it("defaultOpen이면 처음부터 펼쳐져 있다", () => {
    const html = renderToStaticMarkup(createElement(ReadingCard, { ...base, defaultOpen: true }, createElement("p", null, "본문")));
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(">접기<");
    expect(html).toContain("grid-rows-[1fr]");
  });
  it("open을 주면 부모가 쥔다 — defaultOpen보다 우선", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingCard, { ...base, defaultOpen: true, open: false, onToggle: () => {} }, createElement("p", null, "본문")),
    );
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("세 기둥 읽기", () => {
  it("예시 하늘의 태양은 게자리, 상승궁이 있다", () => {
    const { chart } = exampleSky();
    const pillars = chartPillars(chart);
    expect(pillars.sun.key).toBe("cancer");
    expect(pillars.ascendant).not.toBeNull();
  });
  it("시각을 모르면 상승궁 자리는 null", () => {
    const { chart } = exampleSky();
    expect(chartPillars({ ...chart, ascendant: null }).ascendant).toBeNull();
  });
});

describe("궁합 첫 화면", () => {
  it("나·그쪽 이름표 → 금실 → 두 사람의 한 줄 → 공유 순서", () => {
    const { mine, theirs, reading } = exampleMeeting();
    const html = renderToStaticMarkup(
      createElement(SynastryHero, { mine, theirs, reading, profile: { date: EXAMPLE_BIRTH.date }, activeId: null }),
    );
    const tags = [...html.matchAll(/aria-label="태양 /g)].map((m) => m.index!);
    expect(tags).toHaveLength(2);
    const iThreads = html.indexOf("<svg", tags[1]);
    const iOne = html.indexOf("두 사람의 한 줄");
    const iShare = html.indexOf("두 하늘을 카드 한 장으로");
    expect(tags[0]).toBeLessThan(tags[1]);
    expect(tags[1]).toBeLessThan(iThreads);
    expect(iThreads).toBeLessThan(iOne);
    expect(iOne).toBeLessThan(iShare);
  });
  it("탭의 앵커마다 같은 id의 구역이 있다", () => {
    const { mine, theirs, reading } = exampleMeeting();
    const html = renderToStaticMarkup(
      createElement(SynastryBody, {
        mine,
        theirs,
        reading,
        chosen: null,
        activeId: null,
        onPick: () => {},
        onActive: () => {},
      }),
    );
    expectTabsResolve(html);
    // 이름 붙은 조합은 펼쳐져 있고 나머지는 접혀 있다.
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("오늘의 결과 구간", () => {
  const when = new Date("2026-09-07T03:00:00Z");
  const sky = todaySky(when);

  it("뒤집은 뒤: 탭의 앵커마다 같은 id의 구역이 있다", () => {
    const { chart } = exampleSky();
    const back = todayBack(sky, chart, null);
    const html = renderToStaticMarkup(createElement(TodayBody, { back, sky, now: when }));
    expectTabsResolve(html);
    expect(html).toContain('href="#today-transits"');
    expect(html).toContain('href="#today-planets"');
    expect(html).toContain('href="#today-moons"');
  });
  it("뒤집기 전에는 탭이 없고 열 개의 별·다가오는 달만 있다", () => {
    const html = renderToStaticMarkup(createElement(TodayBody, { back: null, sky, now: when }));
    expect(html).not.toContain('aria-label="결과 구역"');
    expect(html).toContain("오늘의 하늘, 열 개의 별");
    expect(html).toContain("다가오는 달");
  });

  it("관심사에 걸리는 것이 있으면 렌즈 탭이 서고 나머지는 '그 밖의 하늘'", () => {
    const { chart } = exampleSky();
    const back = todayBack(sky, chart, "연애운");
    expect(back.lensTransits.length).toBeGreaterThan(0);
    expect(back.otherTransits.length).toBeGreaterThan(0);
    expect(back.lensLabel).toBe("연애운");

    const html = renderToStaticMarkup(createElement(TodayBody, { back, sky, now: when }));
    expectTabsResolve(html);
    expect(tabCount(html)).toBe(5);
    expect(html).toContain('href="#today-lens"');
    expect(html).toContain('href="#today-others"');
    expect(html).toContain("당신이 궁금해한 연애운");
    expect(html).toContain("그 밖의 하늘");
  });

  it("관심사에 걸리는 것이 없으면 렌즈 탭이 없고 나머지가 '오늘의 각'", () => {
    const { chart } = exampleSky();
    const back = todayBack(sky, chart, "재물운");
    expect(back.lensTransits).toHaveLength(0);
    expect(back.otherTransits.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(createElement(TodayBody, { back, sky, now: when }));
    expectTabsResolve(html);
    expect(tabCount(html)).toBe(4);
    expect(html).not.toContain('href="#today-lens"');
    expect(html).toContain('href="#today-others"');
    expect(html).toContain("오늘의 각");
  });

  it("조용한 날에는 목록 대신 안내 한 줄이 서고 탭이 셋", () => {
    const { chart } = exampleSky();
    // 트랜짓이 하나도 없는 날은 실제 차트로는 안 잡힌다 — 느린 셋을 뺀 일곱 별이
    // 내 자리 열 곳과 다섯 각 중 어느 것과도 3도(달은 6도) 안에 들지 않아야 한다.
    // 자리가 빈 차트가 그 상태를 결정론으로 만든다 — quiet 갈래만 보는 것이다.
    const back = todayBack(sky, { ...chart, placements: [], aspects: [] }, "연애운");
    expect(back.quiet).toBe(QUIET_DAY);
    expect(back.headline).toBeNull();

    const html = renderToStaticMarkup(createElement(TodayBody, { back, sky, now: when }));
    expectTabsResolve(html);
    expect(tabCount(html)).toBe(3);
    expect(html).not.toContain('href="#today-lens"');
    expect(html).not.toContain('href="#today-others"');
    expect(html).toContain(QUIET_DAY);
  });
});

describe("한 해의 사건 카드", () => {
  it("사건마다 카드 하나, openId인 카드만 펼쳐져 있고, 카드 id는 사건 id", () => {
    const { chart } = exampleSky();
    const events = yearReading(chart, 2026, null).events;
    expect(events.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      createElement(YearEventRows, { year: 2026, events, openId: events[0].id, onToggle: () => {} }),
    );
    expect(html.match(/aria-expanded=/g)).toHaveLength(events.length);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html).toContain(`id="${events[0].id}"`);
    expect(html).toContain("힘이 도는 기간은");
    expect(html).toContain('class="reading-card');
  });
});

describe("한 해의 탭 배선", () => {
  // 탭은 마운트 뒤(flow === false)에만 선다. 서버 HTML에는 구역만 있으므로 탭바를
  // 같은 해의 탭 명세로 따로 그려 붙이고, 그 앵커가 구역에 닿는지를 본다.
  const scope = () =>
    renderToStaticMarkup(
      createElement(YearScope, { backdrops: [yearBackdrop(2026), yearBackdrop(2027)] }),
    );

  for (const year of [2026, 2027]) {
    it(`${year}년을 고른 탭의 앵커마다 같은 id의 구역이 있다`, () => {
      const tabs = renderToStaticMarkup(createElement(ResultTabs, { items: yearTabs(year) }));
      expectTabsResolve(tabs + scope());
      expect(tabs).toContain(`href="#year-${year}"`);
      expect(tabs).toContain('href="#personal-year"');
    });
  }

  it("두 해가 모두 HTML에 있고 personal-year는 하나뿐이다", () => {
    const html = scope();
    expect(html).toContain('id="year-2026"');
    expect(html).toContain('id="year-2027"');
    expect(html.match(/id="personal-year"/g)).toHaveLength(1);
  });
});

describe("궁합의 금실 축소판", () => {
  const body = (activeId: string | null) => {
    const { mine, theirs, reading } = exampleMeeting();
    return renderToStaticMarkup(
      createElement(SynastryBody, {
        mine,
        theirs,
        reading,
        chosen: null,
        activeId,
        onPick: () => {},
        onActive: () => {},
      }),
    );
  };

  it("카드 목록 위에 축소판이 서고 짚고 있는 실만 밝다", () => {
    const { reading } = exampleMeeting();
    const html = body(reading.lines[1].id);
    expect(html).toContain('data-threads="compact"');
    // 밝은 실은 하나뿐이다 — 카드 열 장이 서로 다른 실을 가리킨다.
    expect(html.match(/stroke-width="2.4"/g)).toHaveLength(1);
  });

  it("짚는 것이 없으면 밝은 실도 없다", () => {
    expect(body(null)).not.toContain('stroke-width="2.4"');
  });

  it("축소판은 첫 화면 그림과 같은 내용이라 스크린리더에는 읽히지 않는다", () => {
    const html = body(null);
    expect(html).not.toContain("두 사람의 별 배치와 그 사이를 잇는");
    expect(html).toContain('data-threads="compact"');
  });
});

describe("용어", () => {
  it("점선 용어를 누르면 나오는 정의가 아톰의 것이다", () => {
    const html = renderToStaticMarkup(createElement(Term, { name: "하우스" }));
    // HTML escapes special chars like ' to &#x27;, so check that definition is rendered
    expect(html).toContain(GLOSSARY.하우스.replace(/'/g, "&#x27;"));
    expect(html).toContain('aria-expanded="false"');
  });
});
