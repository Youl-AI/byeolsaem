import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POSTS, formatPublished, getPost } from "../content/blog";
import { buildRss, toRfc822 } from "../lib/rss";

const CONTENT_DIR = join(process.cwd(), "src/content/blog");

describe("칼럼 목록", () => {
  it("주소가 겹치지 않는다", () => {
    const slugs = POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("주소에 슬래시나 공백이 없다", () => {
    for (const post of POSTS) {
      expect(post.slug, post.title).not.toMatch(/[/\s?#]/);
    }
  });

  it("최신 글이 앞에 온다", () => {
    for (let i = 1; i < POSTS.length; i += 1) {
      expect(
        POSTS[i - 1].published >= POSTS[i].published,
        `${POSTS[i - 1].slug}가 ${POSTS[i].slug}보다 뒤에 나온다`,
      ).toBe(true);
    }
  });

  it("발행일이 YYYY-MM-DD다", () => {
    for (const post of POSTS) {
      expect(post.published, post.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(post.published)), post.slug).toBe(false);
    }
  });

  /**
   * 요약은 목록에도 나가고 검색 결과의 설명으로도 나간다. 너무 짧으면 클릭할
   * 이유가 없고, 너무 길면 검색 결과에서 잘린다.
   */
  it("요약이 검색 결과에 실릴 만한 길이다", () => {
    for (const post of POSTS) {
      expect(post.summary.length, post.slug).toBeGreaterThan(40);
      expect(post.summary.length, post.slug).toBeLessThan(160);
      expect(post.title.length, post.slug).toBeLessThan(60);
    }
  });

  it("슬러그로 글을 찾는다", () => {
    expect(getPost("수성역행-생존-가이드")?.title).toContain("수성 역행");
    expect(getPost("없는-글")).toBeUndefined();
  });

  it("발행일을 사람이 읽는 형태로 적는다", () => {
    expect(formatPublished("2026-03-14")).toBe("2026. 3. 14");
  });
});

describe("칼럼 본문", () => {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  it("목록에 걸리지 않은 본문 파일이 남아 있지 않다", () => {
    // 파일만 만들고 목록에 올리지 않으면 아무 데서도 닿을 수 없는 글이 된다.
    expect(files.length).toBe(POSTS.length);
  });

  it("모든 본문이 실려 있고 분량이 있다", () => {
    for (const file of files) {
      const body = readFileSync(join(CONTENT_DIR, file), "utf8");
      expect(body.replace(/\s/g, "").length, file).toBeGreaterThan(700);
      expect(body, file).toContain("## ");
    }
  });

  /**
   * `next.config.ts`의 `createMDX({})`에는 remark 플러그인이 없다. 표는
   * GFM 확장이라 파이프 문법이 문단 하나로 그대로 나온다 — 2026-09-09에
   * 발행된 글에서 실측했다(`| 부품 | 어디서 |`가 화면에 그대로).
   *
   * 고치는 방법은 둘이었고 표를 버리는 쪽을 골랐다. remark-gfm을 켜면 이미
   * 나간 서른 편의 파이프라인이 함께 바뀌는데, 그 서른 편 중 표를 쓰는 글이
   * 하나도 없어 얻는 것이 없다. 게다가 기본 화면이 390px이라 표는 가로로
   * 넘친다. 표로 적고 싶은 것은 `**굵게** — 설명` 목록이나 가운뎃점으로
   * 이은 문단으로 쓴다(`lunar-nodes.mdx`가 그 예다).
   */
  it("렌더되지 않는 마크다운 표를 쓰지 않는다", () => {
    for (const file of files) {
      const rows = readFileSync(join(CONTENT_DIR, file), "utf8")
        .split("\n")
        .filter((line) => /^\s*\|.*\|\s*$/.test(line));
      expect(rows, file).toEqual([]);
    }
  });

  /**
   * CommonMark는 닫는 `**` 바로 앞이 문장부호이고 뒤가 글자면 강조를 닫지
   * 못한다. 한국어에서는 `**'가면'**이자`처럼 아주 흔한 모양이라 그대로 두면
   * 별표가 화면에 그대로 나온다(실측). 그런 자리는 <strong>으로 쓴다.
   */
  it("한국어 조사에 막혀 열린 채로 끝나는 강조가 없다", () => {
    for (const file of files) {
      const body = readFileSync(join(CONTENT_DIR, file), "utf8");
      const broken = [...body.matchAll(/\*\*(.+?)\*\*(.)/g)].filter(
        ([, inner, after]) => /['"’”)\]}.,!?-]$/.test(inner) && /[\p{L}\p{N}]/u.test(after),
      );
      expect(broken.map((m) => m[0]), file).toEqual([]);
    }
  });
});

describe("칼럼 RSS", () => {
  const xml = buildRss(POSTS);

  it("RFC 822 날짜로 적는다", () => {
    // 2026-03-15는 일요일. 한국 시간 자정으로 적어야 목록의 날짜와 어긋나지 않는다.
    expect(toRfc822("2026-03-15")).toBe("Sun, 15 Mar 2026 00:00:00 +0900");
    expect(toRfc822("2026-03-11")).toBe("Wed, 11 Mar 2026 00:00:00 +0900");
  });

  it("글이 모두 실리고 최신이 앞에 온다", () => {
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1).map((m) => m[1]);
    expect(titles.length).toBe(POSTS.length);
    const dates = [...xml.matchAll(/<pubDate>(.*?)<\/pubDate>/g)].map((m) => Date.parse(m[1]));
    // lastBuildDate가 첫 항목이므로 그 뒤부터가 글이다.
    const posts = dates.slice(1);
    for (let i = 1; i < posts.length; i += 1) {
      expect(posts[i - 1] >= posts[i]).toBe(true);
    }
  });

  it("한글 주소를 인코딩해 싣는다", () => {
    for (const post of POSTS) {
      expect(xml).toContain(`https://byeolsaem.com/blog/${encodeURIComponent(post.slug)}`);
    }
    // 날것의 한글이 링크에 남아 있으면 수집기가 주소를 잘못 읽는다.
    expect(xml).not.toMatch(/<link>[^<]*[가-힣][^<]*<\/link>/);
  });

  it("XML에서 뜻을 갖는 글자를 이스케이프한다", () => {
    const escaped = buildRss([
      { ...POSTS[0], title: "a & b < c", summary: 'he said "x" & \'y\'' },
    ]);
    expect(escaped).toContain("a &amp; b &lt; c");
    expect(escaped).toContain("&quot;x&quot; &amp; &apos;y&apos;");
    // 이스케이프가 빠지면 파서가 여기서 멈춘다.
    expect(escaped).not.toMatch(/<title>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it("빌드마다 값이 달라지지 않는다", () => {
    expect(buildRss(POSTS)).toBe(buildRss(POSTS));
  });
});
