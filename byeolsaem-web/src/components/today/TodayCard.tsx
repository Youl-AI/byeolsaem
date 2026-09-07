"use client";
import { useEffect, useMemo, useState } from "react";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { formatBirthDate } from "@/lib/birth-profile";
import { computeChart } from "@/lib/chart";
import { coordinatesFor, koreaOffsetHours } from "@/lib/coordinates";
import { requestRitual } from "@/lib/ritual";
import { todaySky, type TodaySky } from "@/lib/today";
import { moonArt } from "@/lib/share-card";
import { todayBack, todayFront, type TodayBack, type TodayTransit } from "@/lib/today-reading";
import { ArchCard } from "@/components/ui/ArchCard";
import { GoldButton } from "@/components/ui/GoldButton";
import { KakaoShareButton } from "@/components/ui/KakaoShareButton";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { CardSection } from "@/components/ui/ResultSection";
import { SaveCardButton } from "@/components/ui/SaveCardButton";
import { TalismanChip } from "@/components/ui/TalismanChip";
import { toneLabel } from "@/components/ui/ToneBadge";
import { afterFirstSentence, firstSentence } from "@/lib/text";
import { MoonDisc } from "./MoonDisc";
import { ComingMoons, PlanetsNow, RetroBand } from "./SkyNow";

/** `2026-09-07` 꼴 — 하루 한 번 연출의 열쇠에 쓴다. */
function dateKey(date: { year: number; month: number; day: number }): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/**
 * 오늘의 카드.
 *
 * 앞면은 누구에게나 같다 — 달의 위상은 태양과 달의 각도 하나로 정해지므로 개인
 * 정보가 없어도 보여 줄 수 있다. 그래서 처음 온 사람도 빈 화면을 보지 않는다.
 * 뒤집으면 오늘 하늘이 내 출생 차트를 어디서 건드리는지가 나온다(스펙 §6.3).
 *
 * 날짜는 마운트한 뒤에 정한다. 정적 export라 빌드 시점의 날짜가 HTML에 박히면
 * "오늘"이 배포한 날로 영구히 굳는다. 서버가 만든 첫 렌더와 어긋나지 않도록
 * 그 전까지는 어느 쪽으로도 단정하지 않는다.
 */
export function TodayCard({
  initialSky,
  builtAt,
}: {
  /** 빌드 시점의 하늘. 서버 HTML과 첫 페인트가 이것을 그린다. */
  initialSky: TodaySky;
  builtAt: string;
}) {
  const { profile, ready } = useBirthProfile();
  const [now, setNow] = useState<Date | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const sky = useMemo(() => (now ? todaySky(now) : initialSky), [now, initialSky]);
  /** 띠·삭망이 쓰는 기준 시각 — 마운트 전에는 빌드 시각으로 고정되어 결정론이 유지된다. */
  const clockNow = useMemo(() => now ?? new Date(builtAt), [now, builtAt]);
  const front = useMemo(() => (sky ? todayFront(sky) : null), [sky]);

  const back = useMemo(() => {
    if (!sky || !profile) return null;
    const coordinates = coordinatesFor(profile.city);
    if (!coordinates) return null;
    const natal = computeChart({
      date: profile.date,
      time: profile.time,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezoneOffsetHours: koreaOffsetHours(profile.date, profile.time),
    });
    return todayBack(sky, natal, profile.concern);
  }, [sky, profile]);

  if (!front) return null; // sky가 항상 있으므로 사실상 도달하지 않는다.

  const canFlip = ready && back !== null;

  // 뒤집으면 결과가 스스로 화면 안으로 들어온다. 새 내용이 접힌 선 아래에
  // 생기기만 하면 스크롤해야 한다는 것을 모르는 사람에게는 아무 일도 일어나지
  // 않은 것이다 — 유도 문구는 스펙 §4.4가 금지하므로, 문구 대신 화면이 간다.
  const flip = () => {
    setFlipped(true);
    requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById("today-transits")
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
  };

  return (
    <>
      {/* 카운트다운 띠 — 이 페이지에 "내일 또 확인할 숫자"를 하나 세운다(정찰 ②). */}
      <RetroBand now={clockNow} live={now !== null} />
      <div className="grid items-start gap-10 md:grid-cols-[150px_minmax(0,1fr)] md:gap-12">
      <aside
        className="border-b border-gold/18 pb-5 md:sticky md:top-24 md:border-b-0 md:border-r md:pb-0 md:pr-5 md:text-right"
        aria-label="오늘 날짜와 하늘"
      >
        <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">TONIGHT</p>
        <p className="mt-2 text-meta text-starlight-dim">{front.dateLine}</p>
        <p className="text-meta text-starlight-dim">
          {front.phaseName} · {front.illumination}%
        </p>
        <p className="text-meta text-starlight-dim">달 {front.moonSign}</p>
        {/* "지금 수성 역행 중" 링크가 여기 있었는데, 상단의 카운트다운 띠(RetroBand)가
            역행 여부와 남은 날을 항상 말하게 되어 물러났다(정찰 ②). */}
        {profile ? (
          <>
            <p className="mt-3 text-meta text-gold-soft">{formatBirthDate(profile.date)}</p>
            <button
              type="button"
              onClick={() => requestRitual()}
              className="mt-2 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
            >
              고치기
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => requestRitual()}
            className="mt-3 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
          >
            내 하늘 열기
          </button>
        )}
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
          <div className="flex flex-none flex-col items-center gap-4">
            <ArchCard
              name={front.phaseTitle}
              latin={`MOON IN ${front.moonSignLatin}`}
              tagline={`${front.phaseName} · 밝은 면 ${front.illumination}%`}
              symbol="☽"
              width={240}
            >
              <MoonDisc
                illumination={sky.moon.illumination}
                phase={sky.moon.phase.key}
                /* 마운트 전(빌드 시점 하늘)에는 정지 — now가 잡혀 오늘 값이 된 뒤 한 번만 차오른다. */
                fill={now ? `byeolsaem:moon-fill:${dateKey(sky.date)}` : null}
              />
            </ArchCard>
            {/* "오늘의 내 카드"를 들고 나가는 두 갈래 길(스펙 §6.2·§6.3).
                파일 이름에 날짜가 들어 내일 또 저장해도 어제 것을 덮어쓰지 않는다. */}
            <div className="flex flex-col items-center gap-2">
              <SaveCardButton
                filename={`byeolsaem-moon-${sky.date.year}${String(sky.date.month).padStart(2, "0")}${String(sky.date.day).padStart(2, "0")}.png`}
                spec={() => ({
                  name: front.phaseTitle,
                  latin: `MOON IN ${front.moonSignLatin}`,
                  range: `${front.dateLine} · ${front.illumination}%`,
                  symbol: "☽",
                  tagline: front.phaseName,
                  art: moonArt(sky.moon.illumination, sky.moon.phase.key),
                })}
              />
              <KakaoShareButton
                text={`${front.dateLine}의 달 — ${front.phaseTitle}. ${front.phaseName}, 밝은 면 ${front.illumination}%`}
                path="/today"
                imagePath="/og/today.png"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 basis-72">
            <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
              {front.phaseLine}
            </p>
            {front.moonInSign && (
              <p className="mt-4 max-w-[52ch] break-keep text-guide text-starlight-dim">
                달이 {front.moonSign}에 있습니다. {front.moonInSign}
              </p>
            )}

            {canFlip && !flipped && (
              <div className="mt-8">
                <GoldButton variant="solid" onClick={flip}>
                  내 하늘과 겹쳐 보기
                </GoldButton>
              </div>
            )}
            {ready && !profile && (
              <p className="mt-8 max-w-[52ch] break-keep text-guide text-starlight-dim">
                여기까지는 오늘 밤 하늘을 보는 모든 사람이 같습니다. 태어난 순간을
                남기면 이 하늘이 <b className="font-normal text-starlight">당신의</b>{" "}
                어디를 건드리는지까지 볼 수 있습니다.
              </p>
            )}
            {ready && profile && back === null && (
              <p className="mt-8 max-w-[52ch] break-keep text-guide text-starlight-dim">
                &lsquo;{profile.city}&rsquo;의 좌표를 찾지 못해 내 차트와 겹쳐 볼 수
                없습니다. 태어난 곳을 다시 골라 주세요.
              </p>
            )}
          </div>
        </div>

        <TodayBody back={flipped ? back : null} sky={sky} now={clockNow} />
      </div>
    </div>
    </>
  );
}

/**
 * 카드 아래의 읽는 구간(스펙 C §5.1).
 *
 * 뒤집기 전(back이 null)에는 지금과 같이 열 개의 별과 다가오는 달만 — 탭 둘로
 * 탭바를 세울 이유가 없다. 뒤집으면 탭바가 서고 트랜짓이 카드로 갈린다. 탭바와
 * 다섯 구역이 한 div 안에 있어야 sticky가 산다.
 */
export function TodayBody({
  back,
  sky,
  now,
}: {
  back: TodayBack | null;
  sky: TodaySky;
  now: Date;
}) {
  const hasLens = (back?.lensTransits.length ?? 0) > 0;
  // ResultTabs의 관찰자가 items 정체성에 걸려 있다.
  const tabs = useMemo(
    () =>
      back
        ? [
            { id: "today-transits", label: "건드리는 자리" },
            ...(!back.quiet && hasLens && back.lensLabel
              ? [{ id: "today-lens", label: `궁금해한 ${back.lensLabel}` }]
              : []),
            ...(!back.quiet && back.otherTransits.length > 0
              ? [{ id: "today-others", label: hasLens ? "그 밖의 하늘" : "오늘의 각" }]
              : []),
            { id: "today-planets", label: "열 개의 별" },
            { id: "today-moons", label: "다가오는 달" },
          ]
        : [],
    [back, hasLens],
  );

  if (!back) {
    return (
      <>
        {/* 열 행성 자리표 — 계산은 이미 있었고 화면만 없었다(정찰 ①). */}
        <PlanetsNow sky={sky} />
        {/* 다가오는 삭망(정찰 ⑨). 달 카드의 흐름을 이어받는 자리. */}
        <ComingMoons now={now} />
      </>
    );
  }

  return (
    <div className="mt-16">
      <ResultTabs items={tabs} />
      <TransitList back={back} hasLens={hasLens} />
      <PlanetsNow id="today-planets" sky={sky} />
      <ComingMoons id="today-moons" now={now} />
    </div>
  );
}

/**
 * 뒷면의 조립 순서는 B안(2026-08-14 승인): 오늘의 한 줄 → 당신이 궁금해한 영역 →
 * 해 볼 것/미룰 것 → 그 밖의 하늘. 본문은 생활 언어가 맡고 별 이야기는 근거
 * 줄(basis)로 내려간다. 트랜짓은 카드다(스펙 C §5.2) — 계단은 카드 계단이 맡으므로
 * 예전 블록별 prompt-in 지연(120·200·280ms)은 뺐다. 첫 블록의 prompt-in 하나만
 * 뒤집는 순간의 등장으로 남긴다.
 */
function TransitList({ back, hasLens }: { back: TodayBack; hasLens: boolean }) {
  return (
    <>
      {/* scroll-mt로 머리글과 탭바 아래 여유를 남긴다 — 뒤집는 순간 여기로 데려온다. */}
      <section id="today-transits" className="mt-16 scroll-mt-32">
        <h2 className="animate-prompt-in mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
          오늘 하늘이 건드리는 자리
          <span aria-hidden className="h-px flex-1 bg-gold/25" />
        </h2>

        {back.quiet ? (
          <p className="max-w-[52ch] break-keep text-guide text-starlight">{back.quiet}</p>
        ) : (
          <>
            {back.headline && (
              <div className="animate-prompt-in">
                <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">오늘의 한 줄</p>
                <p className="mt-3 max-w-[44ch] break-keep font-display text-2xl leading-normal text-starlight">
                  {back.headline}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2.5">
              {back.chips.map((chip) => (
                <TalismanChip key={chip.label} symbol={chip.symbol} label={chip.label} />
              ))}
            </div>

            {back.advice && (
              <div className="mt-10 max-w-[52ch] border-l-2 border-gold/45 bg-gold/[0.06] py-4 pl-5 pr-4">
                <p className="break-keep text-guide">
                  <b className="font-normal text-gold-soft">해 볼 것</b>{" "}
                  <span className="text-starlight-dim">{back.advice.try}</span>
                </p>
                <p className="mt-2 break-keep text-guide">
                  <b className="font-normal text-gold-soft">미룰 것</b>{" "}
                  <span className="text-starlight-dim">{back.advice.hold}</span>
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {!back.quiet && hasLens && back.lensLabel && (
        <CardSection id="today-lens" title={`당신이 궁금해한 ${back.lensLabel}`}>
          {back.lensTransits.map((t, i) => (
            <TransitCard key={`${t.moving.key}-${t.fixed.key}-${t.aspectKo}`} t={t} index={i} />
          ))}
        </CardSection>
      )}

      {!back.quiet && back.otherTransits.length > 0 && (
        <CardSection id="today-others" title={hasLens ? "그 밖의 하늘" : "오늘의 각"}>
          {back.otherTransits.map((t, i) => (
            <TransitCard key={`${t.moving.key}-${t.fixed.key}-${t.aspectKo}`} t={t} index={i} />
          ))}
        </CardSection>
      )}

      <p className="mt-10 max-w-[52ch] break-keep text-meta text-starlight-dim">
        오늘 하늘은 한국 시간 정오를 기준으로 계산했습니다. 달은 하루에 13도를 움직이므로
        이른 아침과 늦은 밤은 이 값과 조금 다릅니다.
      </p>
    </>
  );
}

/**
 * 트랜짓 한 장. 옛 TransitItem의 모든 것이 자리만 바꿔 들어 있다 — 별 표기와
 * 오차·결·기간은 용어 줄로, 생활 문장의 첫 문장은 크게, 건드려지는 자리의 생활
 * 이름은 그 밑, 나머지 문장과 근거는 접힌 본문으로.
 */
function TransitCard({ t, index }: { t: TodayTransit; index: number }) {
  return (
    <ReadingCard
      index={index}
      badge={
        <>
          {t.aspectSymbol}
          {"\uFE0E"}
        </>
      }
      meta={`오늘의 ${t.moving.ko} ${t.aspectKo} 내 ${t.fixed.ko} · 오차 ${t.orb.toFixed(1)}도 · ${toneLabel(t.harmony)} · 약 ${t.span}`}
      plain={firstSentence(t.life)}
      where={t.area}
    >
      {afterFirstSentence(t.life) && <p>{afterFirstSentence(t.life)}</p>}
      <p>{t.basis}</p>
    </ReadingCard>
  );
}
