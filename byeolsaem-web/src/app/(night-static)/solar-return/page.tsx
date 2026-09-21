import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/seo/JsonLd";
import { NextSteps } from "@/components/nav/NextSteps";
import { PlaceBand } from "@/components/place/PlaceBand";
import { Faq } from "@/components/retrograde/RetroPageBits";
import { SolarScope } from "@/components/solar/SolarScope";
import { alternatesFor, ogImage } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "솔라 리턴 — 생일마다 새로 그려지는 한 해의 차트 | 별샘",
  description:
    "태양이 태어난 순간의 자리로 돌아오는 순간, 그때의 하늘로 생일부터 다음 생일까지 한 해를 읽습니다. 무료로 계산해 드립니다.",
  alternates: alternatesFor("/solar-return"),
  openGraph: ogImage("/solar-return", "/og/solar-return.png"),
};

const FAQS = [
  {
    question: "솔라 리턴이 무엇인가요?",
    answer:
      "태양이 당신이 태어난 순간의 위치로 정확히 돌아오는 순간의 하늘입니다. 해마다 생일 근방에 한 번 오고, 그 차트로 생일부터 다음 생일까지의 한 해를 읽습니다.",
  },
  {
    question: "생일과 같은 날인가요?",
    answer:
      "거의 같지만 꼭 같지는 않습니다. 지구의 공전이 달력과 조금씩 어긋나서, 리턴 순간은 생일 앞뒤 하루 사이에서 해마다 움직입니다. 별샘은 그 순간을 분 단위로 계산합니다.",
  },
  {
    question: "장소는 어디 기준인가요?",
    answer:
      "별샘은 출생지 기준으로 세웁니다. 리턴 순간의 현재 위치로 세우는 유파도 있지만, 별샘은 위치 정보를 수집하지 않기 때문에 출생지 관례를 따릅니다.",
  },
];

// 글은 max-w-2xl로 읽히는데(SolarScope) 원반과 범례만 두 칸으로 눕느라 780px이
// 필요하다. 그 자리만 넓게 빠져나갈 수 있도록 바깥을 넉넉히 준다. 나머지
// 블록(머리말·FAQ)은 저마다 자기 폭을 이미 물고 있어 함께 늘어나지 않는다.
export default function SolarReturnPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-4xl px-6 pb-32 pt-28">
      <JsonLd data={breadcrumbSchema([{ name: "별샘", path: "/" }, { name: "솔라 리턴", path: "/solar-return" }])} />
      <JsonLd data={faqSchema(FAQS)} />
      <PlaceBand src="/world/place-solar-return.webp" />
      <header className="mx-auto mb-12 max-w-xl text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">SOLAR RETURN</p>
        <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">솔라 리턴</h1>
        <p className="mx-auto mt-4 max-w-md break-keep text-guide text-starlight-dim">
          해마다 생일 무렵, 태양은 당신이 태어난 순간의 자리로 정확히 돌아옵니다.
          그 순간의 하늘이 다음 생일까지 한 해의 지도가 됩니다.
        </p>
      </header>
      <SolarScope builtAt={new Date().toISOString()} />

      {/* FAQ — venus 페이지의 Faq 패턴 그대로(RetroPageBits 재사용). */}
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
        lead="한 해의 지도를 봤다면, 그 해를 지나는 느린 별들의 날짜도 함께 보세요."
        primary={{ href: "/yearly", label: "한 해의 하늘 보기" }}
        secondary={{ href: "/natal", label: "내 천궁도 보기" }}
      />
    </main>
  );
}
