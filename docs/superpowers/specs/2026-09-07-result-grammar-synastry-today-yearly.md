# 결과 문법을 궁합·오늘·한 해에 — 설계

작성 2026-09-07. `/natal` 재구성 스펙(`2026-09-06-natal-result-redesign.md`)에서 만든 네 가지 문법 — 이름표, 첫 화면의 그림, 붙박이 탭바, 카드 — 을 나머지 결과 화면 셋에 적용한다. `docs/todo.md`의 "스펙 C"다.

세 화면은 natal보다 작다. 셋 다 첫 화면에 이미 그림이 있다(금실·달·강). 바뀌는 것은 결과가 시작된 뒤의 긴 목록이다 — 그 목록이 탭 아래 카드로 갈린다.

## 1. 왜

natal에서 실측한 문제는 "덜 직관적"이 아니라 **길다**였다. 결과가 나온 뒤 11,105px를 붙잡아 줄 것 없이 내려갔다. 궁합(`SynastryReading`)은 만남 열 줄이 전부 펼쳐지거나 접혀 세로로 쌓이고, 오늘(`TodayCard`)은 뒤집은 뒤 트랜짓 목록이 계단으로 내려오고, 한 해(`YearScope`)는 좁은 화면에서 사건 열다섯 줄이 목록이다. 세 화면 모두 목록 항목이 **별 표기가 제목**이다("오늘의 토성 □ 내 태양"). natal이 뒤집은 그 순서 — 용어는 작게 위에, 사람 말은 크게 아래에 — 를 여기도 뒤집는다.

## 2. 원칙 — 바꾸지 않는 것

natal 스펙 §2와 같다. 여기서 다시 적는 것은 이 세 화면에서 특히 걸리는 것들이다.

- **문장 삭제 0.** 목록 항목이 카드로 바뀌어도 그 항목이 말하던 문장은 전부 카드 안에 남는다. 접힌 본문도 DOM에 있다.
- **상대(그쪽) 출생 정보 비저장.** 궁합의 이름표는 계산된 차트에서 읽을 뿐 어디에도 쓰지 않는다. 공유 카드에도 상대 정보는 실리지 않는다(지금과 같다).
- **`chart.ascendant === null`이면 이름표 셋째 칸 없음.** 나와 그쪽 각각 따로 판단한다.
- **LCP 앵커는 `opacity: 0`으로 시작하지 않는다.** 궁합은 "두 사람의 한 줄", 오늘은 앞면 `phaseLine`(바뀌지 않음), 한 해는 "올해의 한 줄".
- **탭바 `items`는 `useMemo`.** 관찰자가 배열 정체성에 걸려 있다.
- **카드는 `data-in` 부모의 직계 자식.** `ul > li` 래퍼를 쓰지 않는다. `CardSection`이 그 부모다.
- 구역은 `scroll-mt-32`(머리글 64 + 탭바 48).

## 3. 공유 컴포넌트 변경

natal에만 있던 것을 셋이 함께 쓰도록 꺼낸다. 새 컴포넌트는 없다.

| 파일 | 변경 |
|---|---|
| `src/components/ui/ResultSection.tsx` (신규) | `NatalReading`의 비공개 `Section`·`CardSection`을 `ResultSection`·`CardSection`으로 꺼낸다. 본문은 그대로. `NatalReading`은 import로 바꾼다. |
| `src/components/ui/ReadingCard.tsx` | `defaultOpen?: boolean`(처음부터 펼쳐진 카드 — 궁합의 이름 붙은 조합), `open?: boolean` + `onToggle?: () => void`(부모가 여닫는 카드 — 한 해의 강 점 클릭), `onPointerEnter?`/`onPointerLeave?`(궁합의 금실 밝히기). 전부 선택이고 기본 동작은 지금과 같다. |
| `src/components/chart/NameTag.tsx` | `chartPillars(chart): { sun, moon, ascendant }` — 차트에서 세 기둥의 별자리를 읽는다. `ascendant`는 `chart.ascendant === null`이면 null, 아니면 `signAtLongitude`. |
| `src/components/today/SkyNow.tsx` | `PlanetsNow`·`ComingMoons`에 `id?: string`. 탭의 앵커가 된다. `scroll-mt-32`. |
| `src/components/synastry/CompositeSection.tsx` | `id?: string`. `scroll-mt-32`. |

## 4. 궁합 (`SynastryReading`)

결과가 있을 때(`partner && theirChart && reading`)만 바뀐다. 상대를 넣기 전 화면(`AskPartner`·`InviteButton`), 예시(`ExampleMeeting`), 초대 화면은 그대로.

### 4.1 첫 화면

순서: **나 이름표 · 그쪽 이름표 → 금실(`GoldThreads`) → 두 사람의 한 줄(+ 해 볼 것/버릴 것) → 공유(카드 저장·카카오)**.

- 이름표 둘은 한 줄에 나란히(`flex-wrap`). 각 위에 "나"·"그쪽" 작은 표지. `NameTag`를 그대로 두 번 쓴다 — `chartPillars(myChart)`, `chartPillars(theirChart)`.
- 금실은 지금 그림 그대로, 자리만 위로 올라온다. 아래 카드에 커서를 올리면 실이 밝아지는 연결은 유지한다(`activeId`).
- 공유 두 단추는 맨 아래(지금)에서 첫 화면으로 올라온다. natal과 같은 표지 문구 "두 하늘을 카드 한 장으로 —"를 앞에 둔다. 카드 사양은 지금과 같다(내 태양 성좌, 상대 정보 없음).
- 페이지 헤더(`<h1>궁합</h1>`)는 접지 않는다 — 결과는 상대를 넣은 뒤에야 생기고 그 전 화면이 헤더에 기대고 있다.

`SynastryHero`로 export한다(렌더 테스트용).

### 4.2 탭바

| id | 라벨 | 내용 |
|---|---|---|
| `overview` | 한눈에 | `Resonance`(N/12 카운트업 그대로) + 칩 |
| `lens` | `{렌즈}으로` / 무엇을 볼까요 | 지금의 `LensSection` 그대로(`id` prop만 받는다) |
| `lines` | 닿는 자리 | 만남 카드(§4.3) |
| `composite` | 세 번째 하늘 | 지금의 `CompositeSection`(`id` prop) |

`reading.empty`(맺힌 각도 없음)이면 `lens`·`lines` 탭이 빠지고 `overview`에 `reading.empty` 문장이 들어간다.

탭 아래(탭에 속하지 않음): 초대 단추, `PartnerRoom`, 비저장 안내 문장 — 지금 그대로.

### 4.3 만남 카드

`LineRow`·`CollapsedLineRow`·`LineHead`를 지우고 `ReadingCard`로:

| 카드 자리 | 값 |
|---|---|
| badge | `AspectBadge` — `angle`은 `ASPECT_TYPES`에서 `line.aspectKey`로, `harmony`, `aSymbol`/`bSymbol`은 두 별 기호. `animate`, `delay = i × 60`, `className="w-8"` |
| tech | `(✦ )내 {mine.ko} {aspectKo} 그쪽 {theirs.ko} · 오차 {orb}도 · {toneLabel}` — ✦는 `line.highlighted`일 때만 |
| plain | `line.headline` (+ `highlighted`면 sr-only "고른 관심사에 걸리는 항목입니다.") |
| where | `line.meeting` |
| 본문 | `line.body`, 그리고 `line.highlight`가 있으면 금선 인용 블록으로 |

- 이름 붙은 조합(`line.highlight !== null`)은 `defaultOpen` — "이름 붙은 조합(✦)은 펼쳐 두었고 나머지는 눌러서 엽니다"는 문장이 그대로 참이어야 한다.
- 카드에 `onPointerEnter/Leave`로 `activeId`를 올린다.
- `openLineId` 상태는 사라진다(카드가 각자 연다).

## 5. 오늘 (`TodayCard`)

앞면(달 카드·`phaseLine`·뒤집기 단추)은 그대로. 바뀌는 것은 뒤집은 뒤다.

### 5.1 `TodayBody`

`TransitList` + `PlanetsNow` + `ComingMoons`를 `TodayBody({ back, sky, now })` 하나로 묶어 export한다.

- `back === null`(뒤집기 전, 또는 정보 없음): 탭 없이 `PlanetsNow`·`ComingMoons`만 — 지금과 같은 화면.
- `back`이 있으면 탭바 + 다섯 구역. 탭바와 구역 전부가 한 `div` 안에 있어야 한다(sticky 컨테이닝 블록).

| id | 라벨 | 내용 |
|---|---|---|
| `today-transits` | 건드리는 자리 | 제목, 오늘의 한 줄, 칩, 해 볼 것/미룰 것. `back.quiet`면 그 문장. |
| `today-lens` | `궁금해한 {렌즈}` | 렌즈 트랜짓 카드 (`lensTransits.length > 0`일 때만) |
| `today-others` | 그 밖의 하늘 / 오늘의 각 | 나머지 트랜짓 카드 (`otherTransits.length > 0`일 때만). 렌즈가 없으면 라벨은 "오늘의 각". |
| `today-planets` | 열 개의 별 | `PlanetsNow` |
| `today-moons` | 다가오는 달 | `ComingMoons` |

뒤집기 단추의 스크롤 목표 `#today-transits`는 그대로다. 정오 기준 안내 문장은 카드 구역 뒤에 그대로 남는다.

### 5.2 트랜짓 카드

`TransitItem`을 지우고 `ReadingCard`로:

| 카드 자리 | 값 |
|---|---|
| badge | `t.aspectSymbol` + `"\uFE0E"` |
| tech | `오늘의 {moving.ko} {aspectKo} 내 {fixed.ko} · 오차 {orb}도 · {toneLabel} · 약 {span}` |
| plain | `firstSentence(t.life)` |
| where | `t.area` |
| 본문 | `afterFirstSentence(t.life)`, `t.basis` |

지금 `TransitList`의 `animate-prompt-in` 계단(120·200·280ms)은 카드 계단이 대신한다. "오늘의 한 줄" 블록의 `animate-prompt-in` 하나만 남긴다 — 뒤집는 순간의 등장이다.

## 6. 한 해 (`YearScope`)

### 6.1 사건 카드 (`YearEventRows`)

좁은 화면과 감소 모드의 목록. `ul > li` 아코디언을 지우고 `data-in` 래퍼 + `ReadingCard`로:

| 카드 자리 | 값 |
|---|---|
| id | `event.id` — 강(`YearRiver`)의 점을 누르면 이 id로 스크롤한다 |
| badge | `event.aspectSymbol` + `"\uFE0E"` |
| tech | `(● ){moving.ko} {aspectKo} 내 {fixed.ko} · {M}월 {D}일( 외 n) · {toneLabel}` — ●는 `inLens`일 때만(머리글의 "금색 고리와 점"의 그 점) |
| plain | `firstSentence(event.life)` (+ `inLens`면 sr-only "관심사에 걸리는 날입니다.") |
| where | `event.area` |
| 본문 | `afterFirstSentence(event.life)`, `event.basis`, `{dateLine} · {aspectKo} · {countLine} 힘이 도는 기간은 {span}입니다.` |

여닫기는 부모가 쥔다(`open`/`onToggle`) — 강의 점이 열어 주는 계약이 그대로다. 카드 `key`는 `${year}-${event.id}`(두 해에 같은 각이 있어도 다른 카드). 래퍼에는 `key`를 두지 않는다 — `useInView`의 ref가 붙은 요소가 갈리면 관찰자가 옛 노드를 본다.

### 6.2 탭바 — 넓은 화면 핀 무대가 아닐 때만

| id | 라벨 |
|---|---|
| `year-{year}` | `{year}년, 모두에게` |
| `personal-year` | 당신의 날짜 |

- `BackdropSection`의 `<section>`이 `id="year-{year}"`를 갖는다(지금은 h2에 있다 → h2는 `year-{year}-title`). 숨긴 해의 구역은 탭에 없다.
- `PersonalYear`의 네 갈래 `<section>` 전부 `id="personal-year"`.
- `flow`(넓은 화면 + 감소 모드 아님)는 `YearScope`가 마운트 뒤 `useEffect`로 정하고(`pinCapable()`) `PersonalYear`에 내려 준다. 서버 렌더에는 탭이 없다 — 하이드레이션 불일치를 피한다.
- **핀 무대(`YearFlow`) 경로에는 탭을 두지 않는다.** 무대가 `sticky top-0 h-screen`이라 탭바(`sticky top-16`)와 같은 화면에서 두 붙박이가 겹친다. 그 화면은 스크롤 자체가 목차다. 별도 판단으로 남긴다.

## 7. 모션

새 곡선·새 토큰 없음. 카드 계단(`--animate-card-in`, index × 60ms)과 각 인장(`--animate-arc-draw`)을 그대로 쓴다. 궁합 카드만 `AspectBadge`를 `animate`로 켠다 — natal 별 사이와 같은 그림이다. 오늘·한 해의 인장은 글자 기호(각 종류가 하나뿐인 정보라 기하가 더해 주는 것이 적다).

## 8. 테스트 (`src/test/result-ui.test.ts`에 추가)

- `ReadingCard`: `defaultOpen`이면 `aria-expanded="true"`·"접기"; `open={false}`가 `defaultOpen`을 이긴다.
- `chartPillars`: 예시 하늘(1995-07-14)의 태양은 게자리, 상승궁이 있다; `ascendant: null`인 차트면 셋째 값 null.
- `SynastryHero`(`exampleMeeting()`): 이름표 둘 → 금실 → "두 사람의 한 줄" → "두 하늘을 카드 한 장으로" 순서.
- `SynastryBody`·`TodayBody`: 탭의 모든 `href="#x"`에 대해 `id="x"` 구역이 같은 HTML에 있다(natal 최종 리뷰가 미뤄 둔 테스트).
- `TodayBody(back: null)`: 탭바 없음.
- `YearEventRows`: 카드 수 = 사건 수, `openId`인 카드만 `aria-expanded="true"`, 카드 `id`가 사건 id.

## 9. 검증

건마다 `npx tsc --noEmit && npx vitest run`, 마지막에 `npm run build`. 배포하지 않고 `npx serve byeolsaem-web/out -l 4173`으로 세 페이지를 390×844에서 실측: 궁합(상대 입력 후) 첫 화면 순서·탭 top 64·카드 계단, 오늘 뒤집기 후 탭 등장·`#today-transits` 스크롤, 한 해 좁은 화면 탭·강 점 → 카드 열림.

## 10. 구현 기록 (2026-09-07)

- §3: `ResultSection`·`CardSection`은 `src/components/ui/ResultSection.tsx`. `ReadingCard`의 `open`은 `defaultOpen`보다 우선한다(부모가 쥐면 카드는 스스로 바꾸지 않는다).
- §5.1: 렌즈가 없을 때 나머지 트랜짓 구역의 라벨은 "오늘의 각" — 이 스펙이 새로 넣은 유일한 낱말.
- §6.2: 한 해 탭은 `flow === false`(마운트 뒤 판정)에서만 선다. 서버 HTML에는 없다.
- §4.3·§5.2·§6.1: 카드의 `where`에는 앞의 줄표(—)를 붙이지 않는다. natal이 세운 표기이고 세 화면이 그것을 따른다.
