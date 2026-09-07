import { ASPECT_TYPES, longitudeOf, type AspectType, type Chart } from "./chart";
import { fromJulianDay, norm180, toJulianDay } from "./ephemeris";
import type { PlanetKey } from "./planets";
import { mercuryRetrogrades, type RetrogradePeriod } from "./retrograde";
import { ZODIAC_SIGNS, type ZodiacSign } from "./zodiac";

/**
 * 한 해의 하늘.
 *
 * `/today`가 "지금 하늘이 내 자리를 어디서 스치는가"라면 여기는 "올해 느린 별들이
 * 내 자리를 **언제** 정확히 건드리는가"다. 그래서 오늘과 달리 오브를 재지 않고
 * **날짜**를 구한다 — 각도가 정확히 맞는 순간을 찾아내는 것이 이 페이지의 전부다.
 *
 * 그 날짜는 베끼기 어렵다. 계산으로만 나오고, 사람마다 다르며, 지어낼 수 없다.
 *
 * 움직이는 쪽은 느린 다섯 별뿐이다. 화성보다 빠른 별은 한 해에 수십 번 각도를
 * 맺어서 목록이 달력이 아니라 소음이 된다 — 그쪽은 `/today`가 맡는다.
 */

const MOVERS: PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

/** 한 자리에 7년 이상 머무는 별. 같은 또래가 모두 같은 값을 갖는다. */
const SLOW = new Set<PlanetKey>(["uranus", "neptune", "pluto"]);

/**
 * 하루 사이에 각도 차이가 이만큼 넘게 뛰었다면 값이 ±180도 경계를 돌아 넘어간
 * 것이지 각도가 맞은 것이 아니다. 여기 다루는 별은 가장 빠른 목성도 하루
 * 0.25도를 넘지 않으므로, 진짜 변화가 이 문턱에 닿는 일은 없다.
 */
const WRAP_GUARD = 30;

/** 각도가 맞는 순간을 이 정밀도까지 좁힌다. 0.02일 ≈ 30분. */
const ROOT_PRECISION_DAYS = 0.02;

function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** 한국 시간 1월 1일 0시의 율리우스일. 한 해의 시작이다. */
export function yearStartJd(year: number): number {
  return toJulianDay(new Date(Date.UTC(year - 1, 11, 31, 15, 0, 0)));
}

export interface YearDate {
  /** 한국 날짜. "2027-03-14" */
  iso: string;
  month: number;
  day: number;
  /** 그 해 안에서의 자리, 0~1. 강물 위 노드의 x가 이 값이다. */
  at: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function yearDate(jd: number, year: number): YearDate {
  const start = yearStartJd(year);
  const span = yearStartJd(year + 1) - start;
  // 한국 시간의 날짜로 적는다. 이 사이트의 다른 날짜와 같은 기준이다.
  const kst = new Date(fromJulianDay(jd).getTime() + 9 * 3600_000);
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  return {
    iso: `${kst.getUTCFullYear()}-${pad(month)}-${pad(day)}`,
    month,
    day,
    at: (jd - start) / span,
  };
}

/** 어떤 황경 차이에서 그 각도가 정확해지는가. 합과 대립은 한 곳, 나머지는 양쪽. */
function targetsOf(type: AspectType): number[] {
  if (type.angle === 0 || type.angle === 180) return [type.angle];
  return [type.angle, -type.angle];
}

/** 별의 황경이 목표 황경과 같아지는 순간을 이분법으로 좁힌다. */
export function refineCrossing(planet: PlanetKey, target: number, lowJd: number, highJd: number): number {
  const offset = (jd: number) => norm180(longitudeOf(planet, jd) - target);
  let low = lowJd;
  let high = highJd;
  const lowSign = Math.sign(offset(low));
  while (high - low > ROOT_PRECISION_DAYS) {
    const mid = (low + high) / 2;
    if (Math.sign(offset(mid)) === lowSign) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export interface YearEvent {
  /** 올해 움직이는 별. */
  transiting: PlanetKey;
  /** 내 차트에서 그 별이 건드리는 자리. */
  natal: PlanetKey;
  type: AspectType;
  /**
   * 각도가 정확해지는 날들.
   *
   * 대개 하나지만 셋인 경우가 있다. 느린 별은 한 해에 넉 달쯤 역행하는데, 각도를
   * 맺고 지나간 뒤 되돌아와 한 번 더 맺고, 다시 순행으로 돌아서며 세 번째로
   * 맺는다. 같은 일이 세 번 온다는 뜻이 아니라 한 가지 일이 세 번에 걸쳐
   * 진행된다는 뜻이라, 이 페이지는 세 날짜를 한 줄로 묶어 보여준다.
   */
  exact: YearDate[];
}

/**
 * 올해 느린 별들이 내 차트와 정확히 각도를 맺는 날.
 *
 * 별 하나의 하루 간격 위치를 먼저 한 벌 구해 두고 그 배열로 열 개의 자리 × 여덟
 * 각도를 훑는다. 그러지 않으면 같은 위치 계산을 80번씩 되풀이한다.
 */
export function findYearEvents(natal: Chart, year: number): YearEvent[] {
  const start = yearStartJd(year);
  const days = Math.round(yearStartJd(year + 1) - start);
  const merged = new Map<string, YearEvent>();

  for (const mover of MOVERS) {
    const sampled: number[] = [];
    for (let i = 0; i <= days; i += 1) sampled.push(longitudeOf(mover, start + i));

    for (const placement of natal.placements) {
      // 세대 행성끼리 맺는 각도는 뺀다. 천왕성이 내 해왕성에 각도를 맺는 해는 같은
      // 또래 전체에게 같은 해이고, 게다가 그 반대 방향(해왕성 → 내 천왕성)이 거의
      // 같은 날 함께 잡혀 같은 사건이 두 줄로 올라온다.
      if (SLOW.has(mover) && SLOW.has(placement.planet)) continue;

      for (const type of ASPECT_TYPES) {
        for (const target of targetsOf(type)) {
          const meeting = placement.longitude + target;
          const offset = (longitude: number) => norm180(longitude - meeting);

          let previous = offset(sampled[0]);
          for (let i = 1; i <= days; i += 1) {
            const current = offset(sampled[i]);
            const crossed =
              Math.sign(current) !== Math.sign(previous) &&
              Math.abs(current - previous) < WRAP_GUARD;
            previous = current;
            if (!crossed) continue;

            const jd = refineCrossing(mover, meeting, start + i - 1, start + i);
            const key = `${mover}-${placement.planet}-${type.key}`;
            const existing = merged.get(key);
            if (existing) existing.exact.push(yearDate(jd, year));
            else
              merged.set(key, {
                transiting: mover,
                natal: placement.planet,
                type,
                exact: [yearDate(jd, year)],
              });
          }
        }
      }
    }
  }

  const events = [...merged.values()];
  for (const event of events) event.exact.sort((a, b) => a.at - b.at);
  return events.sort((a, b) => a.exact[0].at - b.exact[0].at);
}

export interface SignSpan {
  sign: ZodiacSign;
  /** 이 자리에 들어선 날. 해가 시작될 때 이미 있었으면 null. */
  from: YearDate | null;
}

/**
 * 그 별이 올해 어느 자리에 머무는가. 자리를 옮기면 그 날짜까지.
 *
 * 같은 자리가 두 번 나오는 일이 있다. 별이 다음 자리에 발을 들였다가 역행으로
 * 되돌아 나온 뒤 다시 들어서는 경우인데, 실제로 일어나는 일이므로 합치지 않고
 * 일어난 순서대로 남긴다.
 */
export function signSpans(planet: PlanetKey, year: number): SignSpan[] {
  const start = yearStartJd(year);
  const days = Math.round(yearStartJd(year + 1) - start);
  const signIndex = (longitude: number) => Math.floor(norm360(longitude) / 30);

  let previous = signIndex(longitudeOf(planet, start));
  const spans: SignSpan[] = [{ sign: ZODIAC_SIGNS[previous], from: null }];

  for (let i = 1; i <= days; i += 1) {
    const index = signIndex(longitudeOf(planet, start + i));
    if (index === previous) continue;
    // 넘은 경계가 어느 도수인지는 방향이 정한다. 순행이면 새로 들어선 자리의
    // 0도이고, 역행이면 방금까지 있던 자리의 0도로 되돌아 나온 것이다.
    const forward = (index - previous + 12) % 12 === 1;
    const boundary = (forward ? index : previous) * 30;
    spans.push({
      sign: ZODIAC_SIGNS[index],
      from: yearDate(refineCrossing(planet, boundary, start + i - 1, start + i), year),
    });
    previous = index;
  }
  return spans;
}

/** 올해에 걸치는 수성 역행 구간. 해를 넘어 걸친 것도 포함한다. */
export function yearRetrogrades(year: number): RetrogradePeriod[] {
  const startJd = yearStartJd(year);
  const endJd = yearStartJd(year + 1);
  // 경계에 걸친 구간은 mercuryRetrogrades가 버리므로, 앞뒤로 넉넉히 잡아 훑은 뒤
  // 올해와 겹치는 것만 남긴다. 역행 한 번이 3주라 80일이면 충분하다.
  const found = mercuryRetrogrades(fromJulianDay(startJd - 80), fromJulianDay(endJd + 80));
  return found.filter((period) => {
    const from = toJulianDay(new Date(period.start));
    const to = toJulianDay(new Date(period.end));
    return to >= startJd && from < endJd;
  });
}
