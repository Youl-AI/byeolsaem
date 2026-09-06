import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { NameTag, nameTagText } from "@/components/chart/NameTag";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { AspectBadge } from "@/components/ui/AspectBadge";
import { ChartWheel } from "@/components/chart/ChartWheel";
import { NatalHero } from "@/components/chart/NatalReading";
import { exampleSky } from "@/lib/example-sky";

const sign = (key: string) => ZODIAC_SIGNS.find((s) => s.key === key)!;

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
    const iTag = html.indexOf('aria-label="태양 게자리');
    const iWheel = html.indexOf("천궁도 원반");
    const iOne = html.indexOf("당신을 한 줄로");
    const iShare = html.indexOf("이 하늘을 카드 한 장으로");
    expect(iTag).toBeGreaterThan(-1);
    expect(iTag).toBeLessThan(iWheel);
    expect(iWheel).toBeLessThan(iOne);
    expect(iOne).toBeLessThan(iShare);
  });
});
