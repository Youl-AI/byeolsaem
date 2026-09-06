"use client";
import { useMemo, useRef } from "react";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { useInView } from "@/hooks/useInView";
import { formatBirthDate, type BirthProfile } from "@/lib/birth-profile";
import { formatPlacement, type Chart } from "@/lib/chart";
import { plainLine } from "@/lib/plain-line";
import { PLANET_BY_KEY, type PlanetKey } from "@/lib/planets";
import { describeElements, type Reading, type ReadingPlacement } from "@/lib/reading";
import { shareWheel, wheelArt } from "@/lib/share-card";
import { firstSentence } from "@/lib/text";
import { SIGN_SYMBOL } from "@/lib/zodiac";
import { requestRitual } from "@/lib/ritual";
import { ASC_FACES, SIGN_FACES } from "@/content/atoms/life";
import { AspectBadge } from "@/components/ui/AspectBadge";
import { GoldButton } from "@/components/ui/GoldButton";
import { KakaoShareButton } from "@/components/ui/KakaoShareButton";
import { ReadingCard } from "@/components/ui/ReadingCard";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { SaveCardButton } from "@/components/ui/SaveCardButton";
import { toneLabel } from "@/components/ui/ToneBadge";
import { ChartWheel, ChartWheelLegend } from "./ChartWheel";
import { NameTag } from "./NameTag";
import { ChartLoading, UnknownPlace } from "./NoProfile";
import { SkyLapse } from "./SkyLapse";
import { Term } from "./Term";
import { useChart } from "./useChart";

/**
 * 천궁도 전체 — 태어난 순간의 하늘을 계산하고 아톰으로 조립해 읽어 준다.
 *
 * 계산도 조립도 이 브라우저 안에서 끝난다. 어디에도 출생 정보를 보내지 않고,
 * 같은 정보를 넣으면 언제 다시 열어도 같은 글이 나온다.
 *
 * 배치는 §11.4에서 정한 시안 B다. 왼쪽 기둥은 스크롤을 따라오며 누구의 하늘을
 * 보고 있는지 계속 말한다.
 *
 * 2026-09-06 재구성: 처음 온 사람이 첫 화면에서 자기 이름표와 원반과 한 줄을
 * 보고, 그 아래는 탭으로 갈린 카드로 읽는다. **문장은 하나도 지우지 않았다** —
 * 옛 화면의 모든 해석 문장은 카드의 "더 읽기" 본문이나 "자세히" 탭에 그대로 있다.
 * 크롤러가 보는 본문은 오히려 늘었다.
 *
 * `intro`(페이지 헤더)는 차트가 없을 때만 그린다. 차트가 있으면 그 300px을
 * 이름표와 원반에 내준다. SSR 시점에는 profile이 항상 null이라 헤더는 HTML에
 * 남는다 — 크롤러와 첫 방문자는 그대로 본다.
 */
export function NatalReading({
  fallback,
  intro,
}: {
  fallback: React.ReactNode;
  intro?: React.ReactNode;
}) {
  const { profile, ready } = useBirthProfile();
  const state = useChart(profile);
  /** 타임랩스의 "오늘". 렌더마다 새 Date를 만들면 SkyLapse의 useMemo가 매번
      깨진다 — 한 번 잡아 두고 세션 내내 같은 값을 쓴다. 이른 return들보다 앞에
      서야 한다(훅 순서 규칙). */
  const now = useRef(new Date());

  // 저장소를 읽기 전에도 예시 하늘을 그대로 둔다. 서버가 이미 그려 둔 것이라
  // HTML에 남아 있고, 여기서 로딩 문구로 바꾸면 그 글이 지워진다 — 수집기가
  // 자바스크립트를 돌리지 않고 보는 화면이 다시 빈 껍데기가 된다.
  if (!ready)
    return (
      <>
        {intro}
        {fallback}
      </>
    );
  // 정보가 없으면 요구부터 하지 않는다 — 예시 하늘을 먼저 보여준다(ExampleSky 주석 참고).
  if (!profile)
    return (
      <>
        {intro}
        {fallback}
      </>
    );
  if (state?.status === "unknown-place")
    return (
      <>
        {intro}
        <UnknownPlace city={profile.city} />
      </>
    );
  if (state?.status !== "ready")
    return (
      <>
        {intro}
        <ChartLoading />
      </>
    );

  const { chart, reading } = state;

  // 원반에서 별을 누르면 그 별의 카드로 데려가고, 카드를 펼친다.
  const selectPlanet = (planet: PlanetKey) => {
    requestAnimationFrame(() => scrollToPlacement(planet));
  };

  return (
    <div className="grid items-start gap-10 md:grid-cols-[150px_minmax(0,1fr)] md:gap-12">
      <BirthRail
        date={formatBirthDate(profile.date)}
        time={profile.time}
        city={profile.city}
        concern={reading.lens?.label}
      />

      <div className="min-w-0">
        <NatalHero
          chart={chart}
          reading={reading}
          profile={profile}
          onSelectPlanet={selectPlanet}
        />
        <NatalBody chart={chart} reading={reading} now={now.current} />
      </div>
    </div>
  );
}

/**
 * 첫 화면 — 모바일 390×844 안에 전부 들어온다.
 *
 * 순서는 이름표 → 원반 → 한 줄 → 공유. 남에게 말할 수 있는 한 줄(이름표)이
 * 먼저 서고, 그 다음이 그림이다. 넓은 화면에서는 원반이 오른쪽 320px 열로 가고
 * 나머지가 왼쪽에 쌓인다 — DOM 순서는 모바일 순서 그대로 두고 CSS로만 옮긴다.
 *
 * 훅이 없다. 렌더 테스트가 이 순서를 직접 지킨다.
 */
export function NatalHero({
  chart,
  reading,
  profile,
  onSelectPlanet,
}: {
  chart: Chart;
  reading: Reading;
  profile: Pick<BirthProfile, "date">;
  onSelectPlanet: (planet: PlanetKey) => void;
}) {
  const { core } = reading;

  // 카드 원반과 원반 정밀본이 같은 데이터를 쓴다 — 두 저장 버튼의 공통 재료.
  const wheelData = () => ({
    placements: chart.placements.map((p) => ({
      symbol: PLANET_BY_KEY[p.planet].symbol,
      longitude: p.longitude,
      retrograde: p.retrograde,
    })),
    ascendant: chart.ascendant,
    aspects: reading.aspects.map((item) => ({
      a: chart.placements.find((p) => p.planet === item.a.key)!.longitude,
      b: chart.placements.find((p) => p.planet === item.b.key)!.longitude,
      harmony: item.aspect.type.harmony,
    })),
  });

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-8">
      {/* 페이지 헤더가 접히면 <h1>이 사라진다. 문서 제목은 남긴다. */}
      <h1 className="sr-only">나의 천궁도</h1>

      <div className="md:col-start-1 md:row-start-1">
        <NameTag
          sun={core.sun.placement.sign}
          moon={core.moon.placement.sign}
          ascendant={core.ascendant?.sign ?? null}
        />
      </div>

      <div className="mt-6 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0">
        <ChartWheel
          chart={chart}
          entrance="byeolsaem:wheel-entrance:natal"
          onSelect={onSelectPlanet}
        />
      </div>

      <div className="mt-6 md:col-start-1 md:row-start-2">
        {/* 당신을 한 줄로 — 전체를 관통하는 요약(B안, 2026-08-14 승인)이자 LCP
            앵커다. 어떤 모션에서도 opacity 0으로 시작하지 않는다: 진입 컨테이너
            바깥에 두고 등장 클래스를 붙이지 않는다. */}
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">당신을 한 줄로</p>
        <p className="mt-3 max-w-[44ch] break-keep font-display text-xl leading-normal text-starlight md:text-2xl">
          {reading.oneLiner}
        </p>

        {/* 계산이 가장 무거운 결과인데 밖으로 나가는 통로가 없었다(정찰 ⑧).
            카드에는 한 줄 요약의 첫 문장만 — 부적 크기의 글자에는 그게 전부 들어간다. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          {/* 뜬금없이 버튼만 있으면 뭘 저장하는지 모른다(2026-08-28). 문구는 태양
              자리 카드가 아니라 세 기둥 — 이 카드가 천궁도의 것임을 문구가 말한다. */}
          <span className="w-full text-meta text-starlight-dim sm:w-auto">
            이 하늘을 카드 한 장으로 —
          </span>
          <SaveCardButton
            filename={`byeolsaem-natal-${profile.date.replaceAll("-", "")}.png`}
            spec={() => ({
              name: core.sun.placement.sign.ko,
              latin: "MY NIGHT SKY",
              range: formatBirthDate(profile.date),
              symbol: SIGN_SYMBOL[core.sun.placement.sign.key],
              tagline: [
                `태양 ${core.sun.placement.sign.ko}`,
                `달 ${core.moon.placement.sign.ko}`,
                ...(core.ascendant ? [`상승 ${core.ascendant.sign.ko}`] : []),
              ].join(" · "),
              // 천궁도 카드에는 천궁도를 — 태양 자리 성좌는 /sign 카드의 옷이다.
              art: wheelArt(wheelData()),
            })}
          />
          {/* 위쪽의 그 원반 그대로를 갖고 싶은 사람도 있다(요청 2026-08-28) —
              하우스 번호·축·ASC까지 실린 정밀본. */}
          <SaveCardButton
            filename={`byeolsaem-wheel-${profile.date.replaceAll("-", "")}.png`}
            idleLabel="원반 이미지로 저장"
            busyLabel="원반을 그리는 중…"
            run={() =>
              shareWheel(
                {
                  ...wheelData(),
                  houseCusps: chart.houseCusps,
                  caption: formatBirthDate(profile.date),
                },
                `byeolsaem-wheel-${profile.date.replaceAll("-", "")}.png`,
              )
            }
          />
          <KakaoShareButton
            text={`나의 천궁도 — ${firstSentence(reading.oneLiner)}`}
            path="/natal"
            imagePath={`/og/sign/${core.sun.placement.sign.key}.png`}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 첫 화면 아래의 읽는 구간. 탭 하나로 다섯 구역을 오간다.
 *
 * 11,105px를 탭 없이 스크롤하던 것이 문제였다(2026-09-06 실측). 구역은 그대로
 * 두고 붙잡아 줄 손잡이만 얹었다.
 */
function NatalBody({ chart, reading, now }: { chart: Chart; reading: Reading; now: Date }) {
  const { core } = reading;
  // 관심사에 걸린 별은 자기 섹션으로, 나머지는 사전 섹션으로 갈라 세운다.
  const highlighted = reading.lens ? reading.placements.filter((p) => p.highlighted) : [];
  const rest =
    highlighted.length > 0 ? reading.placements.filter((p) => !p.highlighted) : reading.placements;

  // ResultTabs의 관찰자가 items 정체성에 걸려 있다 — 매 렌더 새 배열을 주면
  // 스크롤 스파이가 매번 다시 붙는다.
  const tabs = useMemo(
    () => [
      { id: "overview", label: "한눈에" },
      ...(reading.lens && highlighted.length > 0
        ? [{ id: "lens", label: `궁금해한 ${reading.lens.label}` }]
        : []),
      { id: "planets", label: highlighted.length > 0 ? "나머지 별들" : "열 개의 별" },
      ...(reading.aspects.length > 0 ? [{ id: "aspects", label: "별 사이" }] : []),
      { id: "detail", label: "자세히" },
    ],
    [reading.lens, highlighted.length, reading.aspects.length],
  );

  return (
    // 탭바와 그 아래 전부가 한 상자 안에 있어야 한다. sticky는 자기 컨테이닝
    // 블록 밖으로 못 나가므로, 탭만 감싸면 그 div의 높이가 곧 탭 높이라 첫
    // 스크롤에 그대로 밀려 나간다 — 붙는 것처럼 보이지도 않는다.
    <div className="mt-10">
      <ResultTabs items={tabs} />

      {/* 세 기둥. 이 셋을 모르면 나머지는 배경이다. */}
      <CardSection id="overview" title="한눈에">
        <ReadingCard
          index={0}
          badge={
            <>
              {"☉"}
              {"\uFE0E"}
            </>
          }
          tech={`태양 · ${formatPlacement(core.sun.placement)}`}
          plain={
            <>
              겉으로는{" "}
              <b className="font-medium text-gold-soft">
                {SIGN_FACES[core.sun.placement.sign.key].out}
              </b>{" "}
              사람
            </>
          }
          where={firstSentence(core.sun.inSign)}
        >
          <p>{core.sun.inSign}</p>
        </ReadingCard>
        <ReadingCard
          index={1}
          badge={
            <>
              {"☽"}
              {"\uFE0E"}
            </>
          }
          tech={`달 · ${formatPlacement(core.moon.placement)}`}
          plain={
            <>
              혼자일 때는{" "}
              <b className="font-medium text-gold-soft">
                {SIGN_FACES[core.moon.placement.sign.key].in}
              </b>{" "}
              사람
            </>
          }
          where={firstSentence(core.moon.inSign)}
        >
          <p>{core.moon.inSign}</p>
        </ReadingCard>
        {core.ascendant ? (
          <ReadingCard
            index={2}
            badge="ASC"
            tech={`상승궁 · ${core.ascendant.sign.ko}`}
            plain={
              <>
                남들이 처음 보는 나는{" "}
                <b className="font-medium text-gold-soft">
                  {ASC_FACES[core.ascendant.sign.key]}
                </b>{" "}
                사람
              </>
            }
            where={firstSentence(core.ascendant.text)}
          >
            <p>{core.ascendant.text}</p>
          </ReadingCard>
        ) : (
          <p className="mt-3 max-w-[52ch] break-keep text-guide text-starlight-dim">
            상승궁은 태어난 시각을 알아야 정해집니다. 시각이 4분 어긋나면 1도가 움직이므로,
            모르는 채로 채워 넣지 않습니다.
          </p>
        )}
      </CardSection>

      {/* 관심사에 걸린 별은 자기 섹션을 갖는다. 목록 정렬만으로는 "이게 내가
          물어본 것에 대한 답"이라는 것이 전해지지 않았다(B안). */}
      {reading.lens && highlighted.length > 0 && (
        <CardSection
          id="lens"
          title={`당신이 궁금해한 ${reading.lens.label}`}
          intro={reading.lens.summary}
        >
          {highlighted.map((item, i) => (
            <PlanetCard key={item.planet.key} item={item} index={i} />
          ))}
          {reading.lifework && (
            <div className="mt-6 border-l-2 border-gold/45 pl-4">
              <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
                {reading.lifework.text}
              </p>
              <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">
                {reading.lifework.basis}
              </p>
            </div>
          )}
        </CardSection>
      )}
      {!(reading.lens && highlighted.length > 0) && reading.lifework && (
        <CardSection id="lifework" title="평생의 과제 하나">
          <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
            {reading.lifework.text}
          </p>
          <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">
            {reading.lifework.basis}
          </p>
        </CardSection>
      )}

      <CardSection
        id="planets"
        title={highlighted.length > 0 ? "나머지 별들" : "열 개의 별"}
        intro="별마다 무엇을 맡는지, 그 힘이 삶의 어느 자리에 있는지 한 줄씩. 눌러서 펼치면 그 별의 이야기 전부가 나옵니다."
      >
        {rest.map((item, i) => (
          <PlanetCard key={item.planet.key} item={item} index={i} />
        ))}
      </CardSection>

      {reading.aspects.length > 0 && (
        <CardSection
          id="aspects"
          title="별과 별 사이"
          intro={`두 별이 특정한 각도로 만나면 서로의 작용이 섞입니다. 이것을 어스펙트라고 합니다. 당신 고유의 이야기가 진하게 걸린 것부터 ${reading.aspects.length}개를 골랐습니다. 오브는 정확한 각도에서 얼마나 벗어났는지이고, 작을수록 그 성질이 뚜렷합니다.`}
        >
          {reading.aspects.map((item, i) => (
            <ReadingCard
              key={`${item.a.key}-${item.b.key}`}
              index={i}
              badge={
                /* 각의 기하 인장 — "삼각 120도"를 읽는 것과 보는 것의 차이(감사 2026-08-28). */
                <AspectBadge
                  angle={item.aspect.type.angle}
                  harmony={item.aspect.type.harmony}
                  aSymbol={item.a.symbol}
                  bSymbol={item.b.symbol}
                  animate
                  delay={i * 60}
                  /* w-8 = ReadingCard 용어 줄이 비워 둔 pr-8. 더 넓으면 겹친다. */
                  className="w-8"
                />
              }
              /* 결(순풍·마찰·겹침)을 글자로 붙인다 — 인장은 aria-hidden이라
                 접힌 카드에서는 색 말고 아무것도 말하지 않는다. */
              tech={`${item.a.ko} ${item.aspect.type.ko} ${item.b.ko} · 오브 ${item.aspect.orb.toFixed(1)}도 · ${item.strengthKo} · ${toneLabel(item.aspect.type.harmony)}`}
              plain={item.headline}
              where={firstSentence(item.body)}
            >
              <p className="text-gold-soft">{item.theme}</p>
              <p>{item.body}</p>
            </ReadingCard>
          ))}
        </CardSection>
      )}

      <Section id="detail" title="점성술로 자세히">
        <ChartWheelLegend />
        {/* 어떤 방식으로 나눈 하우스인지 화면에서 말한다 — chart.ts가 홀사인을
            고르며 "방식을 화면에 밝힌다"고 약속한 그 자리다. 옛 원반 캡션에
            있던 문장을 그대로 옮겼다. */}
        <p className="mt-4 max-w-[52ch] break-keep text-guide text-starlight-dim">
          <Term name="하우스" />는 <Term name="홀사인" /> 방식으로 나눴습니다.
        </p>

        {/* 이 화면을 읽는 법. 볼 것이 많은 화면이라, 무엇이 중요하고 어떤 순서로
            읽으면 되는지 말해 준다 — 태양·달·상승궁을 모르는 채로
            "천칭자리 10도"를 읽으면 그냥 낯선 문자열이다(§11.3). */}
        <section className="mt-12 border-l-2 border-gold/40 pl-5 text-guide text-starlight">
          <p className="font-display text-lg text-starlight">이 화면을 읽는 순서</p>
          <ul className="mt-3 space-y-2">
            <li>
              <b className="font-normal text-gold-soft">① 세 기둥부터.</b> 태양은 무엇을
              향해 가는 사람인지, 달은 혼자 있을 때 어떤 사람인지,{" "}
              <Term name="상승궁" />은 남들이 처음 보는 나입니다. 이 셋이 하늘의
              뼈대이고 나머지는 살입니다.
            </li>
            {reading.lens && (
              <li>
                <b className="font-normal text-gold-soft">
                  ② 당신이 궁금해한 {reading.lens.label}.
                </b>{" "}
                그 영역에 해당하는 별만 골라 아래에 따로 모아 두었습니다.
              </li>
            )}
            <li>
              <b className="font-normal text-gold-soft">
                {reading.lens ? "③" : "②"} 나머지는 사전처럼.
              </b>{" "}
              별 열 개를 한 번에 다 읽을 필요는 없습니다. 원반의 별 기호를 누르면 그
              별의 설명으로 데려갑니다.
            </li>
          </ul>
        </section>

        <h3 className="mt-12 break-keep font-display text-lg text-starlight">하늘 전체의 무게</h3>
        <p className="mt-2 break-keep leading-relaxed text-starlight">
          {describeElements(reading.elements)}
        </p>
        {/* 별 눈금 줄 — 숫자 한 줄로는 "물 0"의 비어 있음이 안 보였다(감사
            2026-08-28). 빈 눈금이 그대로 보이면 비어 있음이 말이 아니라 그림이 된다. */}
        <ul className="mt-6 space-y-2.5">
          {["불", "흙", "공기", "물"].map((element) => {
            const count = reading.elements.find((e) => e.element === element)?.count ?? 0;
            return (
              <li key={element} className="flex items-center gap-4">
                <span className="w-8 flex-none text-guide text-starlight">{element}</span>
                <span className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < count
                          ? "size-1.5 rounded-full bg-gold-soft"
                          : "size-1.5 rounded-full border border-starlight-dim/40"
                      }
                    />
                  ))}
                </span>
                <span className="text-meta tabular-nums text-starlight-dim">
                  {count}
                  {count === 0 && " · 비어 있는 원소"}
                </span>
              </li>
            );
          })}
        </ul>

        <h3 className="mt-12 break-keep font-display text-lg text-starlight">태어난 뒤 하늘은</h3>
        <p className="mt-2 max-w-[52ch] break-keep text-guide text-starlight-dim">
          느린 별 다섯이 태어난 자리에서 오늘까지 얼마나 돌았는지. 재생을 누르면 한 번 돌고
          멈춥니다.
        </p>
        <SkyLapse chart={chart} now={now} />

        {reading.timeUnknown && (
          <div className="mt-16 border-t border-gold/15 pt-8">
            <p className="max-w-[52ch] break-keep text-guide text-starlight-dim">
              태어난 시각을 남기지 않으셔서 상승궁과 하우스는 비워 두었습니다. 달의
              위치도 하루 사이에 13도까지 움직이므로 위 값은 정오를 기준으로 한
              것입니다. 시각을 찾으시면{" "}
              <button
                type="button"
                onClick={() => requestRitual()}
                className="border-b border-gold/40 pb-0.5 text-gold-soft transition-colors hover:text-starlight"
              >
                다시 남겨
              </button>{" "}
              주세요.
            </p>
          </div>
        )}

        <div className="mt-20 border-t border-gold/15 pt-12">
          <p className="max-w-[52ch] break-keep leading-relaxed text-starlight-dim">
            이 배치가 지금 하늘과 어떻게 만나는지는 날마다 달라집니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <GoldButton variant="solid" href="/today">
              오늘의 하늘 보기
            </GoldButton>
            <GoldButton variant="outline" href="/yearly">
              올해의 흐름 보기
            </GoldButton>
          </div>
        </div>
      </Section>
    </div>
  );
}

/**
 * 카드 묶음 섹션. 화면에 들어오면 data-in을 켜서 카드 계단이 시작된다.
 *
 * 카드는 이 div의 **직계 자식**이어야 한다 — globals.css의 진입 규칙이
 * `[data-in="true"] > .reading-card`라서 중간에 li나 래퍼가 끼면 켜지지 않는다.
 */
function CardSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <Section id={id} title={title}>
      {intro && (
        <p className="mb-4 max-w-[52ch] break-keep text-guide text-starlight-dim">{intro}</p>
      )}
      <div ref={ref} data-in={inView ? "true" : "false"} className="space-y-2.5">
        {children}
      </div>
    </Section>
  );
}

/**
 * 별 하나의 카드. 위에 작게 용어, 아래 크게 사람 말. 접힌 본문에 옛 화면의
 * `PlacementBody`가 그대로 들어 있다 — 자리 문장, 하우스 문장, 세대 행성 안내.
 */
function PlanetCard({ item, index }: { item: ReadingPlacement; index: number }) {
  const tech = `${item.planet.ko} · ${formatPlacement(item.placement)}${
    item.house ? ` · ${item.house.number}하우스` : ""
  }${item.placement.retrograde ? " · ℞" : ""}`;
  return (
    <ReadingCard
      id={placementDomId(item.planet.key)}
      index={index}
      badge={
        <>
          {item.planet.symbol}
          {"\uFE0E"}
        </>
      }
      tech={tech}
      plain={plainLine(item.planet.key, item.house?.number ?? null, item.placement.sign)}
      where={firstSentence(item.inSign)}
    >
      <p>{item.inSign}</p>
      {item.inHouse && <p>{item.inHouse}</p>}
      {item.planet.tier === "generational" && (
        <p className="text-meta">
          {item.planet.ko}은 한 별자리에 {item.planet.dwell} 머뭅니다. 같은 무렵에 태어난
          사람이 모두 같은 자리를 가지므로, 이 별은 개인보다 세대를 말합니다.
        </p>
      )}
    </ReadingCard>
  );
}

/**
 * 왼쪽 붙박이 기둥. 누구의 하늘을 보고 있는지 스크롤 내내 말해 준다.
 *
 * 데스크톱에서는 오른쪽에 금선을 세우고 오른쪽 정렬로 붙여 본문 쪽 가장자리를
 * 만든다. 모바일에서는 세로로 세울 자리가 없으므로 위쪽 가로줄로 눕힌다.
 */
function BirthRail({
  date,
  time,
  city,
  concern,
}: {
  date: string;
  time: string | null;
  city: string;
  concern?: string;
}) {
  return (
    <aside
      className="border-b border-gold/18 pb-5 md:sticky md:top-24 md:border-b-0 md:border-r md:pb-0 md:pr-5 md:text-right"
      aria-label="이 하늘의 출생 정보"
    >
      <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">BORN</p>
      <p className="mt-2 text-meta text-starlight-dim">{date}</p>
      <p className="text-meta text-starlight-dim">{time ?? "시각 모름"}</p>
      <p className="text-meta text-starlight-dim">{city}</p>
      {concern && <p className="mt-3 text-meta text-gold-soft">{concern}</p>}
      <button
        type="button"
        onClick={() => requestRitual()}
        className="mt-4 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
      >
        고치기
      </button>
    </aside>
  );
}

/**
 * 좌측 정렬 섹션. 제목 오른쪽으로 금선이 뻗어 읽는 폭의 끝을 표시한다.
 *
 * `id`는 탭바의 앵커이자 스크롤 스파이의 관찰 대상이다. `scroll-mt-32`(128px)는
 * 머리글 64px + 붙박이 탭바 약 48px을 함께 비운 것 — 앵커로 뛰면 제목이 둘 중
 * 어느 것에도 숨지 않는다. 96px(`scroll-mt-24`)로는 둘의 합에 모자랐다.
 */
function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-32">
      <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        {title}
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>
      {children}
    </section>
  );
}

/** 원반의 기호를 누르면 그 별의 카드로 데려간다. */
function placementDomId(planet: PlanetKey): string {
  return `placement-${planet}`;
}

/**
 * 원반에서 별을 누르면 아래 본문의 그 카드로 간다.
 *
 * §11.4에서는 여기에 패널을 열기로 했지만, 아래 본문이 이미 열 개의 별을 전부
 * 설명하고 있다. 패널을 띄우면 같은 글을 두 곳에 두게 되고 둘이 갈릴 여지가
 * 생긴다 — 데려가는 편이 짧고, 그 김에 앞뒤 별까지 눈에 들어온다.
 *
 * 카드는 접힌 채 도착하므로 그 자리에서 펼쳐 준다. 보러 온 문장이 닫혀 있으면
 * 데려간 보람이 없다.
 */
function scrollToPlacement(planet: PlanetKey): void {
  const target = document.getElementById(placementDomId(planet));
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  // 스크롤만 하면 열 개가 비슷하게 생겨 어느 것을 보러 왔는지 놓친다.
  target.animate(
    [
      { backgroundColor: "color-mix(in srgb, var(--color-gold) 14%, transparent)" },
      { backgroundColor: "transparent" },
    ],
    { duration: 1600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
  const more = target.querySelector<HTMLButtonElement>('button[aria-expanded="false"]');
  more?.click();
}
