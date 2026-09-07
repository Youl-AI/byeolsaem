"use client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/ui/Link";
import { computeChart } from "@/lib/chart";
import { coordinatesFor, koreaOffsetHours } from "@/lib/coordinates";
import { eventDescription, eventHref, eventTitle } from "@/lib/calendar-copy";
import { kstParts } from "@/lib/retrograde-clock";
import { requestRitual } from "@/lib/ritual";
import { kstWeekStart, weeklyData, weeklyPersonal, type WeeklyData, type WeeklyTouch } from "@/lib/weekly-reading";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { WeekPath } from "./WeekPath";

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 트랜싯 한 줄 + 눌러 펼치는 풀이. 천궁도 별 사전의 아코디언과 같은 몸짓. */
function TouchRow({
  touch,
  open,
  onToggle,
}: {
  touch: WeeklyTouch;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-t border-gold/10 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-baseline gap-x-2.5 py-2 text-left"
      >
        <span
          aria-hidden
          className={`flex-none text-meta text-gold transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
        <span className="break-keep text-guide text-starlight-dim">{touch.text}</span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-[48ch] break-keep pb-4 pl-6 text-meta leading-relaxed text-starlight-dim">
            {touch.detail}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * 이번 주 카드. 서버 HTML은 빌드 시점의 주를 담고(크롤러가 본문을 본다),
 * 마운트 후 방문자의 "지금"으로 다시 계산한다 — 주가 바뀌어 있으면 새 주가 뜬다.
 */
export function WeeklyCard({ initial, builtAt }: { initial: WeeklyData; builtAt: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const { profile, ready } = useBirthProfile();

  const data = useMemo(() => (now ? weeklyData(now) : initial), [now, initial]);
  /** "내 차트에는"에서 지금 펼쳐진 줄. 천궁도의 별 사전과 같은 아코디언 문법. */
  const [openTouch, setOpenTouch] = useState<string | null>(null);

  const touches = useMemo(() => {
    if (!profile) return null;
    const coordinates = coordinatesFor(profile.city);
    if (!coordinates) return null;
    const natal = computeChart({
      date: profile.date,
      time: profile.time,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezoneOffsetHours: koreaOffsetHours(profile.date, profile.time),
    });
    return weeklyPersonal(kstWeekStart(now ?? new Date(builtAt)), natal);
  }, [profile, now, builtAt]);

  const start = kstParts(data.weekStart);
  const endDate = new Date(Date.parse(data.weekStart) + 6 * 86400000 + 9 * 3600000);

  return (
    <section className="border border-gold/20 bg-ink-raised/60 px-7 py-9 md:px-10">
      <p className="text-meta tracking-[0.12em] text-gold-soft">
        {start.month}월 {start.day}일 – {endDate.getUTCMonth() + 1}월 {endDate.getUTCDate()}일
      </p>
      <h2 className="mt-3 break-keep font-display text-2xl text-starlight">{data.headline}</h2>
      <p className="mt-3 max-w-[52ch] break-keep text-guide text-starlight-dim">{data.summary}</p>

      <div className="mt-8">
        <WeekPath
          weekStart={data.weekStart}
          events={data.events}
          touches={touches}
          now={now}
        />
      </div>

      <ul className="mt-8 border-t border-gold/10">
        {data.events.length === 0 && (
          <li className="py-5 text-guide text-starlight-dim">
            일곱 날 모두 큰 이동이 없습니다. 이런 주는 벌여 둔 것을 마저 하는 주입니다.
          </li>
        )}
        {data.events.map((ev) => {
          const p = kstParts(ev.date);
          const dow = DOW_KO[new Date(Date.parse(ev.date) + 9 * 3600000).getUTCDay()];
          const href = eventHref(ev);
          return (
            <li key={ev.kind + ev.date} className="flex gap-5 border-b border-gold/10 py-4 last:border-b-0">
              <span className="w-20 flex-none pt-0.5">
                <span className="text-sm text-gold-soft">{dow}요일</span>
                <span className="block text-meta text-starlight-dim">{p.month}/{p.day}</span>
              </span>
              <div>
                <p className="text-starlight">{eventTitle(ev)}</p>
                <p className="mt-0.5 max-w-[44ch] break-keep text-meta leading-relaxed text-starlight-dim">
                  {eventDescription(ev)}
                  {href && (
                    <>
                      {" "}
                      <Link href={href} className="text-gold-soft hover:text-starlight">자세히 →</Link>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 border-l-2 border-gold pl-5">
        {ready && !profile && (
          <p className="break-keep text-guide text-starlight-dim">
            태어난 순간을 넣어 두면, 이 주의 이동이 당신의 별과 닿는 각도가 여기에 덧붙습니다.{" "}
            <button
              type="button"
              onClick={() => requestRitual()}
              className="border-b border-gold/40 pb-px text-gold-soft transition-colors hover:text-starlight"
            >
              내 밤하늘 만들기
            </button>
          </p>
        )}
        {profile && touches && touches.length > 0 && (
          <>
            <p className="font-display text-lg text-gold-soft">내 차트에는</p>
            <p className="mt-1 text-meta text-starlight-dim">눌러서 펼치기 — 그 각이 무슨 뜻인지 풀어 두었습니다.</p>
            <ul className="mt-2">
              {touches.map((t) => (
                <TouchRow
                  key={t.text}
                  touch={t}
                  open={openTouch === t.text}
                  onToggle={() => setOpenTouch(openTouch === t.text ? null : t.text)}
                />
              ))}
            </ul>
          </>
        )}
        {profile && touches && touches.length === 0 && (
          <p className="break-keep text-guide text-starlight-dim">
            이번 주는 당신의 별에 1도 이내로 닿는 각도가 없습니다. 하늘이 조용히 지나가는 주입니다.
          </p>
        )}
        {profile && touches === null && (
          <p className="break-keep text-guide text-starlight-dim">
            &lsquo;{profile.city}&rsquo;의 좌표를 찾지 못해 내 차트와 겹쳐 볼 수 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
