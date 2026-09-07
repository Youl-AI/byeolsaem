"use client";
import { useId, useState } from "react";
import { GLOSSARY, type TermName } from "@/content/atoms/glossary";

/**
 * 점성술 용어에 붙이는 한 줄 정의.
 *
 * 검색으로 들어오는 사람 대부분은 이 어휘를 모른다. 그렇다고 새 창을 열면 읽던
 * 흐름이 끊기고, 본문에 괄호로 풀어 쓰면 아는 사람에게는 같은 설명이 계속
 * 걸리적거린다. 그래서 눌러야 펼쳐지는 형태로 둔다 — 모르는 사람만 한 번 열고,
 * 아는 사람은 그냥 지나간다(RENEWAL_PLAN §11.3).
 *
 * 점선 밑줄은 "눌러 볼 수 있다"는 표시다. 실선 밑줄은 이 사이트에서 링크의
 * 표시이므로 쓰지 않는다 — 눌렀는데 페이지가 바뀌지 않으면 그것도 배신이다.
 */
export function Term({ name }: { name: TermName }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const definition = GLOSSARY[name];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        // border-b는 줄간격이 넓은 문단에서 글자보다 한참 아래에 그어졌다
        // (2026-08-28). text-decoration은 줄간격과 무관하게 글자를 따라간다.
        className={`underline decoration-dashed decoration-1 underline-offset-4 transition-colors ${
          open ? "decoration-gold-soft text-gold-soft" : "decoration-gold/50 text-starlight hover:text-gold-soft"
        }`}
      >
        {name}
      </button>
      {/* 정의는 줄 사이에 끼우지 않고 아래로 내린다. 문장 가운데에 상자가 들어가면
          뒤따르는 조사가 밀려나 "상승궁 [정의] 은 남들이 처음 보는" 처럼 읽힌다.
          span에 block을 주는 것은 p·li 안에서도 유효하다. */}
      {/* 닫혀 있어도 DOM에 남는다 — 높이를 전환하려면 잴 것이 있어야 한다.
          대신 aria-hidden으로 접근성 트리에서는 빼 둔다. */}
      <span className="term-def" data-open={String(open)} aria-hidden={!open}>
        <span>
          <span
            id={id}
            className="mt-1.5 block border-l border-gold/40 pl-3 text-meta text-starlight-dim"
          >
            {definition}
          </span>
        </span>
      </span>
    </>
  );
}
