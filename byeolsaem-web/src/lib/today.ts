import {
  ASPECT_TYPES,
  angleBetween,
  longitudeOf,
  type AspectType,
  type Chart,
  type Placement,
} from "./chart";
import { toJulianDay } from "./ephemeris";
import { moonPhaseAngle, moonPhaseOf, moonIllumination, moonPosition, type MoonPhase } from "./moon";
import { PLANETS, type PlanetKey } from "./planets";
import { signAtLongitude, type ZodiacSign } from "./zodiac";

/**
 * 오늘의 하늘, 그리고 그것이 내 차트와 만나는 자리.
 *
 * 계산은 출생 차트와 같은 천문력을 쓴다. 다른 것은 시점뿐이다 — 태어난 순간 대신
 * 지금이다. 그래서 별도의 천문 코드를 두지 않는다.
 *
 * 하루 안에서도 달은 13도쯤 움직인다. 그래서 "오늘"의 기준 시각을 정해야 하는데,
 * 한국 시간 정오를 쓴다. 자정을 쓰면 날짜가 바뀌는 그 순간의 하늘이 되어 대부분의
 * 사람이 실제로 보는 하루와 어긋나고, 지금 시각을 쓰면 새로고침할 때마다 값이
 * 조금씩 달라져 "오늘의 카드"가 하루 동안 같은 카드가 아니게 된다.
 */

/** 한국 시간 정오의 율리우스일. 그 날짜의 대푯값이다. */
export function noonJulianDay(date: Date): number {
  const kst = new Date(date.getTime() + 9 * 3600_000);
  return toJulianDay(
    new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 3, 0, 0)),
  );
}

export interface TodaySky {
  julianDay: number;
  /** 화면에 쓰는 날짜. 한국 시간 기준. */
  date: { year: number; month: number; day: number; weekday: string };
  moon: {
    longitude: number;
    sign: ZodiacSign;
    phase: MoonPhase;
    /** 0(그믐)~1(보름). 화면에는 백분율로 쓴다. */
    illumination: number;
  };
  sun: { longitude: number; sign: ZodiacSign };
  placements: Placement[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function todaySky(now: Date): TodaySky {
  const jd = noonJulianDay(now);
  const kst = new Date(now.getTime() + 9 * 3600_000);

  const moonLongitude = moonPosition(jd).longitude;
  const sunLongitude = longitudeOf("sun", jd);
  const phaseAngle = moonPhaseAngle(sunLongitude, moonLongitude);

  const placements: Placement[] = PLANETS.map((planet) => {
    const longitude = longitudeOf(planet.key, jd);
    // 하루 뒤와 견줘 역행 여부를 본다. 출생 차트와 같은 방식이다.
    const tomorrow = longitudeOf(planet.key, jd + 1);
    const step = ((tomorrow - longitude + 540) % 360) - 180;
    return {
      planet: planet.key,
      longitude,
      sign: signAtLongitude(longitude),
      degree: longitude % 30,
      // 오늘의 하늘에는 하우스가 없다. 하우스는 태어난 곳의 위도가 있어야 나오고,
      // 여기서 말하는 것은 "지금 하늘이 어떤가"이지 "누구의 하늘인가"가 아니다.
      house: null,
      retrograde: step < 0,
    };
  });

  return {
    julianDay: jd,
    date: {
      year: kst.getUTCFullYear(),
      month: kst.getUTCMonth() + 1,
      day: kst.getUTCDate(),
      weekday: WEEKDAYS[kst.getUTCDay()],
    },
    moon: {
      longitude: moonLongitude,
      sign: signAtLongitude(moonLongitude),
      phase: moonPhaseOf(phaseAngle),
      illumination: moonIllumination(phaseAngle),
    },
    sun: { longitude: sunLongitude, sign: signAtLongitude(sunLongitude) },
    placements,
  };
}

export interface Transit {
  /** 오늘 하늘에서 움직이는 별. */
  transiting: PlanetKey;
  /** 내 차트에서 그 별이 건드리는 자리. */
  natal: PlanetKey;
  type: AspectType;
  orb: number;
  /** 0~1. 정확한 각도에 가까울수록 1. */
  strength: number;
}

/**
 * 트랜짓 오브는 출생 차트보다 좁게 잡는다.
 *
 * 출생 차트의 어스펙트는 평생 그 자리에 있으므로 넉넉하게 봐도 된다. 트랜짓은
 * "오늘 무슨 일이 있는가"를 말하는 것이라, 넓게 잡으면 며칠 내내 같은 항목이
 * 걸려 오늘이 어제와 다르지 않게 된다.
 */
export const TRANSIT_ORB = 3;
/** 달은 하루에 13도를 가므로 같은 오브를 쓰면 하루 안에 들어왔다 나간다. */
const MOON_ORB = 6;

/**
 * 오늘 하늘이 내 출생 차트를 건드리는 자리.
 *
 * 세대 행성(천왕성·해왕성·명왕성)은 몇 달씩 같은 각도에 머문다. 오늘의 이야기로
 * 쓰기에는 너무 느려서, 트랜짓 쪽에서는 빼고 내 차트 쪽 대상으로만 남긴다 —
 * "오늘의 화성이 내 명왕성에"는 오늘의 일이지만 그 반대는 아니다.
 */
const SLOW = new Set<PlanetKey>(["uranus", "neptune", "pluto"]);

export function findTransits(sky: TodaySky, natal: Chart, limit = 4): Transit[] {
  const found: Transit[] = [];

  for (const moving of sky.placements) {
    if (SLOW.has(moving.planet)) continue;
    const orbLimit = moving.planet === "moon" ? MOON_ORB : TRANSIT_ORB;

    for (const fixed of natal.placements) {
      for (const type of ASPECT_TYPES) {
        const orb = Math.abs(angleBetween(moving.longitude, fixed.longitude) - type.angle);
        if (orb > orbLimit) continue;
        found.push({
          transiting: moving.planet,
          natal: fixed.planet,
          type,
          orb,
          strength: 1 - orb / orbLimit,
        });
      }
    }
  }

  // 정확한 각도에 가까운 것부터. 같은 오차라면 느린 행성이 먼저다 — 달의 각도는
  // 몇 시간이면 지나가지만 토성의 각도는 몇 주를 간다.
  return found
    .sort((a, b) => b.strength - a.strength || weight(b.transiting) - weight(a.transiting))
    .slice(0, limit);
}

/** 느릴수록 큰 값. 같은 정확도면 오래가는 쪽을 앞에 둔다. */
function weight(planet: PlanetKey): number {
  return ["moon", "mercury", "venus", "sun", "mars", "jupiter", "saturn"].indexOf(planet);
}
