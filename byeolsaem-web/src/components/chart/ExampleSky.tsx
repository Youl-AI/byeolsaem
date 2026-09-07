import { angleLabel } from "@/lib/basis";
import { formatPlacement } from "@/lib/chart";
import { EXAMPLE_BIRTH, exampleSky } from "@/lib/example-sky";
import { ToneBadge } from "@/components/ui/ToneBadge";
import { ExampleCta } from "./ExampleCta";

/**
 * 출생 정보를 넣기 전의 /natal — 빈 화면 대신 예시 하늘을 보여준다.
 *
 * 실제 결과와 같은 조립기(lib/example-sky.ts)의 출력을 실제 결과와 같은 형태로
 * 렌더한다. 단, 전부 보여주지 않는다 — 한 줄 · 평생의 과제 · 세 기둥 · 어스펙트
 * 하나까지만. 행성 열 개의 사전과 나머지 각은 잦아드는 끝의 CTA가 받는다.
 * 다 보여주면 자기 정보를 넣을 이유가 줄어든다(시안 2026-08-22, 결정 ④).
 *
 * "예시" 라벨은 안내 띠와 첫 섹션 옆, 두 곳뿐이다. 섹션마다 붙이면 소음이다(결정 ②).
 *
 * 서버 컴포넌트다(2026-09-05). 예전에는 클라이언트에서만 그려져서, 서버가 찍는
 * HTML에는 이 글이 한 글자도 남지 않았다 — 검색 수집기와 광고 심사자가 /natal에서
 * 본 것은 프라이머뿐이었다. EXAMPLE_BIRTH는 고정 상수이고 계산은 결정론이라
 * 서버에서 그릴 수 있다. 화면은 그대로이고, 달라지는 것은 문서에 남는 글이다.
 * 단추만 ExampleCta로 떼어 클라이언트에 둔다.
 */
export function ExampleSky() {
  const { reading } = exampleSky();
  const { core } = reading;
  const first = reading.aspects[0];

  return (
    <div className="mx-auto max-w-2xl">
      {/* 예시 안내 띠 — 누구의 하늘인지 처음부터 밝힌다(결정 ①). */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-gold/35 bg-ink-raised/85 px-5 py-4">
        <div className="min-w-[240px] flex-1">
          <p className="break-keep text-starlight">
            아직 내 하늘을 열기 전입니다 — 아래는 예시입니다.
          </p>
          <p className="mt-1 break-keep text-meta text-starlight-dim">{EXAMPLE_BIRTH.label}</p>
        </div>
        <ExampleCta label="내 하늘 열기" />
      </div>

      <div className="mt-12">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">
          당신을 한 줄로
          <span className="ml-3 rounded-full border border-gold/50 px-2.5 py-0.5 tracking-[0.22em] text-gold-soft">
            예시
          </span>
        </p>
        <p className="mt-3 max-w-[44ch] break-keep font-display text-2xl leading-normal text-starlight">
          {reading.oneLiner}
        </p>
      </div>

      {reading.lifework && (
        <ExampleSection title="평생의 과제 하나">
          <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
            {reading.lifework.text}
          </p>
          <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">
            {reading.lifework.basis}
          </p>
        </ExampleSection>
      )}

      <ExampleSection title="세 기둥">
        <div className="space-y-5">
          <ExampleCore symbol="☉" label="태양" value={formatPlacement(core.sun.placement)} text={core.sun.inSign} />
          <ExampleCore symbol="☽" label="달" value={formatPlacement(core.moon.placement)} text={core.moon.inSign} />
          {core.ascendant && (
            <ExampleCore symbol="ASC" label="상승궁" value={core.ascendant.sign.ko} text={core.ascendant.text} />
          )}
        </div>
      </ExampleSection>

      {first && (
        <ExampleSection title="별과 별 사이">
          <div className="border-t border-gold/12 pt-6">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-lg text-starlight">
                <span className="astro-symbol">{first.a.symbol}</span> {first.a.ko}
                <span className="mx-2 astro-symbol text-gold-soft">{first.aspect.type.symbol}</span>
                <span className="astro-symbol">{first.b.symbol}</span> {first.b.ko}
              </span>
              <span className="text-meta text-starlight-dim">
                {angleLabel(first.aspect.type.angle)} · 오브{" "}
                {first.aspect.orb.toFixed(1)}도 · {first.strengthKo}
              </span>
              <ToneBadge harmony={first.aspect.type.harmony} />
            </p>
            <p className="mt-3 text-guide text-gold-soft">
              {first.theme} — {first.headline}
            </p>
            <p className="mt-2 break-keep leading-relaxed text-starlight-dim">{first.body}</p>
          </div>
        </ExampleSection>
      )}

      {/* 예시는 여기서 잦아든다. 나머지(행성 사전, 남은 각들)는 내 하늘의 몫. */}
      <div className="mt-14 bg-gradient-to-b from-transparent to-ink pt-14 text-center">
        <p className="break-keep text-guide text-starlight-dim">
          예시는 여기까지 — 행성 열 개의 사전과 나머지 각도는 내 하늘에서 열립니다.
        </p>
        <div className="mt-6 flex justify-center">
          <ExampleCta label="여기서부터는 내 하늘로" />
        </div>
        <p className="mx-auto mt-4 max-w-md break-keep text-meta text-starlight-dim">
          날짜와 시각, 태어난 곳. 한 번만 남기면 모든 페이지가 그 하늘을 씁니다.
          저장은 이 브라우저 안에서만 이뤄집니다.
        </p>
      </div>
    </div>
  );
}

function ExampleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        {title}
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>
      {children}
    </section>
  );
}

function ExampleCore({
  symbol,
  label,
  value,
  text,
}: {
  symbol: string;
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3 border-t border-gold/15 pt-5">
      <span className="astro-symbol text-lg leading-snug text-gold-soft" aria-hidden>
        {symbol}
        {"︎"}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-meta tracking-[0.2em] text-starlight-dim">{label}</span>
          <span className="font-display text-lg text-starlight">{value}</span>
        </p>
        <p className="mt-2 max-w-[52ch] break-keep leading-relaxed text-starlight-dim">{text}</p>
      </div>
    </div>
  );
}
