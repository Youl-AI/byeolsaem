import type { RetrogradeStatus } from "@/lib/retrograde-clock";

/** 띠가 보여 주는 숫자 하나 — 역행 중이면 남은 날, 아니면 다음까지의 날. 모르면 null. */
export function retroNumber(status: RetrogradeStatus): number | null {
  if (status.state === "retrograde") return status.daysLeft;
  if (status.state === "direct") return status.daysUntil;
  return null;
}

/**
 * 어제 값에서 오늘 값으로 굴릴 수 있으면 어제 값, 아니면 null(굴리지 않는다).
 *
 * 시연판의 "0→N 카운트업"은 하지 않는다 — 숫자가 실제로 변한 만큼만 움직여야
 * 상태 표시다(스펙 B §4). 상태가 다르면(어제는 역행 전, 오늘은 역행 중) 두 숫자가
 * 다른 것을 세고 있으므로 굴리지 않고, 같은 값이면 움직일 것이 없다.
 */
export function rollStart(yesterday: RetrogradeStatus, today: RetrogradeStatus): number | null {
  if (yesterday.state !== today.state) return null;
  const from = retroNumber(yesterday);
  const to = retroNumber(today);
  if (from === null || to === null || from === to) return null;
  return from;
}
