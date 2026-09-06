import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/seo/JsonLd";
import { alternatesFor, ogImage } from "@/lib/metadata";
import { NatalPrimer } from "@/components/chart/NatalPrimer";
import { ExampleSky } from "@/components/chart/ExampleSky";
import { NatalReading } from "@/components/chart/NatalReading";
import { PlaceBand } from "@/components/place/PlaceBand";

export const metadata: Metadata = {
  title: "나의 천궁도 | 별샘",
  description:
    "태어난 순간의 행성 배치를 계산해 읽어 드립니다. 태양과 달, 상승궁, 열 개의 별과 하우스, 그리고 별 사이의 각도까지.",
  /**
   * 한동안 noindex였다. 출생 정보가 없으면 크롤러에게 보이는 것이 "정보를
   * 남겨 달라"는 안내뿐이라, 얇은 페이지로 사이트 평가를 깎을 이유가 없었다
   * (RENEWAL_PLAN §2.4).
   *
   * 그 전제가 NatalPrimer로 사라졌다. 차트가 없어도 하우스·행성·어스펙트를
   * 무엇부터 읽는지가 누구에게나 같은 본문으로 먼저 깔린다 — 색인되는 대상은
   * 개인의 차트가 아니라 그 안내다. "천궁도"는 이 사이트가 가장 정면으로
   * 답하는 검색어인데 스스로 막아 둘 이유가 없다.
   */
  alternates: alternatesFor("/natal"),
  openGraph: ogImage("/natal", "/og/natal.png"),
};

export default function NatalPage() {
  // 차트가 있으면 그리지 않는다 — 이 300px을 이름표와 원반에 내준다(스펙 §4.1).
  const intro = (
    <header className="mx-auto max-w-xl text-center">
      <p className="font-latin text-eyebrow tracking-[0.28em] text-gold">NATAL CHART</p>
      <h1 className="mt-4 break-keep font-display text-3xl text-starlight md:text-4xl">
        나의 천궁도
      </h1>
      <p className="mx-auto mt-5 max-w-md break-keep leading-relaxed text-starlight-dim">
        태어난 순간 하늘에 실제로 있었던 것을 계산한 결과입니다. 계산도 풀이도 이
        브라우저 안에서 끝나며, 어디로도 전송되지 않습니다.
      </p>
    </header>
  );

  return (
    // 시안 B는 왼쪽에 출생 정보 기둥을 세우므로 그만큼 폭이 더 필요하다.
    // 본문 자체는 52자에서 끊기니 넓혀도 줄이 길어지지 않는다(§11.4).
    <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-6 pb-32 pt-28">
      {/* 화면에 있는 문답만 스키마로 낸다(자체 원칙) — 아래 답변은 프라이머 원문이다. */}
      <JsonLd data={breadcrumbSchema([{ name: "별샘", path: "/" }, { name: "천궁도", path: "/natal" }])} />
      <JsonLd
        data={faqSchema([
          { question: "천궁도는 무엇으로 되어 있나요?",
            answer:
              "천궁도는 태어난 순간, 태어난 장소에서 올려다본 하늘의 지도입니다. 세 가지가 겹쳐 한 장을 이룹니다 — 열 개의 별이 어느 별자리에 있었는지, 그 별들이 삶의 어느 방에 놓였는지, 그리고 별끼리 어떤 각도로 마주 보는지." },
          { question: "태어난 시각이 왜 필요한가요?",
            answer:
              "별자리는 날짜만 알면 정해지지만 상승궁과 하우스는 그렇지 않습니다. 지구가 하루에 한 바퀴 자전하므로 상승궁은 약 2시간마다 한 자리씩 옮겨 가고, 그에 따라 열두 방의 경계가 통째로 돌아갑니다." },
          { question: "이 계산은 어디서 이루어지나요?",
            answer:
              "이 브라우저 안에서입니다. 태어난 날짜와 시각, 장소의 좌표로 그 순간의 행성 위치를 천문력으로 구하고, 거기에 미리 작성해 둔 해석을 붙여 조립합니다. 출생 정보는 어디로도 전송되지 않고, 같은 정보를 넣으면 언제 다시 열어도 같은 글이 나옵니다." },
        ])}
      />
      {/* 천궁도를 읽는 장소: 촛불 하나 켜진 해석의 서재. 촛불은 천천히 숨쉰다. */}
      <PlaceBand src="/world/place-natal.webp">
        <div className="natal-candle" />
      </PlaceBand>
      {/* 예시 하늘은 서버가 그려 넘긴다 — 클라이언트 안에서 만들면 HTML에 남지
          않는다(ExampleSky 주석 참고). 저장된 출생 정보가 있으면 하이드레이션
          뒤에 NatalReading이 자기 차트로 바꿔 끼운다.

          헤더는 차트가 없을 때만 — 차트가 있으면 첫 화면 300px을 이름표·원반에
          내준다. SSR 시점에는 profile이 항상 null이라 HTML에는 남는다. */}
      <div className="mt-14">
        <NatalReading intro={intro} fallback={<ExampleSky />} />
      </div>

      {/* 차트는 브라우저가 그리므로 HTML에는 남지 않는다. 누구의 차트인지와 무관하게
          참인 이야기를 아래에 둔다(NatalPrimer 주석 참고). */}
      <NatalPrimer />
    </main>
  );
}
