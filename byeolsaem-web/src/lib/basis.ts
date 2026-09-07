import { HOUSE_AREAS, PLANET_AREAS } from "@/content/atoms/life";
import { eul, gwa, iga } from "./josa";
import { PLANET_BY_KEY, type PlanetKey } from "./planets";

/**
 * 근거 세 줄 — "왜 이게 보이나요"에 답하는 문장.
 *
 * 카드 겉면은 사람 말만 하고, 별 이름·각도·하우스는 여기로 내려온다. 세 줄은
 * 세 질문에 하나씩 답한다: 무엇이 무엇과 / 왜 이 자리인가 / 얼마나 진한가.
 * 넷째 줄은 없다 — 늘리고 싶은 것은 머리줄로 올리거나 버린다.
 *
 * 각은 이름이 아니라 숫자로 말한다. "육분"을 가르치는 것보다 "60도"라고 쓰는 편이
 * 싸다. 조립은 결정론이다 — 같은 입력이면 같은 문장이다.
 */

export type BasisTense = "transit" | "natal" | "synastry";

export interface BasisInput {
  tense: BasisTense;
  /** 움직이는 별(트랜짓) · 첫 별(natal) · 내 별(궁합). */
  a: PlanetKey;
  /** 내 별(트랜짓) · 둘째 별(natal) · 그쪽 별(궁합). */
  b: PlanetKey;
  /** 0 · 60 · 90 · 120 · 180 */
  angle: number;
  /** null이면 오브 대신 정확한 날들로 말한다(한 해). */
  orb: number | null;
  /** b가 든 하우스. 궁합은 그쪽 별이 든 내 하우스. 시각을 모르면 null. */
  house: number | null;
  lens?: string | null;
  /** 오늘 이후 첫 정점의 표기 — "10월 3일". 느린 별에만. */
  peakLabel?: string | null;
  peakPassed?: boolean;
  /** 한 해 전용 — 정확한 날들의 표기. */
  exactLabels?: string[];
}

const COUNT_KO = ["", "한", "두", "세", "네", "다섯"] as const;

/**
 * 각을 화면에 쓰는 유일한 자리 — "60도", 0도는 "겹침". 화면 전체가 이 낱말 하나만
 * 쓴다(스펙 §2 "각은 숫자로 말한다"). 각자 손으로 `angle === 0 ? "겹침" : ...`을
 * 다시 쓰던 아홉 자리를 여기로 모았다 — basis.test.ts가 재발을 막는다.
 *
 * `symbol: true`는 WeekPath의 SVG 라벨 전용이다. 그 라벨은 폭이 좁은 고정폭
 * 칸(`fontSize=10.5`, 길 아래 매달린 추)에 들어가는데 "도"(한글 전각)가 "°"보다
 * 넓어 두 줄로 밀린다 — 그 한 자리만 기호를 쓴다.
 */
export function angleLabel(angle: number, opts?: { symbol?: boolean }): string {
  if (angle === 0) return "겹침";
  return opts?.symbol ? `${angle}°` : `${angle}도`;
}

function firstLine(tense: BasisTense, a: string, b: string, angle: number): string {
  // 0도 갈래는 angleLabel과 동사 어미까지 함께 바뀐다("겹쳐 있었습니다"/"겹칩니다")
  // — 명사 라벨 하나를 문장에 끼워 넣는 다른 자리들과 달리 문장 전체가 갈리므로
  // angleLabel로 옮기면 오히려 두 갈래를 하나의 함수 뒤에 숨기게 된다. 그대로 둔다.
  if (tense === "natal") {
    return angle === 0
      ? `태어날 때 ${a}${gwa(a)} ${b}${iga(b)} 한자리에 겹쳐 있었습니다.`
      : `태어날 때 ${a}${gwa(a)} ${b}${iga(b)} ${angle}도였습니다.`;
  }
  const head = tense === "synastry" ? `내 ${a}${iga(a)} 그쪽 ${b}${gwa(b)}` : `지금 하늘의 ${a}${iga(a)} 내 ${b}${gwa(b)}`;
  return angle === 0 ? `${head} 겹칩니다.` : `${head} ${angle}도를 이룹니다.`;
}

function secondLine(tense: BasisTense, bKey: PlanetKey, b: string, house: number | null, lens: string | null | undefined): string {
  const subject = tense === "synastry" ? `그쪽 ${b}${iga(b)}` : `그 ${b}${iga(b)}`;
  const place =
    house === null
      ? `${PLANET_AREAS[bKey]}${eul(PLANET_AREAS[bKey])} 맡고 있습니다.`
      : `${tense === "synastry" ? "내 " : ""}${house}하우스(${HOUSE_AREAS[house]})에 있습니다.`;
  const line = `${subject} ${place}`;
  return lens ? `${line} ${lens}${iga(lens)} 보는 자리입니다.` : line;
}

function thirdLine(input: BasisInput): string {
  const { tense, orb } = input;
  if (orb === null) {
    const labels = input.exactLabels ?? [];
    if (labels.length <= 1) return `${labels[0] ?? "올해"}에 정확히 맞습니다.`;
    return `${labels.join(" · ")}, ${COUNT_KO[labels.length] ?? labels.length} 번에 걸쳐 맞습니다.`;
  }
  const o = orb.toFixed(1);
  if (tense === "natal") return `${o}도 차이라 ${orb < 2 ? "뚜렷한" : "옅은"} 배선입니다.`;
  if (tense === "synastry") return `${o}도 차이라 ${orb < 2 ? "뚜렷한" : "옅은"} 만남입니다.`;
  if (orb < 1) return `${o}도 차이라 지금이 가장 진합니다.`;
  if (input.peakLabel) return `${o}도 남았습니다 — ${input.peakLabel}에 가장 진합니다.`;
  if (input.peakPassed) return `${o}도 차이라 가장 진한 때는 지났습니다.`;
  return `${o}도 차이라 아직 옅습니다.`;
}

export function basisLines(input: BasisInput): [string, string, string] {
  const a = PLANET_BY_KEY[input.a].ko;
  const b = PLANET_BY_KEY[input.b].ko;
  return [
    firstLine(input.tense, a, b, input.angle),
    secondLine(input.tense, input.b, b, input.house, input.lens),
    thirdLine(input),
  ];
}
