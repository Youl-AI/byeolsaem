import { pairKey } from "@/content/atoms/aspects";
import { lensFor, type ConcernLens } from "@/content/atoms/concerns";
import { HOUSE_BY_NUMBER } from "@/content/atoms/houses";
import {
  NO_CONTACT,
  NO_HOUSES,
  NO_VISITORS,
  PARTNER_TIME_UNKNOWN,
  PLANET_TOUCH,
  resonanceBand,
  SYNASTRY_ASPECTS,
  SYNASTRY_HIGHLIGHTS,
} from "@/content/atoms/synastry";
import { angleLabel, basisLines } from "./basis";
import type { Chart } from "./chart";
import { gwa, iga } from "./josa";
import { PLANET_BY_KEY, type Planet, type PlanetKey } from "./planets";
import { houseOverlay, synastry, type CrossAspect } from "./synastry";

/**
 * 두 하늘의 만남을 글로 조립한다.
 *
 * 조립은 결정론이다. 같은 두 사람에 같은 관심사면 몇 번을 열어도 같은 글이 나온다.
 */

export interface SynastryLine {
  /** 금실 하나를 이 항목과 잇는 열쇠. */
  id: string;
  mine: Planet;
  theirs: Planet;
  /** "trine" 같은 각도 키. 한 줄 조립이 결을 읽는 데 쓴다. */
  aspectKey: string;
  aspectSymbol: string;
  /** 정확한 각도 — 0 · 60 · 90 · 120 · 180. */
  angle: number;
  orb: number;
  /** 힘이 흐르는 각도인가, 마찰이 있는 각도인가. 0은 겹침. */
  harmony: number;
  /** "내 자기 자신으로 서 있는 자리와 그쪽의 마음이 놓이는 자리" */
  meeting: string;
  headline: string;
  body: string;
  /** 이름이 붙어 있는 조합이면 그 한 줄. 없으면 null. */
  highlight: string | null;
  /** 고른 관심사에 걸리는가. 걸리는 것이 목록 앞으로 온다. */
  highlighted: boolean;
  /** 그쪽 별이 든 내 하우스. 내 시각을 모르면 null. */
  house: number | null;
  basis: [string, string, string];
}

/** 관심사가 보는 방 하나와, 그 방에 든 상대의 별. */
export interface LensRoom {
  number: number;
  ko: string;
  domain: string;
  body: string;
  visitors: { planet: Planet; line: string }[];
}

export interface LensView {
  label: string;
  summary: string;
  rooms: LensRoom[];
  /** 내 시각을 몰라 방을 낼 수 없을 때. 있으면 rooms는 비어 있다. */
  noHouses: string | null;
  /** 어느 방에도 상대의 별이 들지 않았을 때. */
  noVisitors: string | null;
  /** 상대가 시각을 몰라 상대의 달이 어긋날 수 있을 때. */
  partnerTimeUnknown: string | null;
}

export interface SynastryReading {
  /** 두 사람의 한 줄 — 가장 깊은 자리와 부딪히는 자리를 붙인 요약. 각도가 없으면 null. */
  oneLiner: string | null;
  /** 해 볼 것 / 버릴 것 — 부딪히는 각도가 있을 때만. */
  advice: { try: string; hold: string } | null;
  /** 이름이 붙어 있는 조합이 몇 개 맺혀 있는가. 화면 앞에 세우는 숫자다. */
  named: number;
  bandLabel: string;
  bandLine: string;
  flowing: number;
  friction: number;
  overlapping: number;
  /** 잡힌 각도의 총수. 화면에 세우는 것은 그중 열 개쯤이다. */
  total: number;
  /** 가장 정확한 각도의 오차. 각도가 하나도 없으면 null. */
  tightest: number | null;
  lines: SynastryLine[];
  /** 고른 관심사로 본 영역. 관심사가 없거나 이름이 틀리면 null. */
  lens: LensView | null;
  /** 각도가 하나도 없을 때. 있으면 목록 대신 이것을 쓴다. */
  empty: string | null;
  chips: { symbol: string; label: string }[];
}

export function crossAspectId(aspect: CrossAspect): string {
  return `thread-${aspect.mine}-${aspect.theirs}-${aspect.type.key}`;
}

/** 화면에 세울 만남의 수. 이보다 아래는 오브가 넓어 이 관계만의 특징이라 하기 어렵다. */
const SHOWN = 10;

function describe(aspect: CrossAspect, highlighted: boolean, house: number | null): SynastryLine {
  const mine = PLANET_BY_KEY[aspect.mine];
  const theirs = PLANET_BY_KEY[aspect.theirs];
  const meaning = SYNASTRY_ASPECTS[aspect.type.key];
  const myTouch = PLANET_TOUCH[aspect.mine];

  return {
    id: crossAspectId(aspect),
    mine,
    theirs,
    aspectKey: aspect.type.key,
    aspectSymbol: aspect.type.symbol,
    angle: aspect.type.angle,
    orb: aspect.orb,
    harmony: aspect.type.harmony,
    meeting: `내 ${myTouch}${gwa(myTouch)} 그쪽의 ${PLANET_TOUCH[aspect.theirs]}`,
    headline: meaning.headline,
    body: meaning.body,
    highlight: SYNASTRY_HIGHLIGHTS[pairKey(aspect.mine, aspect.theirs)] ?? null,
    house,
    basis: basisLines({
      tense: "synastry",
      a: aspect.mine,
      b: aspect.theirs,
      angle: aspect.type.angle,
      orb: aspect.orb,
      house,
    }),
    highlighted,
  };
}

/**
 * 고른 관심사가 보는 방과, 그 방에 든 상대의 별.
 *
 * "그 사람과 금전운"이라는 물음에 실제로 답하는 부분이다. 각도는 어떤 힘이
 * 만나는지만 말하고 어느 영역인지는 말하지 않는다 — 영역을 말하는 것이 방이다.
 */
function buildLens(mine: Chart, theirs: Chart, lens: ConcernLens): LensView {
  const overlay = houseOverlay(mine, theirs);
  const rooms: LensRoom[] = lens.houses.map((number) => {
    const house = HOUSE_BY_NUMBER[number];
    return {
      number,
      ko: house.ko,
      domain: house.domain,
      body: house.body,
      visitors: overlay
        .filter((entry) => entry.house === number)
        .map((entry) => {
          const touch = PLANET_TOUCH[entry.planet];
          return {
            planet: PLANET_BY_KEY[entry.planet],
            line: `${touch}${iga(touch)} 이 방으로 들어옵니다.`,
          };
        }),
    };
  });

  const visitorCount = rooms.reduce((sum, room) => sum + room.visitors.length, 0);
  return {
    label: lens.label,
    summary: lens.summary,
    rooms: overlay.length ? rooms : [],
    noHouses: overlay.length ? null : NO_HOUSES,
    noVisitors: overlay.length && visitorCount === 0 ? NO_VISITORS : null,
    // 방을 정하는 것은 내 차트라 상대의 시각이 없어도 대부분은 맞다. 달만
    // 예외인데, 하루에 13도를 가므로 방 하나를 통째로 건널 수 있다.
    partnerTimeUnknown: overlay.length && theirs.timeUnknown ? PARTNER_TIME_UNKNOWN : null,
  };
}

/** 이 만남이 고른 관심사에 걸리는가 — 별로 걸리거나, 상대의 별이 그 방에 들거나. */
function matchesLens(
  aspect: CrossAspect,
  lens: ConcernLens,
  roomOf: Map<PlanetKey, number>,
): boolean {
  if (lens.planets.includes(aspect.mine) || lens.planets.includes(aspect.theirs)) return true;
  const room = roomOf.get(aspect.theirs);
  return room !== undefined && lens.houses.includes(room);
}

/** 각도의 결을 한 줄의 관형절로. 두 사람의 한 줄이 여기서 조립된다. */
const TONE_CLAUSES: Record<string, string> = {
  conjunction: "깊게 겹쳐 있는",
  sextile: "손이 잘 맞는",
  trine: "말하지 않아도 통하는",
  square: "서로를 밀며 움직이는",
  opposition: "정면으로 마주 선",
};

/**
 * 두 사람의 한 줄 — B안(2026-08-14 승인).
 *
 * 가장 정확하게 흐르는 각도가 관계의 바탕을, 가장 정확한 마찰이 단서를 단다.
 * 목록은 오브순이므로 각 무리의 첫 항목이 그 무리의 대표다.
 */
function composeOneLiner(lines: SynastryLine[]): string | null {
  if (lines.length === 0) return null;
  // 목록은 이름 붙은 조합을 앞세운 순서라, "가장 정확한" 것은 오브로 직접 고른다.
  const byOrb = [...lines].sort((a, b) => a.orb - b.orb);
  const flowing = byOrb.find((line) => line.harmony >= 0);
  const friction = byOrb.find((line) => line.harmony < 0);

  if (flowing && friction) {
    const clause = TONE_CLAUSES[flowing.aspectKey] ?? "깊게 얽힌";
    return `${clause} 사이인데, ${PLANET_TOUCH[friction.mine.key]} 쪽에서는 자꾸 부딪히는 짝입니다.`;
  }
  if (flowing) {
    const clause = TONE_CLAUSES[flowing.aspectKey] ?? "깊게 얽힌";
    return `${clause} 짝입니다. 부딪히는 각도가 드물어, 이 관계를 움직이는 것은 별보다 두 사람의 선택입니다.`;
  }
  return `서로를 세게 움직이는 짝입니다. ${PLANET_TOUCH[friction!.mine.key]} 쪽에서 자주 부딪히지만, 관계를 실제로 나아가게 하는 것도 대개 그 자리입니다.`;
}

export function synastryReading(
  mine: Chart,
  theirs: Chart,
  concern?: string | null,
): SynastryReading {
  const result = synastry(mine, theirs);
  const lens = concern ? (lensFor(concern) ?? null) : null;
  const roomOf = new Map(houseOverlay(mine, theirs).map((e) => [e.planet, e.house]));

  // 자르는 자리를 먼저 정하고 그다음에 관심사로 다시 세운다. 순서를 바꾸면
  // 관심사에 걸리지 않는 이름 붙은 조합이 목록 밖으로 밀려나고, 화면이 한
  // "아래 목록에서 그대로 세어 볼 수 있다"는 약속이 깨진다.
  const cut = result.aspects.slice(0, Math.max(SHOWN, result.named));
  const described = cut.map((aspect) =>
    describe(aspect, lens ? matchesLens(aspect, lens, roomOf) : false, roomOf.get(aspect.theirs) ?? null),
  );
  // 걸리는 것을 앞으로. 같은 무리 안의 차례는 그대로 둔다.
  const lines = [
    ...described.filter((line) => line.highlighted),
    ...described.filter((line) => !line.highlighted),
  ];

  const band = resonanceBand(result.named);

  return {
    oneLiner: composeOneLiner(described),
    advice: described.some((line) => line.harmony < 0)
      ? {
          try: "자주 부딪히는 주제는 성격 차이로 인정하고, 미리 규칙을 정해 두기",
          hold: "상대의 방식을 내 방식으로 고치려는 시도",
        }
      : null,
    named: result.named,
    bandLabel: band.label,
    bandLine: band.line,
    flowing: result.flowing,
    friction: result.friction,
    overlapping: result.overlapping,
    total: result.aspects.length,
    tightest: result.tightest,
    lines,
    lens: lens ? buildLens(mine, theirs, lens) : null,
    empty: result.aspects.length === 0 ? NO_CONTACT : null,
    // 칩은 목록의 앞 세 개다. 따로 고르면 칩과 목록이 서로 다른 이야기를 한다.
    chips: lines.slice(0, 3).map((line) => ({
      symbol: line.mine.symbol,
      label: `내 ${line.mine.ko}–그쪽 ${line.theirs.ko} ${angleLabel(line.angle)}`,
    })),
  };
}
