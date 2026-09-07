import { ASPECT_MEANINGS, pairTheme } from "@/content/atoms/aspects";
import { lensFor, type ConcernLens } from "@/content/atoms/concerns";
import {
  fillLife,
  HOUSE_AREAS,
  PLANET_AREAS,
  toneOf,
  TRANSIT_ADVICE,
  TRANSIT_LIFE,
} from "@/content/atoms/life";
import { MOON_PHASE_LINES, QUIET_DAY, TRANSIT_FRAMES } from "@/content/atoms/today";
import { PLANET_IN_SIGN } from "@/content/atoms/planet-in-sign";
import { angleLabel, basisLines } from "./basis";
import type { Chart } from "./chart";
import {
  formatPassageDate,
  passageRange,
  recurrenceLabel,
  SLOW_MOVERS,
  transitPassage,
} from "./passage";
import { PLANET_BY_KEY, type Planet } from "./planets";
import { afterFirstSentence, firstSentence } from "./text";
import { findTransits, type TodaySky, type Transit } from "./today";

/**
 * 오늘의 카드를 조립한다.
 *
 * 앞면은 개인 정보가 없어도 만들 수 있다 — 달의 위상은 누가 보든 같기 때문이다.
 * 뒷면은 출생 차트가 있어야 나온다. 그래서 두 면을 따로 만든다.
 *
 * 뒷면의 조립 순서는 B안(2026-08-14 승인)이다: 오늘의 한 줄 → 관심사에 걸린
 * 것 → 나머지. 본문은 생활 언어(content/atoms/life.ts)로 말하고 별 이야기는
 * 근거 줄로 내린다.
 *
 * 조립은 결정론이다. 같은 날 같은 차트면 몇 번을 열어도 같은 글이 나온다.
 */

export interface TodayFront {
  /** "10월 3일 금요일" */
  dateLine: string;
  phaseTitle: string;
  phaseName: string;
  /** 밝게 보이는 면, 백분율. */
  illumination: number;
  moonSign: string;
  /** 카드의 라틴 표기용. "LEO SUN"에서 자리 이름만 떼어 쓴다. */
  moonSignLatin: string;
  phaseLine: string;
  /** 달이 지금 그 자리에서 어떻게 구는지. 출생 차트의 '달 × 별자리'와 같은 문장이다. */
  moonInSign: string;
}

export function todayFront(sky: TodaySky): TodayFront {
  const phase = MOON_PHASE_LINES[sky.moon.phase.key];
  return {
    dateLine: `${sky.date.month}월 ${sky.date.day}일 ${sky.date.weekday}요일`,
    phaseTitle: phase.title,
    phaseName: sky.moon.phase.ko,
    illumination: Math.round(sky.moon.illumination * 100),
    moonSign: sky.moon.sign.ko,
    moonSignLatin: sky.moon.sign.latin.replace(/ SUN$/, ""),
    phaseLine: phase.line,
    moonInSign: PLANET_IN_SIGN.moon[sky.moon.sign.key] ?? "",
  };
}

export interface TodayTransit {
  moving: Planet;
  fixed: Planet;
  aspectKo: string;
  aspectSymbol: string;
  /** 정확한 각도에서 벗어난 정도. */
  orb: number;
  /** 힘이 흐르는 각도인가, 마찰이 있는 각도인가. 0은 겹침. */
  harmony: number;
  span: string;
  /** 건드려지는 자리의 생활 이름 — "돈이 드나드는 자리". */
  area: string;
  /** 생활 언어 본문. 결론부터 말한다. */
  life: string;
  /** 고른 관심사에 걸리는가. */
  inLens: boolean;
  /** 정확한 각도 — 0 · 60 · 90 · 120 · 180. */
  angle: number;
  /** 건드려지는 자리의 하우스. 시각을 모르면 null. */
  house: number | null;
  /** 머리줄 — 어디 · 언제 · 얼마나 드문가. */
  meta: string;
  /** life의 첫 문장. */
  plain: string;
  /** life의 둘째 문장. 카드 겉면 둘째 줄이다 — 자리 이름을 반복하지 않는다. */
  where: string;
  /** life의 셋째 문장부터. 없으면 "". */
  rest: string;
  /** 두 별의 주제 — "지키려는 구조와 그것을 깨려는 충동 — 서로 도울 수 있습니다". 옛 basis. */
  caption: string;
  advice: { try: string; hold: string };
  basis: [string, string, string];
  progress: { value: number; peaks: number[] } | null;
}

export interface TodayBack {
  /** 오늘의 한 줄 — 가장 앞에 세우는 항목의 첫 문장. 트랜짓이 없으면 null. */
  headline: string | null;
  /** 관심사에 걸린 것. 관심사가 없으면 빈 배열. */
  lensTransits: TodayTransit[];
  /** 나머지. */
  otherTransits: TodayTransit[];
  lensLabel: string | null;
  /** 해 볼 것 / 미룰 것 — 맨 앞 항목의 별에서 꺼낸다. */
  advice: { try: string; hold: string } | null;
  /** 트랜짓이 없는 날의 안내. 있으면 목록 대신 이것을 쓴다. */
  quiet: string | null;
  /** 강도순 부적 칩 2~3개. */
  chips: { symbol: string; label: string }[];
}

export function todayBack(sky: TodaySky, natal: Chart, concern?: string | null): TodayBack {
  const lens = concern ? (lensFor(concern) ?? null) : null;
  const found = findTransits(sky, natal, 4);
  const transits = found.map((transit) => describeTransit(transit, natal, lens, sky));

  const lensTransits = transits.filter((t) => t.inLens);
  const otherTransits = transits.filter((t) => !t.inLens);
  // 한 줄과 조언은 같은 항목에서 나온다 — 관심사에 걸린 것이 있으면 그쪽이 오늘의
  // 머리가 되고, 없으면 가장 정확한 각도가 맡는다.
  const top = lensTransits[0] ?? transits[0] ?? null;

  return {
    headline: top ? firstSentence(top.life) : null,
    lensTransits,
    otherTransits,
    lensLabel: lens?.label ?? null,
    advice: top ? TRANSIT_ADVICE[top.moving.key] : null,
    quiet: transits.length === 0 ? QUIET_DAY : null,
    // 칩은 목록의 앞 세 개를 그대로 쓴다. 따로 고르면 목록과 칩이 서로 다른
    // 이야기를 하게 되고, 어느 쪽이 오늘인지 알 수 없어진다.
    // 칩 모양(세 조립 함수가 함께 쓴다): "A–B 각도". 소유가 갈리는 쪽에만
    // '내'/'그쪽'을 붙인다 — A(하늘의 움직이는 별)는 문맥이 이미 하늘이라 안
    // 붙이고, B(내 자리)에는 '내'를 붙인다. yearly-reading.ts·synastry-reading.ts와
    // 같은 규칙.
    chips: transits.slice(0, 3).map((t) => ({
      symbol: t.moving.symbol,
      label: `${t.moving.ko}–내 ${t.fixed.ko} ${angleLabel(t.angle)}`,
    })),
  };
}

/** 건드려지는 자리의 생활 이름. 하우스를 알면 하우스가, 모르면 별의 자리가 말한다. */
function areaOf(natal: Chart, planet: Planet["key"]): string {
  const placement = natal.placements.find((p) => p.planet === planet);
  if (placement?.house != null) return HOUSE_AREAS[placement.house];
  return PLANET_AREAS[planet];
}

/**
 * 하우스를 알면 하우스로만 판정한다. 본문이 "돈이 드나드는 자리"처럼 하우스의
 * 생활 이름으로 말하는 이상, 행성 목록으로 걸린 항목(예: 7하우스의 토성)이
 * 재물운 배지 아래 서면 글과 배지가 서로 다른 이야기를 한다 — 실측에서 발견.
 * 시각을 몰라 하우스가 없을 때만 행성 목록이 대신 판정한다.
 */
function matchesLens(natal: Chart, planet: Planet["key"], lens: ConcernLens): boolean {
  const placement = natal.placements.find((p) => p.planet === planet);
  if (placement?.house != null) return lens.houses.includes(placement.house);
  return lens.planets.includes(planet);
}

export function describeTransit(transit: Transit, natal: Chart, lens: ConcernLens | null, sky: TodaySky): TodayTransit {
  const moving = PLANET_BY_KEY[transit.transiting];
  const fixed = PLANET_BY_KEY[transit.natal];
  const meaning = ASPECT_MEANINGS[transit.type.key];
  const frame = TRANSIT_FRAMES[transit.transiting];
  const theme = pairTheme(transit.transiting, transit.natal);
  const span = frame?.span ?? "며칠";
  const area = areaOf(natal, transit.natal);
  const placement = natal.placements.find((p) => p.planet === transit.natal)!;
  const house = placement.house;
  const inLens = lens ? matchesLens(natal, transit.natal, lens) : false;

  const slow = SLOW_MOVERS.includes(transit.transiting);
  const passage = slow ? transitPassage(transit.transiting, placement.longitude, transit.type.angle, sky.julianDay) : null;
  const nextPeak = passage?.peaks.find((p) => p.jd >= sky.julianDay) ?? null;
  const peakLabel = nextPeak ? formatPassageDate(nextPeak, sky.date.year) : null;
  const peakPassed = !!passage && passage.peaks.length > 0 && !nextPeak;

  // where의 마지막 대비책(아래)이 basis[0]을 가리키므로 life보다 먼저 만든다.
  const basis = basisLines({
    tense: "transit",
    a: transit.transiting,
    b: transit.natal,
    angle: transit.type.angle,
    orb: transit.orb,
    house,
    lens: inLens && lens ? lens.label : null,
    peakLabel,
    peakPassed,
  });

  const life = fillLife(TRANSIT_LIFE[toneOf(transit.type.harmony)][transit.transiting], area, span);
  const plain = firstSentence(life);
  const tail = afterFirstSentence(life);
  // life는 두 문장이 기본이다. 둘째 문장이 겉면 둘째 줄이 되고, 셋째부터는 접힌다.
  // life가 혹시라도 한 문장뿐이면 근거 첫 줄로 대신한다 — 그 줄은 늘 별 이름과
  // 각도를 말하므로 plain의 부분 문자열이 될 수 없다(plain을 그대로 반복하면 안 된다).
  const where = firstSentence(tail) || tail || basis[0];
  const rest = firstSentence(tail) ? afterFirstSentence(tail) : "";

  const range = passage ? passageRange(passage, sky.date.year) : "";
  const every = recurrenceLabel(transit.transiting, transit.type.angle);
  const meta = slow ? [area, range, every].filter(Boolean).join(" · ") : `${area} · ${span}`;

  const progress =
    passage && passage.progress !== null && passage.start && passage.end
      ? {
          value: passage.progress,
          peaks: passage.peaks.map((p) => (p.jd - passage.start!.jd) / (passage.end!.jd - passage.start!.jd)),
        }
      : null;

  return {
    moving,
    fixed,
    aspectKo: transit.type.ko,
    aspectSymbol: transit.type.symbol,
    orb: transit.orb,
    harmony: transit.type.harmony,
    span,
    area,
    life,
    caption: theme ? `${theme} — ${meaning.headline}` : meaning.headline,
    inLens,
    angle: transit.type.angle,
    house,
    meta,
    plain,
    where,
    rest,
    advice: TRANSIT_ADVICE[transit.transiting],
    basis,
    progress,
  };
}
