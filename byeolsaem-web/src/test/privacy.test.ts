import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/(dawn)/privacy/page";

/**
 * 개인정보처리방침이 코드와 어긋나지 않게 묶는다.
 *
 * 2026-09-25에 이 테스트를 만든 이유: 방침이 "해석을 계산하는 동안에는 이 값이
 * 계산 서버로 전송된다"고 적고 있었는데, 그 백엔드는 2026-09-05에 재웠고 그 뒤로
 * 웹은 아무것도 보내지 않는다. 한 달 넘게 사실과 다른 방침이 서 있었고 아무도
 * 몰랐다 — 사람이 기억해서 맞출 일이 아니라는 뜻이다.
 *
 * 그래서 두 방향을 다 잠근다. 방침이 "보내지 않는다"고 적는 한 소스에 네트워크
 * 호출이 없어야 하고(아래 스캔), 실제로 싣는 외부 스크립트는 전부 위탁 목록에
 * 적혀 있어야 한다. 둘 중 하나가 움직이면 여기서 먼저 걸린다.
 */

const html = renderToStaticMarkup(createElement(PrivacyPage));
const text = html
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z#0-9]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, acc);
    else if (/\.tsx?$/.test(e.name) && !p.includes("test")) acc.push(p);
  }
  return acc;
}

describe("개인정보처리방침", () => {
  it("계산이 브라우저에서 끝난다고 적는다", () => {
    expect(text).toContain("브라우저 안에서 끝납니다");
    // 재워 둔 백엔드 시절의 문장. 되살아나면 방침부터 고쳐야 한다.
    //
    // 본문만 본다. 개정 이력은 지운 문장을 인용해야 무엇이 바뀌었는지 알 수 있고,
    // 그 인용까지 막으면 이력을 정직하게 쓸 수 없다.
    const body = text.split("개정 이력")[0];
    expect(body).not.toContain("계산 서버로 전송");
  });

  it("그 주장을 코드가 뒷받침한다 — 소스에 네트워크 호출이 없다", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles("src")) {
      const src = readFileSync(f, "utf8");
      // 주석은 뺀다. 이 테스트 자체를 설명하는 주석에 걸리지 않게.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
      if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket/.test(code)) {
        offenders.push(f.replace(/\\/g, "/"));
      }
    }
    expect(offenders, "네트워크 호출을 넣었다면 방침 2항을 먼저 고친다").toEqual([]);
  });

  it("실제로 싣는 외부 서비스를 전부 적는다", () => {
    for (const name of ["Cloudflare", "Google Analytics", "Google AdSense", "카카오"]) {
      expect(text, `${name}가 위탁 목록에 없다`).toContain(name);
    }
  });

  it("카카오 SDK를 쓰는 화면이 있는 한 그 항목을 지우지 못한다", () => {
    const usesKakao = sourceFiles("src").some((f) =>
      /KakaoShareButton|kakaocdn/.test(readFileSync(f, "utf8"))
    );
    expect(usesKakao).toBe(true);
    expect(text).toContain("카카오톡으로 보내기");
  });

  it("시행일을 적는다", () => {
    expect(text).toMatch(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*시행/);
  });
});
