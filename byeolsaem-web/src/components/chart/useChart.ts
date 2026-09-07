"use client";
import { useMemo } from "react";
import { computeChart, type Chart } from "@/lib/chart";
import { coordinatesFor, koreaOffsetHours } from "@/lib/coordinates";
import { assembleReading, type Reading } from "@/lib/reading";
import type { BirthProfile } from "@/lib/birth-profile";

export type ChartState =
  | { status: "ready"; chart: Chart; reading: Reading }
  /** 태어난 곳을 좌표로 옮기지 못했다. 목록에 없는 문자열이 저장된 경우. */
  | { status: "unknown-place" };

/**
 * 저장된 출생 정보로 차트를 계산한다.
 *
 * useMemo로 감싸는 이유는 비용이다. 열 개의 별 위치를 구하고 역행까지 판정하면
 * 케플러 방정식이 스무 번 넘게 풀린다. 한 번은 몇 밀리초라 문제가 없지만,
 * 리렌더마다 다시 하면 탭 하나 누를 때마다 그 값을 치른다.
 */
export function useChart(profile: BirthProfile | null): ChartState | null {
  return useMemo(() => {
    if (!profile) return null;
    const coordinates = coordinatesFor(profile.city);
    // 좌표를 모르면 서울로 대신 채우지 않는다. 엉뚱한 자리로 계산한 하우스는
    // 비어 있는 것보다 나쁘다.
    if (!coordinates) return { status: "unknown-place" as const };

    const chart = computeChart({
      date: profile.date,
      time: profile.time,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezoneOffsetHours: koreaOffsetHours(profile.date, profile.time),
    });

    return { status: "ready" as const, chart, reading: assembleReading(chart, profile.concern) };
  }, [profile]);
}
