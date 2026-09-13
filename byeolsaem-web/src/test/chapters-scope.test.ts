import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChaptersScope } from "@/components/chapters/ChaptersScope";
import { EXAMPLE_BIRTH, exampleSky } from "@/lib/example-sky";
import { currentProfection, profectionYears, zodiacalReleasing } from "@/lib/time-lords";

/**
 * /chapters의 "열기 전" 화면은 예시 시간표를 그린다.
 *
 * 2026-09-14 이전에는 버튼 하나만 있는 안내였다. 프로필 없이 들어온 사람이
 * 화면에서 보는 글자가 211자뿐이었고(실측), 사이트에서 가장 얇은 색인 페이지였다.
 * `/natal`·`/synastry`·`/solar-return`은 같은 자리에서 예시를 깐다 — 이 페이지만
 * 빠져 있었다.
 *
 * 원래 그렇게 둔 이유는 "예시로 흉내 내면 아무 시각이나 넣어도 되는 계산처럼
 * 보인다"였다. 뒤집은 근거는 둘이다. 상승궁이 필요한 것은 `/solar-return`도
 * 같은데 그쪽은 예시를 보여 준다. 그리고 예시 라벨이 시각을 분까지 못 박는다
 * (`EXAMPLE_BIRTH.label`). 시각을 모르는 실제 사용자에게는 여전히 계산하지 않고
 * 그 이유를 밝히는 분기가 따로 남아 있다 — 그 분기가 원래 판단이 지키려던 것이다.
 *
 * 여기서 지키는 것: 예시 차트가 두 시간법을 **둘 다** 낸다는 것. 하나라도 null이면
 * 화면이 도로 빈다. 예시의 출생 시각을 지우거나 좌표를 흔들면 이 테스트가 먼저 깨진다.
 */
describe("예시 시간표 — /chapters 열기 전 화면", () => {
  const now = new Date(Date.UTC(2026, 8, 14));
  const { natal, chart } = exampleSky();

  it("예시 하늘이 natal 시각을 그대로 들고 있다", () => {
    // 라벨이 "오전 9시 30분"이라고 적는 한, 계산 입력도 09:30이어야 한다.
    expect(natal.time).toBe(EXAMPLE_BIRTH.time);
    expect(natal.date).toBe(EXAMPLE_BIRTH.date);
  });

  it("프로펙션이 나온다", () => {
    expect(currentProfection(natal, chart, now)).not.toBeNull();
    expect(profectionYears(natal, chart, now)).not.toBeNull();
  });

  it("조디악 릴리징이 나온다", () => {
    expect(zodiacalReleasing(natal, chart, "fortune", now)).not.toBeNull();
  });

  /**
   * 크롤러가 보는 화면. `now`는 useEffect에서만 채워지므로 서버 렌더에는 없고,
   * 그때는 빌드 시각(`builtAt`)으로 대신한다 — SolarScope와 같은 계약이다.
   * 이 대체를 빼면 정적 HTML이 도로 버튼 하나짜리가 된다(그게 원래 문제였다).
   */
  it("서버 렌더에도 예시가 실린다", () => {
    const html = renderToStaticMarkup(
      createElement(ChaptersScope, { builtAt: "2026-09-14T00:00:00.000Z" }),
    );
    expect(html).toContain("아래는 예시입니다");
    expect(html).toContain(EXAMPLE_BIRTH.label);
    // 두 절이 실제로 그려졌는지 — 안내 문구만 남으면 안 된다.
    expect(html).toContain("올해의 자리");
    expect(html).toContain("인생의 장");
  });
});
