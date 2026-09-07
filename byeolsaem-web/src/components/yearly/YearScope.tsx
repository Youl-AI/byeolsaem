"use client";
import { useEffect, useMemo, useState } from "react";
import { RETROGRADE_YEAR_LINE } from "@/content/atoms/yearly";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { formatBirthDate } from "@/lib/birth-profile";
import { computeChart } from "@/lib/chart";
import { coordinatesFor, KOREA_UTC_OFFSET_HOURS } from "@/lib/coordinates";
import { getFortuneYear } from "@/lib/date";
import { pinCapable } from "@/lib/pin";
import { requestRitual } from "@/lib/ritual";
import { signArt } from "@/lib/share-card";
import { SIGN_SYMBOL, getSunSign } from "@/lib/zodiac";
import {
  formatYearDate,
  yearReading,
  type BackdropSpan,
  type YearBackdrop,
  type YearReadingEvent,
} from "@/lib/yearly-reading";
import { UnknownPlace } from "@/components/chart/NoProfile";
import { GoldButton } from "@/components/ui/GoldButton";
import { KakaoShareButton } from "@/components/ui/KakaoShareButton";
import { ResultTabs } from "@/components/ui/ResultTabs";
import { SaveCardButton } from "@/components/ui/SaveCardButton";
import { TalismanChip } from "@/components/ui/TalismanChip";
import { YearEventRows } from "./YearEventRows";
import { YearFlow } from "./YearFlow";
import { YearRiver } from "./YearRiver";

/**
 * 한 해의 하늘 전체.
 *
 * 앞부분은 출생 정보가 없어도 만들어진다 — 목성과 토성이 올해 어느 자리에
 * 있는지, 수성이 언제 역행하는지는 모두에게 같기 때문이다. 그 값은 빌드할 때
 * 계산해 넘어오므로 검색엔진이 보는 HTML에 이미 들어 있다.
 *
 * 두 해를 모두 그려 두고 고른 해만 보인다. 신년 무렵에 사람들이 찾는 것은 다음
 * 해이고, 두 해가 다 HTML에 있어야 두 해 모두 검색에 걸린다.
 */
export function YearScope({ backdrops }: { backdrops: YearBackdrop[] }) {
  const [year, setYear] = useState(backdrops[0].year);
  // 넓은 화면 + 감소 모드 아님 → 붙박인 가로 강(YearFlow). 아니면 접힌 카드 목록.
  // 마운트 뒤에 정한다 — 서버 HTML에는 탭이 없어야 하이드레이션이 어긋나지 않는다.
  // null은 "아직 모른다".
  const [flow, setFlow] = useState<boolean | null>(null);
  useEffect(() => setFlow(pinCapable()), []);

  // 서버가 만든 HTML은 빌드 시점의 해를 고른 상태다. 보는 사람의 달력이 이미
  // 다음 해로 넘어갔으면 마운트한 뒤 그쪽으로 옮긴다. 11월부터 다음 해를 보여
  // 주는 규칙은 사이트 전체가 같다(getFortuneYear).
  useEffect(() => {
    const wanted = getFortuneYear(new Date());
    if (backdrops.some((b) => b.year === wanted)) setYear(wanted);
  }, [backdrops]);

  const current = backdrops.find((b) => b.year === year) ?? backdrops[0];

  // 좁은 화면과 감소 모드의 탭 둘(스펙 C §6.2). 핀 무대 경로에는 두지 않는다 —
  // 무대가 sticky top-0 h-screen이라 탭바(sticky top-16)와 겹친다.
  const tabs = useMemo(
    () => [
      { id: `year-${current.year}`, label: `${current.year}년, 모두에게` },
      { id: "personal-year", label: "당신의 날짜" },
    ],
    [current.year],
  );

  return (
    <div className="grid items-start gap-10 md:grid-cols-[150px_minmax(0,1fr)] md:gap-12">
      <YearRail backdrops={backdrops} year={current.year} onPick={setYear} />

      <div className="min-w-0">
        {flow === false && <ResultTabs items={tabs} />}
        {backdrops.map((backdrop) => (
          <BackdropSection
            key={backdrop.year}
            backdrop={backdrop}
            hidden={backdrop.year !== current.year}
          />
        ))}
        <PersonalYear year={current.year} flow={flow === true} />
      </div>
    </div>
  );
}

function YearRail({
  backdrops,
  year,
  onPick,
}: {
  backdrops: YearBackdrop[];
  year: number;
  onPick: (year: number) => void;
}) {
  const { profile } = useBirthProfile();
  return (
    <aside
      className="border-b border-gold/18 pb-5 md:sticky md:top-24 md:border-b-0 md:border-r md:pb-0 md:pr-5 md:text-right"
      aria-label="보고 있는 해"
    >
      <p className="font-latin text-eyebrow tracking-[0.2em] text-gold">THE YEAR</p>
      <div className="mt-2 flex gap-4 md:flex-col md:gap-1.5">
        {backdrops.map((b) => (
          <button
            key={b.year}
            type="button"
            onClick={() => onPick(b.year)}
            aria-current={b.year === year ? "true" : undefined}
            className={`font-latin text-lg tracking-[0.08em] transition-colors ${
              b.year === year
                ? "text-starlight underline decoration-gold decoration-1 underline-offset-[6px]"
                : "text-starlight-dim hover:text-starlight"
            }`}
          >
            {b.year}
          </button>
        ))}
      </div>
      {profile ? (
        <>
          <p className="mt-5 text-meta text-gold-soft">{formatBirthDate(profile.date)}</p>
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
          className="mt-5 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
        >
          내 하늘 열기
        </button>
      )}
    </aside>
  );
}

/**
 * 모두에게 같은 부분.
 *
 * 처음 온 사람에게는 이 부분이 본문이지만, 정보를 남긴 사람은 자기 날짜를 보러
 * 온 것이라 이 세 섹션을 매번 지나는 것이 벽이 된다(가시성 점검, 2026-08-14).
 * 그래서 프로필이 있으면 두 줄 요약으로 접고, 원하면 펼친다. 서버 HTML은 언제나
 * 전체를 담는다 — 검색엔진과 첫 방문자가 보는 것이 그 HTML이다.
 */
function BackdropSection({ backdrop, hidden }: { backdrop: YearBackdrop; hidden: boolean }) {
  const { profile, ready } = useBirthProfile();
  const [open, setOpen] = useState(false);
  const collapsed = ready && profile !== null && !open;

  return (
    <section
      id={`year-${backdrop.year}`}
      hidden={hidden}
      className="mt-10 scroll-mt-32"
      aria-labelledby={`year-${backdrop.year}-title`}
    >
      <h2
        id={`year-${backdrop.year}-title`}
        className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight"
      >
        {backdrop.year}년, 모두에게 같은 부분
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>
      <p className="max-w-[52ch] break-keep text-guide text-starlight-dim">
        목성은 한 자리에 약 1년, 토성은 약 2년 반 머뭅니다. 이 두 별이 어디에 있는지가
        &lsquo;{backdrop.year}년이 어떤 해인가&rsquo;를 정하고, 그 부분은 태어난 순간과
        무관하게 모두에게 같습니다.
      </p>

      {collapsed ? (
        <div className="mt-8">
          <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
            <BackdropSummaryLine symbol="♃" name="목성" spans={backdrop.jupiter} />
          </p>
          <p className="mt-2 max-w-[52ch] break-keep leading-relaxed text-starlight">
            <BackdropSummaryLine symbol="♄" name="토성" spans={backdrop.saturn} />
          </p>
          <button
            type="button"
            aria-expanded={false}
            onClick={() => setOpen(true)}
            className="mt-5 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
          >
            자세히 펼치기 — 별자리별 풀이 · 수성 역행 {backdrop.retrogrades.length}회
          </button>
        </div>
      ) : (
        <>
          <SlowPlanet symbol="♃" name="목성" governs="어디가 넓어지는가" spans={backdrop.jupiter} />
          <SlowPlanet symbol="♄" name="토성" governs="어디에 무게가 실리는가" spans={backdrop.saturn} />

      <div className="mt-12 border-t border-gold/15 pt-8">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-display text-lg text-starlight">
            <span className="astro-symbol">☿</span> 수성 역행
          </span>
          <span className="text-meta text-starlight-dim">{backdrop.retrogrades.length}회</span>
        </p>
        <p className="mt-3 max-w-[52ch] break-keep text-guide text-starlight-dim">
          {RETROGRADE_YEAR_LINE}
        </p>
        <ul className="mt-5 space-y-2">
          {backdrop.retrogrades.map((r) => (
            <li key={r.startIso} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-starlight">{r.range}</span>
              <span className="text-meta text-starlight-dim">
                {r.days}일 · {r.arc}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <GoldButton variant="outline" href="/retrograde">
            역행 고리 보기
          </GoldButton>
        </div>
      </div>

          {profile && (
            <button
              type="button"
              aria-expanded={true}
              onClick={() => setOpen(false)}
              className="mt-8 border-b border-gold/40 pb-0.5 text-meta text-gold-soft transition-colors hover:text-starlight"
            >
              요약으로 접기
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** 접힌 상태의 두 줄 요약 — 가장 최근에 자리를 옮긴 구간이 그 해의 얼굴이다. */
function BackdropSummaryLine({
  symbol,
  name,
  spans,
}: {
  symbol: string;
  name: string;
  spans: BackdropSpan[];
}) {
  const last = spans[spans.length - 1];
  if (!last) return null;
  const when = last.from ? `${formatYearDate(last.from)}부터` : "해가 시작될 때부터";
  const firstSentence = last.text.slice(0, last.text.indexOf("다.") + 2) || last.text;
  return (
    <>
      <span className="astro-symbol text-gold-soft">{symbol}</span> {name}은{" "}
      <span className="text-gold-soft">{when}</span> {last.signKo} — {firstSentence}
    </>
  );
}

function SlowPlanet({
  symbol,
  name,
  governs,
  spans,
}: {
  symbol: string;
  name: string;
  governs: string;
  spans: BackdropSpan[];
}) {
  return (
    <div className="mt-12 border-t border-gold/15 pt-8">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-lg text-starlight">
          <span className="astro-symbol">{symbol}</span> {name}
        </span>
        <span className="text-meta text-starlight-dim">{governs}</span>
      </p>
      <ul className="mt-5 space-y-5">
        {spans.map((span, index) => (
          <li key={`${span.signKo}-${index}`} className="grid grid-cols-[minmax(0,1fr)] gap-1">
            <p className="font-display text-starlight">
              {span.signKo}{" "}
              {span.from ? (
                <span className="ml-3 text-meta font-normal text-gold-soft">
                  {formatYearDate(span.from)}부터
                </span>
              ) : (
                <span className="ml-3 text-meta font-normal text-starlight-dim">
                  해가 시작될 때부터
                </span>
              )}
            </p>
            <p className="max-w-[52ch] break-keep leading-relaxed text-starlight-dim">{span.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 내 차트에 걸리는 부분. 여기부터는 출생 정보가 있어야 한다.
 *
 * 계산은 브라우저에서 한다. 느린 별 다섯 개의 1년치 위치를 하루 간격으로 구하고
 * 그 위에서 각도가 맞는 순간을 이분법으로 좁히는 일이라, 해가 바뀌거나 차트가
 * 바뀔 때만 다시 하도록 묶어 둔다.
 */
function PersonalYear({ year, flow }: { year: number; flow: boolean }) {
  const { profile, ready } = useBirthProfile();
  /** 접힌 목록에서 지금 열려 있는 사건. 강의 점을 눌러도 열린다. */
  const [openId, setOpenId] = useState<string | null>(null);

  const reading = useMemo(() => {
    if (!profile) return null;
    const coordinates = coordinatesFor(profile.city);
    if (!coordinates) return null;
    const natal = computeChart({
      date: profile.date,
      time: profile.time,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezoneOffsetHours: KOREA_UTC_OFFSET_HOURS,
    });
    return yearReading(natal, year, profile.concern);
  }, [profile, year]);

  if (!ready) {
    return (
      <section id="personal-year" className="mt-20 scroll-mt-32 border-t border-gold/15 pt-12">
        <p className="text-guide text-starlight-dim" aria-live="polite">
          하늘을 여는 중입니다.
        </p>
      </section>
    );
  }

  if (profile && !reading) {
    return (
      <section id="personal-year" className="mt-20 scroll-mt-32 border-t border-gold/15 pt-12">
        <UnknownPlace city={profile.city} />
      </section>
    );
  }

  if (!profile || !reading) {
    return (
      <section id="personal-year" className="mt-20 scroll-mt-32 border-t border-gold/15 pt-12">
        <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
          여기서부터는 당신의 해
          <span aria-hidden className="h-px flex-1 bg-gold/25" />
        </h2>
        <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">
          위까지는 {year}년을 사는 모든 사람이 같습니다. 태어난 순간을 남기면 이 별들이
          당신의 자리와 <b className="font-normal text-gold-soft">정확히 각도를 맺는 날짜</b>가
          나옵니다.
        </p>
        <p className="mt-3 max-w-[52ch] break-keep text-guide text-starlight-dim">
          운세를 뽑는 것이 아니라 계산입니다. 같은 날짜가 언제 다시 열어도 같게 나옵니다.
        </p>
        <div className="mt-8">
          <GoldButton variant="solid" onClick={() => requestRitual()}>
            내 하늘 열기
          </GoldButton>
        </div>
      </section>
    );
  }

  return (
    <section id="personal-year" className="mt-20 scroll-mt-32 border-t border-gold/15 pt-12">
      <h2 className="mb-6 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        {year}년, 당신의 날짜
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>

      {/* 올해의 한 줄 + 관심사 날짜 + 해 볼 것/미룰 것 — B안(2026-08-14 승인).
          목록은 시간순 강물을 유지하므로, 방향은 여기 머리글이 잡아 준다. */}
      {!reading.quiet && reading.headline && (
        <div className="mb-10">
          <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">올해의 한 줄</p>
          <p className="mt-3 max-w-[44ch] break-keep font-display text-2xl leading-normal text-starlight">
            {reading.headline}
          </p>
          {reading.lensLabel && reading.lensDateLine && (
            <p className="mt-4 max-w-[52ch] break-keep text-guide text-starlight-dim">
              <span className="mr-2 inline-block rounded-full border border-gold/40 px-3 py-0.5 text-eyebrow tracking-[0.18em] text-gold">
                당신이 궁금해한 · {reading.lensLabel}
              </span>
              그 영역을 건드리는 날 — <span className="text-gold-soft">{reading.lensDateLine}</span>.
              아래에서 금색 고리와 점으로 표시해 두었습니다.
            </p>
          )}
          {reading.advice && (
            <div className="mt-6 max-w-[52ch] border-l-2 border-gold/45 bg-gold/[0.06] py-4 pl-5 pr-4">
              <p className="break-keep text-guide">
                <b className="font-normal text-gold-soft">해 볼 것</b>{" "}
                <span className="text-starlight-dim">{reading.advice.try}</span>
              </p>
              <p className="mt-2 break-keep text-guide">
                <b className="font-normal text-gold-soft">미룰 것</b>{" "}
                <span className="text-starlight-dim">{reading.advice.hold}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {reading.quiet ? (
        <p className="max-w-[52ch] break-keep leading-relaxed text-starlight">{reading.quiet}</p>
      ) : flow ? (
        <>
          <p className="max-w-[52ch] break-keep text-guide text-starlight-dim">
            느린 별 다섯 개가 당신의 자리와 정확히 각도를 맺는 날{" "}
            {reading.events.length}개입니다. 스크롤을 내리면 강이 한 해를 지나며 그
            날짜들을 차례로 짚습니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {reading.chips.map((chip) => (
              <TalismanChip key={chip.label} symbol={chip.symbol} label={chip.label} />
            ))}
          </div>

          <div className="mt-6">
            <YearFlow year={year} events={reading.events} />
          </div>

          <ClosingNote />
        </>
      ) : (
        <>
          <p className="max-w-[52ch] break-keep text-guide text-starlight-dim">
            느린 별 다섯 개가 당신의 자리와 정확히 각도를 맺는 날{" "}
            {reading.events.length}개입니다. 강 위의 점이나 아래 줄을 누르면 그날의
            풀이가 열립니다.
          </p>

          <div className="mt-8">
            <YearRiver
              year={year}
              events={reading.events}
              onSelect={(event) => {
                setOpenId(event.id);
                scrollToEvent(event);
              }}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {reading.chips.map((chip) => (
              <TalismanChip key={chip.label} symbol={chip.symbol} label={chip.label} />
            ))}
          </div>

          <YearEventRows
            year={year}
            events={reading.events}
            openId={openId}
            onToggle={setOpenId}
          />

          {/* 한 해의 결과도 밖으로 나갈 통로가 있어야 한다(정찰 ⑧). */}
          {reading.headline && (
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-gold/15 pt-8">
              <SaveCardButton
                filename={`byeolsaem-year-${year}.png`}
                spec={() => ({
                  name: `${year}년의 하늘`,
                  latin: `YEAR ${year}`,
                  range: profile ? formatBirthDate(profile.date) : undefined,
                  symbol: SIGN_SYMBOL[getSunSign(profile!.date).key],
                  tagline: reading.headline!,
                  // 그 사람의 태양 별자리 성좌 — 한 해 카드에도 '누구의 해'인지가 그림에 남는다.
                  art: signArt(getSunSign(profile!.date)),
                })}
              />
              <KakaoShareButton
                text={`${year}년 나의 하늘 — ${reading.headline}`}
                path="/yearly"
                imagePath="/og/yearly.png"
              />
            </div>
          )}

          <ClosingNote />
        </>
      )}
    </section>
  );
}

/** 날짜를 어떻게 읽어야 하는지 — 강의 모양과 무관하게 늘 마지막에 남는 말. */
function ClosingNote() {
  return (
    <p className="mt-14 max-w-[52ch] break-keep text-meta text-starlight-dim">
      날짜는 한국 시간 기준이고, 각도가 정확해지는 순간을 30분 안쪽까지 좁혀
      그날의 날짜로 적었습니다. 그날 하루에 무슨 일이 벌어진다는 뜻이 아니라 그
      무렵이 그 각도의 한가운데라는 뜻입니다.
    </p>
  );
}

/** 강의 점을 누르면 그 날짜의 풀이가 있는 자리로 데려간다. `/natal`의 원반과 같다. */
function scrollToEvent(event: YearReadingEvent): void {
  // 접힌 줄이 열리며 높이가 바뀐 뒤에 재야 가운데가 맞는다.
  requestAnimationFrame(() => {
    const target = document.getElementById(event.id);
    if (!target) return;
    // 이 함수가 도는 경로 자체가 감소 모드 사용자의 폴백이다 — 부드러운
    // 스크롤을 강제하면 안 된다(lib/scroll.ts와 같은 분기).
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    target.animate(
      [
        { backgroundColor: "color-mix(in srgb, var(--color-gold) 14%, transparent)" },
        { backgroundColor: "transparent" },
      ],
      { duration: 1600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  });
}
