import type { ComponentType } from "react";

/**
 * 칼럼 목록.
 *
 * 본문은 옆에 놓인 `.mdx` 파일이고, 여기에는 본문이 스스로 알 수 없는 것만
 * 적는다 — 주소, 목록에 나갈 요약, 발행일, 순서.
 *
 * 새 글을 내는 절차는 두 단계다: `.mdx` 파일을 하나 만들고, 이 배열 맨 앞에
 * 한 줄을 더한다. 프런트매터를 손으로 파싱하는 방식도 검토했지만, 발행일이나
 * 슬러그가 틀려도 빌드가 통과해 버린다. 여기 적으면 타입이 잡아 준다.
 *
 * 파일 이름은 영문, 주소는 한글이다. 주소는 검색어와 같아야 하고, 파일 이름은
 * 어느 운영체제·번들러에서도 탈 없이 import되어야 하기 때문이다.
 */
export interface Post {
  /** 주소. `/blog/<slug>`가 된다. */
  slug: string;
  title: string;
  /** 목록과 검색 결과에 나가는 한 문장. */
  summary: string;
  /** 제목 위에 붙는 분류. */
  category: string;
  /** 발행일. YYYY-MM-DD. */
  published: string;
  /** 읽는 데 걸리는 대략의 시간(분). */
  readingMinutes: number;
  /** 공유 카드. scripts/build-og.mjs가 굽는 /og/blog/ 아래의 파일. */
  image: string;
  /** 본문. 정적 import라 번들러가 빌드 시점에 모두 찾아낸다. */
  load: () => Promise<{ default: ComponentType }>;
}

export const POSTS: Post[] = [
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
  {
    slug: "프로그레션",
    title: "프로그레션 — 하루를 일 년으로 세는 법",
    summary:
      "태어난 지 서른 날 뒤의 하늘이 만 서른 살의 하늘입니다. 프로그레스드 달이 한 자리에 머무는 2년 3개월과, 평생 두세 번 자리를 옮기는 프로그레스드 태양까지.",
    category: "실전 점성학",
    published: "2026-09-05",
    readingMinutes: 6,
    image: "/og/blog/progression.png",
    load: () => import("./progression.mdx"),
  },
  {
    slug: "뱀주인자리",
    title: "뱀주인자리와 열세 번째 별자리 소동",
    summary:
      "몇 년마다 돌아오는 이야기의 정체. 성좌와 별자리가 서로 다른 것인 이유, 회귀 황도가 재고 있는 것, 그리고 태양이 각 자리에 실제로 머무는 날짜까지.",
    category: "점성학 기초",
    published: "2026-09-05",
    readingMinutes: 6,
    image: "/og/blog/ophiuchus.png",
    load: () => import("./ophiuchus.mdx"),
  },
  {
    slug: "목성-리턴",
    title: "목성 리턴 — 12년마다 열리는 확장의 창",
    summary:
      "만 11, 23, 35, 47세 무렵 목성은 태어난 자리로 돌아옵니다. 무엇이든 부풀리는 별을 다루는 법과, 지금 리턴 중인 사자자리 목성 세대까지.",
    category: "나를 아는 법",
    published: "2026-09-04",
    readingMinutes: 4,
    image: "/og/blog/jupiter-return.png",
    load: () => import("./jupiter-return.mdx"),
  },
  {
    slug: "북쪽노드-남쪽노드",
    title: "북쪽 노드와 남쪽 노드 — 차트가 가리키는 방향",
    summary:
      "별이 아닌 두 교차점이 별만큼 진지하게 읽히는 이유. 익숙한 남쪽과 가야 할 북쪽, 그리고 태어난 해로 내 노드 자리를 찾는 표까지.",
    category: "나를 아는 법",
    published: "2026-09-02",
    readingMinutes: 6,
    image: "/og/blog/lunar-nodes.png",
    load: () => import("./lunar-nodes.mdx"),
  },
  {
    slug: "일식-월식",
    title: "일식과 월식 — 진하게 켜진 신월과 보름",
    summary:
      "식은 흩어져 오지 않고 반년마다 몰려서 옵니다. 일식이 배정의 날이고 월식이 마감의 날인 이유, 그리고 2026년 네 번의 식과 다음 식의 날짜까지.",
    category: "점성학 기초",
    published: "2026-08-31",
    readingMinutes: 4,
    image: "/og/blog/eclipses.png",
    load: () => import("./eclipses.mdx"),
  },
  {
    slug: "2026-가을-하늘",
    title: "2026 가을·겨울 하늘 일정 — 9월부터 12월까지 한눈에",
    summary:
      "금성과 수성이 나란히 역행하는 가을, 두 번의 계절 진입, 매달의 신월과 보름. 남은 넉 달의 하늘을 시간까지 정리했습니다.",
    category: "2026 흐름",
    published: "2026-08-24",
    readingMinutes: 5,
    image: "/og/blog/autumn-2026.png",
    load: () => import("./autumn-2026.mdx"),
  },
  {
    slug: "신월-소원",
    title: "신월 소원 쓰는 법 — 뉴문 위싱의 원리와 순서",
    summary:
      "소원은 보름이 아니라 신월에 씁니다. 48시간의 규칙, 별자리에 맞추는 법, 그리고 쓰면 안 되는 신월까지.",
    category: "실전 점성학",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/new-moon-wish.png",
    load: () => import("./new-moon-wish.mdx"),
  },
  {
    slug: "궁합-보는-법",
    title: "점성술 궁합 보는 법 — 두 하늘을 겹친다는 것",
    summary:
      "별자리 두 개로 보는 궁합표가 놓치는 것. 열 개의 별을 전부 겹치는 시너스트리의 문법과, 마찰 각이 나쁜 궁합이 아닌 이유.",
    category: "실전 점성학",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/synastry-guide.png",
    load: () => import("./synastry-guide.mdx"),
  },
  {
    slug: "컴포짓-차트",
    title: "컴포짓 차트 — 두 사람 사이에 생기는 세 번째 차트",
    summary:
      "각자는 멀쩡한데 둘이 만나면 이상해지는 관계의 수수께끼. 관계 자체를 하나의 인격으로 읽는 오래된 방법.",
    category: "실전 점성학",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/composite-chart.png",
    load: () => import("./composite-chart.mdx"),
  },
  {
    slug: "금성자리-연애스타일",
    title: "금성자리 — 연애 스타일은 태양이 아니라 금성이 정한다",
    summary:
      "어떤 사람에게 끌리고 어떻게 사랑을 표현하는가. 궁합표가 다루지 않는 절반, 금성자리 이야기.",
    category: "나를 아는 법",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/venus-sign.png",
    load: () => import("./venus-sign.mdx"),
  },
  {
    slug: "화성자리-뜻",
    title: "화성자리 — 화내는 법과 밀어붙이는 법의 자리",
    summary:
      "바로 터뜨리는 사람과 며칠 말이 없어지는 사람. 에너지를 쓰는 방식, 그리고 미루는 습관이 게으름이 아닌 이유.",
    category: "나를 아는 법",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/mars-sign.png",
    load: () => import("./mars-sign.mdx"),
  },
  {
    slug: "솔라리턴-읽는-법",
    title: "솔라 리턴 읽는 법 — 생일의 하늘이 말하는 한 해",
    summary:
      "해마다 생일 무렵 태양은 태어난 자리로 정확히 돌아옵니다. 그 순간의 차트를 한 해의 지도로 읽는 법.",
    category: "실전 점성학",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/solar-return-guide.png",
    load: () => import("./solar-return-guide.mdx"),
  },
  {
    slug: "태어난-시간-모를-때",
    title: "태어난 시간을 모를 때 볼 수 있는 것과 없는 것",
    summary:
      "시각 없이도 확정되는 것이 생각보다 많고, 사라지는 것은 분명합니다. 그리고 시각을 찾는 현실적인 방법들.",
    category: "실전 점성학",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/birth-time-unknown.png",
    load: () => import("./birth-time-unknown.mdx"),
  },
  {
    slug: "점성술-각",
    title: "합·삼각·사각 — 각(어스펙트)이라는 문법",
    summary:
      "천궁도의 어지러운 선들이 말하는 것. 다섯 가지 기준 각도와, 마찰 각이 없는 차트에 동력도 없는 이유.",
    category: "점성학 기초",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/aspects-guide.png",
    load: () => import("./aspects-guide.mdx"),
  },
  {
    slug: "별자리-4원소",
    title: "불·흙·공기·물 — 열두 별자리를 넷으로 접는 법",
    summary:
      "열두 자리를 하나씩 외우는 대신 넷으로 접기. 원소가 같으면 말이 통하는 이유와 내 차트의 원소 균형 읽는 법.",
    category: "점성학 기초",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/elements.png",
    load: () => import("./elements.mdx"),
  },
  {
    slug: "별자리-3특질",
    title: "활동궁·고정궁·변통궁 — 별자리의 세 가지 움직임",
    summary:
      "계절을 여는 자리, 지키는 자리, 넘기는 자리. 원소와 곱하면 열두 별자리가 전부 설명되는 두 번째 축.",
    category: "점성학 기초",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/modalities.png",
    load: () => import("./modalities.mdx"),
  },
  {
    slug: "천문력-읽는-법",
    title: "천문력 읽는 법 — 행성 기호와 도수의 문법",
    summary:
      "점성가들이 수백 년 써 온 원자료 표. 행성 기호 열 개, 도와 분, 역행 표시까지 — 읽는 법을 처음부터.",
    category: "점성학 기초",
    published: "2026-08-24",
    readingMinutes: 4,
    image: "/og/blog/ephemeris-guide.png",
    load: () => import("./ephemeris-guide.mdx"),
  },
  {
    slug: "별자리-날짜",
    title: "몇 월 며칠은 무슨 별자리 — 날짜표와 경계의 진실",
    summary:
      "열두 별자리의 날짜표, 그리고 표가 경계에서 해마다 틀리는 이유. 경계에 태어난 사람이 자기 자리를 확인하는 법.",
    category: "점성학 기초",
    published: "2026-08-22",
    readingMinutes: 4,
    image: "/og/blog/sun-sign-dates.png",
    load: () => import("./sun-sign-dates.mdx"),
  },
  {
    slug: "금성역행-2026",
    title: "2026 금성 역행 — 수성 역행과 겹치는 가을",
    summary:
      "10월 3일부터 11월 14일까지 금성이 역행합니다. 사랑과 돈을 맡는 별이 되돌아가는 40일, 그리고 수성 역행과 겹치는 3주를 지나는 법.",
    category: "2026 흐름",
    published: "2026-08-22",
    readingMinutes: 4,
    image: "/og/blog/venus-retrograde.png",
    load: () => import("./venus-retrograde.mdx"),
  },
  {
    slug: "달자리-뜻",
    title: "달자리(문 사인) — 혼자 있을 때의 나는 어느 자리인가",
    summary:
      "겉모습이 태양이라면 문을 닫은 뒤가 달입니다. 아무도 자기 달자리를 모르는 이유와, 확인하는 법.",
    category: "나를 아는 법",
    published: "2026-08-22",
    readingMinutes: 7,
    image: "/og/blog/moon-sign.png",
    load: () => import("./moon-sign.mdx"),
  },
  {
    slug: "토성리턴",
    title: "토성 리턴 — 스물아홉의 흔들림에는 이름이 있다",
    summary:
      "토성이 태어난 자리로 돌아오는 29년 주기. 이 시기의 흔들림이 무너짐이 아니라 재건축 통보인 이유.",
    category: "나를 아는 법",
    published: "2026-08-22",
    readingMinutes: 5,
    image: "/og/blog/saturn-return.png",
    load: () => import("./saturn-return.mdx"),
  },
  {
    slug: "사주-점성술-차이",
    title: "사주와 점성술은 무엇이 다른가",
    summary:
      "같은 재료를 쓰는 다른 요리. 달력을 읽는 사주와 하늘을 읽는 점성술 — 세 가지 차이와 하나의 공통점.",
    category: "점성학 기초",
    published: "2026-08-22",
    readingMinutes: 4,
    image: "/og/blog/saju-vs-astrology.png",
    load: () => import("./saju-vs-astrology.mdx"),
  },
  {
    slug: "달의-위상-목표-달성법",
    title: "달의 위상으로 2주마다 목표를 세우는 법",
    summary:
      "달은 29.5일을 주기로 차오르고 이지러집니다. 신월에 세우고 만월에 정리하는 리듬, 그리고 태어난 순간의 달이 말해 주는 것.",
    category: "실전 점성학",
    published: "2026-03-15",
    readingMinutes: 5,
    image: "/og/blog/moon-phase.png",
    load: () => import("./moon-phase.mdx"),
  },
  {
    slug: "수성역행-생존-가이드",
    title: "수성 역행 생존 가이드: 피해야 할 것과 활용법",
    summary:
      "수성 역행은 착시입니다. 그런데 왜 이 시기마다 일이 꼬일까요. 조심할 것, 오히려 잘 되는 것, 그리고 그림자 기간까지.",
    category: "생존 가이드",
    published: "2026-03-14",
    readingMinutes: 4,
    image: "/og/blog/mercury-retrograde.png",
    load: () => import("./mercury-retrograde.mdx"),
  },
  {
    slug: "상승궁-뜻",
    title: "남들이 보는 나 vs 진짜 나: 상승궁의 비밀",
    summary:
      "태어난 시간이 4분만 달라져도 바뀌는 자리. 첫인상을 만들고, 열두 하우스 전체의 기준점이 되는 상승궁 이야기.",
    category: "나를 아는 법",
    published: "2026-03-13",
    readingMinutes: 6,
    image: "/og/blog/ascendant.png",
    load: () => import("./ascendant.mdx"),
  },
  {
    slug: "명왕성-물병자리-2026",
    title: "바람의 시대: 명왕성 물병자리 이동이 뜻하는 2026년",
    summary:
      "248년에 한 바퀴 도는 별이 자리를 옮깁니다. 세대 전체가 공유하는 배치가 개인의 삶에서는 어떻게 갈라지는지.",
    category: "2026 흐름",
    published: "2026-03-12",
    readingMinutes: 4,
    image: "/og/blog/pluto-aquarius.png",
    load: () => import("./pluto-aquarius.mdx"),
  },
  {
    slug: "12하우스-뜻",
    title: "태양궁만으로는 부족한 이유: 12하우스가 말하는 것",
    summary:
      "별자리가 배우의 성격이라면 하우스는 그 배우가 서는 무대입니다. 같은 사자자리가 서로 다르게 사는 이유.",
    category: "점성학 기초",
    published: "2026-03-11",
    readingMinutes: 5,
    image: "/og/blog/houses.png",
    load: () => import("./houses.mdx"),
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

/** "2026. 3. 14" */
export function formatPublished(published: string): string {
  const [year, month, day] = published.split("-");
  return `${year}. ${Number(month)}. ${Number(day)}`;
}
