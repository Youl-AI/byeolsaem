# /natal 결과 화면 재구성 — 설계

작성 2026-09-06. 브레인스토밍에서 확정된 결정을 그대로 적는다. 여기 없는 것은 결정되지 않은 것이 아니라 바꾸지 않는 것이다.

## 1. 왜

피드백 하나에서 시작했다 — "결과 화면이 MBTI·사주·타로 잘 만든 곳보다 덜 직관적이다." 확인해 보니 기능은 다 있었다. 궁합, 공유 카드, 카카오 공유, 세 줄 요약, 원반. 다만 **처음 온 사람이 거기까지 못 간다.**

레퍼런스 다섯 곳(16Personalities, Co-Star, The Pattern, 네이버 별자리운세, 별샘)을 모바일 390px로 찍어 비교한 결과, 잘 만든 곳이 공유하는 패턴은 다섯이고 별샘은 그중 셋이 비어 있었다.

| 패턴 | 별샘 지금 |
|---|---|
| ① 이름표 — 한 줄로 남에게 말할 수 있는 것 | 없음 |
| ② 첫 화면에 그림 | 배경만. 원반은 스크롤 두 번 뒤 |
| ③ 사람 말이 크고 용어는 작다 | 반대. `화성 · 처녀자리 25° · 1하우스`가 먼저 |
| ④ 섹션 탭 | 없음. 11,105px를 탭 없이 스크롤 |
| ⑤ 항목 = 카드(제목 + 한 줄 + 펼치기) | 문단과 아코디언 혼재 |

The Pattern의 카드 문법이 가장 배울 것이 많았다 — 위에 작게 `Aries Ascendant`, 아래 크게 "Ambition & Success or Feelings of Inadequacy". 점성술 용어가 제목이 아니라 꼬리표다.

## 2. 원칙 — 바꾸지 않는 것

- **문장을 지우지 않는다.** 지금 화면의 모든 해석 문장은 새 화면에도 있다. 자리만 옮긴다. 크롤러가 보는 본문은 늘어난다.
- **시각 미상이면 계산하지 않는다.** `chart.ascendant === null`이면 이름표 셋째 칸·원반의 ASC·하우스 문장 전부 생략. 임의 시각 대입 금지.
- **숫자는 엔진에서.** 타임랩스 궤적은 `planetPosition`을 그 자리에서 호출한 값이다. 미리 계산한 표를 두지 않는다.
- **LCP 앵커는 첫 프레임부터 보인다.** "당신을 한 줄로"는 어떤 모션에서도 `opacity: 0`으로 시작하지 않는다.
- **transform과 opacity만 움직인다.** 예외는 `SkyLapse`의 SVG 좌표 갱신 하나. 이유는 §7.
- **감소 모드는 "덜"이지 "없음"이 아니다.** 이동·dash 제거, opacity 200ms는 남긴다.
- 카카오 공유 이미지는 `/og/sign/<태양>.png` 정적 파일 유지. 정적 내보내기라 사용자별 OG를 만들 수 없고, 바꿀 이유도 약하다.
- 카드의 둘째 줄이 본문 첫 문장이므로 펼친 본문은 둘째 문장부터 — 문장은 한 번만 보인다(2026-09-07 결정).

## 3. 범위

**이 스펙:** `/natal` 결과 화면(`NatalReading`과 그 자식), 공유 컴포넌트 넷(`NameTag`·`ResultTabs`·`ReadingCard`·`SkyLapse`), `ChartWheel` 등장 모션, `AspectBadge` 호 모션, `ASC_FACES` 콘텐츠 12칸.

**같이 받는 것:** `/solar-return`의 `ChartWheel`이 같은 등장 prop을 켠다. 코드 한 줄.

**다음 스펙(C):** synastry·today·yearly에 같은 `ResultTabs`·`ReadingCard`를 적용. 이 스펙이 만든 컴포넌트를 재사용하므로 순서가 이렇다. today는 이미 글리프 우선(ArchCard + MoonDisc), synastry는 RESONANCE 큰 숫자, yearly는 한 줄 + 날짜 셋을 갖고 있어서 첫 화면 재구성은 natal보다 작다.

**별도 스펙(B):** 산재 모션 다섯 — `docs/superpowers/specs/2026-09-06-scattered-motion.md`.

## 4. 화면 구조

### 4.1 첫 화면 (모바일 390×844 안에 전부)

```
BORN 레일 (기존 BirthRail)
NameTag        ☉ 게자리 · ☽ 물병자리 · ↑ 처녀자리
ChartWheel     태양·달·상승궁 금색(CSS .wheel-core), 나머지 흐림, 등장 약 1,000ms(§7.1)
oneLiner       "당신을 한 줄로" (기존)
ShareRow       카드로 저장 · 원반 이미지로 저장 · 카카오 (기존 세 버튼, 위치만 이동)
```

데스크톱(`md:`)은 원반이 오른쪽 320px 열에 서고 NameTag·oneLiner·ShareRow가 왼쪽에 쌓인다. `grid-template-columns: minmax(0,1fr) 320px`.

**페이지 헤더 접기.** `natal/page.tsx`의 `<header>`(NATAL CHART · 나의 천궁도 · 설명 두 문장, 약 300px)는 차트가 있을 때 렌더하지 않는다. `NatalReading`이 `intro: React.ReactNode` prop을 받아 `fallback`을 그리는 분기에서만 `intro`를 함께 그린다. SSR 시점에는 profile이 항상 null이라 헤더는 HTML에 남는다 — 크롤러와 첫 방문자는 그대로 본다.

### 4.2 탭바

첫 화면 바로 아래, `position: sticky; top: 0`. 항목과 앵커:

| 탭 | id | 렌즈 없으면 |
|---|---|---|
| 한눈에 | `overview` | |
| 궁금해한 {lens.label} | `lens` | 생략 |
| 열 개의 별 / 나머지 별들 | `planets` | 섹션 제목과 같은 문자열을 쓴다 — 하이라이트가 없으면 "열 개의 별", 있으면 "나머지 별들" |
| 별 사이 | `aspects` | aspects 0개면 생략 |
| 자세히 | `detail` | |

### 4.3 한눈에 — 핵심 카드 셋

| 카드 | tech (작게) | plain (크게) | where (둘째 줄) | 더 읽기 |
|---|---|---|---|---|
| ☉ | 태양 · {자리} {도}° | 겉으로는 **{SIGN_FACES[sun].out}** 사람 | `core.sun.inSign` 첫 문장 | 첫 문장을 뺀 나머지(`afterFirstSentence`) |
| ☽ | 달 · {자리} {도}° | 혼자일 때는 **{SIGN_FACES[moon].in}** 사람 | `core.moon.inSign` 첫 문장 | 첫 문장을 뺀 나머지 |
| ASC | 상승궁 · {자리} | 남들이 처음 보는 나는 **{ASC_FACES[asc]}** 사람 | `core.ascendant.text` 첫 문장 | 첫 문장을 뺀 나머지 |

상승궁 없음: 셋째 카드 대신 기존 문구 "상승궁은 태어난 시각을 알아야 정해집니다…"를 카드 없이 한 줄로.

### 4.4 궁금해한 {렌즈}

`reading.lens.summary` 한 문단 → 하이라이트된 행성 카드(§4.5 형식) → `reading.lifework`(기존 인용 블록 그대로).

### 4.5 별 열 개 — 행성 카드

| 필드 | 값 |
|---|---|
| badge | `planet.symbol` + U+FE0E |
| tech | `{planet.ko} · {자리} {도}°` + (하우스 있으면 ` · {n}하우스`) + (역행이면 ` · ℞`) |
| plain | `plainLine(planet, house)` — §5.2 |
| where | `inSign` 첫 문장 |
| 더 읽기 | 첫 문장을 뺀 나머지(`afterFirstSentence`) + `inHouse`(있으면) + 세대 행성 안내문(기존) |

순서는 기존 `assembleReading`이 정한 그대로(하이라이트 → 개인 → 사회 → 세대).

### 4.6 별 사이 — 각 카드

| 필드 | 값 |
|---|---|
| badge | `AspectBadge` (호 등장 모션 포함, §7.3) |
| tech | `{a.ko} {type.ko} {b.ko} · 오브 {orb}도 · {strengthKo}` |
| plain | `aspect.headline` (기존) |
| where | `aspect.body` 첫 문장 |
| 더 읽기 | 첫 문장을 뺀 나머지(`afterFirstSentence`) |

### 4.7 자세히

순서대로: `ChartWheelLegend`(기존) → "이 화면을 읽는 순서"(기존 문구를 여기로 이동) → 원소 균형 문장(기존 `describeElements`) → **`SkyLapse`**(§6) → 시각 미상 안내(기존, 해당 시).

`WheelFigure`(스크롤 핀 투어)는 **제거한다.** 원반이 첫 화면으로 올라가면 핀할 대상이 없다. 컴포넌트 파일과 그 gsap ScrollTrigger 등록을 지운다. 투어가 하던 "태양→달→상승궁 차례로 밝힘"은 등장 모션의 600ms 시점 점등이 대신한다.

## 5. 컴포넌트와 데이터

### 5.1 신규 컴포넌트

| 이름 | 위치 | 역할 |
|---|---|---|
| `NameTag` | `src/components/chart/NameTag.tsx` | 이름표 한 줄. props: `sun`, `moon`, `ascendant: ZodiacSign \| null`. 공유 카드 tagline과 같은 문자열 규칙 |
| `ResultTabs` | `src/components/ui/ResultTabs.tsx` | sticky 탭바. props: `items: {id, label}[]`. `<a href="#id">`, IntersectionObserver 하나로 현재 섹션 표시. 밑줄 `transition: left 300ms, width 300ms cubic-bezier(0.16,1,0.3,1)` |
| `ReadingCard` | `src/components/ui/ReadingCard.tsx` | 카드 한 장. props: `badge: ReactNode`, `tech: string`, `plain: ReactNode`, `where: string`, `children`(더 읽기 본문), `id?`. 펼침은 기존 `grid-template-rows 0fr→1fr 300ms` 패턴 |
| `SkyLapse` | `src/components/chart/SkyLapse.tsx` | 타임랩스. props: `chart: Chart`, `now: Date`. §6 |

### 5.2 `plainLine` — 행성 한 줄

`src/lib/plain-line.ts`. 입력 `planet: PlanetKey`, `house: number | null`, `sign: ZodiacSign`. 출력:

- 하우스 있음: `${PLANET_AREAS[planet]}${이/가} ${HOUSE_AREAS[house]}에 있습니다` — 조사는 `src/lib/josa.ts`.
- 하우스 없음: `${PLANET_AREAS[planet]} — ${sign.ko}`.

`PLANET_AREAS`·`HOUSE_AREAS`는 [life.ts](../../../byeolsaem-web/src/content/atoms/life.ts) 18~45행에 이미 있다. 새 문장을 쓰지 않는다.

**120쌍 점검 절차(구현 중 1회):** 임시 테스트로 10행성 × 12하우스의 `plainLine` 출력을 `C:/tmp/audit/plain-lines.txt`로 덤프하고 눈으로 훑는다. 어색한 쌍은 `PLANET_AREAS`/`HOUSE_AREAS` 원문을 고치지 않고 `PLAIN_OVERRIDES: Partial<Record<\`${PlanetKey}-${number}\`, string>>`에 예외로 적는다. 덤프 파일과 임시 테스트는 지운다.

### 5.3 `ASC_FACES` — 신규 콘텐츠 12칸

`life.ts`에 `SIGN_FACES` 아래 추가. 첫인상을 말하는 관형형, `SIGN_FACES.out`과 겹치지 않게(태양과 상승궁이 같은 자리일 때 두 카드가 같은 말을 하면 안 된다).

```ts
export const ASC_FACES: Record<string, string> = {
  aries: "먼저 말을 꺼내는",
  taurus: "느긋해 보이는",
  gemini: "말이 잘 통하는",
  cancer: "낯을 가리는",
  leo: "눈에 잘 띄는",
  virgo: "단정하고 조심스러운",
  libra: "예의가 몸에 붙은",
  scorpio: "속을 잘 안 보이는",
  sagittarius: "거리감이 없는",
  capricorn: "나이보다 어른스러운",
  aquarius: "어딘가 남다른",
  pisces: "부드럽고 순한",
};
```

구현 시 각 항목을 `ASCENDANT_ATOMS[sign]` 첫 문장과 나란히 놓고 결이 어긋나는 칸은 고친다(처녀자리 아톰 "단정하고 꼼꼼한 사람으로 보입니다"와 위 "단정하고 조심스러운"처럼 같은 방향이어야 한다).

### 5.4 `Section` 변경

`id?: string` prop 추가, `<section id={id} className="… scroll-mt-24">`. 탭바 높이만큼 `scroll-margin-top`.

### 5.5 지우는 것

- `src/components/chart/WheelFigure.tsx` 삭제. `NatalReading`에서 import 제거.
- `NatalReading` 안 `PlacementAccordionRow`, `PlacementRow`, `PlacementHead`, `PlacementBody`, `CoreLine` → `ReadingCard`로 대체하며 삭제. 문장은 카드의 "더 읽기"로 이동.
- 공유 버튼 블록(현재 288~335행) → 첫 화면 `ShareRow`로 이동. 내용 동일.

## 6. `SkyLapse` — 태어난 뒤 하늘은

- 대상: 목성·토성·천왕성·해왕성·명왕성. 태양·달·수성·금성·화성은 그리지 않는다(31년에 태양 31바퀴, 달 400바퀴 — 원으로 뭉개진다).
- 샘플: 출생 JD부터 `now` JD까지 **361점 균등**. 각 점에서 `planetPosition(body, jd).longitude`. 언랩: 이웃 차가 ±180을 넘으면 360 보정(느린 별은 한 스텝 ~32일에 180°를 넘지 않는다).
- 계산 시점: ▶ 첫 클릭 때 `useMemo`. 1,805회 호출, 케플러 근사라 1ms 안팎.
- 그림: 네이탈 원반은 고정·흐림(기존 규약 — ASC 왼쪽, 황경 증가 반시계). 바깥 고리 r=128에 다섯 기호가 움직이고, 궤적 반지름은 바퀴마다 6px 안으로(`r = 128 − (누적각/360)·6`) — 목성 세 바퀴가 겹치지 않게.
- 재생: 2,600ms, `cubic-bezier(0.77,0,0.175,1)`(저장소 ease-in-out), rAF로 `x/y` 속성 갱신. 한 번 돌고 멈춤. `<input type="range" min=0 max=360>` 슬라이더로 아무 시점 고정.
- 캡션: 날짜 · 만 나이 · 토성 누적 바퀴. 토성이 0.97~1.06바퀴 구간이면 "토성 리턴" 표시. 끝 상태: "{오늘} · 만 {n}세 — 토성 {x}바퀴 · 목성 {y}바퀴".
- 감소 모드: ▶은 끝 상태로 즉시 점프. 슬라이더는 동작.
- 자동재생 없음. 첫 화면 등장 모션과 겹치지 않도록 "자세히" 탭 안에만 있다.
- 우측 표(별 · 태어난 자리 · 오늘 자리 · 돈 바퀴)를 함께 그린다. 값은 같은 샘플의 양끝.

## 7. 모션 스펙

곡선은 저장소 토큰 둘만 쓴다. **셋째 곡선을 들이지 않는다.**

- 그리기(stroke): `cubic-bezier(0.33, 1, 0.68, 1)` — `river-draw`·`thread-draw`·`retro-draw`와 같음
- 등장·점등: `cubic-bezier(0.16, 1, 0.3, 1)` — `prompt-in`·`node-rise`·`panel-in`과 같음

### 7.1 `ChartWheel` 등장 (prop `entrance?: boolean`)

`globals.css`에 토큰 추가: `--animate-wheel-ring: wheel-draw 400ms <그리기> both`, `--animate-wheel-tick: wheel-fade 300ms <등장> both`, `--animate-wheel-glyph: wheel-pop 300ms <등장> both`, `--animate-wheel-asp: wheel-draw 300ms <그리기> both`. 계단은 인라인 `animation-delay`.

| 시작 | 요소 | 동작 |
|---|---|---|
| 0ms | 바깥 고리 | `pathLength=1`, dashoffset 1→0, `transform: rotate(-90deg)`로 12시에서 시계 방향 |
| 120 + 40·i | 하우스 경계선 12 + 자리 기호 12 | opacity 0→1 |
| 300 + 30·i | 행성 기호 10 (개인→사회→세대 순) | opacity 0→1, `scale(.9)→1`, `transform-box: fill-box` |
| 500 + 50·min(i, 4) | 각 선(화면에 그리는 것만 세고, 다섯째에서 계단이 멈춘다) | dashoffset 1→0 |
| 600 | 태양·달·상승궁 | fill 금색 + `drop-shadow`, `transition 400ms <등장>` |

총 약 1,000ms(코어 점등이 600ms에 시작해 1,000ms에 끝난다; 각 선은 그리는 것만 세어 다섯째까지 계단). 중단 없음 — `pointer-events` 잠그지 않고 첫 프레임부터 `onSelect` 동작. **세션당 한 번:** `sessionStorage["byeolsaem:wheel-entrance"]`가 있으면 `entrance`를 끈다(완성 상태로 즉시). 감소 모드: dash·scale 제거, 모든 요소 opacity 200ms 한 번.

`SolarScope`의 `<ChartWheel>`도 `entrance`를 켠다. 키는 `byeolsaem:wheel-entrance:solar`.

### 7.2 카드 진입

`useInView(0.2)`로 섹션이 들어올 때 카드마다 `animation-delay: 60ms·i`, `260ms <등장>`, `opacity 0→1 + translateY(6px)→0`. 첫 화면(한눈에 셋)은 원반 등장이 끝난 뒤 스크롤로 만나므로 겹치지 않는다. 감소 모드: opacity만.

### 7.3 `AspectBadge` 호

호 `<path>`에 `pathLength=1`, 카드가 뷰에 들어올 때 dashoffset 1→0, `300ms <그리기>`, 카드 계단과 같은 delay. 두 점은 A 즉시, B는 호가 닿는 240ms에 `wheel-pop`. 합(0°)은 호가 없으니 이중 점만 등장.

### 7.4 탭바 밑줄

`left`·`width` `transition 300ms <등장>`. 앵커 이동은 `scroll-behavior: smooth`(기존 lenis 규약 따름).

## 8. 성능 · 접근성

- 신규 CSS/JS 합계 3KB 이내. 라이브러리 추가 없음. `gsap` import는 `WheelFigure` 삭제로 natal에서 사라진다.
- `page-fade` 라우트 전환(실측 186~252ms)과 무관 — 전부 컴포넌트 내부.
- LCP: oneLiner 텍스트는 어느 분기에서도 애니메이션 대상이 아니다. SVG는 LCP 후보가 아니다.
- CLS: transform·opacity만. 카드 펼침은 기존 grid-rows 패턴.
- 탭은 `<nav aria-label="결과 구역">` 안의 `<a>`. 현재 탭 `aria-current="location"`.
- `ReadingCard` 더 읽기는 `<button aria-expanded>`. 카드 헤더 안에 `Term` 툴팁을 넣지 않는다(기존 규칙 — button 중첩 금지).
- `SkyLapse` 슬라이더 `aria-label="출생부터 오늘까지"`, 캡션은 `aria-live="polite"`.

## 9. 테스트

| 대상 | 가드 |
|---|---|
| `ASC_FACES` | 12칸 모두 비어 있지 않음, `SIGN_FACES[k].out`과 같은 문자열 없음 (`atoms.test.ts`) |
| `plainLine` | 10×12 전부 비어 있지 않음, 조사 `이/가`가 받침 규칙에 맞음, 하우스 null이면 ` — ` 포함 |
| `NameTag` | ascendant null이면 항목 2개, 문자열이 공유 카드 tagline 규칙(`태양 X · 달 Y · 상승 Z`의 기호 버전)과 동일 |
| `ResultTabs` | 렌즈 있음 5개 / 없음 4개 / aspects 0이면 "별 사이" 없음. 각 `href`가 실제 `Section id`와 일치 |
| 첫 화면 DOM 순서 | `NameTag` → `ChartWheel` → oneLiner → `ShareRow` (렌더 테스트, `skip-link.test.ts` 방식) |
| `SkyLapse` | 361점, 첫 점 = 네이탈 경도(±0.01°), 언랩 후 토성 누적각이 예시 하늘에서 360~400° 사이 |
| 폰트 | `fonts.test.ts` 통과 — 새 글자가 있으면 `python scripts/subset-maruburi.py` |
| 회귀 | 기존 378개 전부 통과. `WheelFigure` 참조 테스트 있으면 삭제 |

## 10. 검증 절차

`npx tsc --noEmit` → `npx vitest run` → `npm run build` → 루트 `npx wrangler deploy` → dev-browser로 실측: 모바일 390 첫 화면에 ShareRow까지 들어오는지, 등장 모션 850ms 안에 끝나는지(`performance.now()`), 감소 모드에서 dash 없이 opacity만인지, 라우트 전환 시간이 기존 범위인지. 그 뒤 커밋·푸시.

커밋은 둘로 나눈다 — (1) 콘텐츠·유틸·테스트(`ASC_FACES`, `plainLine`, 컴포넌트 넷), (2) `NatalReading` 재구성 + `WheelFigure` 삭제 + 모션 토큰. 되돌릴 때 (2)만 되돌리면 옛 화면이 살아난다.
