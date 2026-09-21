import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalMonthNav } from "@/components/calendar/CalMonthNav";
import { EphemerisLegend } from "@/components/ephemeris/EphemerisLegend";
import { EphemerisTable } from "@/components/ephemeris/EphemerisTable";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/seo/JsonLd";
import { BUILD_MONTHS } from "@/lib/calendar-events";
import { monthTable } from "@/lib/ephemeris-table";
import { monthNote } from "@/content/month-notes";
import { alternatesFor, ogImage } from "@/lib/metadata";

/**
 * 월별 천문력 — /ephemeris 허브의 형제. 창은 빌드 시점의 이전 1 + 당월 + 이후
 * 10 = 12장이고, 달력과 같은 BUILD_MONTHS를 그대로 쓴다(자체 계산 금지 — 단일
 * 빌드 시계). 표는 슬라이드 연출 대상이 아니므로 view-transition-name은 없다.
 */
const MONTHS = BUILD_MONTHS;

const pad = (n: number) => String(n).padStart(2, "0");
export const monthHref = (m: { year: number; month: number }) => `/ephemeris/${m.year}/${pad(m.month)}`;

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
  const path = monthHref({ year, month });
  return {
    title: `${year}년 ${month}월 천문력 — 날짜별 행성 위치표 | 별샘`,
    description: `${year}년 ${month}월 매일 자정(KST)의 열 행성 위치. 별자리·도수·역행(℞)까지 실제 천문 계산 그대로의 원자료입니다.`,
    alternates: alternatesFor(path),
    openGraph: ogImage(path, "/og/ephemeris.png"),
    /** 달력 월별 화면과 같은 규칙 — 손으로 쓴 글이 있는 달만 색인한다. */
    robots: monthNote(year, month) ? undefined : { index: false, follow: true },
  };
}

export default async function EphemerisMonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month, idx } = parseParams(await params);
  if (idx < 0) notFound();
  const note = monthNote(year, month);

  const faqs = [
    {
      question: "이 표는 언제 기준인가요?",
      answer: "각 날짜의 한국 시간 자정(00:00 KST) 기준입니다. 하루 사이에도 달은 약 13도를 움직이므로, 정밀한 시각이 필요하면 천궁도 계산기를 쓰세요.",
    },
    {
      question: "℞ 표시는 무엇인가요?",
      answer: "그 날 그 행성이 역행 중이라는 뜻입니다. 실제로 뒤로 도는 것이 아니라 지구에서 본 겉보기 움직임입니다.",
    },
  ];

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([
        { name: "별샘", path: "/" },
        { name: "천문력", path: "/ephemeris" },
        { name: `${year}년 ${month}월`, path: monthHref({ year, month }) },
      ])} />
      <JsonLd data={faqSchema(faqs)} />
      <PlaceBand src="/world/place-ephemeris.webp" />
      <header className="mb-10 text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">EPHEMERIS</p>
      </header>
      <CalMonthNav
        label={`${year}년 ${month}월 천문력`}
        prevHref={idx > 0 ? monthHref(MONTHS[idx - 1]) : null}
        nextHref={idx < MONTHS.length - 1 ? monthHref(MONTHS[idx + 1]) : null}
        keepScroll
      />
      {note && (
        <p className="mt-6 break-keep leading-relaxed text-starlight-dim">{note.ephemeris}</p>
      )}
      <div className="mt-6">
        <EphemerisLegend />
      </div>
      <EphemerisTable year={year} month={month} rows={monthTable(year, month)} />
      <NextSteps
        lead="이 달의 원자료가 당신의 차트에서는 무엇을 뜻하는지 — 태어난 순간을 넣으면 바로 나옵니다."
        primary={{ href: "/natal", label: "내 천궁도 보기" }}
        secondary={{ href: "/calendar", label: "하늘의 달력 보기" }}
      />
    </main>
  );
}
