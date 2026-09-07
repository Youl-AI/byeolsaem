"use client";
import { angleLabel } from "@/lib/basis";
import { EXAMPLE_PARTNER_BIRTH, exampleMeeting } from "@/lib/example-sky";
import { requestRitual } from "@/lib/ritual";
import { CompositeSection } from "./CompositeSection";
import { GoldButton } from "@/components/ui/GoldButton";
import { ToneBadge } from "@/components/ui/ToneBadge";

/**
 * 내 출생 정보를 넣기 전의 /synastry — 빈 화면 대신 예시 궁합을 보여준다.
 *
 * ExampleSky(/natal)와 같은 처방이다. 궁합은 두 사람 몫의 정보를 요구해 문턱이
 * 두 배인데, 결과물의 생김새는 똑같이 감춰져 있었다. 실제 조립기의 출력을
 * 일부만 — 한 줄 · 해 볼 것/버릴 것 · 이름 붙은 만남 하나 — 보여주고 잦아든다.
 * 금실 그림과 나머지 스무 개 남짓의 만남은 내 궁합의 몫이다.
 */
export function ExampleMeeting() {
  const { mine, theirs, reading } = exampleMeeting();
  const named = reading.lines.find((line) => line.highlight);

  return (
    <div className="mx-auto max-w-2xl">
      {/* 누구와 누구의 예시인지 처음부터 밝힌다 — 개인화인 척하지 않는 것이 신뢰 조건. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-gold/35 bg-ink-raised/85 px-5 py-4">
        <div className="min-w-[240px] flex-1">
          <p className="break-keep text-starlight">
            아직 내 하늘을 열기 전입니다 — 아래는 예시입니다.
          </p>
          <p className="mt-1 break-keep text-meta text-starlight-dim">
            {EXAMPLE_PARTNER_BIRTH.label}
          </p>
        </div>
        <GoldButton variant="solid" onClick={() => requestRitual()}>
          내 하늘 열기
        </GoldButton>
      </div>

      {reading.oneLiner && (
        <div className="mt-12">
          <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">
            두 사람의 한 줄
            <span className="ml-3 rounded-full border border-gold/50 px-2.5 py-0.5 tracking-[0.22em] text-gold-soft">
              예시
            </span>
          </p>
          <p className="mt-3 max-w-[44ch] break-keep font-display text-2xl leading-normal text-starlight">
            {reading.oneLiner}
          </p>
          {reading.advice && (
            <div className="mt-6 max-w-[52ch] border-l-2 border-gold/45 bg-gold/[0.06] py-4 pl-5 pr-4">
              <p className="break-keep text-guide">
                <b className="font-normal text-gold-soft">해 볼 것</b>{" "}
                <span className="text-starlight-dim">{reading.advice.try}</span>
              </p>
              <p className="mt-2 break-keep text-guide">
                <b className="font-normal text-gold-soft">버릴 것</b>{" "}
                <span className="text-starlight-dim">{reading.advice.hold}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {named && (
        <section className="mt-14">
          <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
            이 짝에 맺힌 만남 {reading.named}개 중 하나
            <span aria-hidden className="h-px flex-1 bg-gold/25" />
          </h2>
          <div className="border-t border-gold/40 py-6">
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-meta tracking-[0.16em] text-gold" aria-hidden>
                ✦
              </span>
              <span className="font-display text-lg text-starlight">
                내 <span className="astro-symbol">{named.mine.symbol}</span> {named.mine.ko}
                <span className="mx-2 astro-symbol text-gold-soft">{named.aspectSymbol}</span>그쪽{" "}
                <span className="astro-symbol">{named.theirs.symbol}</span> {named.theirs.ko}
              </span>
              <span className="text-meta text-starlight-dim">
                {angleLabel(named.angle)} · 오브 {named.orb.toFixed(1)}도
              </span>
              <ToneBadge harmony={named.harmony} />
            </span>
            <p className="mt-3 max-w-[52ch] break-keep text-guide text-gold-soft">
              {named.meeting} — {named.headline}
            </p>
            <p className="mt-2 max-w-[52ch] break-keep leading-relaxed text-starlight-dim">
              {named.body}
            </p>
            {named.highlight && (
              <p className="mt-3 max-w-[52ch] break-keep border-l-2 border-gold/40 pl-4 leading-relaxed text-starlight">
                {named.highlight}
              </p>
            )}
          </div>
        </section>
      )}

      <CompositeSection mine={mine} theirs={theirs} />

      {/* 예시는 여기서 잦아든다. 금실 그림과 나머지 만남들은 내 궁합의 몫. */}
      <div className="mt-14 bg-gradient-to-b from-transparent to-ink pt-14 text-center">
        <p className="break-keep text-guide text-starlight-dim">
          예시는 여기까지 — 이 짝에는 만남이 {reading.total}개 맺혀 있고, 두 하늘을 잇는
          금실 그림까지 내 궁합에서 열립니다.
        </p>
        <div className="mt-6 flex justify-center">
          <GoldButton variant="solid" onClick={() => requestRitual()}>
            여기서부터는 내 궁합으로
          </GoldButton>
        </div>
        <p className="mx-auto mt-4 max-w-md break-keep text-meta text-starlight-dim">
          내 정보를 먼저 남기고, 상대의 정보는 그때그때 넣습니다. 상대의 정보는
          저장하지 않습니다 — 화면을 떠나면 사라집니다.
        </p>
      </div>
    </div>
  );
}
