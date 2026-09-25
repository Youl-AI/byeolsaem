import type { CSSProperties } from "react";
import { Link } from "@/components/ui/Link";
import { LineDiamond } from "@/components/ui/LineDiamond";

/**
 * "이 답이 어디서 나오는가" — 결과 미리보기와 세 개의 문 사이.
 *
 * 흐름이 "무엇을 받는가 → 어디로 들어갈까"였고, 그 사이에 "그런데 이걸 왜 믿나"가
 * 없었다. 고르기 직전이 근거를 읽을 자리다.
 *
 * `/about`과 `/method`에 이미 있는 이야기를 홈으로 끌어올린 것이다. 그 두 페이지로
 * 가는 길이 지금까지 푸터뿐이었다 — 홈만 보고 떠나는 사람은 이 사이트가 계산을
 * 직접 한다는 것을 알 방법이 없었다.
 *
 * 레이아웃은 ResultPreview와 같은 패밀리(가운데 스택 + LineDiamond + data-reveal)다.
 * 새 시각 언어를 만들지 않는다 — 몰입 스크롤에 이질적인 덩어리가 끼면 홈이 파는
 * 것이 상한다.
 *
 * 순수 서버 컴포넌트로 둔다. 크롤러와 심사자가 읽는 것은 첫 HTML이다.
 */

const order = (i: number) => ({ "--reveal-i": i }) as CSSProperties;

/** 세 가지 약속. 전부 사이트가 실제로 지키는 것이라 확인할 수 있다. */
const PROMISES = [
  {
    title: "계산을 직접 합니다",
    body: (
      <>
        &ldquo;당신의 태양은 게자리 21도&rdquo;라는 문장은 어디서나 볼 수 있습니다. 그 21도가
        어디서 나왔는지 적어 두는 곳은 드뭅니다. 별샘은 행성 위치를 받아 오지 않고 궤도에서
        직접 구합니다 &mdash; JPL이 공개한 궤도 요소를 쓰고, 달에는 ELP-2000/82를 줄인 급수를
        씁니다. 오차는 행성이 몇 분각, 달이 황경 10초각 수준입니다. 그 숫자까지 적어 두었으니
        틀리면 저희 책임입니다.
      </>
    ),
  },
  {
    title: "뽑지 않습니다",
    body: (
      <>
        같은 배치라면 언제 다시 보아도 같은 이야기가 나옵니다. 계산된 자리마다 미리 써 둔
        해석을 꺼내 맞출 뿐, 어느 단계에서도 임의로 고르는 과정이 없습니다. 어제와 오늘 말이
        달라지는 풀이는 믿을 수 없다고 봅니다.
      </>
    ),
  },
  {
    title: "한국의 사정도 넣습니다",
    body: (
      <>
        1987년과 1988년 여름, 한국에는 서머타임이 있었습니다. 그 두 해의 그 구간에 태어난
        사람은 시계가 한 시간 앞당겨져 있었으므로 출생 시각을 그대로 넣으면 하늘이 어긋납니다.
        상승궁이 자리 하나를 통째로 건너뛰는 일이 실제로 생깁니다. 별샘은 병원에서 받은 시각을
        그대로 넣으면 그만입니다 &mdash; 보정은 계산이 알아서 합니다.
      </>
    ),
  },
  {
    title: "모르는 것은 비워 둡니다",
    body: (
      <>
        태어난 시각을 모르면 상승궁과 하우스는 정해지지 않습니다. 그럴 때는 그 자리를 비워
        두고 시각과 무관한 것만 알려 드립니다. 다른 곳과 하우스 번호가 다르게 나온다면 대개
        나누는 방식이 달라서입니다. 별샘은 홀사인 한 가지만 쓰고, 왜 그 방식인지도 적어
        두었습니다.
      </>
    ),
  },
];

export function WhyDifferent() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 text-center md:py-36">
      <p data-reveal style={order(0)} className="font-latin text-eyebrow tracking-[0.28em] text-gold">
        THE CALCULATION
      </p>
      <h2
        data-reveal
        style={order(1)}
        className="mt-4 break-keep font-display text-2xl text-starlight md:text-3xl"
      >
        이 답이 어디서 나오는지 밝힙니다
      </h2>
      <p
        data-reveal
        style={order(2)}
        className="mx-auto mt-4 max-w-md break-keep leading-relaxed text-starlight-dim"
      >
        생년월일을 넣으면 그럴듯한 문장이 나오는 곳은 많습니다. 그 문장이 어떤 계산에서
        나왔는지 밝히는 곳은 찾기 어려웠습니다.
      </p>

      <div data-reveal style={order(3)}>
        <LineDiamond className="my-12" />
      </div>

      {/* 왼쪽 정렬로 둔다. 가운데 정렬은 한 줄짜리 문구에는 맞지만 네 줄이 넘어가면
          줄머리가 흔들려 읽는 속도가 떨어진다. */}
      <dl className="mx-auto max-w-xl space-y-10 text-left">
        {PROMISES.map((p, i) => (
          <div key={p.title} data-reveal style={order(4 + i)}>
            <dt className="break-keep font-display text-lg text-starlight">{p.title}</dt>
            <dd className="mt-2.5 break-keep leading-relaxed text-starlight-dim">{p.body}</dd>
          </div>
        ))}
      </dl>

      <div data-reveal style={order(8)} className="mx-auto mt-12 max-w-xl text-left">
        <p className="break-keep leading-relaxed text-starlight-dim">
          별샘은 한 사람이 만들고 있습니다. 2026년 2월에 첫 줄을 썼고 회사도 팀도 없습니다.
          계산이 틀렸다는 제보가 가장 반갑습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-meta tracking-wide">
          <Link
            href="/method"
            className="text-gold-soft underline underline-offset-4 transition-colors hover:text-starlight"
          >
            쓰는 계산 방법 전부 &rarr;
          </Link>
          <Link
            href="/about"
            className="text-gold-soft underline underline-offset-4 transition-colors hover:text-starlight"
          >
            만드는 사람과 문의 &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
