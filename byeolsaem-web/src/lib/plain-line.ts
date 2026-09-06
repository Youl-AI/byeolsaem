import { HOUSE_AREAS, PLANET_AREAS } from "@/content/atoms/life";
import { iga } from "@/lib/josa";
import type { PlanetKey } from "@/lib/planets";
import type { ZodiacSign } from "@/lib/zodiac";

/**
 * 행성 카드의 첫 줄 — 점성술 용어 없이 "무엇이 어디에 있는가".
 *
 * `화성 · 처녀자리 25° · 1하우스`는 처음 온 사람에게 낯선 문자열이다. 그 대신
 * 별이 맡는 것(PLANET_AREAS)과 방의 생활 이름(HOUSE_AREAS)을 조사 하나로 잇는다:
 * "밀어붙이는 힘이 당신 자신과 첫인상에 있습니다". 두 표는 이미 있었고 화면이
 * 안 쓰고 있었다. 새 문장을 쓰지 않는다.
 *
 * 120쌍을 기계적으로 이으면 어색한 조합이 나올 수 있다. 그런 쌍은 두 표의 원문을
 * 고치지 않고 PLAIN_OVERRIDES에 예외로 적는다 — 원문은 다른 화면도 쓴다.
 */
export const PLAIN_OVERRIDES: Partial<Record<`${PlanetKey}-${number}`, string>> = {
  // 달-4: "마음이 놓이는 자리가 집과 마음의 바닥에 있습니다" — "마음"이 두 번 겹친다.
  "moon-4": "당신이 편안해지는 자리가 집과 마음의 바닥에 있습니다",
  // 수성-3: "말과 생각이 오가는 자리가 말과 가까운 관계에 있습니다" — "말"이 두 번 겹친다.
  "mercury-3": "생각이 오가는 자리가 말과 가까운 관계에 있습니다",
  // 금성-5: "좋아하고 사랑하는 방식이 만들고 사랑하는 즐거움에 있습니다" — "사랑"이 두 번 겹친다.
  "venus-5": "좋아하는 마음이 만들고 사랑하는 즐거움에 있습니다",
  // 명왕성-3: "밑바닥의 힘이 말과 가까운 관계에 있습니다" — 힘/결속 쪽 표현이 대화 자리와 어색하게 붙는다.
  "pluto-3": "생각의 뿌리가 말과 가까운 관계에 있습니다",
};

export function plainLine(planet: PlanetKey, house: number | null, sign: ZodiacSign): string {
  const area = PLANET_AREAS[planet];
  // 시각을 모르면 방이 없다 — 자리만 말하고 하우스를 꾸며 넣지 않는다.
  if (house === null) return `${area} — ${sign.ko}`;
  const override = PLAIN_OVERRIDES[`${planet}-${house}`];
  if (override) return override;
  return `${area}${iga(area)} ${HOUSE_AREAS[house]}에 있습니다`;
}
