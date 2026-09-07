/**
 * 각의 결을 부르는 말 — 흐름·맞바람·겹침. 한 곳에만 둔다.
 *
 * 배지 말고도 이 말이 필요한 자리가 있다. 결과 카드의 용어 줄은 접혀 있을 때도
 * 보이는데, 거기서 결이 색으로만 전해지면 색을 못 보는 사람에게는 아무 말도
 * 하지 않는 셈이다(AspectBadge의 SVG는 aria-hidden이다). 그래서 글자를 붙이되,
 * 두 곳이 서로 다른 말을 하지 않도록 매핑은 여기 하나만 있다.
 *
 * "순풍"·"마찰"이 아니라 "흐름"·"맞바람"이다 — 어스펙트 이름처럼 화면에 남으면
 * 안 되는 말은 아니지만, 이 배지가 부르던 옛 이름 그대로였다(2026-09-08 정리).
 */
export function toneLabel(harmony: number): string {
  return harmony > 0 ? "흐름" : harmony < 0 ? "맞바람" : "겹침";
}

/**
 * 강도 라벨 — 이 각도가 흐름인지 맞바람인지 겹침인지를 글자로 말한다.
 *
 * 테두리 색(gold/40 vs gold/12)만으로는 아무도 못 읽는다는 가시성 점검
 * (2026-08-14)에서 나왔다. 캡슐 테두리는 두르지 않는다 — 본문 사이에서
 * 은은하게 읽히는 작은 글자면 충분하고, 그쪽이 이 사이트의 결이다.
 */
export function ToneBadge({ harmony, span }: { harmony: number; span?: string }) {
  const tone = toneLabel(harmony);
  const color =
    harmony > 0 ? "text-[#b9d9ae]" : harmony < 0 ? "text-[#d9aeae]" : "text-gold-soft";
  return (
    <span className={`text-eyebrow tracking-[0.18em] ${color}`}>
      {tone}
      {span ? <span className="text-starlight-dim"> · {span}</span> : null}
    </span>
  );
}
