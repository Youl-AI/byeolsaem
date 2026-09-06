import { compositeChart } from "@/lib/composite";
import type { Chart } from "@/lib/chart";
import {
  COMPOSITE_INTRO,
  composeCompositeReading,
  type CompositeAxis,
} from "./composite-reading";

/** 궁합 결과의 세 번째 섹션 — 관계 자체의 차트. 서버에서도 그려진다(예시 포함). */
export function CompositeSection({ mine, theirs, id }: { mine: Chart; theirs: Chart; id?: string }) {
  const reading = composeCompositeReading(compositeChart(mine, theirs));
  return (
    <section id={id} className="mt-16 scroll-mt-32">
      <h2 className="mb-4 flex items-center gap-4 break-keep font-display text-xl text-starlight">
        우리 사이에 생긴 세 번째 하늘
        <span aria-hidden className="h-px flex-1 bg-gold/25" />
      </h2>
      <p className="max-w-[56ch] break-keep text-guide text-starlight-dim">{COMPOSITE_INTRO}</p>
      <Axis axis={reading.sun} />
      <Axis axis={reading.moon} />
      <Axis axis={reading.venus} />
    </section>
  );
}

function Axis({ axis }: { axis: CompositeAxis }) {
  return (
    <div className="mt-10">
      <h3 className="break-keep font-display text-lg text-starlight">{axis.title}</h3>
      <p className="mt-1.5 max-w-[56ch] break-keep text-meta text-gold-soft">{axis.frame}</p>
      <p className="mt-2.5 max-w-[62ch] break-keep leading-relaxed text-starlight-dim">{axis.body}</p>
    </div>
  );
}
