import type { Metadata } from "next";
import { ChaptersScope } from "@/components/chapters/ChaptersScope";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/seo/JsonLd";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { Faq } from "@/components/retrograde/RetroPageBits";
import { alternatesFor, ogImage } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "인생의 시간표 — 프로펙션과 조디악 릴리징 | 별샘",
  description:
    "연간 프로펙션으로 올해의 별자리와 주인 행성을, 조디악 릴리징으로 인생의 장을 계산합니다. 태어난 순간에 감긴 시계를 읽는 고전 점성술의 시간법 — 무료, 로그인 없음.",
  alternates: alternatesFor("/chapters"),
  openGraph: ogImage("/chapters", "/og/chapters.png"),
};

const FAQS = [
  {
    question: "연간 프로펙션이 뭔가요?",
    answer:
      "생일마다 상승궁에서 한 칸씩 나아가 올해의 별자리와 올해의 주인 행성을 정하는 고전 기법입니다. 열두 해에 한 바퀴 돌아오고, 실제 하늘이 아니라 나이만으로 정해집니다. 그래서 태어난 시각이 꼭 필요합니다.",
  },
  {
    question: "조디악 릴리징이 뭔가요?",
    answer:
      "출생 차트의 행운의 점(또는 정신의 점)에서 출발해, 별자리마다 정해진 연수만큼 인생을 장(章)으로 나누는 헬레니즘 기법입니다. 장이 바뀔 때 삶의 무대가 바뀌고, 행운의 점에서 열 번째 자리의 장을 절정기로 읽습니다.",
  },
];

export default function ChaptersPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([{ name: "별샘", path: "/" }, { name: "인생의 시간표", path: "/chapters" }])} />
      <JsonLd data={faqSchema(FAQS)} />
      <PlaceBand src="/world/place-chapters.webp" />
      <header className="mx-auto mb-12 max-w-xl text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">TIME LORDS</p>
        <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">인생의 시간표</h1>
        <p className="mx-auto mt-4 max-w-md break-keep text-guide text-starlight-dim">
          실제 하늘을 보는 트랜짓과 달리, 여기서는 태어난 순간 감긴 시계를
          읽습니다. 올해가 어느 자리의 해인지, 지금이 인생의 몇 장(章)인지 —
          고전 점성술의 두 가지 시간법입니다.
        </p>
      </header>

      <ChaptersScope builtAt={new Date().toISOString()} />

      <section className="mt-20 border-t border-gold/15 pt-12">
        <h2 className="mb-6 break-keep font-display text-xl text-starlight">자주 묻는 것</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <Faq key={faq.question} question={faq.question}>
              <p className="max-w-[58ch] break-keep leading-relaxed">{faq.answer}</p>
            </Faq>
          ))}
        </div>
      </section>

      <NextSteps
        lead="시계가 가리키는 장을 봤다면, 그 해의 실제 하늘도 함께 보세요."
        primary={{ href: "/yearly", label: "한 해의 하늘 보기" }}
        secondary={{ href: "/solar-return", label: "솔라 리턴 보기" }}
      />
    </main>
  );
}
