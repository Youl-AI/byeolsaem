import { longitudeOf } from "./chart";
import { fromJulianDay, norm180 } from "./ephemeris";
import type { PlanetKey } from "./planets";
import { refineCrossing } from "./yearly";

/**
 * 느린 별의 통과 — 언제 시작해 언제 끝나고 언제 가장 진한가.
 *
 * `/today`는 오브를 재고 `/yearly`는 정확한 날을 구한다. 이 파일은 그 둘 사이다:
 * 오늘 걸려 있는 느린 별의 각이 언제부터 언제까지 걸려 있는지를 오늘에서 앞뒤로
 * 하루씩 걸어 찾는다. 역행으로 잠깐 벗어났다 돌아오는 것은 한 통과로 친다 —
 * 토성이면 아홉 달, 정확한 날이 셋까지 나온다.
 *
 * 빠른 별에는 쓰지 않는다. 몇 시간짜리에 날짜를 붙이면 과장이 된다.
 */

/** `/today`의 TRANSIT_ORB와 같은 값. 여기서 갈리면 카드의 기간과 목록의 기준이 어긋난다. */
export const PASSAGE_ORB = 3;
export const SLOW_MOVERS: readonly PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
/** 이보다 긴 빈틈은 다른 통과다. 토성의 역행 고리는 넉 달을 넘지 않는다. */
const MERGE_GAP_DAYS = 120;
const SEARCH_DAYS = 400;
/** 하루 사이 이만큼 뛰면 ±180 경계를 넘은 것이지 정점이 아니다(yearly.ts와 같다). */
const WRAP_GUARD = 30;

export interface PassageDate {
  jd: number;
  year: number;
  month: number;
  day: number;
}

export interface Passage {
  start: PassageDate | null;
  end: PassageDate | null;
  peaks: PassageDate[];
  progress: number | null;
}

export type LongitudeAt = (planet: PlanetKey, jd: number) => number;

function kstDate(jd: number): PassageDate {
  const kst = new Date(fromJulianDay(jd).getTime() + 9 * 3600_000);
  return { jd, year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate() };
}

/** 오늘에서 한 방향으로 걸어 통과의 끝을 찾는다. `dir`은 -1(과거) 또는 +1(미래). */
function edge(orbAt: (jd: number) => number, todayJd: number, dir: -1 | 1): number | null {
  let lastIn = todayJd;
  let gap = 0;
  for (let i = 1; i <= SEARCH_DAYS; i += 1) {
    const jd = todayJd + dir * i;
    if (orbAt(jd) <= PASSAGE_ORB) {
      lastIn = jd;
      gap = 0;
    } else {
      gap += 1;
      if (gap > MERGE_GAP_DAYS) return lastIn;
    }
  }
  return null;
}

export function transitPassage(
  mover: PlanetKey,
  natalLongitude: number,
  angle: number,
  todayJd: number,
  longitudeAt: LongitudeAt = longitudeOf,
): Passage | null {
  if (!SLOW_MOVERS.includes(mover)) return null;

  const orbAt = (jd: number) => Math.abs(Math.abs(norm180(longitudeAt(mover, jd) - natalLongitude)) - angle);
  const startJd = edge(orbAt, todayJd, -1);
  const endJd = edge(orbAt, todayJd, 1);

  // 정점 — 목표 황경(natal ± angle)을 지나는 순간. yearly.ts와 같은 방법이다.
  const lo = startJd ?? todayJd - SEARCH_DAYS;
  const hi = endJd ?? todayJd + SEARCH_DAYS;
  const targets = angle === 0 || angle === 180 ? [natalLongitude + angle] : [natalLongitude + angle, natalLongitude - angle];
  const peaks: PassageDate[] = [];
  for (const target of targets) {
    const offset = (jd: number) => norm180(longitudeAt(mover, jd) - target);
    let previous = offset(lo);
    for (let jd = lo + 1; jd <= hi; jd += 1) {
      const current = offset(jd);
      const crossed = Math.sign(current) !== Math.sign(previous) && Math.abs(current - previous) < WRAP_GUARD;
      previous = current;
      if (!crossed) continue;
      // 합성 경도 함수를 쓸 때도 refineCrossing이 실제 longitudeOf를 부르지 않게, 여기서 직접 좁힌다.
      peaks.push(kstDate(longitudeAt === longitudeOf ? refineCrossing(mover, target, jd - 1, jd) : jd - 0.5));
    }
  }
  peaks.sort((a, b) => a.jd - b.jd);

  const progress =
    startJd !== null && endJd !== null && endJd > startJd
      ? Math.min(1, Math.max(0, (todayJd - startJd) / (endJd - startJd)))
      : null;

  return {
    start: startJd === null ? null : kstDate(startJd),
    end: endJd === null ? null : kstDate(endJd),
    peaks,
    progress,
  };
}

/** 공전 주기(년). 느린 별만. */
const ORBIT_YEARS: Partial<Record<PlanetKey, number>> = {
  jupiter: 11.86,
  saturn: 29.46,
  uranus: 84.0,
  neptune: 164.8,
  pluto: 248,
};

/** 84년 이상이면 "평생 한 번" — 천왕성의 합·대립부터. */
export function recurrenceLabel(mover: PlanetKey, angle: number): string | null {
  const years = ORBIT_YEARS[mover];
  if (!years) return null;
  const perCycle = angle === 0 || angle === 180 ? 1 : 2;
  const every = Math.round(years / perCycle);
  return every >= 84 ? "평생 한 번" : `${every}년에 한 번`;
}

export function formatPassageDate(date: PassageDate, todayYear: number): string {
  const md = `${date.month}월 ${date.day}일`;
  return date.year === todayYear ? md : `${date.year}년 ${md}`;
}

export function passageRange(passage: Passage, todayYear: number): string {
  const { start, end } = passage;
  if (start && end) return `${formatPassageDate(start, todayYear)} – ${formatPassageDate(end, todayYear)}`;
  if (start) return `${formatPassageDate(start, todayYear)}부터`;
  if (end) return `${formatPassageDate(end, todayYear)}까지`;
  return "";
}
