import type { MoonPhaseKey } from "@/lib/moon";

/**
 * 달의 밝은 면 — 카드의 MoonDisc가 그린다. 비율을 그대로 그리는 것이 이 사이트의
 * 약속이다: "보름달"이라고 쓰는 대신 실제로 그만큼 밝게 그린다.
 *
 * 초승과 그믐은 같은 비율이라도 밝은 쪽이 반대다. 위상 이름으로 어느 쪽인지
 * 가른다 — 비율만으로는 알 수 없다.
 *
 * 함수로 따로 둔 것은 차오름 연출 때문이다(스펙 B §3). 0에서 오늘 값까지 36프레임
 * 동안 같은 식을 되풀이 부르므로, 컴포넌트 안에 두면 렌더와 식이 섞인다.
 */
const WAXING = new Set<MoonPhaseKey>([
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
]);

export function moonPath(illumination: number, phase: MoonPhaseKey, r = 46): string {
  if (illumination <= 0.01) return "";
  // 밝은 부분의 안쪽 경계는 타원이다. 반달에서 폭이 0이 되고, 그 전후로 부호가
  // 뒤집히며 볼록에서 오목으로 바뀐다.
  const k = 1 - 2 * illumination;
  const rx = Math.abs(k) * r;
  // 스윕 방향: 차오르는 달은 오른쪽이 밝다.
  const outer = WAXING.has(phase) ? 1 : 0;
  // 명암 경계 타원의 방향. 초승(k>0)은 밝은 쪽으로 볼록해 실낱이 되고, 보름
  // 쪽(k<0)은 어두운 쪽으로 볼록해 반원 너머까지 차오른다. 이 부호가 뒤집혀
  // 있으면 96%가 실낱로, 보름이 빈 원으로 그려진다(2026-08-26 실측).
  const inner = k >= 0 ? 1 - outer : outer;
  return `M 60 ${60 - r} A ${r} ${r} 0 0 ${outer} 60 ${60 + r} A ${rx} ${r} 0 0 ${inner} 60 ${60 - r} Z`;
}
