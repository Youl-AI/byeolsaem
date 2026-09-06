import type { Chart } from "@/lib/chart";
import { signAtLongitude, type ZodiacSign } from "@/lib/zodiac";

/**
 * 차트에서 세 기둥의 별자리를 읽는다. 궁합이 나와 그쪽의 이름표를 같은 함수로
 * 만든다(스펙 C §3). 상승궁은 `chart.ascendant`가 null이면 null — 시각을 모르면
 * 계산하지 않는다는 원칙 그대로.
 */
export function chartPillars(chart: Chart): {
  sun: ZodiacSign;
  moon: ZodiacSign;
  ascendant: ZodiacSign | null;
} {
  const sun = chart.placements.find((p) => p.planet === "sun")!.sign;
  const moon = chart.placements.find((p) => p.planet === "moon")!.sign;
  return {
    sun,
    moon,
    ascendant: chart.ascendant === null ? null : signAtLongitude(chart.ascendant),
  };
}

/**
 * 이름표 — 태양·달·상승궁을 한 줄로. Co-Star의 `☉Scorpio ☽Pisces ↑Leo`와 같은
 * 문법이다. 결과에서 남에게 말할 수 있는 한 줄이 이것이고, 공유 카드의 tagline과
 * 같은 세 값을 쓴다.
 *
 * 상승궁이 없으면 셋째 항목이 없다. 시각을 모르면 계산하지 않는다는 원칙 그대로.
 */
export function nameTagText(sun: ZodiacSign, moon: ZodiacSign, ascendant: ZodiacSign | null): string {
  const parts = [`☉ ${sun.ko}`, `☽ ${moon.ko}`];
  if (ascendant) parts.push(`↑ ${ascendant.ko}`);
  return parts.join(" · ");
}

export function NameTag({
  sun,
  moon,
  ascendant,
}: {
  sun: ZodiacSign;
  moon: ZodiacSign;
  ascendant: ZodiacSign | null;
}) {
  const items: [string, string][] = [
    ["☉", sun.ko],
    ["☽", moon.ko],
  ];
  if (ascendant) items.push(["↑", ascendant.ko]);
  const label = [`태양 ${sun.ko}`, `달 ${moon.ko}`, ...(ascendant ? [`상승궁 ${ascendant.ko}`] : [])].join(", ");
  return (
    <p
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-x-2.5 rounded-full border border-gold/40 px-3.5 py-1.5 text-meta text-gold-soft"
    >
      {items.map(([symbol, name], i) => (
        <span key={symbol} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className="mr-1 opacity-50">·</span>}
          <span aria-hidden className="astro-symbol">
            {symbol}
            {"\uFE0E"}
          </span>
          <span>{name}</span>
        </span>
      ))}
    </p>
  );
}
