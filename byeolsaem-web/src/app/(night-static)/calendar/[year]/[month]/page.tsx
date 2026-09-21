import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/seo/JsonLd";
import { IcsRow } from "@/components/calendar/IcsRow";
import { MonthSection } from "@/components/calendar/MonthSection";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { eventTitle } from "@/lib/calendar-copy";
import { BUILD_MONTHS, monthEvents } from "@/lib/calendar-events";
import { monthNote } from "@/content/month-notes";
import { alternatesFor, ogImage } from "@/lib/metadata";
import { formatKstDate } from "@/lib/retrograde-clock";

/**
 * 월별 달력 — /calendar 허브의 형제. "2026년 10월 신월" 같은 검색이 이 주소로
 * 들어온다. 창은 빌드 시점의 이전 1 + 당월 + 이후 10 = 12장이고, 빌드마다 한 달씩
 * 미끄러진다. 밀려난 과거 주소는 자연히 404가 된다 — 사이트맵도 같은 창만 싣는다.
 */
const MONTHS = BUILD_MONTHS;

const pad = (n: number) => String(n).padStart(2, "0");
export const monthHref = (m: { year: number; month: number }) => `/calendar/${m.year}/${pad(m.month)}`;

export function generateStaticParams() {
  return MONTHS.map((m) => ({ year: String(m.year), month: pad(m.month) }));
}

function parseParams(params: { year: string; month: string }) {
  const year = Number(params.year);
  const month = Number(params.month);
  const idx = MONTHS.findIndex((m) => m.year === year && m.month === month);
  return { year, month, idx };
}

export async function generateMetadata({ params }: { params: Promise<{ year: string; month: string }> }): Promise<Metadata> {
  const { year, month, idx } = parseParams(await params);
  if (idx < 0) return {};
  const events = monthEvents(year, month);
  const headline = events.map((e) => eventTitle(e)).slice(0, 4).join(" · ");
  const path = monthHref({ year, month });
  return {
    title: `${year}년 ${month}월 하늘의 달력 — 신월·보름·역행 | 별샘`,
    description: `${year}년 ${month}월의 하늘: ${headline || "조용한 달"}. 신월과 보름, 역행의 시작과 끝, 태양이 자리를 옮기는 날을 날짜와 시각까지 계산했습니다.`,
    alternates: alternatesFor(path),
    openGraph: ogImage(path, "/og/calendar.png"),
    /**
     * 손으로 쓴 글이 있는 달만 색인한다(content/month-notes.ts 주석 참고).
     * 나머지 열 장은 틀에서 나온 문장이 절반을 넘어 얇은 페이지로 읽힌다 —
     * 화면에서 사라지지는 않고, 검색 결과에만 내놓지 않는다.
     */
    robots: monthNote(year, month) ? undefined : { index: false, follow: true },
  };
}

export default async function CalendarMonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month, idx } = parseParams(await params);
  if (idx < 0) notFound();
  const events = monthEvents(year, month);
  const note = monthNote(year, month);

  const faqs = [
    events.find((e) => e.kind === "new-moon") && {
      question: `${year}년 ${month}월 신월은 언제인가요?`,
      answer: `${formatKstDate(events.find((e) => e.kind === "new-moon")!.date)}입니다. 달이 태양과 겹치는 정확한 순간을 계산한 값입니다.`,
    },
    events.find((e) => e.kind === "full-moon") && {
      question: `${year}년 ${month}월 보름달은 언제인가요?`,
      answer: `${formatKstDate(events.find((e) => e.kind === "full-moon")!.date)}입니다.`,
    },
    {
      question: "이 날짜는 어떻게 계산하나요?",
      answer: "별샘의 자체 천문 계산으로 태양과 달, 행성의 실제 위치를 구해 정확한 순간을 찾습니다. 한국 시간(KST) 기준입니다.",
    },
  ].filter(Boolean) as { question: string; answer: string }[];

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([
        { name: "별샘", path: "/" },
        { name: "하늘의 달력", path: "/calendar" },
        { name: `${year}년 ${month}월`, path: monthHref({ year, month }) },
      ])} />
      <JsonLd data={faqSchema(faqs)} />
      <PlaceBand src="/world/place-calendar.webp" />
      <header className="mb-10 text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">SKY CALENDAR</p>
      </header>
      <MonthSection
        year={year}
        month={month}
        prevHref={idx > 0 ? monthHref(MONTHS[idx - 1]) : null}
        nextHref={idx < MONTHS.length - 1 ? monthHref(MONTHS[idx + 1]) : null}
        keepScroll
      />
      {note && (
        <p className="mt-8 break-keep leading-relaxed text-starlight-dim">{note.calendar}</p>
      )}
      <IcsRow />
      <NextSteps
        lead="이 달의 하늘이 당신의 차트에서는 어느 방을 지나는지 — 태어난 순간을 넣으면 바로 나옵니다."
        primary={{ href: "/natal", label: "내 천궁도 보기" }}
        secondary={{ href: "/weekly", label: "이번 주 하늘 보기" }}
      />
    </main>
  );
}
