<div align="center">

<img src="./byeolsaem-web/public/og/default.png" alt="별샘" width="100%" />

# 별샘 — 태어난 순간의 하늘로 읽는 천궁도

**[byeolsaem.com](https://byeolsaem.com)**

[![Next](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)](#)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](#)
[![Tailwind](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white)](#)
[![three.js](https://img.shields.io/badge/three.js-000000?logo=threedotjs&logoColor=white)](#)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)](#)

</div>

---

## 1. 무엇인가

생년월일시와 태어난 곳을 받아 그 순간의 행성 배치를 계산하고, 배치에 대응하는
해석을 조립해 보여주는 정적 웹 서비스다. 네이탈 차트 · 오늘의 하늘 · 궁합 ·
연간 흐름 · 12별자리 · 수성 역행 페이지로 구성된다.

**이 저장소는 2026년 8월 리뉴얼된 별샘이다.** 구 버전은 `Star Sync`라는 이름의
바닐라 JS + FastAPI 서비스였고, 지금은 삭제됐다 (git 히스토리에는 남아 있다).
리뉴얼의 배경과 판단 근거는 [`HANDOFF.md`](./HANDOFF.md), 실행 계획은
[`RENEWAL_PLAN.md`](./RENEWAL_PLAN.md)에 있다.

| | 구 Star Sync (2026.01~03) | 별샘 (2026.08~) |
| --- | --- | --- |
| 프론트 | 바닐라 JS · 단일 `index.html` | Next 16 App Router · 정적 export |
| 차트 계산 | Render 백엔드 (kerykeion) | **브라우저** (직접 구현) |
| 해석 | Gemini 호출 1회 / 요청 | **해석 아톰 DB 조립** (LLM 0회) |
| 응답 | 약 14.7초 (콜드 스타트 시 30초+) | 네트워크 왕복 없음 |
| 호스팅 | Vercel + Render | Cloudflare Workers |

---

## 2. 화면

<p align="center">
  <img src="assets/screen-hero.png" width="820" alt="메인 — WebGL 별하늘 위의 히어로">
</p>

첫 화면. 배경은 three.js로 그린 별하늘이고, 소프트웨어 렌더러로 내려간 기기에서는
스스로 등급을 낮춘다(§4.3). 출생 정보를 이미 남긴 사람에게는 자기 별자리로 문장이
바뀐다 — 위 화면의 *"천칭자리의 별이 샘 아래에 떠 있습니다"*가 그것이다.

<p align="center">
  <img src="assets/screen-natal-wheel.png" width="820" alt="네이탈 차트 — 천궁도 휠과 범례">
</p>

브라우저에서 계산한 천궁도. 열 개의 별, 하우스 분할, 어스펙트 선까지 전부 여기서
구한 값이다. 오른쪽 범례가 **선의 색이 무엇을 뜻하는지 직접 말한다** — 금색은
육분·삼각, 흐린 선은 사각·대립, 기호 옆 `R`은 그때 그 행성이 역행 중이었다는 뜻.
읽는 법을 모르는 사람에게 그림만 던지지 않는다.

<p align="center">
  <img src="assets/screen-natal-reading.png" width="820" alt="네이탈 해석 — 아톰 DB로 조립한 본문">
</p>

해석 본문. **LLM 호출 없이 아톰 DB를 조립해 만든 글이다**(§4.2). 별마다 별자리·도수·
하우스를 먼저 적고 그 배치가 무엇을 뜻하는지 잇는다. 천왕성·해왕성·명왕성처럼 한
별자리에 7~20년 머무는 별에는 *"이 별은 개인보다 세대를 말합니다"*라는 단서를 붙인다 —
같은 세대 전체가 같은 값을 갖는 별을 개인의 이야기처럼 팔지 않기 위해서다.

<p align="center">
  <img src="assets/screen-retrograde.png" width="820" alt="수성 역행 — 궤도 계산으로 그린 역행 고리">
</p>

수성 역행. 이 페이지의 값은 어디서도 베껴 오지 않았다. **점 하나가 하루**고, 궤도
요소에서 구한 위치를 이어 그린 길이다. 겉보기 황경이 줄어드는 구간을 찾아 유(留)
시각을 분 단위까지 계산한다(`2026. 10. 24. 16:18` → `2026. 11. 14. 00:58`,
되짚는 각도 `15.9도`). 한 번 맞으면 몇 년치가 저절로 나온다는 것이 직접 계산한
이유다(§4.1).

<p align="center">
  <img src="assets/screen-share-card.png" width="380" alt="공유 카드 — 캔버스에 다시 그린 부적 카드">
</p>

공유용 카드. DOM을 찍지 않고 캔버스에 다시 그린다(§4.4). 치수와 색은 화면 컴포넌트가
쓰는 값을 그대로 옮겨서, 저장된 카드와 화면의 카드가 같은 그림이 된다.

---

## 3. 구조

```
byeolsaem/
├─ byeolsaem-web/          현재 서비스 (Next 16 · 정적 export)
│  ├─ src/lib/             천문 계산 · 해석 조립 · 공유 카드
│  ├─ src/content/atoms/   해석 아톰 (배치 → 문장)
│  ├─ src/content/signs/   12별자리 페이지 원고
│  └─ src/content/blog/    칼럼 (MDX)
├─ main.py  logic.py       FastAPI 백엔드 (Render) — 아래 4절 참조
├─ measure_latency.py      백엔드 응답 시간 측정
├─ wrangler.jsonc          Cloudflare — byeolsaem-web/out 을 서빙
├─ vercel.json             구 vercel.app → byeolsaem.com 301 (삭제 금지)
├─ HANDOFF.md              리뉴얼 전 진단 · 전략 · 판단 게이트
└─ RENEWAL_PLAN.md         리뉴얼 실행 계획
```

배포는 두 단계다.

```bash
cd byeolsaem-web && npm run build   # 정적 export → byeolsaem-web/out
cd .. && npx wrangler deploy        # out/ 을 Cloudflare Workers 로
```

---

## 4. 설계에서 정한 것들

### 4.1 천문 계산을 직접 했다

원래 계획은 파이썬 백엔드가 스위스 천문력으로 맡는 것이었다. 그러나 정적 export에는
서버가 없고, 요청당 과금되는 외부 점성술 API는 트래픽 성장이 곧 비용이 된다.
남은 선택지는 직접 계산이었다.

| 대상 | 방법 | 정밀도 |
| --- | --- | --- |
| 행성 | JPL 근사 궤도 요소 (Standish, 1800~2050 유효) | 몇 분각 |
| 달 | ELP-2000/82 축약 급수 (Meeus, 천문 알고리즘 47장) | 황경 약 10초각 |

달만 다른 방법을 쓰는 이유는 케플러 요소만으로 값이 안 나오기 때문이다. 달은 지구와
태양 양쪽에 끌려다니며 궤도가 계속 흔들린다. 달의 10초각은 시간으로 1초 미만이라,
태어난 시각을 분 단위로 아는 사람에게는 충분하다.

정밀도를 문서에 적어 두는 이유는 **한계를 아는 상태로 쓰기 위해서다.** 별자리·하우스
판정에는 충분하지만, 경계에서 몇 초 이내로 태어난 경우에는 어긋날 수 있다.

### 4.2 해석에 무작위도 LLM도 넣지 않았다

같은 배치면 언제 다시 열어도 같은 문장이 나온다. 운세 서비스에서 **같은 사람이 다시
봤을 때 다른 말이 나오는 것은 신뢰가 무너지는 지점이다.**

비용 구조도 이유다. 광고 수익 모델에서 무료 지면에 사용자당 LLM 호출을 붙이면
재방문이 늘수록 적자다. 그래서 기본 경로는 아톰 DB 조립으로 가고, LLM은
"더 깊이 보기" 뒤로 격리하는 설계를 택했다 (`RENEWAL_PLAN.md` §0.2).

부수 효과가 하나 더 있다. **조립된 글은 크롤러가 읽을 수 있다.** LLM이 런타임에
만들어 낸 문장은 구글이 보지 못하는데, 애드센스 거절 사유가 콘텐츠 부족이었다.

### 4.3 "WebGL이 되는가"가 아니라 "GPU가 그리는가"를 묻는다

크롬은 GPU 드라이버를 못 믿을 때 조용히 소프트웨어 래스터라이저(SwiftShader)로
내려간다. WebGL은 그대로 동작하므로 기능 감지로는 걸러지지 않는다 — 다만 모든
픽셀을 CPU가 그린다. 화면을 덮는 셰이더에 이것은 CPU 코어 하나를 통째로 태우는
일이고, 실제로 그런 기기에서 메인 페이지가 CPU 50%를 먹는다는 제보를 받았다.

그래서 렌더러 문자열을 확인해 `full` / `lite` / `static` 세 단계로 내린다
([`src/lib/sky-tier.ts`](./byeolsaem-web/src/lib/sky-tier.ts)).

### 4.4 공유 카드는 DOM을 찍지 않고 캔버스에 다시 그린다

구 버전은 `html2canvas`를 썼고, 기기 해상도마다 여백과 비율이 틀어졌다. DOM을
찍으려면 폰트를 데이터 URI로 심은 SVG `foreignObject`를 거쳐야 해서 무겁고
브라우저마다 결과가 다르다.

이 카드는 도형 몇 개와 글 몇 줄이라 캔버스에 직접 그리는 쪽이 코드도 짧고 결과가
일정하다. 치수와 색은 화면 컴포넌트가 쓰는 값을 그대로 옮겼다 — **화면의 카드와
저장된 카드가 다르게 생겼으면 "내 카드"가 아니기 때문이다.**

---

## 5. 백엔드 (Render) — 현재 미사용

`main.py` · `logic.py`는 구 버전이 쓰던 FastAPI 백엔드이며 지금도 Render에서
돌고 있다. **리뉴얼된 사이트는 이 백엔드를 호출하지 않는다** — 차트를 브라우저에서
계산하기 때문이다.

지우지 않고 두는 이유는 `RENEWAL_PLAN.md` §6이 이 코드를 `/chart` · `/deep`
엔드포인트로 되살릴 계획이기 때문이다. kerykeion(스위스 천문력)은 파이썬 전용이고,
개인 천궁도의 정밀도를 올리려면 결국 이쪽이 필요하다.

> Render 서비스 이름은 아직 `star-sync`다. 대시보드에서 바꾸면 `measure_latency.py`를
> 고친다. 예전에는 `../byeolsaem-keepalive/worker.js`도 같이 고쳐야 했는데, 그 keep-alive
> 워커는 서비스가 suspend된 뒤 2026-09-14에 삭제했다.
>
> 그 서비스는 **2026-09-05부터 suspend 상태**다(무료 한도 소진). 되살리는 조건은
> `docs/todo.md`의 "잠재워 둔 것"에 적어 두었다.

---

## 6. 개발

```bash
cd byeolsaem-web
npm install
npm run dev        # http://localhost:3000
npm run build      # 정적 export (out/)
npm test           # vitest run
npx tsc --noEmit   # 타입 체크
```

폰트(Pretendard Variable, MaruBuri)는 npm 패키지가 아니라 `src/fonts/`에 직접
포함된 서브셋 파일을 `next/font/local`로 로드한다.

---

## 7. 페이지

| 경로 | 내용 |
| --- | --- |
| `/` | 랜딩 — WebGL 별하늘 · 의식형 입력 흐름 |
| `/natal` | 네이탈 차트 — 배치 · 어스펙트 · 조립된 해석 |
| `/today` | 오늘의 하늘 — 달 위상 · 트랜짓 |
| `/synastry` | 궁합 — 두 차트 비교 |
| `/yearly` | 연간 흐름 |
| `/sign`, `/sign/[sign]` | 12별자리 (12페이지) |
| `/retrograde` | 수성 역행 — 궤도 계산으로 유(留) 시각 직접 판정 |
| `/blog`, `/blog/[slug]` | 칼럼 (MDX) |
| `/about`, `/privacy` | |

---

<div align="center">

**김하율** · [hayoul1999@gmail.com](mailto:hayoul1999@gmail.com) · [github.com/Youl-AI](https://github.com/Youl-AI)

</div>
