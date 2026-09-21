import type { Metadata } from "next";
import { CalMonthNav } from "@/components/calendar/CalMonthNav";
import { CurrentMonthNotice } from "@/components/calendar/CurrentMonthNotice";
import { EphemerisLegend } from "@/components/ephemeris/EphemerisLegend";
import { EphemerisTable } from "@/components/ephemeris/EphemerisTable";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { JsonLd, breadcrumbSchema } from "@/components/seo/JsonLd";
import { BUILD_MONTHS } from "@/lib/calendar-events";
import { monthTable } from "@/lib/ephemeris-table";
import { alternatesFor, ogImage } from "@/lib/metadata";

/**
 * 천문력 허브 — 이번 달. /calendar처럼 내용이 달마다 회전하는 페이지라
 * canonical은 /ephemeris 자신이다. 월별 원자료는 [year]/[month]가 갖는다.
 */
const MONTHS = BUILD_MONTHS;
const CURRENT = MONTHS[1]; // [0]이 이전 달
const pad = (n: number) => String(n).padStart(2, "0");
const href = (m: { year: number; month: number }) => `/ephemeris/${m.year}/${pad(m.month)}`;

export const metadata: Metadata = {
  title: "천문력 — 날짜별 행성 위치표 | 별샘",
  description:
    "이번 달 매일 자정(KST)의 열 행성 위치를 표로 봅니다. 별자리·도수·역행(℞)까지 실제 천문 계산 그대로의 원자료입니다.",
  alternates: alternatesFor("/ephemeris"),
  openGraph: ogImage("/ephemeris", "/og/ephemeris.png"),
};

export default function EphemerisPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([{ name: "별샘", path: "/" }, { name: "천문력", path: "/ephemeris" }])} />
      <PlaceBand src="/world/place-ephemeris.webp" />
      <header className="mx-auto mb-12 max-w-xl text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">EPHEMERIS</p>
        <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">천문력</h1>
        <p className="mx-auto mt-4 max-w-md break-keep text-guide text-starlight-dim">
          천문력은 날짜별 행성 위치를 적은 표입니다. 점성술의 모든 해석은 이
          원자료에서 시작합니다. 별샘의 다른 페이지가 답을 준다면, 이 표는
          재료를 그대로 보여줍니다.
        </p>
      </header>
      <CurrentMonthNotice builtYear={CURRENT.year} builtMonth={CURRENT.month} hrefBase="/ephemeris" noun="천문력" />
      <EphemerisLegend />
      <CalMonthNav
        label={`${CURRENT.year}년 ${CURRENT.month}월`}
        prevHref={href(MONTHS[0])}
        nextHref={href(MONTHS[2])}
        as="h2"
      />
      <EphemerisTable year={CURRENT.year} month={CURRENT.month} rows={monthTable(CURRENT.year, CURRENT.month)} />
      <NextSteps
        lead="이 원자료가 당신의 차트에서는 무엇을 뜻하는지 — 태어난 순간을 넣으면 바로 나옵니다."
        primary={{ href: "/natal", label: "내 천궁도 보기" }}
        secondary={{ href: "/calendar", label: "하늘의 달력 보기" }}
      />
    </main>
  );
}
