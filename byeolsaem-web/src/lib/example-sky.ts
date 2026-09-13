import { computeChart, type BirthMoment, type Chart } from "./chart";
import { assembleReading, type Reading } from "./reading";
import { solarReturnChart } from "./solar-return";
import { synastryReading, type SynastryReading } from "./synastry-reading";

/**
 * 예시 하늘 — 출생 정보를 넣기 전의 /natal이 보여주는 고정 차트.
 *
 * 왜 예시가 먼저인가: 정보가 없으면 결과물의 생김새를 알 길이 없었고, 그 상태로
 * "생일·시각·장소부터 내라"는 순서였다(시안 2026-08-22 승인). 예시를 실제 결과와
 * 같은 조립기로 렌더하면 예시가 곧 결과물의 정직한 미리보기가 된다.
 *
 * 날짜는 임의의 과거 한 시점이다. 실존 인물의 것이 아니고, 화면이 날짜·시각·장소를
 * 처음부터 밝힌다 — 개인화인 척하지 않는 것이 이 기능의 신뢰 조건이다.
 * 시각이 있는 차트라 상승궁까지 전부 보인다.
 */
export const EXAMPLE_BIRTH = {
  /** 화면에 그대로 보여 주는 문구. 계산 입력과 어긋나면 안 된다(테스트가 지킨다). */
  label: "1995년 7월 14일 오전 9시 30분, 서울에서 태어난 사람의 하늘",
  date: "1995-07-14",
  time: "09:30",
  latitude: 37.5665,
  longitude: 126.978,
  timezoneOffsetHours: 9,
} as const;

/** 모듈 로드 시 한 번만 계산한다. 결정론이라 캐시가 곧 정답이다. */
let cached: { natal: BirthMoment; chart: Chart; reading: Reading } | null = null;

/**
 * `natal`도 함께 돌려준다 — 차트만으로는 안 되는 계산이 있다. /chapters의
 * 프로펙션과 릴리징은 태어난 **날짜**에서 나이를 세므로 `BirthMoment`가 필요하다.
 * 부르는 쪽에서 EXAMPLE_BIRTH를 다시 조립하면 그 조립이 여기와 어긋날 수 있어
 * 만든 자리에서 함께 내보낸다.
 */
export function exampleSky(): { natal: BirthMoment; chart: Chart; reading: Reading } {
  if (!cached) {
    const natal: BirthMoment = {
      date: EXAMPLE_BIRTH.date,
      time: EXAMPLE_BIRTH.time,
      latitude: EXAMPLE_BIRTH.latitude,
      longitude: EXAMPLE_BIRTH.longitude,
      timezoneOffsetHours: EXAMPLE_BIRTH.timezoneOffsetHours,
    };
    const chart = computeChart(natal);
    cached = { natal, chart, reading: assembleReading(chart, null) };
  }
  return cached;
}

/**
 * 예시 궁합의 상대 — /synastry의 정보 없음 화면이 쓰는 두 번째 고정 차트.
 * 이 짝은 한 줄 요약·해 볼 것·이름 붙은 조합(내 태양 육분 그쪽 달)이 모두
 * 나오도록 골랐다(테스트가 지킨다). 첫 사람은 EXAMPLE_BIRTH를 그대로 쓴다 —
 * 예시 인물이 페이지마다 다르면 예시가 아니라 사람처럼 보이기 시작한다.
 */
export const EXAMPLE_PARTNER_BIRTH = {
  label: "1995년 7월 14일 서울에서 태어난 사람과 1997년 4월 19일 부산에서 태어난 사람의 만남",
  date: "1997-04-19",
  time: "20:10",
  latitude: 35.1796,
  longitude: 129.0756,
  timezoneOffsetHours: 9,
} as const;

let cachedMeeting: { mine: Chart; theirs: Chart; reading: SynastryReading } | null = null;

export function exampleMeeting(): { mine: Chart; theirs: Chart; reading: SynastryReading } {
  if (!cachedMeeting) {
    const mine = exampleSky().chart;
    const theirs = computeChart({
      date: EXAMPLE_PARTNER_BIRTH.date,
      time: EXAMPLE_PARTNER_BIRTH.time,
      latitude: EXAMPLE_PARTNER_BIRTH.latitude,
      longitude: EXAMPLE_PARTNER_BIRTH.longitude,
      timezoneOffsetHours: EXAMPLE_PARTNER_BIRTH.timezoneOffsetHours,
    });
    cachedMeeting = { mine, theirs, reading: synastryReading(mine, theirs, null) };
  }
  return cachedMeeting;
}

/**
 * 예시 솔라 리턴 — /solar-return의 정보 없음 화면. EXAMPLE_BIRTH과 같은 사람이다
 * (예시 인물이 페이지마다 다르면 사람처럼 보이기 시작한다 — exampleMeeting 주석 참고).
 * now에 따라 유효한 리턴이 달라지므로 캐시하지 않는다.
 */
export function exampleSolarReturn(now: Date): { instant: Date; nextInstant: Date; chart: Chart } {
  return solarReturnChart(
    {
      date: EXAMPLE_BIRTH.date,
      time: EXAMPLE_BIRTH.time,
      latitude: EXAMPLE_BIRTH.latitude,
      longitude: EXAMPLE_BIRTH.longitude,
      timezoneOffsetHours: EXAMPLE_BIRTH.timezoneOffsetHours,
    },
    now,
  );
}
