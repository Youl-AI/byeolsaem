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
import { SynastryBody, SynastryHero } from "@/components/synastry/SynastryReading";

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
        tech: "화성 · 처녀자리 25° · 1하우스",
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
          tech: "화성 · 처녀자리 25° · 1하우스",
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
    tech: "화성 · 처녀자리 25° · 1하우스",
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
      createElement(SynastryBody, { mine, theirs, reading, chosen: null, onPick: () => {}, onActive: () => {} }),
    );
    expectTabsResolve(html);
    // 이름 붙은 조합은 펼쳐져 있고 나머지는 접혀 있다.
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
  });
});
