import type { Chart } from "@/lib/chart";
import { planetPosition, toJulianDay } from "@/lib/ephemeris";

/**
 * 출생 순간부터 오늘까지, 느린 별 다섯의 길.
 *
 * 태양·달·수성·금성·화성은 그리지 않는다 — 31년에 태양 31바퀴, 달 400바퀴라
 * 화면에 원으로 뭉개진다. 목성(12년)·토성(29.5년)·천왕성(84년)·해왕성·명왕성만
 * 남기면 그림이 한 문장을 말한다: 토성이 한 바퀴 돌아 제자리에 왔다.
 *
 * 361점 균등 샘플. 느린 별은 한 스텝(~32일)에 180°를 넘지 않으므로 이웃 차가
 * ±180을 넘으면 360 보정해 누적(언랩)한다. 미리 계산한 표를 두지 않는다 —
 * 같은 엔진을 그 자리에서 부른다.
 */
export const SLOW_BODIES = ["jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
export type SlowBody = (typeof SLOW_BODIES)[number];

export interface LapseSeries {
  steps: number;
  /** 언랩 누적 황경. [0]은 네이탈 황경. */
  series: Record<SlowBody, number[]>;
  /** 돈 바퀴 수. */
  travel: Record<SlowBody, number>;
  /** 오늘 황경 0~360. */
  today: Record<SlowBody, number>;
}

export function sampleLapse(chart: Chart, now: Date, steps = 360): LapseSeries {
  const jd0 = chart.julianDay;
  const jd1 = toJulianDay(now);
  const series = {} as Record<SlowBody, number[]>;
  const travel = {} as Record<SlowBody, number>;
  const today = {} as Record<SlowBody, number>;
  for (const body of SLOW_BODIES) {
    const natal = chart.placements.find((p) => p.planet === body)!.longitude;
    const out: number[] = [natal];
    let acc = natal;
    let last = natal;
    for (let i = 1; i <= steps; i += 1) {
      const lon = planetPosition(body, jd0 + ((jd1 - jd0) * i) / steps).longitude;
      let d = lon - last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      acc += d;
      last = lon;
      out.push(acc);
    }
    series[body] = out;
    travel[body] = (acc - natal) / 360;
    today[body] = ((acc % 360) + 360) % 360;
  }
  return { steps, series, travel, today };
}
