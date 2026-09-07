/**
 * 각의 결을 부르는 말 — 흐름·맞바람·겹침. 한 곳에만 둔다.
 *
 * 카드 재설계(2026-09-08) 뒤로 `ReadingCard`는 `toneLabel`을 부르지 않는다 —
 * 결의 보증은 이제 배지가 아니라 `plain`이 쥔다. `plain`은 `ASPECT_MEANINGS.headline`
 * 계열의 문장("서로 밀어냅니다"/"서로 도울 수 있습니다")이라 색을 못 보는 사람도
 * 결을 글자로 읽는다. 이 컴포넌트는 예시 카드 셋(`ExampleSky`·`ExampleMeeting`·
 * `YearFlow`)에만 남아 있다 — 그 자리는 여전히 용어 줄 옆에 색으로만 결을 얹는다.
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
