# 칼럼 발행 대기열 (2026-09-08 집필분 — 점성술의 역사 다섯 편)

5편을 미리 써 두었다. 원고는 `docs/column-queue/*.mdx`에 있다 —
`src/content/blog/`에 두면 "목록에 없는 본문 금지" 테스트에 걸려서다.
OG 카드는 5편분 전부 미리 구워 두었다(`public/og/blog/`).

**폰트 서브셋은 다시 구울 것이 없다.** 다섯 편에 쓰인 글자가 전부 이미
`src/fonts/maruburi-subset.txt`에 들어 있는 것을 확인했다(2026-09-08). 발행 전에
본문을 고쳤다면 그때는 `python scripts/subset-maruburi.py`를 돌린다 — 그 스크립트는
`src/` 아래만 훑으므로 `docs/`에 있는 동안에는 이 원고를 보지 못한다.

앞 묶음(2026-08-31 집필 5편)은 2026-09-08에 전부 발행돼 이 문서에서 내렸다.
그 항목들은 `git log -- docs/column-queue.md`로 찾을 수 있다.

## 이 묶음의 성격

다섯 편이 연대순 한 줄로 이어진다. 기원 → 전승 → 분리 → 대중화 → 한국.
**순서대로 발행해야 한다** — 뒤 글이 앞 글을 링크로 걸고 있어서, 순서를 바꾸면
아직 없는 주소로 링크가 걸린다.

분류 `점성술의 역사`는 새로 생기는 것이다. `blog/page.tsx`의 `CATEGORY_ORDER`에
넣지 않으면 목록 맨 끝에 붙는다. 자리를 정하려면 그 배열에 한 줄 더한다.

이 묶음은 `column-style.md` §4의 "숫자는 엔진에서 뽑는다"를 지킬 수 없다.
천체력이 1800~2050년만 유효해서 고대나 케플러 시대 위치를 계산할 수 없다.
대신 사실은 전부 조사로 확인했고, 확인되지 않은 것은 다섯째 편에서 모른다고 적었다.

**발행 절차 (편당):**
1. `docs/column-queue/<파일>.mdx`를 `byeolsaem-web/src/content/blog/`로 이동
2. 아래 해당 항목을 `src/content/blog/index.ts`의 `POSTS` 맨 앞에 붙여 넣고
   `published`를 그날 날짜로 수정
3. 아래 "들어오는 링크"에 적힌 기존 글 한 편을 고쳐 새 글로 링크를 건다
   (링크가 한쪽으로만 걸리면 새 글이 고립된다 — `column-style.md` §5)
4. `npx tsc --noEmit && npx vitest run && npm run build` → 루트에서 `npx wrangler deploy`
5. 본문을 발행 전에 고쳤다면 `python scripts/subset-maruburi.py`도 다시 실행

2~3일 간격 발행이 원칙(애드센스 발행 이력). 다섯 편이면 9월 10일부터 2~3일
간격으로 9월 하순까지 간다.

- [ ] 1) 점성술은 어디서 왔나 ← **다음 차례**
- [ ] 2) 바그다드를 거쳐 온 점성술
- [ ] 3) 점성술과 천문학이 갈라선 자리
- [ ] 4) 신문 별자리 운세는 1930년에 태어났다
- [ ] 5) 한국에 서양 점성술은 언제 들어왔나

## 1) 점성술은 어디서 왔나

```ts
  {
    slug: "점성술-역사",
    title: "점성술은 어디서 왔나 — 왕의 하늘에서 개인의 차트로",
    summary:
      "3천 년 전 바빌로니아의 징조 목록에서 기원전 410년의 첫 출생 차트까지. 지금 쓰는 차트의 부품이 각각 어디서 왔는지 표로 정리했습니다.",
    category: "점성술의 역사",
    published: "2026-09-10",
    readingMinutes: 5,
    image: "/og/blog/astrology-origins.png",
    load: () => import("./astrology-origins.mdx"),
  },
```

들어오는 링크: `ophiuchus.mdx`의 "3천 년 가까이 쌓아 온 해석" 대목에서 이 글로 건다.

## 2) 바그다드를 거쳐 온 점성술

```ts
  {
    slug: "점성술-아랍-전승",
    title: "바그다드를 거쳐 온 점성술 — 700년의 번역",
    summary:
      "유럽이 그리스어를 잃은 사이 프톨레마이오스는 아랍어로 남았습니다. 아부 마샤르와 톨레도의 번역가들이 그 책을 다시 라틴어로 돌려놓기까지.",
    category: "점성술의 역사",
    published: "2026-09-13",
    readingMinutes: 5,
    image: "/og/blog/arabic-transmission.png",
    load: () => import("./arabic-transmission.mdx"),
  },
```

들어오는 링크: `aspects-guide.mdx`(점성술-각)의 각 이름을 설명하는 대목에서 건다.

## 3) 점성술과 천문학이 갈라선 자리

```ts
  {
    slug: "점성술-천문학-분리",
    title: "점성술과 천문학이 갈라선 자리",
    summary:
      "케플러는 차트를 팔았고 대학은 점성술을 가르쳤습니다. 두 학문이 한 몸이던 시절과, 계산만 천문학이 가져간 17세기의 갈림길.",
    category: "점성술의 역사",
    published: "2026-09-16",
    readingMinutes: 5,
    image: "/og/blog/astrology-astronomy-split.png",
    load: () => import("./astrology-astronomy-split.mdx"),
  },
```

들어오는 링크: `ephemeris-guide.mdx`(천문력-읽는-법)에서 건다.

## 4) 신문 별자리 운세는 1930년에 태어났다

```ts
  {
    slug: "별자리운세-기원",
    title: "신문 별자리 운세는 1930년에 태어났다",
    summary:
      "마거릿 공주의 차트와 비행선 한 척이 열두 칸 운세를 만들었습니다. 그 형식이 무엇을 버렸는지, 왜 안 맞는다는 말이 나오는지까지.",
    category: "점성술의 역사",
    published: "2026-09-19",
    readingMinutes: 5,
    image: "/og/blog/sun-sign-column-1930.png",
    load: () => import("./sun-sign-column-1930.mdx"),
  },
```

들어오는 링크: `houses.mdx`(12하우스-뜻)의 "태양궁만으로는 부족한 이유"에서 건다.

## 5) 한국에 서양 점성술은 언제 들어왔나

```ts
  {
    slug: "한국-점성술-역사",
    title: "한국에 서양 점성술은 언제 들어왔나",
    summary:
      "조선에는 관상감이 있었고 개인의 운명을 다루는 부서까지 있었습니다. 1653년에 들어온 것은 서양의 계산법이었지 황도 열두 자리의 풀이가 아니었습니다.",
    category: "점성술의 역사",
    published: "2026-09-22",
    readingMinutes: 5,
    image: "/og/blog/astrology-in-korea.png",
    load: () => import("./astrology-in-korea.mdx"),
  },
```

들어오는 링크: `saju-vs-astrology.mdx`(사주-점성술-차이)에서 건다.

`published` 날짜는 예시 — 실제 발행일로 바꿔 넣는다.
전부 발행되면 이 파일의 항목을 지우고 다음 묶음으로 갈아 끼운다.

## 주제 풀 현황

발행 완료: 일식·월식, 노드, 목성 리턴, 뱀주인자리, 프로그레션, 트랜짓, 보이드 문.
대기: 위 다섯 편. 남은 주제: 타로와 점성술.

이 묶음을 다 내면 발행 35편이 된다. 40편 목표까지 다섯 편이 더 필요하고,
주제 풀에는 하나만 남아 있다. **다음 묶음 집필 전에 주제부터 새로 골라야 한다.**

칼럼을 쓰는 방법은 `docs/column-style.md`에 따로 정리했다. 이 파일은 발행 절차만
다루고, 목소리와 구조는 그쪽이 담당한다.
