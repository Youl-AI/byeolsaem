# 칼럼 발행 대기열 (2026-08-31 집필분)

5편을 미리 써 두었다. 발행 전 원고 1편은 이 폴더(`docs/column-queue/*.mdx`)에
있다 — `src/content/blog/`에 두면 "목록에 없는 본문 금지" 테스트에 걸려서다.
OG 카드와 폰트 서브셋은 5편분 전부 미리 구워 두었다.

**발행 절차 (편당):**
1. `docs/column-queue/<파일>.mdx`를 `byeolsaem-web/src/content/blog/`로 이동
2. 아래 해당 항목을 `src/content/blog/index.ts`의 `POSTS` 맨 앞에 붙여 넣고
   `published`를 그날 날짜로 수정
3. `npx tsc --noEmit && npx vitest run && npm run build` → 루트에서 `npx wrangler deploy`
4. 본문을 발행 전에 고쳤다면 `python scripts/subset-maruburi.py`도 다시 실행

2~3일 간격 발행이 원칙(애드센스 발행 이력).

- [x] 일식과 월식 — 2026-08-31 발행됨
- [x] 북쪽 노드와 남쪽 노드 — 2026-09-02 발행됨
- [x] 목성 리턴 — 2026-09-04 발행됨
- [x] 트랜짓 읽는 법 — 2026-09-07 발행됨
- [ ] 보이드 문 ← **다음 차례** (9/9~10 무렵)

발행 순서는 위에서 아래가 자연스럽다(교차 링크가 이 순서로 걸려 있다).

## 2) 북쪽 노드와 남쪽 노드

```ts
  {
    slug: "북쪽노드-남쪽노드",
    title: "북쪽 노드와 남쪽 노드 — 차트가 가리키는 방향",
    summary:
      "별이 아닌 두 교차점이 별만큼 진지하게 읽히는 이유. 익숙한 남쪽과 가야 할 북쪽, 그리고 태어난 해로 내 노드 자리를 찾는 표까지.",
    category: "나를 아는 법",
    published: "2026-09-02",
    readingMinutes: 5,
    image: "/og/blog/lunar-nodes.png",
    load: () => import("./lunar-nodes.mdx"),
  },
```

## 3) 목성 리턴

```ts
  {
    slug: "목성-리턴",
    title: "목성 리턴 — 12년마다 열리는 확장의 창",
    summary:
      "만 11, 23, 35, 47세 무렵 목성은 태어난 자리로 돌아옵니다. 무엇이든 부풀리는 별을 다루는 법과, 지금 리턴 중인 사자자리 목성 세대까지.",
    category: "나를 아는 법",
    published: "2026-09-05",
    readingMinutes: 4,
    image: "/og/blog/jupiter-return.png",
    load: () => import("./jupiter-return.mdx"),
  },
```

## 4) 트랜짓 읽는 법

```ts
  {
    slug: "트랜짓-읽는-법",
    title: "트랜짓 읽는 법 — 지금 하늘을 내 차트에 겹치기",
    summary:
      "네이탈이 사진이라면 트랜짓은 그 위를 지나는 날씨입니다. 느린 별부터 보는 우선순위와, 예보를 예언으로 만들지 않는 태도까지.",
    category: "실전 점성학",
    published: "2026-09-07",
    readingMinutes: 5,
    image: "/og/blog/transit-guide.png",
    load: () => import("./transit-guide.mdx"),
  },
```

## 5) 보이드 문

```ts
  {
    slug: "보이드문",
    title: "보이드 문 — 달이 약속을 비운 시간",
    summary:
      "이틀 반에 한 번, 달의 수첩이 비는 몇 시간이 옵니다. 계약과 시작을 피하라는 오래된 경고와, 달의 도수로 어림하는 요령까지.",
    category: "실전 점성학",
    published: "2026-09-09",
    readingMinutes: 4,
    image: "/og/blog/void-moon.png",
    load: () => import("./void-moon.mdx"),
  },
```

`published` 날짜는 예시 — 실제 발행일로 바꿔 넣는다. 발행 절차:
`byeolsaem-web`에서 `npm run build` → 저장소 루트에서 `npx wrangler deploy`.
전부 발행되면 이 파일은 지운다.

주제 풀 현황: 일식·월식 ✓, 노드 ✓, 목성 리턴 ✓, 뱀주인자리 ✓(2026-09-05),
프로그레션 ✓(2026-09-05) / 대기: 트랜짓, 보이드 문 / 남음: 점성술의 역사,
타로와 점성술.

2026-09-05에 뱀주인자리와 프로그레션 두 편을 같은 날 올렸다. 2~3일 간격 원칙에서
한 번 벗어난 것이라, 대기 중인 두 편은 날짜를 뒤로 밀었다.

칼럼을 쓰는 방법은 `docs/column-style.md`에 따로 정리했다. 이 파일은 발행 절차만
다루고, 목소리와 구조는 그쪽이 담당한다.
