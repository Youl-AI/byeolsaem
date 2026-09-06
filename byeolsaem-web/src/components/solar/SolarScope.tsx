"use client";
import { useMemo, useState, useEffect } from "react";
import { ChartWheel, ChartWheelLegend } from "@/components/chart/ChartWheel";
import { GoldButton } from "@/components/ui/GoldButton";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { coordinatesFor, KOREA_UTC_OFFSET_HOURS } from "@/lib/coordinates";
import { EXAMPLE_BIRTH, exampleSolarReturn } from "@/lib/example-sky";
import { formatKstDate } from "@/lib/retrograde-clock";
import { requestRitual } from "@/lib/ritual";
import { solarReturnChart } from "@/lib/solar-return";
import { UnknownPlace } from "@/components/chart/NoProfile";
import { composeSolarReading, type SolarAxis } from "./solar-reading";

/**
 * 솔라 리턴 본문 — 내 정보가 있으면 내 리턴 차트, 없으면 예시(EXAMPLE_BIRTH)를
 * 보여준다.
 *
 * `useBirthProfile`의 `profile`은 클라이언트에서 저장소를 읽기 전까지 항상
 * null이다(ready 가드는 그 훅 안쪽에 있다 — 여기서 따로 `!ready`로 분기하지
 * 않는다). 그래서 이 컴포넌트가 만드는 첫 그림 — 서버 HTML과 하이드레이션
 * 전 클라이언트 첫 렌더 — 은 언제나 예시 쪽이다. 크롤러가 보는 것도 이 예시다.
 *
 * `now`도 같은 이유로 useState(null) → useEffect에서 채운다. 마운트 전에는
 * `now`가 없으므로 `builtAt`(빌드 시점)으로 고정한다 — TodayCard/WeeklyCard와
 * 같은 계약이다. 정적 export라 빌드 시점의 날짜가 그대로 굳으면 안 되므로,
 * 마운트 뒤 방문자의 "지금"으로 다시 계산한다.
 */
export function SolarScope({ builtAt }: { builtAt: string }) {
  const { profile } = useBirthProfile();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const mine = useMemo(() => {
    if (!profile || !now) return null;
    const coordinates = coordinatesFor(profile.city);
    if (!coordinates) return null;
    return solarReturnChart(
      {
        date: profile.date,
        time: profile.time,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        timezoneOffsetHours: KOREA_UTC_OFFSET_HOURS,
      },
      now,
    );
  }, [profile, now]);

  // 서버 HTML과 첫 그림은 언제나 예시 쪽(위 주석 참고).
  const data = useMemo(
    () => mine ?? exampleSolarReturn(now ?? new Date(builtAt)),
    [mine, now, builtAt],
  );
  const reading = useMemo(() => composeSolarReading(data.chart), [data.chart]);
  const isExample = mine === null;
  // chart 기준 — solarReturnChart가 출생 시각을 모르면 chart.timeUnknown을 세운다
  // (profile.time과 어긋나지 않게 한 곳만 본다).
  const timeUnknown = mine !== null && data.chart.timeUnknown;

  // 프로필은 있는데 저장된 지역명의 좌표를 못 찾은 경우 — 예시로 조용히 빠지지
  // 않는다. YearScope의 "profile && !reading → UnknownPlace" 분기와 같은 자리다
  // (최종 리뷰 I-2). ready 가드는 없어도 된다: 마운트 전에는 profile이 항상
  // null이라 이 분기에 들어오지 않고, 서버 HTML과 첫 클라이언트 렌더는 그대로
  // 예시 경로를 탄다.
  if (profile && now && !coordinatesFor(profile.city)) {
    return <UnknownPlace city={profile.city} />;
  }

  return (
    // 바깥은 원반이 두 칸으로 누울 폭(780px)까지 열어 두고, 글줄은 안쪽
    // max-w-2xl이 지킨다 — 읽는 폭이 넓어지면 줄이 길어져 눈이 줄을 놓친다.
    <div className="mx-auto max-w-[780px]">
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

      <p className="mt-8 break-keep text-guide text-starlight-dim">
        이번 리턴의 유효 기간 —{" "}
        <span className="text-starlight">
          {formatKstDate(data.instant.toISOString())} ~ {formatKstDate(data.nextInstant.toISOString())}
        </span>
      </p>
      </div>

      {/* 원반과 범례 — natal의 원반과 같은 짝이다. natal 쪽은 기호를 누르면
          아래 본문의 그 별 카드로 데려가는데, 이 페이지는 행성 사전 섹션이 없어
          데려갈 자리가 없다. 그래서 원반과 범례만 나란히 둔다 — 기준은
          "원반의 기호에 범례가 딸려 있을 것". */}
      {/* justify-center: 좁은 화면에서 줄바꿈이 일어나 원반만 한 줄을 차지할 때
          가운데로 온다. 두 칸으로 눕는 폭에서는 범례가 남은 자리를 다 채워
          효과가 없다. */}
      <figure className="mt-8 flex flex-wrap items-start justify-center gap-x-10 gap-y-6">
        <div className="w-full max-w-[460px] flex-none">
          <ChartWheel chart={data.chart} entrance="byeolsaem:wheel-entrance:solar" />
        </div>
        <figcaption className="min-w-0 flex-1 basis-64">
          <ChartWheelLegend />
        </figcaption>
      </figure>

      <div className="mx-auto max-w-2xl">
      {reading.ascendant && <AxisSection axis={reading.ascendant} />}
      {reading.sunHouse && <AxisSection axis={reading.sunHouse} />}
      {reading.moonSign && <AxisSection axis={reading.moonSign} />}

      {timeUnknown && (
        <div className="mt-12 border-t border-gold/15 pt-8">
          <p className="max-w-[52ch] break-keep text-guide text-starlight-dim">
            태어난 시각을 알면 두 축이 더 열립니다 — 올해의 첫인상(상승궁)과 올해
            빛이 모이는 방(태양의 하우스)은 시각이 있어야 정해집니다.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

function AxisSection({ axis }: { axis: SolarAxis }) {
  return (
    <section className="mt-12">
      <h2 className="break-keep font-display text-xl text-starlight">{axis.title}</h2>
      <p className="mt-2 max-w-[56ch] break-keep text-meta text-gold-soft">{axis.frame}</p>
      <p className="mt-3 max-w-[62ch] break-keep leading-relaxed text-starlight-dim">{axis.body}</p>
    </section>
  );
}
