import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema } from "@/components/seo/JsonLd";
import { CurrentMonthNotice } from "@/components/calendar/CurrentMonthNotice";
import { IcsRow } from "@/components/calendar/IcsRow";
import { MonthSection } from "@/components/calendar/MonthSection";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { BUILD_MONTHS } from "@/lib/calendar-events";
import { alternatesFor, ogImage } from "@/lib/metadata";

/**
 * 하늘의 달력 허브 — 이번 달. /today처럼 내용이 달마다 회전하는 페이지라
 * canonical은 /calendar 자신이다. 월별 상세는 [year]/[month]가 갖는다.
 */
const MONTHS = BUILD_MONTHS;
const CURRENT = MONTHS[1]; // [0]이 이전 달
const pad = (n: number) => String(n).padStart(2, "0");
const href = (m: { year: number; month: number }) => `/calendar/${m.year}/${pad(m.month)}`;

export const metadata: Metadata = {
  title: "하늘의 달력 — 신월·보름·역행이 있는 날 | 별샘",
  description:
    "이번 달 하늘에 일어나는 일을 한 장에: 신월과 보름의 정확한 시각, 역행의 시작과 끝, 태양이 자리를 옮기는 날. 전부 실제 천문 계산입니다.",
  alternates: alternatesFor("/calendar"),
  openGraph: ogImage("/calendar", "/og/calendar.png"),
};

export default function CalendarPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([{ name: "별샘", path: "/" }, { name: "하늘의 달력", path: "/calendar" }])} />
      <PlaceBand src="/world/place-calendar.webp" />
      <header className="mx-auto mb-12 max-w-xl text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">SKY CALENDAR</p>
        <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">하늘의 달력</h1>
        <p className="mx-auto mt-4 max-w-md break-keep text-guide text-starlight-dim">
          신월과 보름, 역행의 시작과 끝, 태양이 자리를 옮기는 날 — 한 달의 하늘을
          한 장에 담았습니다. 날짜와 시각은 전부 실제 천문 계산입니다.
        </p>
      </header>
      <CurrentMonthNotice builtYear={CURRENT.year} builtMonth={CURRENT.month} />
      <MonthSection
        year={CURRENT.year}
        month={CURRENT.month}
        prevHref={href(MONTHS[0])}
        nextHref={href(MONTHS[2])}
        headingAs="h2"
      />
      <IcsRow />
      <NextSteps
        lead="다가오는 역행이 궁금하다면 — 시작과 끝, 점검 목록까지 정리되어 있습니다."
        primary={{ href: "/retrograde", label: "수성 역행 보기" }}
        secondary={{ href: "/weekly", label: "이번 주 하늘 보기" }}
      />
    </main>
  );
}
