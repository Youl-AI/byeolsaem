/**
 * 공유 카드(OG 이미지)를 PNG 파일로 굽는다.
 *
 * 왜 스크립트인가. Next에는 `opengraph-image.tsx` 파일 규칙이 있고 실제로 잘
 * 돌아가지만, 그 결과물은 확장자가 없는 `/opengraph-image`로 나간다. 우리 호스트
 * (Cloudflare Workers Assets)는 파일 확장자로 content-type을 정하므로 그 주소는
 * **타입 헤더 없이** 서빙된다(2026-08-15 배포해서 실측). 카카오·X 같은 곳은
 * content-type을 보고 이미지를 그릴지 정하기 때문에, 그대로 두면 미리보기가
 * 뜨지 않는다.
 *
 * 그래서 `.png`로 구워 public/og/에 두고, 메타데이터가 그 주소를 직접 가리킨다.
 * 폰트 서브셋과 같은 취급이다 — 디자인이나 별자리 데이터가 바뀔 때만 다시 돌린다.
 *
 *   node --experimental-strip-types scripts/build-og.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { ImageResponse } from "next/og.js";
import { ZODIAC_SIGNS } from "../src/lib/zodiac.ts";
import { constellation } from "./lib/constellation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "og");
const SIZE = { width: 1200, height: 630 };

const INK = "#0b1026";
const GOLD = "#e3c568";
const STARLIGHT = "#eef1fb";
const DIM = "#a9aec2";
const GROUND =
  "radial-gradient(1000px 560px at 50% 8%, #1a224a 0%, #0b1026 46%, #070a16 100%)";

const h = React.createElement;

/**
 * 배경의 별. 좌표를 박아 두어 빌드마다 같은 그림이 나온다 — 무작위로 흩뿌리면
 * 이미지가 매번 달라져 커밋 diff가 의미 없이 커진다.
 */
const STARS = [
  [80, 90, 2], [190, 480, 1.5], [300, 140, 2.5], [420, 560, 1.5], [520, 70, 2],
  [610, 300, 1.5], [700, 520, 2], [790, 130, 2.5], [880, 420, 1.5], [960, 220, 2],
  [1050, 540, 2.5], [1120, 100, 1.5], [150, 300, 1.5], [1010, 60, 1.5], [660, 600, 1.5],
];

function starLayer(exclude = null) {
  return STARS.filter(([x]) => exclude === null || x < exclude).map(([x, y, r], i) =>
    h("div", {
      key: `s${i}`,
      style: {
        position: "absolute", left: x, top: y,
        width: r * 2, height: r * 2, borderRadius: r,
        background: GOLD, opacity: 0.55,
      },
    }),
  );
}

function frame(children, extra = {}) {
  return h(
    "div",
    {
      style: {
        width: "100%", height: "100%", display: "flex",
        background: GROUND, fontFamily: "MaruBuri", position: "relative",
        ...extra,
      },
    },
    children,
  );
}

/** 사이트 공용 카드. 자기 카드가 없는 모든 경로가 이걸 쓴다. */
function defaultCard() {
  return frame([
    ...starLayer(),
    h("div", {
      key: "body",
      style: {
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "0 96px", width: "100%",
      },
    }, [
      h("div", { key: "eyebrow", style: { display: "flex", fontSize: 26, letterSpacing: 10, color: GOLD } }, "BYEOLSAEM"),
      h("div", { key: "title", style: { display: "flex", marginTop: 26, fontSize: 92, color: STARLIGHT } }, "별샘"),
      h("div", { key: "sub", style: { display: "flex", marginTop: 30, fontSize: 40, color: DIM } },
        "당신이 태어난 밤, 하늘은 기억하고 있어요"),
    ]),
    h("div", {
      key: "rule",
      style: { position: "absolute", left: 96, bottom: 84, width: 148, height: 2, background: GOLD, opacity: 0.75 },
    }),
  ]);
}

/**
 * 별자리 카드 — 오른쪽에 그 자리의 성좌를 그린다.
 *
 * 좌표와 잇는 선은 화면의 진(陣)이 쓰는 것과 같은 데이터다(lib/zodiac.ts의
 * stars·path, 260×200 좌표계). 새로 그릴 것이 없고, 공유했을 때 열두 장이 서로
 * 다른 그림이 된다.
 */
function signCard(sign) {
  const BOX = { w: 430, h: 430 };
  const sky = constellation(sign, BOX, { h, gold: GOLD, bright: "#fff6d8" });

  return frame([
    ...starLayer(620),
    h("div", {
      key: "body",
      style: {
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 0 0 96px", width: 640,
      },
    }, [
      h("div", { key: "eyebrow", style: { display: "flex", fontSize: 24, letterSpacing: 8, color: GOLD } }, "BYEOLSAEM"),
      h("div", { key: "name", style: { display: "flex", marginTop: 22, fontSize: 84, color: STARLIGHT } }, sign.ko),
      h("div", { key: "range", style: { display: "flex", marginTop: 14, fontSize: 30, color: GOLD } }, sign.range),
      h("div", { key: "tag", style: { display: "flex", marginTop: 26, fontSize: 32, color: DIM } }, sign.tagline),
    ]),
    h("div", {
      key: "sky",
      style: {
        position: "absolute", right: 72, top: (630 - BOX.h) / 2,
        width: BOX.w, height: BOX.h, display: "flex",
      },
    }, sky),
  ]);
}

/**
 * 페이지·칼럼 카드의 오른쪽 모티프들 — 전부 원과 선(div)만으로 그린다.
 * Satori는 SVG path를 못 그리고, MaruBuri에 행성 기호 글리프가 있다는 보장도
 * 없다. 원·선·글자는 어디서나 그려진다.
 */
const MOTIFS = {
  /** 달 — 큰 원 위에 잉크 원을 겹쳐 이지러진 면을 만든다. */
  moon(box) {
    return [
      h("div", { key: "m1", style: {
        position: "absolute", left: 0, top: 0, width: box, height: box,
        borderRadius: box / 2, background: STARLIGHT, opacity: 0.92,
      } }),
      h("div", { key: "m2", style: {
        position: "absolute", left: -box * 0.28, top: -box * 0.06, width: box, height: box,
        borderRadius: box / 2, background: "#0b1026", opacity: 0.96,
      } }),
      h("div", { key: "m3", style: {
        position: "absolute", left: box * 0.14, top: box * 0.3, width: 7, height: 7,
        borderRadius: 4, background: GOLD, opacity: 0.9,
      } }),
    ];
  },
  /** 역행 고리 — 하루 점들이 타원 궤적을 돌고, 되짚는 구간만 골드로 밝다. */
  loop(box) {
    const dots = [];
    const N = 26;
    for (let i = 0; i < N; i += 1) {
      const t = (i / N) * Math.PI * 2 + Math.PI / 7;
      const x = box / 2 + Math.cos(t) * (box / 2 - 18);
      const y = box / 2 + Math.sin(t) * (box / 2.9);
      const retro = i >= 8 && i <= 15;
      const r = retro ? 7 : 4.5;
      dots.push(h("div", { key: `d${i}`, style: {
        position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2,
        borderRadius: r, background: retro ? GOLD : STARLIGHT,
        opacity: retro ? 0.95 : 0.45,
      } }));
    }
    return dots;
  },
  /** 천궁 원반 — 링 둘과 지평선·자오선. */
  wheel(box) {
    const ring = (inset, opacity) => h("div", { key: `r${inset}`, style: {
      position: "absolute", left: inset, top: inset,
      width: box - inset * 2, height: box - inset * 2,
      borderRadius: (box - inset * 2) / 2, border: `2px solid ${GOLD}`, opacity,
    } });
    return [
      ring(0, 0.8), ring(54, 0.45),
      h("div", { key: "hz", style: {
        position: "absolute", left: 0, top: box / 2 - 1, width: box, height: 2,
        background: GOLD, opacity: 0.5,
      } }),
      h("div", { key: "md", style: {
        position: "absolute", left: box / 2 - 1, top: 0, width: 2, height: box,
        background: GOLD, opacity: 0.3,
      } }),
    ];
  },
  /** 두 하늘 — 링 두 개가 겹치는 자리. */
  rings(box) {
    const d = box * 0.62;
    const ring = (key, left, top, color, opacity) => h("div", { key, style: {
      position: "absolute", left, top, width: d, height: d, borderRadius: d / 2,
      border: `2.5px solid ${color}`, opacity,
    } });
    return [
      ring("a", 0, box * 0.19, GOLD, 0.85),
      ring("b", box - d, box * 0.19, STARLIGHT, 0.6),
    ];
  },
  /** 지평선과 떠오르는 반원 — 상승궁. */
  horizon(box) {
    const d = box * 0.56;
    return [
      h("div", { key: "sun", style: {
        position: "absolute", left: (box - d) / 2, top: box / 2 - d / 2,
        width: d, height: d, borderRadius: d / 2, border: `3px solid ${GOLD}`, opacity: 0.9,
      } }),
      h("div", { key: "mask", style: {
        position: "absolute", left: -10, top: box / 2, width: box + 20, height: box / 2,
        background: "#0b1026", opacity: 0.97,
      } }),
      h("div", { key: "line", style: {
        position: "absolute", left: 0, top: box / 2 - 1, width: box, height: 2,
        background: STARLIGHT, opacity: 0.7,
      } }),
    ];
  },
};

/**
 * 페이지·칼럼 공용 카드 — 왼쪽 글, 오른쪽 모티프. 정찰 ⑤(2026-08-22):
 * 칼럼 다섯 편과 도구 페이지 전부가 기본 카드 한 장으로 공유되고 있었다.
 */
function pageCard({ eyebrow, title, sub, motif }) {
  const BOX = 360;
  return frame([
    ...starLayer(620),
    h("div", {
      key: "body",
      style: {
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 0 0 96px", width: 600,
      },
    }, [
      h("div", { key: "eyebrow", style: { display: "flex", fontSize: 24, letterSpacing: 8, color: GOLD } }, eyebrow),
      h("div", { key: "title", style: { display: "flex", marginTop: 22, fontSize: title.length > 10 ? 58 : 76, color: STARLIGHT, lineHeight: 1.3, wordBreak: "keep-all" } }, title),
      h("div", { key: "sub", style: { display: "flex", marginTop: 24, fontSize: 30, color: DIM, lineHeight: 1.5 } }, sub),
    ]),
    h("div", {
      key: "motif",
      style: {
        position: "absolute", right: 96, top: (630 - BOX) / 2,
        width: BOX, height: BOX, display: "flex",
      },
    }, MOTIFS[motif](BOX)),
  ]);
}

/** 자기 카드를 갖는 경로들. 파일명은 public/og/ 아래 경로다. */
const PAGE_CARDS = [
  { file: "today.png", eyebrow: "TONIGHT", title: "오늘의 하늘", sub: "달의 위상과 열 행성의 자리, 매일 새로", motif: "moon" },
  { file: "natal.png", eyebrow: "MY NIGHT SKY", title: "나의 천궁도", sub: "태어난 순간의 하늘을 계산해서 읽어 드립니다", motif: "wheel" },
  { file: "synastry.png", eyebrow: "TWO SKIES", title: "궁합", sub: "두 하늘이 서로의 어디를 건드리는지", motif: "rings" },
  { file: "yearly.png", eyebrow: "THE YEAR", title: "한 해의 하늘", sub: "느린 별들이 당신과 각도를 맺는 날짜들", motif: "wheel" },
  { file: "sign.png", eyebrow: "TWELVE ROOMS", title: "열두 개의 방", sub: "별자리 열둘, 각자의 방식과 계절", motif: "wheel" },
  { file: "retrograde.png", eyebrow: "MERCURY RETROGRADE", title: "수성 역행", sub: "지금 역행인가요 — 계산이 답합니다", motif: "loop" },
  { file: "retrograde-venus.png", eyebrow: "VENUS RETROGRADE", title: "금성 역행", sub: "사랑과 돈을 맡는 별이 되돌아가는 40일", motif: "loop" },
  { file: "retrograde-mars.png", eyebrow: "MARS RETROGRADE", title: "화성 역행", sub: "추진력을 맡는 별이 되돌아가는 두 달 반", motif: "loop" },
  { file: "blog/moon-phase.png", eyebrow: "COLUMN", title: "달의 위상 목표 달성법", sub: "신월에 세우고 만월에 정리하는 법", motif: "moon" },
  { file: "blog/mercury-retrograde.png", eyebrow: "COLUMN", title: "수성 역행 생존 가이드", sub: "피해야 할 것과 활용하는 법", motif: "loop" },
  { file: "blog/ascendant.png", eyebrow: "COLUMN", title: "상승궁의 비밀", sub: "남들이 보는 나 vs 진짜 나", motif: "horizon" },
  { file: "blog/pluto-aquarius.png", eyebrow: "COLUMN", title: "명왕성 물병자리 시대", sub: "2026년의 거대한 변화", motif: "rings" },
  { file: "blog/sun-sign-dates.png", eyebrow: "COLUMN", title: "몇 월 며칠은 무슨 별자리", sub: "날짜표, 그리고 경계의 진실", motif: "wheel" },
  { file: "blog/venus-retrograde.png", eyebrow: "COLUMN", title: "2026 금성 역행", sub: "수성 역행과 겹치는 가을", motif: "loop" },
  { file: "blog/moon-sign.png", eyebrow: "COLUMN", title: "달자리라는 것", sub: "혼자 있을 때의 나는 어느 자리인가", motif: "moon" },
  { file: "blog/saturn-return.png", eyebrow: "COLUMN", title: "토성 리턴", sub: "스물아홉의 흔들림에는 이름이 있다", motif: "horizon" },
  { file: "blog/saju-vs-astrology.png", eyebrow: "COLUMN", title: "사주와 점성술", sub: "같은 재료를 쓰는 다른 요리", motif: "rings" },
  { file: "blog/houses.png", eyebrow: "COLUMN", title: "12하우스가 말하는 것", sub: "태양궁만으로는 부족한 이유", motif: "wheel" },
  { file: "blog/autumn-2026.png", eyebrow: "COLUMN", title: "2026 가을·겨울 하늘 일정", sub: "9월부터 12월까지 한눈에", motif: "horizon" },
  { file: "blog/new-moon-wish.png", eyebrow: "COLUMN", title: "신월 소원 쓰는 법", sub: "뉴문 위싱의 원리와 순서", motif: "moon" },
  { file: "blog/synastry-guide.png", eyebrow: "COLUMN", title: "점성술 궁합 보는 법", sub: "두 하늘을 겹친다는 것", motif: "rings" },
  { file: "blog/composite-chart.png", eyebrow: "COLUMN", title: "컴포짓 차트", sub: "두 사람 사이의 세 번째 차트", motif: "rings" },
  { file: "blog/venus-sign.png", eyebrow: "COLUMN", title: "금성자리", sub: "연애 스타일을 정하는 자리", motif: "rings" },
  { file: "blog/mars-sign.png", eyebrow: "COLUMN", title: "화성자리", sub: "화내는 법과 밀어붙이는 법", motif: "horizon" },
  { file: "blog/solar-return-guide.png", eyebrow: "COLUMN", title: "솔라 리턴 읽는 법", sub: "생일의 하늘이 말하는 한 해", motif: "wheel" },
  { file: "blog/birth-time-unknown.png", eyebrow: "COLUMN", title: "태어난 시간을 모를 때", sub: "볼 수 있는 것과 없는 것", motif: "horizon" },
  { file: "blog/aspects-guide.png", eyebrow: "COLUMN", title: "각이라는 문법", sub: "합·삼각·사각이 말하는 것", motif: "wheel" },
  { file: "blog/elements.png", eyebrow: "COLUMN", title: "불·흙·공기·물", sub: "열두 별자리를 넷으로 접는 법", motif: "loop" },
  { file: "blog/modalities.png", eyebrow: "COLUMN", title: "활동궁·고정궁·변통궁", sub: "별자리의 세 가지 움직임", motif: "loop" },
  { file: "blog/ephemeris-guide.png", eyebrow: "COLUMN", title: "천문력 읽는 법", sub: "행성 기호와 도수의 문법", motif: "moon" },
  { file: "blog/eclipses.png", eyebrow: "COLUMN", title: "일식과 월식", sub: "진하게 켜진 신월과 보름", motif: "moon" },
  { file: "blog/lunar-nodes.png", eyebrow: "COLUMN", title: "북쪽 노드와 남쪽 노드", sub: "차트가 가리키는 방향", motif: "loop" },
  { file: "blog/jupiter-return.png", eyebrow: "COLUMN", title: "목성 리턴", sub: "12년마다 열리는 확장의 창", motif: "rings" },
  { file: "blog/transit-guide.png", eyebrow: "COLUMN", title: "트랜짓 읽는 법", sub: "지금 하늘을 내 차트에 겹치기", motif: "wheel" },
  { file: "blog/void-moon.png", eyebrow: "COLUMN", title: "보이드 문", sub: "달이 약속을 비운 시간", motif: "moon" },
  { file: "blog/astrology-origins.png", eyebrow: "COLUMN", title: "점성술은 어디서 왔나", sub: "왕의 하늘에서 개인의 차트로", motif: "wheel" },
  { file: "blog/arabic-transmission.png", eyebrow: "COLUMN", title: "바그다드를 거쳐 온 점성술", sub: "700년의 번역", motif: "rings" },
  { file: "blog/astrology-astronomy-split.png", eyebrow: "COLUMN", title: "갈라선 자리", sub: "점성술과 천문학이 한 몸이던 시절", motif: "horizon" },
  { file: "blog/sun-sign-column-1930.png", eyebrow: "COLUMN", title: "별자리 운세의 탄생", sub: "1930년 런던의 한 신문사에서", motif: "loop" },
  { file: "blog/astrology-in-korea.png", eyebrow: "COLUMN", title: "한국의 하늘", sub: "관상감은 있었고 별자리 운세는 없었다", motif: "wheel" },
  { file: "blog/ophiuchus.png", eyebrow: "COLUMN", title: "뱀주인자리", sub: "열세 번째 별자리라는 소동", motif: "wheel" },
  { file: "blog/progression.png", eyebrow: "COLUMN", title: "프로그레션", sub: "하루를 일 년으로 세는 법", motif: "loop" },
  { file: "calendar.png", eyebrow: "SKY CALENDAR", title: "하늘의 달력", sub: "신월과 보름, 역행의 시작과 끝", motif: "wheel" },
  { file: "weekly.png", eyebrow: "THIS WEEK", title: "이번 주 하늘", sub: "이레 동안 하늘에 일어나는 일", motif: "horizon" },
  { file: "solar-return.png", eyebrow: "SOLAR RETURN", title: "솔라 리턴", sub: "생일마다 새로 그려지는 일 년의 지도", motif: "rings" },
  { file: "ephemeris.png", eyebrow: "EPHEMERIS", title: "천문력", sub: "날짜별 행성 위치, 원자료 그대로", motif: "horizon" },
  { file: "chapters.png", eyebrow: "TIME LORDS", title: "인생의 시간표", sub: "올해의 자리, 인생의 장", motif: "rings" },
];

async function render(element, file, font) {
  const res = new ImageResponse(element, {
    ...SIZE,
    fonts: [{ name: "MaruBuri", data: font, style: "normal", weight: 700 }],
  });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT, file), buf);
  return buf.length;
}

const font = await readFile(join(ROOT, "src/fonts/MaruBuri-OG.ttf"));
await mkdir(join(OUT, "sign"), { recursive: true });

let total = await render(defaultCard(), "default.png", font);
console.log(`og/default.png  ${(total / 1024).toFixed(0)}KB`);

for (const sign of ZODIAC_SIGNS) {
  const bytes = await render(signCard(sign), `sign/${sign.key}.png`, font);
  total += bytes;
  console.log(`og/sign/${sign.key}.png`.padEnd(24), `${(bytes / 1024).toFixed(0)}KB`);
}
await mkdir(join(OUT, "blog"), { recursive: true });
for (const card of PAGE_CARDS) {
  const bytes = await render(pageCard(card), card.file, font);
  total += bytes;
  console.log(`og/${card.file}`.padEnd(28), `${(bytes / 1024).toFixed(0)}KB`);
}
console.log(`\n합계 ${(total / 1024).toFixed(0)}KB / ${ZODIAC_SIGNS.length + 1 + PAGE_CARDS.length}장`);
