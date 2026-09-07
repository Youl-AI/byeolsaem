"use client";
import { useEffect, useMemo, useState } from "react";
import { m } from "motion/react";
import { CONCERN_LENSES } from "@/content/atoms/concerns";
import { LENS_INTRO, RESONANCE_NOTE } from "@/content/atoms/synastry";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { useInView } from "@/hooks/useInView";
import type { RitualData } from "@/components/hero/RitualForm";
import type { BirthProfile } from "@/lib/birth-profile";
import { formatBirthDate } from "@/lib/birth-profile";
import { ASPECT_TYPES, computeChart, type Chart } from "@/lib/chart";
import { coordinatesFor, koreaOffsetHours } from "@/lib/coordinates";
import { AspectBadge } from "@/components/ui/AspectBadge";
import { NameTag, chartPillars } from "@/components/chart/NameTag";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { CardSection, ResultSection } from "@/components/ui/ResultSection";
import { Link } from "@/components/ui/Link";
import { SIGN_SYMBOL, getSunSign } from "@/lib/zodiac";
import { signArt } from "@/lib/share-card";
import { afterFirstSentence, firstSentence } from "@/lib/text";
import { openBirthPanel, requestRitual } from "@/lib/ritual";
import { consumeInviteHash, type InvitePayload } from "@/lib/invite";
import {
  synastryReading,
  type LensView,
  type SynastryReading as SynastryReadingData,
} from "@/lib/synastry-reading";
import { ChartLoading, UnknownPlace } from "@/components/chart/NoProfile";
import { CompositeSection } from "./CompositeSection";
import { ExampleMeeting } from "./ExampleMeeting";
import { GoldButton } from "@/components/ui/GoldButton";
import { InviteButton } from "./InviteButton";
import { KakaoShareButton } from "@/components/ui/KakaoShareButton";
import { SaveCardButton } from "@/components/ui/SaveCardButton";
import { MotionScope } from "@/components/ui/MotionScope";
import { TalismanChip } from "@/components/ui/TalismanChip";
import { GoldThreads } from "./GoldThreads";

/**
 * 두 하늘의 만남.
 *
 * 상대의 정보는 저장하지 않는다. 내 출생 정보는 이 사이트를 쓰는 내내 같지만
 * 상대는 그렇지 않고, 무엇보다 **내 브라우저에 남의 생년월일을 남길 이유가
 * 없다.** 새로고침하면 사라지며, 화면에도 그렇게 적어 둔다.
 *
 * 입력은 같은 패널을 두 번째로 쓴다(RENEWAL_PLAN §11.4). 폼을 하나 더 만들면
 * 검증이 갈리는 순간부터 어느 쪽이 맞는지 알 수 없게 된다. onComplete만 바꿔
 * 끼우면 결과가 저장소 대신 이 화면의 상태로 간다.
 */
export function SynastryReading() {
  const { profile, ready } = useBirthProfile();
  const [partner, setPartner] = useState<RitualData | null>(null);
  /** 아래 목록에서 짚고 있는 만남. 그림의 실 한 가닥이 이것을 따라 밝아진다. */
  const [activeId, setActiveId] = useState<string | null>(null);
  /**
   * 이 관계의 무엇을 볼 것인가.
   *
   * 저장된 관심사를 첫 값으로 쓰되 **저장하지는 않는다.** 저장된 값은 "나에 대해
   * 무엇이 궁금한가"이고 여기서 고르는 것은 "이 사람과의 무엇이 궁금한가"다.
   * 다른 질문이라, 궁합을 보려고 잠깐 재물운으로 바꾼 것이 `/natal`의 천궁도까지
   * 바꿔 놓으면 안 된다. 게다가 상대 정보조차 저장하지 않으면서 그 사람과의
   * 렌즈만 저장하는 것은 앞뒤가 맞지 않는다.
   */
  const [concern, setConcern] = useState<string | null>(null);
  const chosen = concern ?? profile?.concern ?? null;
  /** 초대 링크로 왔는가. 화면 상태까지만 간다 — localStorage에는 남기지 않는다. */
  const [invited, setInvited] = useState<InvitePayload | null>(null);

  const myChart = useChartOf(profile);
  const theirChart = useChartOf(partner);

  const reading = useMemo(
    () => (myChart && theirChart ? synastryReading(myChart, theirChart, chosen) : null),
    [myChart, theirChart, chosen],
  );

  // 초대 링크로 왔는가 — fragment는 마운트 후에만 읽을 수 있다(SSR엔 없다).
  // 레이아웃의 스크럽 스크립트가 GA보다 먼저 주소에서 걷어 두므로(invite.ts
  // M-1 주석 참고) 여기서는 그 결과를 consumeInviteHash로 읽기만 한다.
  // 그 대가로 새로고침하면 초대가 사라진다 — 받은 링크를 다시 열면 된다.
  useEffect(() => {
    const payload = consumeInviteHash();
    if (payload) {
      setInvited(payload);
      setPartner({ ...payload, concern: null });
    }
  }, []);

  const askPartner = () => {
    openBirthPanel({
      kicker: "THEIR SKY",
      title: "상대의 밤하늘",
      description:
        "상대의 정보는 저장하지 않습니다. 이 화면을 떠나거나 새로고침하면 사라집니다.",
      // 배너가 초대가 아닌 상대 위에 남으면 거짓말이 된다 — 단, 취소하면(패널을
      // 닫기만 하면) 초대 상태는 그대로 둔다. 실제로 입력을 마쳤을 때만 지운다.
      onComplete: (d) => {
        setInvited(null);
        setPartner(d);
      },
      // 관심사는 묻지 않는다. 그 사람의 운세를 보는 것이 아니라 두 하늘이 만나는
      // 자리를 보는 것이라 상대의 관심사로는 할 일이 없다. 이 관계의 무엇을 볼지는
      // 결과 화면에서 내가 고른다.
      askConcern: false,
    });
  };

  if (!ready) return <ChartLoading />;
  // 정보가 없으면 요구부터 하지 않는다 — 예시 궁합을 먼저 보여준다(ExampleMeeting 주석 참고).
  // 단, 초대를 받아 온 것이라면 예시로 빠지지 않는다 — 상대의 하늘이 이미 와 있다.
  if (!profile) return invited ? <InvitedIntro invited={invited} /> : <ExampleMeeting />;
  if (!myChart)
    return (
      <>
        {invited && <InviteBanner invited={invited} />}
        <UnknownPlace city={profile.city} />
      </>
    );

  return (
    <div className="grid items-start gap-10 md:grid-cols-[150px_minmax(0,1fr)] md:gap-12">
      <aside
        className="border-b border-gold/18 pb-5 md:sticky md:top-24 md:border-b-0 md:border-r md:pb-0 md:pr-5 md:text-right"
        aria-label="이 궁합의 두 사람"
      >
        <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">TWO SKIES</p>
        <p className="mt-2 text-meta text-starlight-dim">나</p>
        <p className="text-meta text-gold-soft">{formatBirthDate(profile.date)}</p>
        <button
          type="button"
          onClick={() => requestRitual()}
          className="mt-1 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
        >
          고치기
        </button>

        <p className="mt-5 text-meta text-starlight-dim">그쪽</p>
        {partner ? (
          <>
            <p className="text-meta text-gold-soft">{formatBirthDate(partner.date)}</p>
            <button
              type="button"
              onClick={askPartner}
              className="mt-1 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
            >
              다른 사람으로
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={askPartner}
            className="border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
          >
            정보 넣기
          </button>
        )}
      </aside>

      <div className="min-w-0">
        {invited && <InviteBanner invited={invited} />}
        {!partner && <AskPartner onAsk={askPartner} />}
        {!partner && (
          <div className="mt-10">
            <InviteButton profile={profile} />
          </div>
        )}
        {partner && !theirChart && (
          <div className="py-8">
            <UnknownPlace city={partner.city} />
          </div>
        )}
        {partner && theirChart && reading && (
          <>
            <SynastryHero
              mine={myChart}
              theirs={theirChart}
              reading={reading}
              profile={profile}
              activeId={activeId}
            />
            <SynastryBody
              mine={myChart}
              theirs={theirChart}
              reading={reading}
              chosen={chosen}
              activeId={activeId}
              onPick={setConcern}
              onActive={setActiveId}
            />

            <div className="mt-8">
              <InviteButton profile={profile} />
            </div>

            {/* 상대의 생년월일을 방금 받았으니 그 사람의 태양궁을 이미 안다.
                일반 메뉴 대신 그 자리로 보낸다 — 열두 장을 이미 써 두었고,
                "그 사람은 어떤 사람인가"가 궁합 다음에 오는 물음이다. */}
            <PartnerRoom date={partner.date} />

            <p className="mt-14 max-w-[52ch] break-keep text-meta text-starlight-dim">
              상대의 정보는 어디에도 저장되지 않았습니다. 계산은 이 브라우저 안에서
              끝났고, 새로고침하면 사라집니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 첫 화면 — 나·그쪽 이름표, 금실, 두 사람의 한 줄, 공유(스펙 C §4.1).
 *
 * 이름표는 계산된 차트에서 읽을 뿐 어디에도 쓰지 않는다. 상승궁은 각자 따로 —
 * 한쪽만 시각을 몰라도 그쪽 이름표만 두 칸이다. "두 사람의 한 줄"이 이 화면의
 * LCP 앵커라 등장 클래스를 붙이지 않는다.
 */
export function SynastryHero({
  mine,
  theirs,
  reading,
  profile,
  activeId,
}: {
  mine: Chart;
  theirs: Chart;
  reading: SynastryReadingData;
  profile: Pick<BirthProfile, "date">;
  activeId: string | null;
}) {
  const me = chartPillars(mine);
  const them = chartPillars(theirs);
  return (
    <div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div>
          <p className="mb-1.5 text-meta text-starlight-dim">나</p>
          <NameTag sun={me.sun} moon={me.moon} ascendant={me.ascendant} />
        </div>
        <div>
          <p className="mb-1.5 text-meta text-starlight-dim">그쪽</p>
          <NameTag sun={them.sun} moon={them.moon} ascendant={them.ascendant} />
        </div>
      </div>

      <div className="mt-6">
        <GoldThreads mine={mine} theirs={theirs} lines={reading.lines} activeId={activeId} />
      </div>

      {reading.oneLiner && (
        <>
          {/* 두 사람의 한 줄 — 숫자보다 먼저, 이 관계가 어떤 짝인지부터(B안). */}
          <div className="mt-8">
            <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">두 사람의 한 줄</p>
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

          {/* 궁합 결과도 밖으로 나갈 통로가 있어야 한다(정찰 ⑧). 그림은 내
              태양 별자리 성좌 — 상대의 정보는 카드에도 남기지 않는다. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="w-full text-meta text-starlight-dim sm:w-auto">
              두 하늘을 카드 한 장으로 —
            </span>
            <SaveCardButton
              filename={`byeolsaem-synastry-${profile.date.replaceAll("-", "")}.png`}
              spec={() => ({
                name: "두 사람의 하늘",
                latin: "TWO SKIES",
                range: formatBirthDate(profile.date),
                symbol: SIGN_SYMBOL[getSunSign(profile.date).key],
                tagline: firstSentence(reading.oneLiner!),
                art: signArt(getSunSign(profile.date)),
              })}
            />
            <KakaoShareButton
              text={`두 사람의 하늘 — ${firstSentence(reading.oneLiner)}`}
              path="/synastry"
              imagePath="/og/synastry.png"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** 각 이름(`line.aspectKey`)에서 각도를 — 인장이 그릴 벌어짐. */
function aspectAngle(key: string): number {
  return ASPECT_TYPES.find((t) => t.key === key)?.angle ?? 0;
}

/**
 * 첫 화면 아래의 읽는 구간. 탭 넷 — 한눈에, {렌즈}으로, 닿는 자리, 세 번째 하늘
 * (스펙 C §4.2). 만남은 카드다(§4.3): 용어는 작게 위, 이 만남의 이름은 크게 아래,
 * 두 자리가 만나는 생활 문장이 그 밑, 본문은 접혀 있다. 이름 붙은 조합(✦)은
 * 처음부터 펼쳐져 있다 — 아래 안내문이 그렇게 말한다.
 */
export function SynastryBody({
  mine,
  theirs,
  reading,
  chosen,
  activeId,
  onPick,
  onActive,
}: {
  mine: Chart;
  theirs: Chart;
  reading: SynastryReadingData;
  chosen: string | null;
  /** 지금 짚고 있는 만남 — 카드 위 축소판이 그 실을 밝힌다. */
  activeId: string | null;
  onPick: (concern: string) => void;
  onActive: (id: string | null) => void;
}) {
  // ResultTabs의 관찰자가 items 정체성에 걸려 있다 — 매 렌더 새 배열을 주면
  // 스크롤 스파이가 매번 다시 붙는다.
  const tabs = useMemo(
    () => [
      { id: "overview", label: "한눈에" },
      ...(reading.empty
        ? []
        : [
            { id: "lens", label: reading.lens ? `${reading.lens.label}으로` : "무엇을 볼까요" },
            { id: "lines", label: "닿는 자리" },
          ]),
      { id: "composite", label: "세 번째 하늘" },
    ],
    [reading.empty, reading.lens],
  );

  return (
    // 탭바와 그 아래 전부가 한 상자 안에 있어야 한다 — sticky는 자기 컨테이닝
    // 블록 밖으로 못 나간다.
    <div className="mt-10">
      <ResultTabs items={tabs} />

      <ResultSection id="overview" title="한눈에">
        <Resonance reading={reading} />
        {reading.empty ? (
          <p className="mt-10 max-w-[52ch] break-keep leading-relaxed text-starlight">
            {reading.empty}
          </p>
        ) : (
          <div className="mt-10 flex flex-wrap gap-2.5">
            {reading.chips.map((chip) => (
              <TalismanChip key={chip.label} symbol={chip.symbol} label={chip.label} />
            ))}
          </div>
        )}
      </ResultSection>

      {!reading.empty && (
        <>
          <LensSection id="lens" lens={reading.lens} chosen={chosen} onPick={onPick} />

          <CardSection
            id="lines"
            title="두 하늘이 닿는 자리"
            intro={`${chosen ? `${chosen}에 걸리는 것을 앞에 두고, ` : ""}이름이 붙어 있는 조합과 무게가 실린 것부터 ${reading.lines.length}개입니다. 이름 붙은 조합(✦)은 펼쳐 두었고 나머지는 눌러서 엽니다. 한 줄에 커서를 올리거나 눌러서 열면 바로 위 그림에서 그 실이 밝아집니다.`}
            aside={
              /* 큰 그림은 첫 화면에 있어 여기서는 안 보인다. 축소판을 카드 바로 위에
                 두고, 넓은 화면에서는 탭바 아래에 붙여 카드를 지나는 동안에도 남긴다.
                 좁은 화면은 hover가 없으므로 카드를 여는 것이 짚는 동작이다. */
              <div className="mb-5 border-b border-gold/15 pb-4 md:sticky md:top-[7.25rem] md:z-10 md:bg-ink/95 md:pt-2 md:backdrop-blur">
                <GoldThreads
                  mine={mine}
                  theirs={theirs}
                  lines={reading.lines}
                  activeId={activeId}
                  compact
                />
              </div>
            }
          >
            {reading.lines.map((line, i) => (
              <ReadingCard
                key={line.id}
                index={i}
                defaultOpen={line.highlight !== null}
                onPointerEnter={() => onActive(line.id)}
                onPointerLeave={() => onActive(null)}
                // 손가락에는 hover가 없다. 카드를 여닫는 것이 그 자리에서 짚는
                // 동작이므로, 방금 만진 줄의 실을 밝힌다.
                onToggle={() => onActive(line.id)}
                badge={
                  <AspectBadge
                    angle={aspectAngle(line.aspectKey)}
                    harmony={line.harmony}
                    aSymbol={line.mine.symbol}
                    bSymbol={line.theirs.symbol}
                    animate
                    delay={i * 60}
                    className="w-8"
                  />
                }
                meta={
                  <>
                    {/* 별표는 sr-only 문장(아래 plain)이 같은 말을 하므로 스크린리더에는
                        숨긴다 — 안 그러면 도형 이름과 문장이 겹쳐 두 번 읽힌다. */}
                    {line.highlighted && <span aria-hidden>✦ </span>}
                    {line.meeting}
                  </>
                }
                plain={
                  <>
                    {line.headline}
                    {line.highlighted && <span className="sr-only"> 고른 관심사에 걸리는 항목입니다.</span>}
                  </>
                }
                where={firstSentence(line.body)}
                basis={line.basis}
              >
                {afterFirstSentence(line.body) && <p>{afterFirstSentence(line.body)}</p>}
                {line.highlight && (
                  <p className="border-l-2 border-gold/40 pl-4 text-starlight">{line.highlight}</p>
                )}
              </ReadingCard>
            ))}
          </CardSection>
        </>
      )}

      <CompositeSection id="composite" mine={mine} theirs={theirs} />
    </div>
  );
}

/** 궁합을 다 읽은 사람이 다음에 궁금해하는 것 — 상대의 자리. */
function PartnerRoom({ date }: { date: string }) {
  const sign = getSunSign(date);
  return (
    <div className="mt-16 border-t border-gold/15 pt-10">
      <p className="max-w-[52ch] break-keep leading-relaxed text-starlight-dim">
        상대의 태양은 <span className="text-starlight">{sign.ko}</span>에 있습니다.
        각도가 둘 사이의 일이라면, 그 자리는 그 사람 혼자서도 그런 사람인 부분입니다.
      </p>
      <Link
        href={`/sign/${sign.key}`}
        className="mt-4 inline-block border-b border-gold/40 pb-0.5 text-gold-soft transition-colors hover:border-gold-soft hover:text-starlight"
      >
        {sign.ko} 읽어 보기
        <span aria-hidden> →</span>
      </Link>
    </div>
  );
}

/** 출생 정보 한 벌에서 차트를. 좌표를 찾지 못하면 null이다. */
function useChartOf(data: RitualData | null): Chart | null {
  return useMemo(() => {
    if (!data) return null;
    const coordinates = coordinatesFor(data.city);
    if (!coordinates) return null;
    return computeChart({
      date: data.date,
      time: data.time,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezoneOffsetHours: koreaOffsetHours(data.date, data.time),
    });
  }, [data]);
}

/** 초대 링크로 왔다는 것을 알리는 띠 — 상대가 이미 보내 둔 하늘. */
function InviteBanner({ invited }: { invited: InvitePayload }) {
  return (
    <p className="mb-8 border border-gold/25 bg-ink-raised/60 px-4 py-3 break-keep text-guide text-starlight-dim">
      누군가 궁합을 청했습니다 · {formatBirthDate(invited.date)}의 하늘이 도착해 있어요.
    </p>
  );
}

/**
 * 초대 링크로 왔지만 아직 내 하늘을 열지 않은 상태 — ExampleMeeting 대신 이
 * 화면을 보여준다. 예시로 흘려보내면 이미 도착해 있는 상대의 하늘이 묻힌다.
 * 내 정보를 넣으면(useBirthProfile 갱신) 다음 렌더에서 곧장 결과로 넘어간다.
 */
function InvitedIntro({ invited }: { invited: InvitePayload }) {
  return (
    <div className="mx-auto max-w-[52ch] py-16">
      <InviteBanner invited={invited} />
      <p className="break-keep leading-relaxed text-starlight">
        받은 것은 상대의 하늘입니다. 당신의 순간을 넣으면 두 하늘이 만나는 자리가 곧장
        열립니다.
      </p>
      <div className="mt-8">
        <GoldButton variant="solid" onClick={() => requestRitual()}>
          내 밤하늘 열기
        </GoldButton>
      </div>
    </div>
  );
}

function AskPartner({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="max-w-[52ch]">
      <p className="break-keep leading-relaxed text-starlight">
        당신의 하늘은 준비됐습니다. 상대가 태어난 순간을 넣으면 두 하늘이 서로의 어디를
        건드리는지 계산합니다.
      </p>
      <p className="mt-3 break-keep text-guide text-starlight-dim">
        상대의 정보는 <b className="font-normal text-gold-soft">저장하지 않습니다.</b> 이
        화면을 떠나거나 새로고침하면 사라집니다 — 남의 생년월일을 내 브라우저에 남길
        이유가 없습니다.
      </p>
      <div className="mt-8">
        <GoldButton variant="solid" onClick={onAsk}>
          상대의 하늘 넣기
        </GoldButton>
      </div>
    </div>
  );
}

/**
 * 앞에 세우는 숫자 — 이름이 붙어 있는 조합이 몇 개 맺혀 있는가.
 *
 * 숫자보다 그 숫자가 무엇인지가 먼저다. 궁합 점수로 읽히면 이 페이지는 계산이
 * 아니라 점괘가 된다 — 그래서 세는 방법을 숫자 바로 옆에 붙여 둔다. 아래 목록에서
 * 직접 세어 보면 같은 값이 나온다.
 */
function Resonance({ reading }: { reading: SynastryReadingData }) {
  const [frame, started] = useInView<HTMLDivElement>(0.5);
  const shown = useCountUp(reading.named, started);

  return (
    <div ref={frame} className="flex flex-wrap items-start gap-x-10 gap-y-6">
      <div className="flex-none">
        <p className="font-latin text-eyebrow tracking-[0.24em] text-gold">RESONANCE</p>
        <p className="mt-1 font-display text-6xl tabular-nums text-starlight">
          {shown}
          <span className="ml-1 font-display text-2xl text-starlight-dim">{" / 12"}</span>
        </p>
        <p className="mt-1 font-display text-lg text-gold-soft">{reading.bandLabel}</p>
      </div>
      <div className="min-w-0 flex-1 basis-72">
        <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">{reading.bandLine}</p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-meta text-starlight-dim">
          <li>맺힌 각도 모두 {reading.total}</li>
          <li>흐르는 각도 {reading.flowing}</li>
          <li>부딪히는 각도 {reading.friction}</li>
          <li>겹치는 각도 {reading.overlapping}</li>
          {reading.tightest !== null && <li>가장 정확한 오브 {reading.tightest.toFixed(1)}도</li>}
        </ul>
        <p className="mt-5 max-w-[52ch] break-keep text-meta text-starlight-dim">
          {RESONANCE_NOTE}
        </p>
      </div>
    </div>
  );
}

/**
 * 이 관계의 무엇을 볼 것인가, 그리고 그 영역에서 두 사람이 어떻게 만나는가.
 *
 * 각도는 어떤 힘이 만나는지만 말한다. 어느 영역인지를 말하는 것은 방(하우스)이고,
 * "그 사람과 금전운"이라는 물음에 실제로 답하는 것도 방이다 — 재물운은 2하우스
 * (내가 버는 것)와 8하우스(남과 얽힌 돈)를 본다.
 *
 * 관심사를 바꾸면 이 자리와 아래 목록의 차례가 즉시 바뀐다. 계산은 이미 브라우저
 * 안에 다 있어서 다시 물을 것이 없다.
 */
function LensSection({
  id,
  lens,
  chosen,
  onPick,
}: {
  id: string;
  lens: LensView | null;
  chosen: string | null;
  onPick: (concern: string) => void;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-32">
      <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        {lens ? `${lens.label}으로 본다면` : "무엇을 볼까요"}
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>

      <MotionScope>
      <div role="group" aria-label="이 관계에서 볼 영역" className="flex flex-wrap gap-2.5">
        {CONCERN_LENSES.map((option) => {
          const active = option.label === chosen;
          return (
            <m.button
              key={option.key}
              type="button"
              onClick={() => onPick(option.label)}
              aria-pressed={active}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className={`rounded-full border px-4 py-2 text-xs tracking-wide transition-colors ${
                active
                  ? "border-gold bg-gold/12 text-starlight"
                  : "border-gold/30 text-starlight-dim hover:border-gold/60 hover:text-starlight"
              }`}
            >
              {option.label}
            </m.button>
          );
        })}
      </div>
      </MotionScope>

      {!lens ? (
        <p className="mt-6 max-w-[52ch] break-keep text-guide text-starlight-dim">
          하나를 고르면 그 영역에서 두 사람이 어디서 만나는지를 봅니다. 여기서 고른
          것은 이 화면 안에서만 쓰이고 저장되지 않습니다.
        </p>
      ) : (
        <>
          <p className="mt-6 max-w-[52ch] break-keep text-guide text-starlight">{lens.summary}</p>
          <p className="mt-2 max-w-[52ch] break-keep text-meta text-starlight-dim">{LENS_INTRO}</p>

          {lens.noHouses ? (
            <p className="mt-6 max-w-[52ch] break-keep leading-relaxed text-starlight-dim">
              {lens.noHouses}
            </p>
          ) : (
            <>
              <ul className="mt-8 space-y-8">
                {lens.rooms.map((room) => (
                  <li key={room.number} className="border-t border-gold/15 pt-6">
                    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-lg text-starlight">
                        내 {room.ko}
                      </span>
                      <span className="text-meta text-starlight-dim">
                        {room.number}번째 방 · {room.domain}
                      </span>
                    </p>
                    {room.visitors.length === 0 ? (
                      <p className="mt-3 max-w-[52ch] break-keep text-guide text-starlight-dim">
                        이 방에 드는 상대의 별은 없습니다.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {room.visitors.map((visitor) => (
                          <li
                            key={visitor.planet.key}
                            className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3"
                          >
                            <span className="astro-symbol text-lg leading-snug text-gold-soft" aria-hidden>
                              {visitor.planet.symbol}
                              {"︎"}
                            </span>
                            <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
                              그쪽의 {visitor.planet.ko} — {visitor.line}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {lens.noVisitors && (
                <p className="mt-8 max-w-[52ch] break-keep leading-relaxed text-starlight-dim">
                  {lens.noVisitors}
                </p>
              )}
              {lens.partnerTimeUnknown && (
                <p className="mt-6 max-w-[52ch] break-keep text-meta text-starlight-dim">
                  {lens.partnerTimeUnknown}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

/** 0에서 그 값까지 올라간다. 화면에 들어온 뒤에 시작해야 눈에 보인다. */
function useCountUp(target: number, run: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const DURATION = 1100;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // 끝에서 부드럽게 멎는다. 일정한 속도로 세면 마지막에 뚝 끊긴다.
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run]);

  return value;
}

