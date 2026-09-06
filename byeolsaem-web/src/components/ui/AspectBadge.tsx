import type { CSSProperties } from "react";

const ASTRO_FONT = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", sans-serif';

/**
 * 각의 기하 인장 — 각(어스펙트)은 본질이 기하인데 글로만 적혀 있었다.
 * 작은 원 위에 두 별이 실제 각도만큼 벌어져 앉고, 사이를 호가 잇는다.
 * 순풍은 금색, 맞바람은 은회색, 합은 한 점에 겹친 이중 점.
 * 천궁도의 "별과 별 사이"와 궁합의 "다섯 가지 각도"가 같이 쓴다.
 *
 * animate이면 호가 A에서 B까지 300ms에 그어지고 점이 뒤따라 뜬다 — 호가 각도
 * 자체라, 그어지는 것이 "이만큼 벌어졌다"의 설명이다. 카드 계단과 같은 delay를 받는다.
 */
export function AspectBadge({
  angle,
  harmony,
  aSymbol,
  bSymbol,
  className,
  animate = false,
  delay = 0,
}: {
  angle: number;
  harmony: number;
  aSymbol?: string;
  bSymbol?: string;
  className?: string;
  animate?: boolean;
  delay?: number;
}) {
  const C = 38;
  const R = 26;
  const pt = (r: number, deg: number): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
  };
  const stroke = harmony > 0 ? "var(--color-gold-soft)" : harmony < 0 ? "rgba(154,150,168,0.9)" : "var(--color-starlight)";
  const [ax, ay] = pt(R, 0);
  const [bx, by] = pt(R, angle);
  const conj = angle === 0;
  // animate일 때만 붙는 속성. 정지 그림(공유 카드 등)은 속성 자체가 없어야 한다.
  const arc: { pathLength?: number; className?: string; style?: CSSProperties } = animate
    ? { pathLength: 1, className: "aspect-arc", style: { animationDelay: `${delay}ms` } }
    : {};
  const dot = (offset: number) => (animate ? { animationDelay: `${delay + offset}ms` } : undefined);
  return (
    <svg viewBox="0 0 76 76" className={className} aria-hidden>
      <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(201,162,39,0.35)" strokeWidth={1} />
      {conj ? (
        // 합 — 같은 자리에 겹친다: 한 점과 그 둘레의 작은 링.
        <>
          <circle cx={ax} cy={ay} r={3} fill={stroke} className={animate ? "aspect-dot" : undefined} style={dot(0)} />
          <circle cx={ax} cy={ay} r={6.5} fill="none" stroke={stroke} strokeWidth={1} opacity={0.7} className={animate ? "aspect-dot" : undefined} style={dot(120)} />
        </>
      ) : (
        <>
          {angle === 180 ? (
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.6} {...arc} />
          ) : (
            <path
              d={`M ${ax} ${ay} A ${R} ${R} 0 ${angle > 180 ? 1 : 0} 1 ${bx} ${by}`}
              fill="none"
              stroke={stroke}
              strokeWidth={1.6}
              {...arc}
            />
          )}
          <circle cx={ax} cy={ay} r={2.6} fill={stroke} className={animate ? "aspect-dot" : undefined} style={dot(0)} />
          <circle cx={bx} cy={by} r={2.6} fill={stroke} className={animate ? "aspect-dot" : undefined} style={dot(240)} />
        </>
      )}
      {aSymbol && (
        <text
          {...glyphAt(pt, conj ? -16 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-starlight)"
          fontSize={11}
          style={{ fontFamily: ASTRO_FONT }}
        >
          {aSymbol}
          {"︎"}
        </text>
      )}
      {bSymbol && (
        <text
          {...glyphAt(pt, conj ? 16 : angle)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-starlight)"
          fontSize={11}
          style={{ fontFamily: ASTRO_FONT }}
        >
          {bSymbol}
          {"︎"}
        </text>
      )}
      <text
        x={C}
        y={C + (conj ? 6 : 1)}
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgba(154,150,168,0.9)"
        fontSize={10}
        style={{ fontFamily: "var(--font-latin)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}
      >
        {angle}°
      </text>
    </svg>
  );
}

function glyphAt(
  pt: (r: number, deg: number) => [number, number],
  deg: number,
): { x: number; y: number } {
  const [x, y] = pt(35, deg);
  return { x, y };
}
