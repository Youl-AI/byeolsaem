/**
 * 문장 단위 유틸.
 *
 * 이 저장소의 모든 해석 문장은 "…다."로 끝난다(아톰 작문 규칙, 스펙 §7).
 * 그래서 첫 "다."까지가 곧 첫 문장이다 — 평생의 과제(reading.ts)와 한 해의
 * headline(yearly-reading.ts)이 문단에서 첫 문장만 떼어 쓸 때 이 규칙에 기댄다.
 * atoms.test.ts가 규칙 쪽을 지킨다.
 */
export function firstSentence(text: string): string {
  const end = text.indexOf("다.");
  return end === -1 ? text : text.slice(0, end + 2);
}

/**
 * 첫 문장을 뺀 나머지. 카드는 둘째 줄에 첫 문장을 이미 보여 주므로, 펼친 본문이
 * 같은 문장으로 다시 시작하면 반복으로 읽힌다(2026-09-07 실측). 첫 문장만 있는
 * 글이면 빈 문자열 — 부르는 쪽이 빈 <p>를 그리지 않게 한다.
 */
export function afterFirstSentence(text: string): string {
  const end = text.indexOf("다.");
  return end === -1 ? "" : text.slice(end + 2).trim();
}
