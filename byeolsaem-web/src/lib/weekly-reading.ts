import { TRANSIT_FRAME, TRANSIT_SELF, TRANSIT_SKY } from "@/content/atoms/transits";
import { basisLines } from "./basis";
import { eventsBetween, type CalendarEvent } from "./calendar-events";
import { eventTitle } from "./calendar-copy";
import { ASPECT_TYPES, angleBetween, longitudeOf, type Chart } from "./chart";
import { toJulianDay } from "./ephemeris";
import { PLANETS } from "./planets";
import { kstParts } from "./retrograde-clock";

/**
 * 이번 주 하늘 — /today(하루)와 /yearly(일 년) 사이의 시간 축.
 * 주는 한국 달력의 월요일 00:00에 시작한다.
 */
const DAY_MS = 86400000;
const KST_MS = 9 * 3600000;
const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function kstWeekStart(now: Date): Date {
  const kst = new Date(now.getTime() + KST_MS);
  const dow = (kst.getUTCDay() + 6) % 7; // 월=0
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - dow) - KST_MS);
}

export interface WeeklyData {
  /** 주 시작(월요일 00:00 KST)의 UTC ISO */
  weekStart: string;
  events: CalendarEvent[];
  headline: string;
  summary: string;
}

/** 헤드라인이 앞세우는 순서 — 역행이 삭망보다, 삭망이 인그레스보다 크다. */
const PRIORITY: CalendarEvent["kind"][] = ["retro-start", "retro-end", "new-moon", "full-moon", "ingress", "moon-ingress"];

function headlineOf(ev: CalendarEvent): string {
  switch (ev.kind) {
    case "retro-start": return `${ev.planetKo}이 걸음을 되짚기 시작하는 주입니다.`;
    case "retro-end": return `${ev.planetKo}이 다시 앞으로 걷기 시작하는 주입니다.`;
    case "new-moon": return `${ev.signKo} 신월에서 새로 시작하는 주입니다.`;
    case "full-moon": return `${ev.signKo} 보름이 한가운데 놓인 주입니다.`;
    case "ingress": return `태양이 ${ev.signKo}로 들어서는 주입니다.`;
    case "moon-ingress": return `달이 ${ev.signKo}로 옮겨 가는 주입니다.`;
  }
}

/** 요약문에 끼워 넣는 명사형 이름. 다섯 kind 모두 받침으로 끝나 "이 있습니다"와 항상 맞물린다. */
function summaryName(ev: CalendarEvent): string {
  return ev.kind === "ingress" ? `태양의 ${ev.signKo} 진입` : eventTitle(ev);
}

/**
 * 달의 이동은 요약에서 따로 묶는다. 한 주에 두세 번이라 다른 사건과 한 줄에
 * 늘어놓으면 문장이 길어지고, 무게도 다르다 — 삭망은 그 주의 제목이 되지만
 * 달의 이동은 배경음에 가깝다.
 */
function moonLineOf(moons: { date: string; signKo: string }[]): string {
  if (moons.length === 0) return "";
  const parts = moons.map((e) => `${kstParts(e.date).day}일 ${e.signKo}`);
  return `달은 ${parts.join(", ")}로 자리를 옮깁니다.`;
}

export function weeklyData(now: Date): WeeklyData {
  const start = kstWeekStart(now);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  // 달의 이동까지 싣는다. 삭망·역행·태양 인그레스만 세면 한 주가 통째로 비는
  // 주가 생기고, 그런 주의 화면에는 "조용합니다" 한 줄밖에 남지 않았다.
  const events = eventsBetween(start, end, { moon: true });
  const moons = events.filter((e) => e.kind === "moon-ingress");
  const major = events.filter((e) => e.kind !== "moon-ingress");
  const moonLine = moonLineOf(moons);

  if (major.length === 0) {
    return {
      weekStart: start.toISOString(),
      events,
      headline: "큰 이동 없이 달만 걸어가는 주입니다.",
      summary: moonLine
        ? `${moonLine} 삭망도 역행의 전환도 없는 주라, 벌여 둔 것을 마저 하기 좋은 시간입니다.`
        : "벌여 둔 것을 마저 하기 좋은 시간입니다.",
    };
  }
  const top = [...major].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0];
  const rest = major.filter((e) => e !== top);
  const restLine =
    rest.length === 0
      ? "이 주의 큰 사건은 이 하나입니다."
      : `그 밖에 ${rest.map((e) => `${kstParts(e.date).day}일 ${summaryName(e)}`).join(", ")}이 있습니다.`;
  return {
    weekStart: start.toISOString(),
    events,
    headline: headlineOf(top),
    summary: moonLine ? `${restLine} ${moonLine}` : restLine,
  };
}

export interface WeeklyTouch {
  /** 그 날 정오 KST의 UTC ISO */
  date: string;
  dowKo: string;
  text: string;
  /** 별길 그림의 짧은 라벨 — "금성–화성 60°" 꼴로 조립한다. */
  movingKo: string;
  fixedKo: string;
  /** 별길 그림의 라벨에 쓰는 각도 숫자. */
  angle: number;
  /** 펼치면 나오는 풀이 — 트랜싯 아톰 세 조각을 이어 붙인다. */
  detail: string;
  basis: [string, string, string];
}

/**
 * 이번 주 내 차트에 닿는 각도 — 일곱 날의 정오 하늘을 natal과 겹쳐 본다.
 * orb 1도 이내만 싣고, 같은 (움직이는 별, 내 별, 각) 쌍은 orb가 가장 작은 날
 * 하나만 남긴다. 트랜싯 어휘는 /today 뒷면과 같은 결이다.
 */
export function weeklyPersonal(weekStart: Date, natal: Chart): WeeklyTouch[] {
  const best = new Map<string, { orb: number; touch: WeeklyTouch }>();
  const planetKo = new Map(PLANETS.map((p) => [p.key, p.ko]));

  for (let day = 0; day < 7; day += 1) {
    const at = new Date(weekStart.getTime() + day * DAY_MS + (12 - 9) * 3600000); // 정오 KST
    const jd = toJulianDay(at);
    const dowKo = DOW_KO[new Date(at.getTime() + 9 * 3600000).getUTCDay()];
    for (const moving of PLANETS) {
      const movingLon = longitudeOf(moving.key, jd);
      for (const fixed of natal.placements) {
        for (const type of ASPECT_TYPES) {
          const orb = Math.abs(angleBetween(movingLon, fixed.longitude) - type.angle);
          if (orb > 1) continue;
          const key = `${moving.key}-${fixed.planet}-${type.key}`;
          const fixedKo = planetKo.get(fixed.planet) ?? fixed.planet;
          const meets = type.angle === 0 ? "겹칩니다" : `${type.angle}도를 이룹니다`;
          const touch: WeeklyTouch = {
            date: at.toISOString(),
            dowKo,
            // natal 별 이름 10개(태양·달·수성·금성·화성·목성·토성·천왕성·해왕성·명왕성)는
            // 전부 받침으로 끝나므로 "과"가 항상 맞다("와"를 쓰면 어긋난다).
            text: `${dowKo}요일 — 하늘의 ${moving.ko}이 내 ${fixedKo}과 ${meets}.`,
            movingKo: moving.ko,
            fixedKo,
            angle: type.angle,
            detail: `하늘의 ${moving.ko} — ${TRANSIT_SKY[moving.key]}. 내 ${fixedKo} — ${TRANSIT_SELF[fixed.planet]}. ${TRANSIT_FRAME[type.key]}`,
            basis: basisLines({
              tense: "transit",
              a: moving.key,
              b: fixed.planet,
              angle: type.angle,
              orb,
              house: fixed.house,
            }),
          };
          const prev = best.get(key);
          if (!prev || orb < prev.orb) best.set(key, { orb, touch });
        }
      }
    }
  }
  return [...best.values()]
    .sort((a, b) => a.touch.date.localeCompare(b.touch.date))
    .map((v) => v.touch);
}
