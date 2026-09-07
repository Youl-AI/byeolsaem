import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { NameTag, chartPillars, nameTagText } from "@/components/chart/NameTag";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { AspectBadge } from "@/components/ui/AspectBadge";
import { ChartWheel } from "@/components/chart/ChartWheel";
import { NatalBody, NatalHero } from "@/components/chart/NatalReading";
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
import { YearFlow } from "@/components/yearly/YearFlow";
import { YearRiver } from "@/components/yearly/YearRiver";
import { ExampleSky } from "@/components/chart/ExampleSky";
import { ExampleMeeting } from "@/components/synastry/ExampleMeeting";
import { toneLabel } from "@/components/ui/ToneBadge";
import { TouchRow } from "@/components/weekly/WeeklyCard";
import { kstWeekStart, weeklyPersonal } from "@/lib/weekly-reading";

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
    expect(html).toContain("width:40%");
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

describe("천궁도 각 카드", () => {
  it("겉면에 별 표기가 없고 근거 세 줄이 natal 시제다", () => {
    const { chart, reading } = exampleSky();
    expect(reading.aspects.length).toBeGreaterThan(0);
    for (const item of reading.aspects) {
      // '합'은 여기서 뺀다 — \b는 아스키 전용이라 한글 앞뒤에서 경계로 서지 않고,
      // 흔한 음절이라 어차피 스펙이 금지어에서 뺐다(§2). '합'을 빼도 검사하는 것은
      // '육분'·'삼각'·'사각'·'대립'·'순풍'·'마찰'·'오브' 그대로다.
      expect(item.meta).not.toMatch(/오브|육분|삼각|사각|대립|순풍|마찰/);
      expect(item.basis[0]).toMatch(/^태어날 때 .+ (\d+도였습니다|한자리에 겹쳐 있었습니다)\.$/);
      expect(item.basis[2]).toMatch(/배선입니다\.$/);
    }
    void chart;
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
    // 이름 붙은 조합은 펼쳐져 있고 나머지는 접혀 있다. 근거 줄이 하우스를 말하면
    // 그 안의 용어(하우스)도 자기 버튼을 갖고 항상 aria-expanded="false"로
    // 뜨므로, 카드 자체의 열고 닫기 버튼만 그 문구("접기"/"더 읽기")로 센다.
    expect(html).toContain(">접기<");
    expect(html).toContain(">더 읽기<");
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
    // 근거 줄이 하우스를 말하면 그 안의 용어(하우스)도 자기 버튼을 갖는다 —
    // 카드 자체의 열고 닫기 버튼만 "접기"/"더 읽기"로 세어야 겹치지 않는다.
    expect(html.match(/>(?:접기|더 읽기)</g)).toHaveLength(events.length);
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

describe("카드 밖에도 각 이름이 없다", () => {
  const FORBIDDEN = /육분|삼각|사각|대립|순풍|마찰|오차/;

  it("세 화면의 부적 칩", () => {
    const { chart } = exampleSky();
    const { mine, theirs, reading: meet } = exampleMeeting();
    const sky = todaySky(new Date("2026-09-07T03:00:00Z"));
    const chips = [
      ...todayBack(sky, chart, null).chips,
      ...yearReading(chart, 2026, null).chips,
      ...meet.chips,
    ];
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) expect(chip.label).not.toMatch(FORBIDDEN);
    void mine;
    void theirs;
  });

  it("한 해의 강이 짚어 주는 줄", () => {
    const { chart } = exampleSky();
    const events = yearReading(chart, 2026, null).events;
    const html = renderToStaticMarkup(
      createElement(YearFlow, { year: 2026, events }),
    );
    expect(html).not.toMatch(FORBIDDEN);
  });

  it("좁은 화면·감소 모드의 강(YearRiver)이 스크린리더에 각 이름을 말하지 않는다", () => {
    // YearScope는 넓은 화면 + 모션 허용에서 YearFlow를, 좁은 화면이나
    // prefers-reduced-motion에서 YearRiver를 고른다(PersonalYear). 시각으로는
    // 안 보여도 aria-label은 스크린리더 사용자에게 그대로 말해지는 화면이다.
    const { chart } = exampleSky();
    const events = yearReading(chart, 2026, null).events;
    const html = renderToStaticMarkup(
      createElement(YearRiver, { year: 2026, events, onSelect: () => {} }),
    );
    const labels = [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(label).not.toMatch(FORBIDDEN);
  });

  it("천궁도의 평생 가는 각도 줄", () => {
    const { reading } = exampleSky();
    if (reading.lifework) expect(reading.lifework.basis).not.toMatch(FORBIDDEN);
  });

  it("toneLabel도 순풍·마찰이라 부르지 않는다", () => {
    // ToneBadge는 ExampleSky·ExampleMeeting·YearFlow 셋에서만 쓰인다 — 이 태스크가
    // 고치는 자리와 정확히 겹친다. 이름 붙은 라벨(순풍/마찰)이지 본문 산문이 아니므로
    // 금지어 규칙이 그대로 걸린다.
    expect(toneLabel(1)).not.toMatch(FORBIDDEN);
    expect(toneLabel(-1)).not.toMatch(FORBIDDEN);
    expect(toneLabel(0)).not.toMatch(FORBIDDEN);
  });

  it("정보를 넣기 전의 예시 카드 둘", () => {
    const natal = renderToStaticMarkup(createElement(ExampleSky, {}));
    const meeting = renderToStaticMarkup(createElement(ExampleMeeting, {}));
    // 두 카드는 ASPECT_MEANINGS의 본문·뉘앙스 문장을 그대로 보여준다. 예: opposition의
    // nuance는 "이 마찰은 주로 사람이나 상황을 통해 밖에서 옵니다"처럼 "마찰"을 평범한
    // 산문으로 쓴다 — 이 저장소의 룰링이 명시적으로 남겨 두라고 한 자리다. 그래서 카드
    // 전체가 아니라, 이 태스크가 실제로 고치는 자리(각도·오브 표기 줄과 톤 배지)만 좁혀
    // 확인한다.
    const badgeLine = (html: string): string => {
      const meta = html.match(/<span class="text-meta text-starlight-dim">([^<]*)<\/span>/);
      const tone = html.match(/<span class="text-eyebrow tracking-\[0\.18em\][^"]*">([^<]*)<\/span>/);
      return `${meta?.[1] ?? ""} ${tone?.[1] ?? ""}`;
    };
    // badgeLine()의 두 정규식이 빗나가면 ""를 돌려주고, ""는 무엇에도 안 걸려
    // not.toMatch가 공허하게 통과한다 — 실제로 내용을 봤다는 것부터 확인한다.
    expect(badgeLine(natal).trim().length).toBeGreaterThan(0);
    expect(badgeLine(meeting).trim().length).toBeGreaterThan(0);
    expect(badgeLine(natal)).not.toMatch(FORBIDDEN);
    expect(badgeLine(meeting)).not.toMatch(FORBIDDEN);
  });

  it("궁합 카드 목록의 RESONANCE 통계 줄", () => {
    // Resonance는 export되어 있지 않다 — SynastryBody가 그것을 그린다(같은 파일,
    // "궁합의 금실 축소판" describe의 body() 헬퍼와 같은 방식).
    const { mine, theirs, reading } = exampleMeeting();
    expect(reading.tightest).not.toBeNull();
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
    expect(html).not.toMatch(FORBIDDEN);
  });
});

/** 카드 하나의 조각들 — ReadingCard가 쓰는 클래스가 유일한 출처다. */
function cardsOf(html: string): { meta: string; plain: string; where: string; basis: string[]; all: string }[] {
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
  return [...html.matchAll(/<article[^>]*?class="reading-card[\s\S]*?<\/article>/g)].map((m) => {
    const card = m[0];
    const meta = card.match(/<p class="pr-8 text-\[0\.72rem\][^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const plain = card.match(/<p class="mt-0\.5 break-keep font-display[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const where = card.match(/<p class="mt-1 break-keep text-meta[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const basis = [...card.matchAll(/<p data-basis-line[^>]*>([\s\S]*?)<\/p>/g)].map((b) => strip(b[1]));
    return { meta: strip(meta), plain: strip(plain), where: strip(where), basis, all: strip(card) };
  });
}

// 이름을 "다섯 화면"이 아니라 "네 화면"으로 쓴다. screens()는 카드가 있는 네 화면만
// 렌더한다 — 주간은 카드가 아니라 TouchRow다(스펙 §6 "카드가 아니라 TouchRow.
// 머리줄 없음"). TouchRow를 여기 끼워 넣으면 cardsOf()가 찾는 것(meta·plain·where)이
// 애초에 없어 "카드 수 > 0" 같은 불변식이 화면 하나만 공허하게 실패한다 — 카드
// 전용으로 좁히고 주간은 아래 별도 describe에서 근거 세 줄만 확인한다.
describe("카드 문법 불변식 — 네 화면", () => {
  const when = new Date("2026-09-07T03:00:00Z");
  const screens = (): [string, string][] => {
    const { chart, reading } = exampleSky();
    const { mine, theirs, reading: meet } = exampleMeeting();
    const sky = todaySky(when);
    return [
      ["오늘", renderToStaticMarkup(createElement(TodayBody, { back: todayBack(sky, chart, "연애운"), sky, now: when }))],
      ["한 해", renderToStaticMarkup(createElement(YearEventRows, { year: 2026, events: yearReading(chart, 2026, null).events, openId: null, onToggle: () => {} }))],
      ["천궁도", renderToStaticMarkup(createElement(NatalBody, { chart, reading, now: when }))],
      ["궁합", renderToStaticMarkup(createElement(SynastryBody, { mine, theirs, reading: meet, chosen: null, activeId: null, onPick: () => {}, onActive: () => {} }))],
    ];
  };

  it("where는 plain 안에 글자 그대로 들어 있지 않다", () => {
    for (const [name, html] of screens()) {
      const cards = cardsOf(html);
      expect(cards.length, name).toBeGreaterThan(0);
      for (const c of cards) {
        // plain도 비어 있으면 안 된다 — where만 지키면, 렌더 클래스가 바뀌어
        // plain 정규식이 조용히 빗나가도(""가 되어도) includes(where) 검사는
        // "" 안에 아무것도 없다는 이유로 계속 통과해 버린다.
        expect(c.plain.length, name).toBeGreaterThan(0);
        expect(c.where.length, `${name}: ${c.plain}`).toBeGreaterThan(0);
        expect(c.plain.includes(c.where), `${name}: "${c.where}"가 "${c.plain}" 안에 있다`).toBe(false);
      }
    }
  });

  // 금지어 검사의 범위 (2026-09-08 판단, 진행 원장에 근거가 있다).
  // 각 이름(육분·삼각·사각·대립)은 아톰의 주석에만 있고 사용자 문자열에는 없다 —
  // 그래서 카드 전체에서 막는다. 반면 '마찰'·'순풍'은 ASPECT_MEANINGS.body와
  // planet-in-house의 산문 속 보통명사다("이 마찰은 불편하지만…"). 스펙이 겨눈 것은
  // toneLabel이 찍어 내던 라벨이지 산문이 아니므로, 그 둘과 '오차'는 이 재설계가
  // 소유한 자리 — 머리줄·둘째 줄·근거 세 줄 — 에서만 막는다.
  it("카드 어디에도 각 이름이 없다", () => {
    for (const [name, html] of screens()) {
      const cards = cardsOf(html);
      expect(cards.length, name).toBeGreaterThan(0);
      for (const c of cards) {
        expect(c.all, name).not.toMatch(/육분|삼각|사각|대립/);
      }
    }
  });

  it("머리줄·둘째 줄·근거에는 결 이름과 오차도 없다", () => {
    for (const [name, html] of screens()) {
      const cards = cardsOf(html);
      expect(cards.length, name).toBeGreaterThan(0);
      for (const c of cards) {
        expect([c.meta, c.where, ...c.basis].join(" "), name).not.toMatch(/오차|순풍|마찰/);
      }
    }
  });

  // 이 불변식은 근거가 있는 카드에만 건다(2026-09-08 판단, task-10-report.md에 근거가
  // 있다). NatalBody는 세 기둥 카드(태양·달·상승궁)와 열 개의 별 카드도 reading-card로
  // 그리지만, Task 8이 근거를 붙인 것은 별과 별 사이의 "각" 카드뿐이다 — 그 둘은 이
  // 재설계의 범위 밖이라 근거 없이 그대로 남았다. basis는 ReadingCard에서부터 있으면
  // 세 줄, 없으면 소제목째 안 그리는 선택 슬롯이다(스펙 §3.1 "비어 있으면 소제목도
  // 없다"). 오늘·한 해·궁합의 카드는 전부 근거를 갖고 있어 이 좁힘이 그 셋에는 아무
  // 영향이 없다.
  it("근거가 있는 카드는 세 줄이다", () => {
    for (const [name, html] of screens()) {
      const withBasis = cardsOf(html).filter((c) => c.basis.length > 0);
      expect(withBasis.length, name).toBeGreaterThan(0);
      for (const c of withBasis) {
        expect(c.basis.length, `${name}: ${c.plain}`).toBe(3);
      }
    }
  });
});

// 주간은 카드가 아니라 TouchRow라 위 "네 화면" 불변식에 끼울 수 없다(cardsOf가
// 찾는 meta·plain·where가 애초에 없다). 그래도 다섯 화면이 한 문법을 쓴다는
// 원칙(스펙 §5)은 TouchRow의 접힘에도 적용된다 — 여기서 근거 세 줄과 하우스
// 점선 용어만 따로 확인한다(BasisLines 추출 전에는 TouchRow가 이 둘을 손으로
// 다시 쓰며 하우스 용어를 빠뜨렸다).
describe("주간 TouchRow — 근거 세 줄", () => {
  it("왜 이게 보이나요와 세 줄, 하우스에 점선 용어", () => {
    const { chart } = exampleSky();
    const touches = weeklyPersonal(kstWeekStart(new Date("2026-09-07T03:00:00Z")), chart);
    expect(touches.length).toBeGreaterThan(0);
    const withHouse = touches.find((t) => t.basis[1].includes("하우스"));
    expect(withHouse).toBeDefined();
    const html = renderToStaticMarkup(
      createElement(TouchRow, { touch: withHouse!, open: true, onToggle: () => {} }),
    );
    expect(html).toContain("왜 이게 보이나요");
    expect(html.match(/data-basis-line/g)).toHaveLength(3);
    expect(html).toContain(">하우스</button>"); // Term
  });
});
