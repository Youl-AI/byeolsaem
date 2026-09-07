import { VerticalWorld } from "@/components/world/VerticalWorld";
import { DeepResult } from "@/components/world/DeepResult";
import { TodayTeaser } from "@/components/sections/TodayTeaser";
import { ThreeDoors } from "@/components/sections/ThreeDoors";
import { TimePath } from "@/components/sections/TimePath";
import { TwelveRooms } from "@/components/sections/TwelveRooms";
import { NightsEndCall } from "@/components/sections/NightsEndCall";
import { ResultPreview } from "@/components/sections/ResultPreview";
import { Footer } from "@/components/sections/Footer";
import { Reveal } from "@/components/Reveal";
import { JsonLd, siteSchema } from "@/components/seo/JsonLd";
import { WithoutBirthProfile } from "@/components/WithoutBirthProfile";
import { NightEnd, NightPhase } from "@/components/sky/NightJourney";
import type { Metadata } from "next";
import { alternatesFor } from "@/lib/metadata";

// 제목·설명은 루트 레이아웃의 값이 그대로 이 페이지의 것이라 다시 적지 않는다.
// 여기서 필요한 건 정규 주소뿐이다 — 공유 링크에 파라미터가 붙어 들어와도
// (`?utm_source=…`, 페이스북이 붙이는 `?fbclid=…`) 한 주소로 세어지도록.
export const metadata: Metadata = {
  alternates: alternatesFor("/"),
};

// SkyBackdrop과 Veil은 layout.tsx에서 전역으로 마운트돼 있다 (relative z-10 래퍼 안에서
// 히어로가 그 위에 그려진다) — 여기서 다시 만들지 않는다.
// 아래 4개 섹션은 서로 다른 레이아웃 패밀리를 쓴다: 2열(TodayTeaser) → 중앙
// 스택(ResultPreview) → 비대칭 벤토(ThreeDoors) → 푸터 바(Footer). 섹션 배경은
// 모두 투명 또는 nebula-bg 뿐이라 SkyBackdrop이 계속 비쳐 보인다.
//
// 순서의 근거: 문을 열라고 권하기 전에 문 너머에 무엇이 있는지부터 보여준다.
// 그리고 그 안내는 아직 자기 결과를 보지 못한 사람에게만 필요하므로,
// 저장된 출생 정보가 있으면 통째로 내린다(WithoutBirthProfile 주석 참고).
// VerticalWorld는 Reveal로 감싸지 않는다: LCP 보호(첫 화면 콘텐츠는 즉시 보여야
// 함) + 이미 스크롤에 묶인 자체 연출이 있어 CSS Reveal과 겹치면 이중 모션이
// 된다. Footer는 스크롤 맨 끝에 있어 진입 모션의 체감 효과가
// 낮고 필수 고지 문구가 지연 없이 보이는 편이 접근성상 낫다고 판단해 제외했다.
// NightPhase가 감싼 구간이 화면 중앙을 지나는 동안 배경이 그 시간대를 유지한다
// (NightJourney 참고). 초저녁 → 깊은 밤 → 자정 → 새벽 직전 → 여명.
// 결과 미리보기는 사람에 따라 빠지므로(WithoutBirthProfile) 자정 구간도 함께
// 사라진다 — 여정은 남은 구간끼리 이어져 끊기지 않는다.
export default function Home() {
  return (
    <main id="main" tabIndex={-1}>
      {/* 이 사이트가 무엇인지 한 번 밝힌다 — 검색 결과의 사이트 이름이 주소가
          아니라 '별샘'으로 나온다. */}
      <JsonLd data={siteSchema()} />
      {/* 별의 샘 수직 세계 (2026-08-14 v4 확정: 하늘 크롭 + 2.4배 압축 — 둘 다
          데스크톱 전용, 모바일은 그림이 짧아 CSS/JS가 끈다). 크롭 56.7vw는 v4에서
          조율한 90vh(1290×813 기준)의 vw 환산값이다.
          하강이 끝난 심연에서, 입력을 마친 사람은 자기 별을 만난다(DeepResult). */}
      <NightPhase index={0}>
        <VerticalWorld compress={2.4} topCrop={56.7} />
        <DeepResult />
      </NightPhase>
      <NightPhase index={1}>
        <Reveal>
          <TodayTeaser />
        </Reveal>
      </NightPhase>
      <WithoutBirthProfile>
        <NightPhase index={2}>
          <Reveal>
            <ResultPreview />
          </Reveal>
        </NightPhase>
      </WithoutBirthProfile>
      <NightPhase index={3}>
        <Reveal>
          <ThreeDoors />
        </Reveal>
        {/* 문 다음에는 시간의 별길 — 오늘부터 일생까지 다섯 배율의 시간 축이
            /today·/weekly·/calendar·/yearly·/chapters를 잇는다(홈 재편 안 B).
            자체 진입 연출(선 긋기)이 있어 Reveal로 감싸지 않는다. */}
        <TimePath />
        {/* 길 다음에는 방 — 검색 유입의 핵심인 /sign 12페이지로 가는 유일한
            메인 내부 링크이기도 하다. */}
        <Reveal>
          <TwelveRooms />
        </Reveal>
      </NightPhase>
      <NightPhase index={4}>
        {/* 여정의 끝, 여명 무렵의 마지막 초대. 구경만 하고 떠나려던 사람을
            그 자리에서 입력으로 잇는다(NightsEndCall 주석 참고). */}
        <Reveal>
          <NightsEndCall />
        </Reveal>
        <Footer />
      </NightPhase>
      <NightEnd />
    </main>
  );
}
