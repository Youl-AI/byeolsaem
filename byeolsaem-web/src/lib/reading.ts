import { ASPECT_MEANINGS, PAIR_READINGS, modeOf, pairKey, pairTheme } from "@/content/atoms/aspects";
import { ASCENDANT_ATOMS, MIDHEAVEN_ATOMS } from "@/content/atoms/ascendant";
import { lensFor, type ConcernLens } from "@/content/atoms/concerns";
import { HOUSE_AREAS, PLANET_AREAS, SIGN_FACES } from "@/content/atoms/life";
import { basisLines } from "./basis";
import { eun, iga } from "./josa";
import { firstSentence } from "./text";
import { HOUSE_BY_NUMBER, type House } from "@/content/atoms/houses";
import { PLANET_IN_HOUSE } from "@/content/atoms/planet-in-house";
import { PLANET_IN_SIGN } from "@/content/atoms/planet-in-sign";
import type { Aspect, Chart, Placement } from "./chart";
import { PLANET_BY_KEY, TIER_RANK, type Planet, type PlanetKey, type PlanetTier } from "./planets";
import { ZODIAC_SIGNS, type ZodiacSign } from "./zodiac";

/**
 * 계산된 차트에 아톰을 붙여 읽을 수 있는 글로 만든다.
 *
 * 여기에는 무작위도 인공지능도 없다. 같은 배치면 언제 다시 열어도 같은 문장이
 * 나온다 — 점술 서비스에서 이것은 취향이 아니라 신뢰의 조건이다
 * (RENEWAL_PLAN §2.3).
 *
 * 조립 순서도 규칙이다. 관심사에 해당하는 것을 먼저, 그다음 별은 개인 → 사회(목성·토성) →
 * 세대 순으로 둔다.
 */

export interface ReadingPlacement {
  planet: Planet;
  placement: Placement;
  /** 이 별이 이 별자리에 있을 때 */
  inSign: string;
  /** 이 별이 이 하우스에 있을 때. 시각을 모르면 null. */
  inHouse: string | null;
  house: House | null;
  /** 관심사 렌즈에 걸렸는가 */
  highlighted: boolean;
}

export interface ReadingAspect {
  aspect: Aspect;
  a: Planet;
  b: Planet;
  /** "밖으로 향하는 의지와 안에서 움직이는 감정" */
  theme: string;
  headline: string;
  body: string;
  /** "거의 정확" — 오브 세기를 말로. */
  strengthKo: string;
  /** 머리줄 — 두 별이 앉은 자리의 생활 이름. */
  meta: string;
  basis: [string, string, string];
}

export interface Reading {
  /** 당신을 한 줄로 — 태양(겉)과 달(안)의 결을 붙인 요약. B안(2026-08-14 승인). */
  oneLiner: string;
  /**
   * 평생의 과제 하나 — 가중 세기가 가장 높은 마찰 각도. 마찰이 없는 하늘이면 null.
   * 생활 문장과, 그것이 어느 별 이야기인지 근거 줄.
   */
  lifework: { text: string; basis: string } | null;
  /** 태양·달·상승궁 세 줄. 이 셋이 없으면 나머지는 배경이다. */
  core: {
    sun: ReadingPlacement;
    moon: ReadingPlacement;
    ascendant: { sign: ZodiacSign; text: string } | null;
    midheaven: { sign: ZodiacSign; text: string } | null;
  };
  placements: ReadingPlacement[];
  aspects: ReadingAspect[];
  lens: ConcernLens | null;
  /** 원소가 어디에 몰려 있는가. 전체 인상을 한마디로 말할 때 쓴다. */
  elements: { element: string; count: number }[];
  timeUnknown: boolean;
}

function signOf(longitude: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

function toReadingPlacement(placement: Placement, lens: ConcernLens | null): ReadingPlacement {
  const planet = PLANET_BY_KEY[placement.planet];
  const house = placement.house === null ? null : HOUSE_BY_NUMBER[placement.house];
  return {
    planet,
    placement,
    inSign: PLANET_IN_SIGN[placement.planet][placement.sign.key],
    inHouse: placement.house === null ? null : PLANET_IN_HOUSE[placement.planet][placement.house],
    house,
    // 하우스를 알면 하우스로만 판정한다. 화면이 "7하우스 · 동반자"라고 말하는
    // 별이 재물운 섹션에 서면 글과 섹션이 서로 다른 이야기를 한다(실측).
    // 시각을 몰라 하우스가 없을 때만 행성 목록(전통적 지표성)이 대신 판정한다.
    highlighted: Boolean(
      lens &&
        (placement.house !== null
          ? lens.houses.includes(placement.house)
          : lens.planets.includes(placement.planet)),
    ),
  };
}

/**
 * 개인성 가중치 (스펙 §3). 오브가 아무리 정확해도 세대끼리의 각도는 이 사람
 * 고유의 이야기가 아니다 — 순위는 세기 × 이 가중치로 정한다. chart.ts는 기하만
 * 알므로 여기(해석)에서 곱한다.
 */
type TierPairKey =
  | "personal-personal"
  | "personal-social"
  | "personal-generational"
  | "social-social"
  | "social-generational"
  | "generational-generational";

const TIER_WEIGHTS: Record<TierPairKey, number> = {
  "personal-personal": 1.0,
  "personal-social": 0.85,
  "personal-generational": 0.7,
  "social-social": 0.5,
  "social-generational": 0.35,
  "generational-generational": 0.15,
};

export function tierWeight(a: PlanetTier, b: PlanetTier): number {
  const [x, y] = TIER_RANK[a] <= TIER_RANK[b] ? [a, b] : [b, a];
  return TIER_WEIGHTS[`${x}-${y}` as TierPairKey];
}

/** 오브 세기를 말로 (스펙 §4). 화면 메타 줄이 쓴다. */
export function strengthLabel(strength: number): string {
  if (strength >= 0.8) return "거의 정확";
  if (strength >= 0.55) return "뚜렷";
  return "넓게 걸침";
}

/** 세대 각도임을 밝히는 고정 문장 (스펙 §3). 지어내지 않고 사실을 말한다. */
const GENERATIONAL_NOTE = "비슷한 시기에 태어난 사람들이 함께 가지는 각도입니다.";

/**
 * 어스펙트를 문장으로. 본문은 행성 쌍이 정하고(PAIR_READINGS), 각도는 headline과
 * nuance 한 줄로 5방의 구분을 지킨다 (content/atoms/aspects.ts 참고).
 */
function toReadingAspect(aspect: Aspect, chart: Chart): ReadingAspect | null {
  const theme = pairTheme(aspect.a, aspect.b);
  if (!theme) return null;
  const meaning = ASPECT_MEANINGS[aspect.type.key];
  const a = PLANET_BY_KEY[aspect.a];
  const b = PLANET_BY_KEY[aspect.b];
  const bothNonPersonal = a.tier !== "personal" && b.tier !== "personal";
  // 쌍의 문단 + 각도의 꼬리. 세대끼리의 각도에는 그 사실을 밝히는 문장이 하나 더 붙는다.
  const paragraph = `${PAIR_READINGS[pairKey(aspect.a, aspect.b)][modeOf(aspect.type.key)]} ${meaning.nuance}`;

  const at = (key: PlanetKey) => chart.placements.find((p) => p.planet === key)!;
  const areaOf = (key: PlanetKey) => {
    const h = at(key).house;
    return h === null ? PLANET_AREAS[key] : HOUSE_AREAS[h];
  };
  const areaA = areaOf(aspect.a);
  const areaB = areaOf(aspect.b);
  const meta = areaA === areaB ? areaA : `${areaA} · ${areaB}`;
  const basis = basisLines({
    tense: "natal",
    a: aspect.a,
    b: aspect.b,
    angle: aspect.type.angle,
    orb: aspect.orb,
    house: at(aspect.b).house,
  });

  return {
    aspect,
    a,
    b,
    theme,
    headline: meaning.headline,
    body: bothNonPersonal ? `${paragraph} ${GENERATIONAL_NOTE}` : paragraph,
    strengthKo: strengthLabel(aspect.strength),
    meta,
    basis,
  };
}

/**
 * @param concern 히어로에서 고른 관심사. 렌즈에 없는 값이면 무시한다.
 * @param aspectLimit 몇 개까지 보여 줄지. 전부 늘어놓으면 읽히지 않는다.
 */
export function assembleReading(
  chart: Chart,
  concern?: string | null,
  aspectLimit = 6,
): Reading {
  const lens = concern ? (lensFor(concern) ?? null) : null;

  const placements = chart.placements.map((p) => toReadingPlacement(p, lens));
  const byKey = new Map(placements.map((p) => [p.planet.key, p]));

  // 관심사에 걸린 것 → 개인 → 사회 → 세대 순서.
  const ordered = [...placements].sort((a, b) => {
    if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
    return TIER_RANK[a.planet.tier] - TIER_RANK[b.planet.tier];
  });

  // chart.ts의 순수 세기 순서 위에 개인성 가중치를 곱해 다시 세운다
  const aspects = chart.aspects
    .map((aspect) => toReadingAspect(aspect, chart))
    .filter((a): a is ReadingAspect => a !== null)
    .sort(
      (x, y) =>
        y.aspect.strength * tierWeight(y.a.tier, y.b.tier) -
        x.aspect.strength * tierWeight(x.a.tier, x.b.tier),
    )
    .slice(0, aspectLimit);

  const counts = new Map<string, number>();
  for (const placement of chart.placements) {
    counts.set(placement.sign.element, (counts.get(placement.sign.element) ?? 0) + 1);
  }

  return {
    oneLiner: composeOneLiner(byKey.get("sun")!, byKey.get("moon")!),
    lifework: composeLifework(aspects),
    core: {
      sun: byKey.get("sun")!,
      moon: byKey.get("moon")!,
      ascendant:
        chart.ascendant === null
          ? null
          : {
              sign: signOf(chart.ascendant),
              text: ASCENDANT_ATOMS[signOf(chart.ascendant).key],
            },
      midheaven:
        chart.midheaven === null
          ? null
          : {
              sign: signOf(chart.midheaven),
              text: MIDHEAVEN_ATOMS[signOf(chart.midheaven).key],
            },
    },
    placements: ordered,
    aspects,
    lens,
    elements: [...counts.entries()]
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count),
    timeUnknown: chart.timeUnknown,
  };
}

/**
 * 당신을 한 줄로 — 겉(태양)과 안(달)의 결을 붙인다.
 *
 * 조사(2026-08-14)에서 확인한 것: 읽히는 서비스는 전체를 관통하는 요약을 맨
 * 앞에 세운다. 여기서는 뽑는 수식 없이, 이미 계산된 두 자리의 결만 잇는다.
 */
function composeOneLiner(sun: ReadingPlacement, moon: ReadingPlacement): string {
  const out = SIGN_FACES[sun.placement.sign.key].out;
  const inner = SIGN_FACES[moon.placement.sign.key].in;
  if (sun.placement.sign.key === moon.placement.sign.key) {
    return `겉도 안도 ${out} 결 하나로 이루어져 있습니다 — 드물게 또렷한 하늘입니다.`;
  }
  if (sun.placement.sign.element === moon.placement.sign.element) {
    return `겉은 ${out} 사람, 혼자일 때는 ${inner} 사람입니다. 같은 원소의 결이라 겉과 안이 크게 다투지 않습니다.`;
  }
  return `겉은 ${out} 사람, 혼자일 때는 ${inner} 사람입니다. 이 간격이 당신을 움직이는 힘입니다.`;
}

/**
 * 평생의 과제 하나 — 목록에서 가중 세기가 가장 높은 마찰 각도.
 *
 * 예전에는 테마 라벨을 되읽었다("…힘이 계속 부딪힙니다"). 지금은 그 쌍의 마찰
 * 문단 첫 문장을 그대로 쓴다 — 아톰 작문 규칙(스펙 §7)이 첫 문장을 홀로 서는
 * 완결 서술로 강제하는 이유가 바로 이 자리다.
 */
function composeLifework(aspects: ReadingAspect[]): Reading["lifework"] {
  const friction = aspects.find((a) => a.aspect.type.harmony < 0);
  if (!friction) return null;
  return {
    text: `${firstSentence(friction.body)} 편한 배치는 아니지만, 당신을 실제로 움직여 온 것도 이 마찰입니다.`,
    basis: `${friction.a.ko} ${friction.aspect.type.ko} ${friction.b.ko} · 태어난 순간부터 평생 가는 각도`,
  };
}

/**
 * 원소 분포를 한 문장으로.
 *
 * 열 개의 별이 네 원소에 고르게 흩어지는 일은 드물다. 한쪽에 몰려 있으면 그
 * 자체가 전체 인상을 정하고, 아예 비어 있는 원소가 있으면 그쪽이 이 사람의
 * 과제가 된다.
 */
export function describeElements(elements: { element: string; count: number }[]): string {
  const top = elements[0];
  const missing = ["불", "흙", "공기", "물"].filter(
    (element) => !elements.some((e) => e.element === element && e.count > 0),
  );

  const strong =
    top.count >= 5
      ? `열 개의 별 중 ${top.count}개가 ${top.element}에 몰려 있습니다.`
      : `${top.element}${iga(top.element)} ${top.count}개로 가장 많지만 한쪽으로 크게 치우치지는 않았습니다.`;

  if (missing.length === 0) return `${strong} 네 원소가 모두 채워져 있습니다.`;
  return `${strong} 반면 ${missing.join("·")}${eun(missing[missing.length - 1])} 비어 있어, 그 성질은 스스로 익혀야 하는 쪽에 가깝습니다.`;
}
