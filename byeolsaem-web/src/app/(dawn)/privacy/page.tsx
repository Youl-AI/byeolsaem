import type { Metadata } from "next";
import { DawnDocument, DawnSection } from "@/components/dawn/Document";
import { alternatesFor } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 별샘",
  description:
    "별샘이 수집하는 정보, 저장 위치, 보관 기간, 제3자 처리 위탁과 이용자의 권리를 안내합니다.",
  alternates: alternatesFor("/privacy"),
};

// 정책 문서는 같은 템플릿에서 장식(장 번호·드롭캡)을 뺀 판을 쓴다(스펙 §6.8).
export default function PrivacyPage() {
  return (
    <DawnDocument
      title="개인정보처리방침"
      lead="별샘이 무엇을 받고, 어디에 두고, 언제 지우는지 적어 둡니다."
      updated={
        <>
          2026. 10. 2. 시행
          <br />
          <span className="text-ink-dim">
            2026. 9. 25. 개정 고지 — 그때까지는 종전 방침(2026. 8. 12. 시행)이 적용됩니다
          </span>
        </>
      }
      ornament={false}
    >
      <DawnSection title="1. 받는 정보">
        <p>
          별샘은 회원가입이 없습니다. 이름·연락처·주민등록번호를 받지 않고, 계정도
          만들지 않습니다. 천궁도를 계산하기 위해 다음을 입력받습니다.
        </p>
        <ul>
          <li>태어난 날짜</li>
          <li>태어난 시각 (모르면 입력하지 않아도 됩니다)</li>
          <li>태어난 지역 — 광역시·도와 시·군·구</li>
          <li>관심 있는 주제 — 재물운, 연애운 등 선택지 중 하나</li>
        </ul>
        <p>
          이 값들은 행성 위치 계산에만 쓰입니다. 어떤 개인을 특정하는 용도로 쓰거나
          다른 정보와 결합하지 않습니다.
        </p>
      </DawnSection>

      <DawnSection title="2. 어디에 저장되나요">
        <p>
          입력하신 출생 정보는 <strong>이용자 본인의 브라우저 안에만</strong> 저장됩니다
          (localStorage). 별샘의 서버에는 저장되지 않습니다. 다시 방문했을 때 같은 정보를
          또 입력하지 않도록 하기 위한 것입니다.
        </p>
        <p>
          천궁도 계산과 풀이 조립은 전부 <strong>이 브라우저 안에서 끝납니다</strong>.
          출생 정보가 별샘의 서버로 전송되는 경로 자체가 없습니다 — 별샘은 정적 파일만
          내려보내고, 계산은 내려받은 코드가 이용자의 기기 안에서 수행합니다. 그래서
          별샘은 이용자가 언제 어디서 태어났는지 알지 못합니다.
        </p>
      </DawnSection>

      <DawnSection title="3. 언제 지워지나요">
        <p>
          브라우저에 저장된 정보는 결과 화면의 <strong>&ldquo;다른 정보로 보기&rdquo;</strong>를
          누르면 즉시 지워집니다. 브라우저의 사이트 데이터 삭제 기능으로도 지울 수
          있습니다. 별샘이 따로 보관하는 사본이 없으므로, 지우면 그것으로 끝입니다.
        </p>
      </DawnSection>

      <DawnSection title="4. 외부에 맡기는 처리">
        <p>별샘은 다음 서비스의 힘을 빌립니다. 각 서비스는 자체 개인정보처리방침을 따릅니다.</p>
        <ul>
          <li>
            <strong>Cloudflare</strong> — 웹사이트 전송과 보안. 접속 과정에서 IP 주소가
            처리됩니다.
          </li>
          <li>
            <strong>Google Analytics</strong> — 어떤 페이지가 얼마나 읽히는지 집계합니다.
            개인을 식별하지 않는 형태로 수집합니다.
          </li>
          <li>
            <strong>Google AdSense</strong> — 메인을 제외한 페이지에 광고를 싣습니다.
            Google을 비롯한 제3자 공급업체가 쿠키를 사용해 이전 방문 기록을 바탕으로
            광고를 게재할 수 있습니다.
          </li>
          <li>
            <strong>카카오</strong> — 결과 화면의 &ldquo;카카오톡으로 보내기&rdquo;에 쓰는
            SDK를 불러옵니다. 이 버튼이 있는 화면(천궁도·궁합·오늘의 하늘)에서는 누르지
            않아도 SDK가 먼저 실리므로, 그 시점에 카카오 쪽에 접속 기록이 남을 수 있습니다.
            실제로 공유를 누를 때 전달되는 것은 그 화면의 한 줄 요약과 별샘 주소뿐이고,{" "}
            <strong>출생 정보는 포함되지 않습니다</strong>.
          </li>
        </ul>
        <p>
          이 목록 밖으로 개인정보를 판매하거나 제공하지 않습니다.
        </p>
      </DawnSection>

      <DawnSection title="5. 쿠키와 광고">
        <p>
          별샘은 로그인 쿠키를 쓰지 않습니다. 방문 분석과 광고 목적의 쿠키가 위 외부
          서비스에 의해 설정될 수 있으며, 브라우저 설정에서 차단할 수 있습니다. 차단해도
          천궁도 계산 기능은 그대로 동작합니다.
        </p>
      </DawnSection>

      <DawnSection title="6. 이용자의 권리">
        <p>
          별샘은 이용자를 식별할 수 있는 정보를 보관하지 않으므로, 열람·정정·삭제 요구의
          대상이 되는 저장분이 없습니다. 브라우저에 남은 정보는 위 3항의 방법으로 언제든
          직접 지울 수 있습니다. 그 밖에 문의하실 내용이 있으면 아래로 연락 주세요.
        </p>
      </DawnSection>

      <DawnSection title="7. 문의">
        <p>
          개인정보 보호 책임자: 별샘 운영자
          <br />
          연락처: <a href="mailto:hayoul1999@gmail.com">hayoul1999@gmail.com</a>
        </p>
        <p>
          이 방침이 바뀌면 시행일을 고쳐 이 페이지에 올립니다. 중요한 변경은 시행 7일
          전에 알립니다.
        </p>
      </DawnSection>

      <DawnSection title="개정 이력">
        <p>
          <strong>2026. 10. 2. 시행</strong> (2026. 9. 25. 고지) — 두 가지를 바로잡았습니다.
        </p>
        <ul>
          <li>
            2항에서 &ldquo;해석을 계산하는 동안 계산 서버로 전송된다&rdquo;는 설명을 지웠습니다.
            그 서버는 2026년 9월에 내렸고, 지금은 계산이 전부 브라우저 안에서 끝납니다.{" "}
            <strong>새로 생긴 변화가 아니라, 이미 그러한 것을 뒤늦게 바로 적는 것입니다</strong> —
            고지 기간에도 출생 정보가 서버로 가는 일은 없습니다.
          </li>
          <li>
            4항에 <strong>카카오</strong>를 더했습니다. 공유 버튼이 있는 화면에서 SDK를
            싣고 있었는데 목록에서 빠져 있었습니다. 새로 시작하는 처리가 아니라 누락을
            채우는 것입니다.
          </li>
        </ul>
      </DawnSection>
    </DawnDocument>
  );
}
