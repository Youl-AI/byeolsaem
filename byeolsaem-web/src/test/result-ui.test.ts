import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZODIAC_SIGNS } from "@/lib/zodiac";
import { NameTag, nameTagText } from "@/components/chart/NameTag";
import { ReadingCard } from "@/components/ui/ReadingCard";

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
