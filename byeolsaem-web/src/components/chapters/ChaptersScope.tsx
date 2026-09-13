"use client";
import { useEffect, useMemo, useState } from "react";
import { UnknownPlace } from "@/components/chart/NoProfile";
import { GoldButton } from "@/components/ui/GoldButton";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { computeChart, type BirthMoment, type Chart } from "@/lib/chart";
import { coordinatesFor, koreaOffsetHours } from "@/lib/coordinates";
import { EXAMPLE_BIRTH, exampleSky } from "@/lib/example-sky";
import { requestRitual } from "@/lib/ritual";
import { currentProfection, profectionYears } from "@/lib/time-lords";
import { ProfectionSection } from "./ProfectionSection";
import { ReleasingSection } from "./ReleasingSection";

/**
 * /chapters의 본문 게이트.
 *
 * 프로필이 없으면 **예시 시간표**를 그린다(EXAMPLE_BIRTH — 다른 세 화면과 같은
 * 사람). 시각이 없으면 계산하지 않고 그 이유를 밝힌다. SolarScope와 같은 마운트
 * 계약: 서버 HTML과 첫 클라이언트 렌더는 항상 예시 경로를 탄다.
 *
 * 2026-09-14까지는 예시 없이 버튼 하나만 두었다. 이유는 "두 시간법 모두 상승궁에서
 * 출발하므로, 예시로 흉내 내면 아무 시각이나 넣어도 되는 계산처럼 보인다"였다.
 * 뒤집은 근거 둘: 상승궁이 필요한 것은 `/solar-return`도 같은데 그쪽은 예시를
 * 보여 준다(같은 위험에 반대 결정), 그리고 예시 라벨이 시각을 분까지 못 박아
 * "아무 시각이나"로 읽히지 않는다.
 *
 * 원래 판단이 진짜로 지키려던 것은 아래 **시각 미상 분기**다. 그건 그대로 둔다 —
 * 시각을 모르는 실제 사용자에게는 여전히 계산하지 않고 이유를 말한다.
 *
 * 바꾼 대가: 프로필 없이 들어온 사람이 보는 글자가 211자에서 1,600자 안팎으로
 * 늘었다. 사이트에서 가장 얇은 색인 페이지였다(2026-09-14 실측).
 */
export function ChaptersScope({ builtAt }: { builtAt: string }) {
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

  // 열기 전(서버 HTML 포함) — 예시 차트로 같은 두 절을 그대로 그린다.
  // `now`는 마운트 뒤에만 있으므로 그전에는 빌드 시각으로 나이를 센다. 정적
  // export라 빌드 날짜가 굳으면 안 되고, 마운트 뒤 방문자의 "지금"으로 다시
  // 계산된다 — SolarScope와 같은 계약이다.
  const isExample = !natalAndChart;
  const { natal, chart } = natalAndChart ?? exampleSky();
  const at = now ?? new Date(builtAt);

  const profection = currentProfection(natal, chart, at);
  const years = profectionYears(natal, chart, at);

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
      {isExample && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-gold/35 bg-ink-raised/85 px-5 py-4">
          <div className="min-w-[240px] flex-1">
            <p className="break-keep text-starlight">
              아직 내 하늘을 열기 전입니다 — 아래는 예시입니다.
            </p>
            <p className="mt-1 break-keep text-meta text-starlight-dim">{EXAMPLE_BIRTH.label}</p>
          </div>
          <GoldButton variant="solid" onClick={() => requestRitual()}>
            내 하늘 열기
          </GoldButton>
        </div>
      )}
      <ProfectionSection profection={profection} years={years} />
      <ReleasingSection natal={natal} chart={chart} now={at} />
    </div>
  );
}
