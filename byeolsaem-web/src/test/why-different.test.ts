import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WhyDifferent } from "@/components/sections/WhyDifferent";

/**
 * 메인의 "이 답이 어디서 나오는가" 섹션.
 *
 * 2026-09-25에 넣었다. 그전까지 홈에서 읽을 수 있는 글은 한글 864자였고 그중
 * 절반이 메뉴 라벨이었다(실측). `/about`과 `/method`에 정직하고 구체적인 글이
 * 있는데 홈에서는 그 존재조차 알 수 없었다 — 푸터 말고는 가는 길이 없었다.
 *
 * 그래서 이 섹션이 지켜야 하는 것은 **분량**과 **두 페이지로 가는 길**이다.
 * 둘 다 여기서 강제한다. 문구를 다듬는 것은 자유지만, 줄여서 다시 얇아지거나
 * 링크가 빠지면 이 테스트가 먼저 깨진다.
 *
 * 서버 렌더로 검사하는 이유: 크롤러와 심사자가 읽는 것은 첫 HTML이다. 이 섹션이
 * 클라이언트에서만 붙으면 목적을 통째로 잃는다.
 */
describe("메인 — 이 답이 어디서 나오는가", () => {
  const html = renderToStaticMarkup(createElement(WhyDifferent));
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  it("서버 HTML에 그대로 실린다", () => {
    expect(text.length).toBeGreaterThan(0);
  });

  it("읽을 글이 한글 600자를 넘는다", () => {
    const hangul = (text.match(/[가-힣]/g) ?? []).length;
    expect(hangul).toBeGreaterThan(600);
  });

  it("세 가지 약속을 전부 말한다", () => {
    expect(text).toContain("계산을 직접");
    expect(text).toContain("뽑지 않습니다");
    expect(text).toContain("비워 둡니다");
  });

  it("근거를 댈 수 있는 구체적인 값을 적는다", () => {
    // 막연한 자랑이 아니라 확인할 수 있는 것만 적는다 — column-style.md §4와 같은 규칙.
    expect(text).toContain("ELP-2000/82");
    expect(text).toContain("홀사인");
  });

  it("계산 방법과 소개로 가는 길을 연다", () => {
    expect(html).toContain('href="/method"');
    expect(html).toContain('href="/about"');
  });

  it("만드는 사람을 밝힌다", () => {
    expect(text).toContain("한 사람이 만들고 있습니다");
  });
});
