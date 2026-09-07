# 산재 모션 다섯 — 설계

작성 2026-09-06. `/natal` 재구성 스펙(`2026-09-06-natal-result-redesign.md`)과 같은 브레인스토밍에서 나왔지만 파일이 서로 다르고 한 건씩 독립이라 따로 둔다. 다섯 건 전부 "이미 있는 그리기 문법을 아직 안 닿은 그림에 적용"이다. 새 곡선·새 라이브러리·새 지속 모션 없음 — 단 하나, 달무리 호흡은 홈 히어로에 지속 모션을 하나 더 얹는다(§6). 사용자가 시연을 보고 그대로 넣기로 정했다.

곡선 토큰은 natal 스펙 §7과 같다: 그리기 `cubic-bezier(0.33,1,0.68,1)`, 등장·점등 `cubic-bezier(0.16,1,0.3,1)`.

공통 규칙: transform·opacity만(§4 예외 하나), 감소 모드는 opacity 200ms만 남김, LCP 앵커(각 페이지의 첫 텍스트 블록)는 애니메이션 대상이 아님.

## 1. 주간 별길 — 선이 그어지고 별이 켜진다

파일 [WeekPath.tsx](../../../byeolsaem-web/src/components/weekly/WeekPath.tsx). 지금은 68행에서 전체가 700ms opacity 페이드만 한다.

홈의 [TimePath.tsx](../../../byeolsaem-web/src/components/sections/TimePath.tsx)와 같은 문법으로:

- 가로선(91행)·세로선(145행): `transform: scaleX(0)→1`(세로는 `scaleY`), `transform-origin: left`(세로 `top`), `transform-box: fill-box`, `transition 1000ms <등장>`.
- 정거장 7개(별·점·요일 라벨): `--animate-node-rise`(기존 420ms) 재사용, `animation-delay: 250 + 110·i ms`. 이벤트 점(120~122행)은 그 정거장 delay + 60ms.
- 오늘 정거장의 `star-breathe` 링(109행)은 `animation-delay: 1200ms`로 시작을 늦춘다 — 등장이 끝난 뒤 숨쉬기.
- 트리거: 기존 `useInView`. 감소 모드: 지금의 700ms 페이드 그대로(변경 없음).
- 폴백 `VerticalPath`도 동일 규칙.

테스트: 없음(순수 CSS). 검증은 dev-browser 실측 — 7정거장 마지막 delay가 250+660=910ms, 라벨까지 970ms 안에 끝남.

## 2. 12년 아치 — 올해 칸만 켜진다

파일 [ProfectionSection.tsx](../../../byeolsaem-web/src/components/chapters/ProfectionSection.tsx) 115~160행의 SVG. 지금은 전체 700ms opacity 페이드.

- 아치 전체 페이드는 유지.
- 올해 칸(`profection.house`에 해당하는 `<path>`): `fill: rgba(227,197,104,0)→rgba(227,197,104,.18)`, `transition: fill 400ms <등장> 500ms`. fill 전환은 컴포지터 밖이지만 path 하나 1회라 허용.
- 올해 칸 라벨 `<text>`: `fill` 회색→`var(--color-gold-soft)`, 같은 타이밍.
- 나이 마커(올해 칸 바깥 "만 N세 · N하우스"): `--animate-node-rise`, `animation-delay: 700ms`.
- 열두 칸 순차 점등은 **하지 않는다.** 12× 계단은 길고, 칸 순서는 정보가 아니다.
- 감소 모드: 페이드만.

테스트: 없음.

## 3. 오늘의 달 — 신월에서 오늘까지 차오름

파일 [MoonDisc.tsx](../../../byeolsaem-web/src/components/today/MoonDisc.tsx). 지금은 정지. 밝은 면 경로는 `k = 1 − 2·illumination`으로 그린다(12행, 29행).

- 마운트 시 `illumination`을 0→오늘 값으로 600ms 보간, rAF에서 `<path d>`를 다시 계산. 이징은 `<등장>` 곡선을 큐빅으로 근사한 `1 − (1−t)^3`.
- **하루 한 번.** `sessionStorage["byeolsaem:moon-fill:<YYYY-MM-DD>"]`가 있으면 즉시 오늘 값.
- SVG 좌표 갱신이라 transform·opacity 원칙의 유일한 예외. 근거: 108px 경로 36프레임, 레이아웃 무관.
- `phase`(초승/그믐 방향)는 보간 중에도 오늘 값 고정 — 방향이 바뀌면 안 된다.
- 감소 모드: 정지(오늘 값).
- `MoonDisc`는 `TodayCard`와 공유 카드(`moonArt`) 두 곳에서 쓰인다. 공유 카드 쪽은 정적 렌더라 애니메이션 prop을 켜지 않는다 — `animate?: boolean` prop, 기본 false, `TodayCard`에서만 true.

테스트: `moonPath(0)`이 빈 경로, `moonPath(illum)`이 기존 식과 동일한 문자열(리팩터 회귀).

## 4. 역행 띠 — 어제 값에서 오늘 값으로

파일 [SkyNow.tsx](../../../byeolsaem-web/src/components/today/SkyNow.tsx)의 `RetroBand`. 지금은 정지 숫자.

- 시연판의 "0→N 카운트업"은 하지 않는다. 대신 **어제 값→오늘 값**(예: 49→48), 300ms, `<등장>` 곡선. 숫자가 실제로 변한 만큼만 움직인다 — 상태 표시.
- 어제 값 = `retrogradeStatus(spans, now − 1일)`의 같은 필드. 값이 같으면(경계 안 넘음) 움직이지 않는다.
- **하루 첫 방문에만.** `sessionStorage["byeolsaem:retro-roll:<YYYY-MM-DD>"]`.
- 숫자는 `font-variant-numeric: tabular-nums`(폭 고정). 정수 보간, `Math.round`.
- 감소 모드: 오늘 값 즉시.

테스트: 어제·오늘 값이 같을 때 rAF가 시작되지 않음(호출 카운트 0).

## 5. 달무리 호흡 — 홈 히어로

파일 [hero/Moon.tsx](../../../byeolsaem-web/src/components/hero/Moon.tsx). 지금은 정지 달무리. 시연판 값 그대로.

- `@keyframes halo-breathe { 0%,100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.18); opacity: .5 } }`, `3.4s ease-in-out infinite`. 토큰 `--animate-halo-breathe`. `lonely-star`(3.4s)와 주기를 맞춘다.
- 대상은 바깥 링 `div`(`size-[260px] md:size-[400px]`) 하나. 안쪽 동심원은 정지.
- **스크롤이 시작되면 멈춘다.** `HeroSequence`가 `#hero-moon`을 GSAP으로 옮기기 시작하는 시점에 `animation-play-state: paused` — 두 모션이 같은 요소를 다투지 않게. `HeroSequence`의 기존 ScrollTrigger `onEnter`/첫 `onUpdate`에서 클래스 토글.
- 감소 모드: 없음(정지).
- 배경 별하늘(three.js 자전)과 지속 모션이 둘이 된다. 브레인스토밍에서 짚었고, 사용자가 시연을 본 뒤 넣기로 결정.

테스트: 없음. dev-browser로 스크롤 후 `getComputedStyle(...).animationPlayState === "paused"` 확인.

## 6. 하지 않는 것(기록)

시연판에서 검토 후 뺀 셋. 이유는 성능이 아니라 기능이다.

- 천문력 표 행 계단 — 읽는 데이터가 600ms 늦게 온다.
- 달력 30칸 계단 — 정보(신월·보름 점 둘)를 설명하지 않는 750ms.
- 하늘 띠 "어제→오늘" 이동 — 달만 14° 움직이고 아홉은 1px 미만. 진짜 값인데 고장으로 읽힌다. 대안은 어제 자리를 흐린 점으로 병기하는 정적 표현(별도 판단).

## 7. 검증 · 커밋

건마다 커밋 하나. 각각 `npx tsc --noEmit && npx vitest run && npm run build`, 배포 후 dev-browser로 해당 페이지 모바일 390 실측(감소 모드 on/off 두 번). 순서: 1 → 2 → 3 → 4 → 5.

## 8. 구현 기록 (2026-09-07)

- §1 주간 별길: 선은 `scaleX` 대신 `pathLength=1` + `stroke-dashoffset`(그리기 토큰, 1000ms) — 이 저장소의 SVG 선 그리기 문법 그대로. `<line>`에 `transform-box: fill-box`는 높이 0 bbox 위에서 원점을 재야 해 피했다. 트리거는 `useInView`(0.25)로 바꾸고 `WeeklyCard`의 rAF `entered`를 지웠다.
- §2 12년 아치: 최종 색은 기존 값 유지(`rgba(201,162,39,0.16)`). 나이 마커 = 다이얼 중앙 `AGE`+숫자.
- §3 오늘의 달: `MoonDisc` prop은 `fill?: string | null`(세션 열쇠) — `ChartWheel`의 `entrance`와 같은 계약. `TodayCard`는 `now`를 안 뒤에만 열쇠를 준다(빌드 시점 하늘로 한 번, 오늘로 한 번 도는 것을 막는다). 경로 식은 `src/lib/moon-path.ts`.
- §4 역행 띠: `RetroBand` prop `live`(같은 이유). 굴림 판정은 `src/lib/retro-roll.ts`.
- §5 달무리: `HeroSequence`에는 ScrollTrigger가 없다 — 달은 단추로 시작하는 Flip이 옮긴다. `scene === "arrival"`에서만 숨쉬고 의식이 시작되면 `animation: none`(paused가 아니라 제거 — 커진 채 얼어붙지 않게).
- 표기 하나: 하네스가 도구 인자의 네 자리 유니코드 이스케이프를 실제 문자로 정규화해서, 구현자가 ES2015 코드 포인트 형식으로 적은 것을 그 뒤 저장소 표기로 통일했다(커밋 7233d98·f88d19e). 두 형식은 같은 문자열로 컴파일된다.
