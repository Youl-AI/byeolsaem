import type { Metadata } from "next";
import { Link } from "@/components/ui/Link";
import { POSTS, formatPublished, type Post } from "@/content/blog";
import { alternatesFor } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "칼럼 | 별샘",
  description:
    "점성술을 처음 읽는 사람을 위한 글. 하우스와 상승궁, 수성 역행, 달의 위상처럼 자주 묻는 것부터 차례로 다룹니다.",
  alternates: alternatesFor("/blog"),
};

/**
 * 주제 순서 — 격자가 아니라 읽는 길이다. 기초 문법부터 시작해 자기 차트로,
 * 실전으로, 올해의 하늘로 나아간다. 여기 없는 새 분류는 목록 끝에 붙는다.
 */
// 모르는 분류는 아래 ordered에서 뒤에 붙지만, 자리를 우연에 맡기지 않으려고 전부 적어 둔다.
// "점성술의 역사"를 끝에 두는 것은 의도다 — 도구를 찾아 온 사람에게 배경 읽을거리를
// 먼저 내밀지 않는다.
const CATEGORY_ORDER = [
  "점성학 기초",
  "나를 아는 법",
  "실전 점성학",
  "2026 흐름",
  "생존 가이드",
  "점성술의 역사",
];

const anchorOf = (category: string): string => category.replaceAll(" ", "-");

export default function BlogIndexPage() {
  // POSTS는 최신순 — 맨 앞이 새로 나온 글이다.
  const [featured, ...rest] = POSTS;
  const ordered = [
    ...CATEGORY_ORDER,
    ...[...new Set(rest.map((p) => p.category))].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  const groups = ordered
    .map((category) => ({ category, posts: rest.filter((p) => p.category === category) }))
    .filter((g) => g.posts.length > 0);

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-32 pt-10">
      <header className="text-center">
        <p className="font-latin text-eyebrow tracking-[0.28em] text-gold-dark">COLUMN</p>
        <h1 className="mt-4 break-keep font-display text-3xl leading-snug text-ink-text md:text-4xl">
          칼럼
        </h1>
        <p className="mx-auto mt-5 max-w-lg break-keep leading-relaxed text-ink-dim">
          별자리 하나로 설명되지 않는 것들을 하나씩 풀어 씁니다. 읽고 나서 자기
          하늘에서 확인할 수 있는 이야기만 싣습니다.
        </p>

        <div className="my-10 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-px w-8 bg-gold-dark/40" />
          <span className="size-[3px] rotate-45 bg-gold-dark/70" />
          <span className="h-px w-8 bg-gold-dark/40" />
        </div>
      </header>

      {/*
        글이 스물을 넘으면서 한 줄 목록은 끝없는 두루마리가 됐다(2026-08-28).
        새로 나온 글 한 편을 앞에 세우고, 나머지는 읽는 길 순서의 주제로 묶는다.
      */}
      <section className="mx-auto max-w-[65ch]">
        <p className="text-eyebrow tracking-[0.22em] text-gold-dark">
          새로 나온 글 · {featured.category}
        </p>
        <Link href={`/blog/${featured.slug}`} className="group mt-4 block">
          <h2 className="break-keep font-display text-2xl leading-snug text-ink-text transition-colors group-hover:text-gold-dark md:text-3xl">
            {featured.title}
          </h2>
          <p className="mt-4 break-keep leading-relaxed text-ink-dim">{featured.summary}</p>
          <p className="mt-4 text-meta text-ink-dim">
            <time dateTime={featured.published}>{formatPublished(featured.published)}</time> · 읽는 데{" "}
            {featured.readingMinutes}분
          </p>
        </Link>
      </section>

      <nav
        aria-label="주제별 바로 가기"
        className="mx-auto mt-14 flex max-w-[65ch] flex-wrap gap-x-6 gap-y-2 border-y border-gold-dark/15 py-4"
      >
        {groups.map((g) => (
          <a
            key={g.category}
            href={`#${anchorOf(g.category)}`}
            className="text-meta text-ink-dim transition-colors hover:text-gold-dark"
          >
            {g.category} <span className="text-gold-dark">{g.posts.length}</span>
          </a>
        ))}
      </nav>

      {groups.map((g) => (
        <section
          key={g.category}
          id={anchorOf(g.category)}
          className="mx-auto mt-16 max-w-[65ch] scroll-mt-24"
        >
          <h2 className="flex items-baseline gap-4 break-keep font-display text-lg text-ink-text">
            {g.category}
            <span aria-hidden className="h-px flex-1 bg-gold-dark/20" />
            <span className="text-meta font-normal text-ink-dim">{g.posts.length}편</span>
          </h2>
          <ul className="mt-2">
            {g.posts.map((post) => (
              <PostRow key={post.slug} post={post} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <li className="border-t border-gold-dark/15 first:border-t-0">
      <Link href={`/blog/${post.slug}`} className="group block py-6">
        <h3 className="break-keep font-display text-lg leading-snug text-ink-text transition-colors group-hover:text-gold-dark">
          {post.title}
        </h3>
        <p className="mt-2 break-keep leading-relaxed text-ink-dim">{post.summary}</p>
        <p className="mt-3 text-meta text-ink-dim">
          <time dateTime={post.published}>{formatPublished(post.published)}</time> · 읽는 데{" "}
          {post.readingMinutes}분
        </p>
      </Link>
    </li>
  );
}
