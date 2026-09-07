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
import {
  EMPTY_HALF,
  EXACT_COUNT_LINES,
  JUPITER_YEAR,
  QUIET_YEAR,
  SATURN_YEAR,
  YEAR_FRAMES,
} from "@/content/atoms/yearly";
import { angleLabel, basisLines } from "./basis";
import type { Chart } from "./chart";
import { recurrenceLabel } from "./passage";
import { afterFirstSentence, firstSentence } from "./text";
import { PLANET_BY_KEY, type Planet, type PlanetKey } from "./planets";
import { formatZodiacDegree } from "./retrograde";
import type { RetrogradePeriod } from "./retrograde-clock";
import {
  findYearEvents,
  signSpans,
  yearRetrogrades,
  type SignSpan,
  type YearDate,
  type YearEvent,
} from "./yearly";

/**
 * 한 해의 카드를 조립한다.
 *
 * 앞면(`yearBackdrop`)은 개인 정보가 없어도 만들 수 있다 — 목성과 토성이 올해
 * 어느 자리에 있는지, 수성이 언제 역행하는지는 모두에게 같기 때문이다. 그래서
 * 이 부분은 빌드할 때 미리 계산해 HTML에 넣는다.
 *
 * 뒷면(`yearReading`)은 출생 차트가 있어야 나오고 브라우저에서 계산한다.
 *
 * 조립은 결정론이다. 같은 해 같은 차트면 몇 번을 열어도 같은 글이 나온다.
 */

export interface BackdropSpan {
  signKo: string;
  /** 그 자리에 들어선 날. 해가 시작될 때 이미 있었으면 null. */
  from: YearDate | null;
  text: string;
}

export interface BackdropRetrograde {
  /** "9월 17일 - 10월 9일" */
  range: string;
  startIso: string;
  endIso: string;
  days: number;
  /** "처녀자리 15도에서 사자자리 2도까지" */
  arc: string;
}

export interface YearBackdrop {
  year: number;
  jupiter: BackdropSpan[];
  saturn: BackdropSpan[];
  retrogrades: BackdropRetrograde[];
}

/** "3월 14일" */
export function formatYearDate(date: YearDate): string {
  return `${date.month}월 ${date.day}일`;
}

function backdropSpans(spans: SignSpan[], table: Record<string, string>): BackdropSpan[] {
  return spans.map((span) => ({
    signKo: span.sign.ko,
    from: span.from,
    text: table[span.sign.key] ?? "",
  }));
}

function kstMonthDay(iso: string): { month: number; day: number } {
  const kst = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return { month: kst.getUTCMonth() + 1, day: kst.getUTCDate() };
}

function describeRetrograde(period: RetrogradePeriod): BackdropRetrograde {
  const from = kstMonthDay(period.start);
  const to = kstMonthDay(period.end);
  return {
    range: `${from.month}월 ${from.day}일 - ${to.month}월 ${to.day}일`,
    startIso: period.start,
    endIso: period.end,
    days: Math.round(period.days),
    arc: `${formatZodiacDegree(period.startLongitude)}에서 ${formatZodiacDegree(period.endLongitude)}까지`,
  };
}

export function yearBackdrop(year: number): YearBackdrop {
  return {
    year,
    jupiter: backdropSpans(signSpans("jupiter", year), JUPITER_YEAR),
    saturn: backdropSpans(signSpans("saturn", year), SATURN_YEAR),
    retrogrades: yearRetrogrades(year).map(describeRetrograde),
  };
}

export interface YearReadingEvent {
  /** 강물의 노드에서 이 항목으로 데려갈 때 쓰는 DOM id. */
  id: string;
  moving: Planet;
  fixed: Planet;
  aspectSymbol: string;
  /** 정확한 각도 — 0 · 60 · 90 · 120 · 180. */
  angle: number;
  /** 힘이 흐르는 각도인가, 마찰이 있는 각도인가. 0은 겹침. */
  harmony: number;
  exact: YearDate[];
  /** "3월 14일 · 7월 2일 · 11월 30일" */
  dateLine: string;
  countLine: string;
  span: string;
  /** 건드려지는 자리의 생활 이름 — "돈이 드나드는 자리". */
  area: string;
  /** 생활 언어 본문. 결론부터 말한다. */
  life: string;
  /** 머리줄 — 자리 · 날짜 · 얼마나 드문가. */
  meta: string;
  /** life의 첫 문장. */
  plain: string;
  /** life의 둘째 문장. 카드 겉면 둘째 줄이다 — 자리 이름을 반복하지 않는다. */
  where: string;
  /** life의 셋째 문장부터. 없으면 "". */
  rest: string;
  /** 두 별의 주제 — 옛 basis. */
  caption: string;
  advice: { try: string; hold: string };
  basis: [string, string, string];
  /** 고른 관심사에 걸리는가. */
  inLens: boolean;
  body: string;
}

export interface YearHalf {
  label: string;
  events: YearReadingEvent[];
  /** 사건이 없는 반년의 한 줄. */
  empty: string | null;
}

export interface YearReading {
  events: YearReadingEvent[];
  halves: [YearHalf, YearHalf];
  /** 올해의 한 줄 — 머리가 되는 사건의 첫 문장. 사건이 없으면 null. */
  headline: string | null;
  /** 해 볼 것 / 미룰 것 — 머리 사건의 별에서 꺼낸다. */
  advice: { try: string; hold: string } | null;
  lensLabel: string | null;
  /** 관심사에 걸린 사건들의 날짜 — "3월 14일 · 7월 2일". 없으면 null. */
  lensDateLine: string | null;
  /** 올해 아무것도 걸리지 않은 경우의 안내. 있으면 목록 대신 이것을 쓴다. */
  quiet: string | null;
  chips: { symbol: string; label: string }[];
}

export function eventDomId(event: YearEvent): string {
  return `year-${event.transiting}-${event.natal}-${event.type.key}`;
}

/** 느릴수록 큰 값. 부적 칩은 오래 가는 것부터 고른다. */
const SLOWNESS: PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

/** 건드려지는 자리의 생활 이름. 하우스를 알면 하우스가, 모르면 별의 자리가 말한다. */
function areaOf(natal: Chart, planet: PlanetKey): string {
  const placement = natal.placements.find((p) => p.planet === planet);
  if (placement?.house != null) return HOUSE_AREAS[placement.house];
  return PLANET_AREAS[planet];
}

/** 하우스를 알면 하우스로만 판정한다 — today-reading의 matchesLens와 같은 이유. */
function matchesLens(natal: Chart, planet: PlanetKey, lens: ConcernLens): boolean {
  const placement = natal.placements.find((p) => p.planet === planet);
  if (placement?.house != null) return lens.houses.includes(placement.house);
  return lens.planets.includes(planet);
}

function describe(event: YearEvent, natal: Chart, lens: ConcernLens | null): YearReadingEvent {
  const moving = PLANET_BY_KEY[event.transiting];
  const fixed = PLANET_BY_KEY[event.natal];
  const meaning = ASPECT_MEANINGS[event.type.key];
  const frame = YEAR_FRAMES[event.transiting];
  const theme = pairTheme(event.transiting, event.natal);
  const span = frame?.span ?? "그 무렵";
  const area = areaOf(natal, event.natal);
  const dateLine = event.exact.map(formatYearDate).join(" · ");
  // 머리줄은 줄인 꼴을 쓴다(스펙 §3.3 "3월 14일 외 2") — 전체 목록은 근거 셋째
  // 줄(basis[2])이 이미 말한다. dateLine(전체 목록)은 강(YearRiver·YearFlow)이
  // 여전히 쓴다.
  const dateAbbrev = `${formatYearDate(event.exact[0])}${event.exact.length > 1 ? ` 외 ${event.exact.length - 1}` : ""}`;
  const every = recurrenceLabel(event.transiting, event.type.angle);

  const placement = natal.placements.find((p) => p.planet === event.natal)!;
  const inLens = lens ? matchesLens(natal, event.natal, lens) : false;

  // where의 마지막 대비책(아래)이 basis[0]을 가리키므로 life보다 먼저 만든다
  // — today-reading.describeTransit과 같은 이유.
  const basis = basisLines({
    tense: "transit",
    a: event.transiting,
    b: event.natal,
    angle: event.type.angle,
    orb: null,
    house: placement.house,
    lens: inLens && lens ? lens.label : null,
    exactLabels: event.exact.map(formatYearDate),
  });

  // "그 무렵 서너 달"은 날짜 뒤에 붙는 표현이라, 문장 속에서는 "서너 달"만 쓴다.
  const life = fillLife(
    TRANSIT_LIFE[toneOf(event.type.harmony)][event.transiting],
    area,
    span.replace(/^그 무렵 /, ""),
  );
  const plain = firstSentence(life);
  const tail = afterFirstSentence(life);
  const where = firstSentence(tail) || tail || basis[0];
  const rest = firstSentence(tail) ? afterFirstSentence(tail) : "";

  return {
    id: eventDomId(event),
    moving,
    fixed,
    aspectSymbol: event.type.symbol,
    angle: event.type.angle,
    harmony: event.type.harmony,
    exact: event.exact,
    dateLine,
    countLine: EXACT_COUNT_LINES[event.exact.length] ?? EXACT_COUNT_LINES[3],
    span,
    area,
    life,
    meta: [area, dateAbbrev, every].filter(Boolean).join(" · "),
    plain,
    where,
    rest,
    caption: theme ? `${theme} — ${meaning.headline}` : meaning.headline,
    advice: TRANSIT_ADVICE[event.transiting],
    basis,
    inLens,
    body: `${meaning.body} ${frame?.brings ?? ""}`.trim(),
  };
}

export function yearReading(natal: Chart, year: number, concern?: string | null): YearReading {
  const lens = concern ? (lensFor(concern) ?? null) : null;
  const found = findYearEvents(natal, year);
  const events = found.map((event) => describe(event, natal, lens));

  const first = events.filter((e) => e.exact[0].at < 0.5);
  const second = events.filter((e) => e.exact[0].at >= 0.5);

  // 칩은 가장 오래 가는 셋이다. 날짜순으로 앞의 셋을 쓰면 1월에 몰린 해에는
  // 한 해 전체가 1월처럼 보인다.
  // 칩 모양은 today-reading.ts와 같은 규칙 — "A–B 각도", 하늘의 별(A)에는 안
  // 붙이고 내 자리(B)에만 '내'를 붙인다.
  const chips = [...events]
    .sort(
      (a, b) =>
        SLOWNESS.indexOf(b.moving.key) - SLOWNESS.indexOf(a.moving.key) ||
        a.exact[0].at - b.exact[0].at,
    )
    .slice(0, 3)
    .map((e) => ({
      symbol: e.moving.symbol,
      label: `${e.moving.ko}–내 ${e.fixed.ko} ${angleLabel(e.angle)}`,
    }));

  // 올해의 머리: 관심사에 걸린 사건이 있으면 그중 가장 오래가는 것, 없으면
  // 전체에서 가장 오래가는 것. 하루짜리가 아니라 몇 달짜리가 한 해를 정의한다.
  const bySlowness = (list: YearReadingEvent[]) =>
    [...list].sort(
      (a, b) =>
        SLOWNESS.indexOf(b.moving.key) - SLOWNESS.indexOf(a.moving.key) ||
        a.exact[0].at - b.exact[0].at,
    );
  const lensEvents = events.filter((e) => e.inLens);
  const top = bySlowness(lensEvents)[0] ?? bySlowness(events)[0] ?? null;

  return {
    events,
    halves: [
      { label: "상반기", events: first, empty: first.length ? null : EMPTY_HALF },
      { label: "하반기", events: second, empty: second.length ? null : EMPTY_HALF },
    ],
    headline: top ? firstSentence(top.life) : null,
    advice: top ? TRANSIT_ADVICE[top.moving.key] : null,
    lensLabel: lens?.label ?? null,
    lensDateLine: lensEvents.length
      ? lensEvents.map((e) => formatYearDate(e.exact[0])).join(" · ")
      : null,
    quiet: events.length === 0 ? QUIET_YEAR : null,
    chips,
  };
}
