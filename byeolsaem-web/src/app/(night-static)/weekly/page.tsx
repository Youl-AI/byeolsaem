import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema } from "@/components/seo/JsonLd";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { WeeklyCard } from "@/components/weekly/WeeklyCard";
import { alternatesFor, ogImage } from "@/lib/metadata";
import { weeklyData } from "@/lib/weekly-reading";

/**
 * 이번 주 하늘 — /today(하루)와 /yearly(일 년) 사이의 빈 시간 축(2026-08-23 결정).
 * 내용이 주마다 회전하므로 canonical은 /weekly 자신이다.
 */
export const metadata: Metadata = {
  title: "이번 주 하늘 — 주간 점성술 캘린더 | 별샘",
  description:
    "이번 주 하늘에 실제로 일어나는 일을 요일별로: 신월·보름, 역행의 시작과 끝, 태양의 자리 이동. 조용한 주는 조용하다고 말합니다.",
  alternates: alternatesFor("/weekly"),
  openGraph: ogImage("/weekly", "/og/weekly.png"),
};

export default function WeeklyPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([{ name: "별샘", path: "/" }, { name: "이번 주 하늘", path: "/weekly" }])} />
      <PlaceBand src="/world/place-weekly.webp" />
      <header className="mx-auto mb-12 max-w-xl text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">THIS WEEK</p>
        <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">이번 주 하늘</h1>
        <p className="mx-auto mt-4 max-w-md break-keep text-guide text-starlight-dim">
          이레 동안 하늘에 일어나는 일만 골라 담았습니다. 사건이 없는 날은 없다고
          말합니다 — 그것도 정보입니다.
        </p>
      </header>
      <WeeklyCard initial={weeklyData(new Date())} builtAt={new Date().toISOString()} />
      <NextSteps
        lead="한 주보다 넓게 보고 싶다면 — 이 달 전체의 하늘이 달력 한 장에 있습니다."
        primary={{ href: "/calendar", label: "하늘의 달력 보기" }}
        secondary={{ href: "/today", label: "오늘의 하늘 보기" }}
      />
    </main>
  );
}
