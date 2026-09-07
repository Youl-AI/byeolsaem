"use client";
import { useEffect, useMemo, useState } from "react";
import { UnknownPlace } from "@/components/chart/NoProfile";
import { GoldButton } from "@/components/ui/GoldButton";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { computeChart, type BirthMoment, type Chart } from "@/lib/chart";
import { coordinatesFor, koreaOffsetHours } from "@/lib/coordinates";
import { requestRitual } from "@/lib/ritual";
import { currentProfection, profectionYears } from "@/lib/time-lords";
import { ProfectionSection } from "./ProfectionSection";
import { ReleasingSection } from "./ReleasingSection";

/**
 * /chapters의 본문 게이트.
 *
 * 두 시간법 모두 상승궁에서 출발하므로 예시 차트를 보여주지 않는다 — 예시로
 * 흉내 내면 "아무 시각이나 넣어도 되는 계산"처럼 보인다. 프로필이 없으면
 * 열기를 권하고, 시각이 없으면 계산하지 않는 이유를 밝힌다. SolarScope와
 * 같은 마운트 계약: 서버 HTML과 첫 클라이언트 렌더는 항상 "열기 전" 화면.
 */
export function ChaptersScope() {
  const { profile } = useBirthProfile();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const natalAndChart = useMemo((): { natal: BirthMoment; chart: Chart } | null => {
    if (!profile || !now) return null;
    const coordinates = coordinatesFor(profile.city);
    if (!coordinates) return null;
    const natal: BirthMoment = {
      date: profile.date,
      time: profile.time,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezoneOffsetHours: koreaOffsetHours(profile.date, profile.time),
    };
    return { natal, chart: computeChart(natal) };
  }, [profile, now]);

  if (profile && now && !coordinatesFor(profile.city)) {
    return <UnknownPlace city={profile.city} />;
  }

  // 열기 전(서버 HTML 포함) — 계산 숫자는 하나도 그리지 않는다.
  if (!natalAndChart || !now) {
    return (
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-gold/35 bg-ink-raised/85 px-5 py-4">
        <p className="min-w-[240px] flex-1 break-keep text-starlight">
          이 페이지의 계산은 태어난 순간에서 출발합니다 — 내 하늘을 열면
          올해의 자리와 인생의 장이 바로 계산됩니다.
        </p>
        <GoldButton variant="solid" onClick={() => requestRitual()}>
          내 하늘 열기
        </GoldButton>
      </div>
    );
  }

  const { natal, chart } = natalAndChart;
  const profection = currentProfection(natal, chart, now);
  const years = profectionYears(natal, chart, now);

  // 시각 미상 — 반쪽 계산 없이 전체를 안내로 대체한다(스펙 §3.1).
  if (!profection || !years) {
    return (
      <div className="mx-auto max-w-2xl border border-gold/25 bg-ink-raised/60 px-6 py-8">
        <p className="break-keep leading-relaxed text-starlight">
          프로펙션과 릴리징은 둘 다 상승궁에서 출발합니다. 태어난 시각이
          있어야 계산할 수 있습니다 — 별샘은 모르는 값을 지어내지 않습니다.
        </p>
        <p className="mt-4 break-keep text-guide text-starlight-dim">
          출생 시각을 찾는 현실적인 방법을 칼럼에 정리해 두었습니다:{" "}
          <a href="/blog/태어난-시간-모를-때" className="text-gold-soft underline underline-offset-4">
            태어난 시간을 모를 때 볼 수 있는 것과 없는 것
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProfectionSection profection={profection} years={years} />
      <ReleasingSection natal={natal} chart={chart} now={now} />
    </div>
  );
}
