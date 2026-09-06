"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { GoldButton } from "@/components/ui/GoldButton";
import { KakaoShareButton } from "@/components/ui/KakaoShareButton";
import { SaveCardButton } from "@/components/ui/SaveCardButton";
import { SignArchCard } from "@/components/ui/ArchCard";
import { TalismanChip } from "@/components/ui/TalismanChip";
import { Moon } from "./Moon";
import { RitualForm, type RitualData } from "./RitualForm";
import { SIGN_SYMBOL, getSunSign } from "@/lib/zodiac";
import { MockChart } from "./MockChart";
import { useBirthProfile } from "@/hooks/useBirthProfile";
import { clearBirthProfile, saveBirthProfile } from "@/lib/birth-profile";
import { OPEN_RITUAL_EVENT } from "@/lib/ritual";
import { signArt } from "@/lib/share-card";

gsap.registerPlugin(Flip);

export type Scene = "arrival" | "altar" | "ritual" | "complete";

// 의식 위에 걸리는 문구는 지금 묻고 있는 것을 따라간다. 도시를 고르는 중에도
// "어느 밤에 태어나셨나요?"가 그대로 떠 있으면 방금 답한 질문이 남아있는 것처럼
// 보인다. 인덱스는 RitualForm의 STEP_LABELS 순서와 같다.
const RITUAL_PROMPTS = [
  "어느 밤에 태어나셨나요?",
  "그 밤, 몇 시였나요?",
  "어느 하늘 아래였나요?",
  "무엇이 가장 궁금하신가요?",
] as const;

// 장면별 달 위치. "arrival"은 화면 우상단 모서리에 반쯤 걸쳐 잘린 비대칭 구도,
// 그 이후 장면은 중앙 상단으로 이동한다. 클래스 자체는 즉시 바뀌지만(top/left는
// 절대 애니메이션하지 않는다), startRitual()이 전환 직전 시점의 GSAP Flip으로
// 두 위치 사이를 transform 보간해 "미끄러지듯" 움직이는 것처럼 보이게 한다.
//
// 주의: 중앙 정렬을 `-translate-x-1/2 -translate-y-1/2`(Tailwind translate 유틸,
// 즉 transform 프로퍼티)로 하지 않는다. GSAP Flip도 같은 요소의 transform을
// 직접 제어하므로 두 시스템이 transform 프로퍼티를 두고 충돌하면 Flip이 캐싱한
// transform 값이 최종적으로 CSS 클래스의 translate를 덮어써 버려, 애니메이션이
// 끝나는 순간 달이 (translate 없는 위치)에서 (translate 적용된 진짜 목표 위치)로
// 순간 점프하는 버그가 생긴다(dev-browser 좌표 기록으로 실측 확인함). 달의 크기가
// 브레이크포인트별 고정값(260px/400px)이므로 음수 margin으로 동일한 중앙 정렬
// 효과를 transform 없이 낼 수 있다.
const MOON_POSITION: Record<Scene, string> = {
  arrival: "-right-[130px] -top-[110px] md:-right-[210px] md:-top-[170px]",
  altar: "left-1/2 top-[18dvh] -ml-[130px] -mt-[130px] md:-ml-[200px] md:-mt-[200px]",
  ritual: "left-1/2 top-[18dvh] -ml-[130px] -mt-[130px] md:-ml-[200px] md:-mt-[200px]",
  complete: "left-1/2 top-[18dvh] -ml-[130px] -mt-[130px] md:-ml-[200px] md:-mt-[200px]",
};

export function HeroSequence() {
  const [scene, setScene] = useState<Scene>("arrival");
  // "complete" 장면에서 목업 천궁도 드로잉이 끝났는지. 드로잉이 끝나야 그 아래
  // 목업 결과 카드가 페이드인한다.
  const [chartDrawn, setChartDrawn] = useState(false);
  // RitualForm이 알려주는 현재 단계. 위쪽 문구를 갈아끼우는 데만 쓴다.
  const [ritualStep, setRitualStep] = useState(0);
  // 이번 전환이 "다시 보기"인지. 달이 중앙으로 옮겨가는 altar 구간에서는 아직
  // scene이 "complete"가 아니라서, 이 표시가 없으면 결과를 보러 가는 길에도
  // "어느 밤에 태어나셨나요?"가 잠깐 떴다가 바뀐다.
  const [resuming, setResuming] = useState(false);
  // 방금 폼에서 받은 값. 결과 화면은 저장된 프로필을 우선 읽지만, 저장이
  // 실패하는 환경(시크릿 모드, 용량 초과)에서는 이 값이 유일한 원본이다.
  const [entered, setEntered] = useState<RitualData | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const ritualRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);
  // CTA 더블클릭/Enter 재호출로 두 번째 타임라인이 생성되는 것을 막는 재진입 가드.
  // useState가 아니라 useRef인 이유: setState는 배칭되어 같은 프레임 안의 두 번째
  // 호출 시점에 아직 반영되지 않을 수 있다. ref는 대입 즉시(동기) 값이 바뀌므로
  // 같은 이벤트 루프 틱 안에서 벌어지는 연속 클릭도 확실히 막는다.
  const isTransitioningRef = useRef(false);

  // 이미 출생 정보를 남긴 사람인지. 저장소는 클라이언트에서만 읽히므로
  // profileReady가 true가 되기 전에는 "처음 온 사람" 쪽 문구를 그린다.
  const { profile, ready: profileReady } = useBirthProfile();

  // startRitual이 도착해야 할 장면. 처음 온 사람은 입력 폼("ritual"), 이미
  // 입력을 마친 사람은 결과("complete")로 곧장 간다. GSAP context에 등록된
  // 함수는 인자 전달 방식이 문서화돼 있지 않으므로 상태를 ref로 건네준다
  // (setState는 배칭되어 같은 틱 안에서 반영이 보장되지 않는다).
  const pendingTargetRef = useRef<Scene>("ritual");
  // 진행 중인 장면. window 이벤트 리스너가 낡은 클로저로 scene을 보지 않도록
  // 별도 ref에 미러링한다.
  const sceneRef = useRef<Scene>("arrival");
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  // gsap.context는 이 컴포넌트가 만든 모든 트윈/타임라인(Flip 포함)을 추적해서
  // unmount 시 ctx.revert() 한 번으로 정리할 수 있게 해준다.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {}, sectionRef);
    ctxRef.current = ctx;

    ctx.add("startRitual", () => {
      // 재진입 가드: 이미 전환이 진행 중이면(scene이 아직 "arrival"에서 안 바뀌었어도)
      // 즉시 무시한다. scene 상태가 "altar"로 바뀌어 pointer-events-none이 걸리기까지
      // 약 150ms의 창이 있고, 그 사이의 더블클릭이나 키보드 Enter 재호출을 이 플래그가 막는다.
      if (isTransitioningRef.current) {
        return;
      }
      isTransitioningRef.current = true;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reducedMotion) {
        setScene(pendingTargetRef.current);
        isTransitioningRef.current = false;
        return;
      }

      const moonEl = document.getElementById("hero-moon");
      if (!moonEl) {
        setScene(pendingTargetRef.current);
        isTransitioningRef.current = false;
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          setScene(pendingTargetRef.current);
          isTransitioningRef.current = false;
        },
      });

      // 1) 헤드라인이 별빛처럼 위로 살짝 뜨며 흐려져 사라진다 (0.5s).
      if (headlineRef.current) {
        tl.to(
          headlineRef.current,
          {
            opacity: 0,
            y: -24,
            filter: "blur(6px)",
            duration: 0.5,
            ease: "power2.out",
          },
          0
        );
      }

      // 2) 헤드라인이 채 다 사라지기 전, 달이 중앙으로 흘러가기 시작한다.
      //    Flip.getState → (동기) DOM 반영 → Flip.from 순서를 한 프레임 안에서
      //    보장하기 위해 flushSync로 scene 전환을 강제 커밋한다. rAF/setState의
      //    비동기 배칭에 의존하면 달이 순간이동해 보일 수 있다.
      tl.call(
        () => {
          const state = Flip.getState(moonEl);
          flushSync(() => setScene("altar"));

          // 헤드라인 컨테이너가 이 순간 aria-hidden="true"로 바뀐다. 방금까지
          // 포커스를 갖고 있던 CTA 버튼(마우스 클릭이든 Enter 키 호출이든)이 그
          // 안에 그대로 남아있으면 "포커스 요소가 aria-hidden 조상 안에 있음"
          // 위반(axe aria-hidden-focus)이 발생한다. blur()만으로는 포커스가
          // body로 빠져 맥락이 끊기므로, 다음 단계에서 사용자가 답할 질문인
          // "어느 밤에 태어나셨나요?" 문구 쪽으로 포커스를 옮겨 스크린리더
          // 사용자에게도 흐름이 이어지게 한다. 이 시점은 aria-hidden이 걸리는
          // 시점과 동일한 동기 구간(flushSync 직후)이라 위반 창이 생기지 않는다.
          if (ritualRef.current) {
            ritualRef.current.focus({ preventScroll: true });
          } else {
            (document.activeElement as HTMLElement | null)?.blur();
          }

          // "어느 밤에 태어나셨나요?"는 altar 진입과 동시에 마운트되지만
          // 달이 자리 잡기 전까지는 보이지 않아야 한다.
          if (ritualRef.current) {
            gsap.set(ritualRef.current, { opacity: 0, y: 12 });
          }

          const flip = Flip.from(state, {
            duration: 1.1,
            ease: "power3.out",
          });
          // 타임라인의 일부로 편입시켜 kill()/revert() 한 번으로 함께 정리되게 한다.
          tl.add(flip, tl.time());

          // 3) 달이 자리를 잡으면 곧바로 문구가 부드럽게 나타난다.
          if (ritualRef.current) {
            tl.to(
              ritualRef.current,
              { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
              ">"
            );
          }
        },
        undefined,
        0.15
      );
    });

    return () => {
      ctx.revert();
      isTransitioningRef.current = false;
    };
  }, []);

  // 결과 화면에서는 더 이상 묻는 것이 없으므로 질문 대신 도착을 알린다.
  // 결과로 곧장 가는 중(resuming)이라면 그 도중에도 질문을 띄우지 않는다.
  const promptText =
    scene === "complete" || resuming
      ? "당신의 하늘입니다"
      : RITUAL_PROMPTS[ritualStep];

  // 입력 의식을 여는 유일한 진입점. 목표 장면을 정한 뒤 GSAP 타임라인을 깨운다.
  const openRitual = (target: Scene) => {
    pendingTargetRef.current = target;
    setResuming(target === "complete");
    ctxRef.current?.startRitual?.();
  };

  // 페이지 아래쪽 "세 개의 문"에서 올라오는 요청. 각 문이 자기만의 입력 폼을
  // 만드는 대신 이 이벤트를 쏘고, 입력은 언제나 여기 히어로에서만 받는다.
  // 이미 의식이 시작된 뒤라면 무시한다(진행 중인 흐름을 되감지 않는다).
  useEffect(() => {
    const onOpen = () => {
      if (sceneRef.current === "arrival") openRitual("ritual");
    };
    window.addEventListener(OPEN_RITUAL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_RITUAL_EVENT, onOpen);
  }, []);

  // ritual → complete 전환에서는 관심사 버튼(포커스를 갖고 있던 요소)이 통째로
  // 언마운트된다. arrival → altar 때와 달리 옮겨갈 곳을 안내해줄 GSAP 콜백이
  // 없으므로, 여기서 별도로 scene이 "complete"가 되는 순간 결과 컨테이너로
  // 포커스를 옮겨 body로 새는 것을 막는다. 결과 컨테이너 자체에는 role="status"
  // sr-only 문구를 둬 스크린리더에 완료를 알린다(아래 JSX).
  useEffect(() => {
    if (scene === "complete") {
      completeRef.current?.focus({ preventScroll: true });
    }
  }, [scene]);

  return (
    // 히어로는 두 층으로 나뉜다.
    //
    // (1) 무대(stage): 정확히 100dvh 고정. 달과 헤드라인이 이 안에서 absolute로
    //     배치된다. overflow-hidden은 "arrival"에서 달이 화면 모서리에 반쯤 잘려
    //     보이는 비대칭 구도를 만든다(MOON_POSITION 주석 참고). 높이가 절대
    //     변하지 않으므로 달의 top-[18dvh]나 헤드라인의 bottom-20이 장면 전환
    //     도중에 흔들리지 않는다.
    //
    // (2) 의식/결과: 일반 흐름(flow) 안에 있고 음수 마진으로 무대 위 52dvh
    //     지점까지 끌어올려 겹친다. absolute가 아니라 flow인 것이 핵심이다 —
    //     absolute 자식은 부모 높이에 기여하지 않아서, 예전 구조에서는 결과
    //     카드가 100dvh를 넘어가는 순간 아래 섹션(TodayTeaser)이 그 위를 덮어
    //     "다른 정보로 보기" 버튼이 클릭조차 되지 않았다(Playwright pointer
    //     intercept로 실측 확인). 이제 히어로가 자기 내용만큼 실제 높이를 갖는다.
    <section ref={sectionRef} className="relative min-h-[100dvh]" id="hero">
      <div className="relative h-[100dvh] overflow-hidden">
        {/* 헤드라인 자리의 스크림(§10-2). 글 뒤에만 깃털처럼 번지는 국소 어둠 —
            커튼과 별이 그 아래서 살짝 가라앉아 글이 뜬다. 경계가 없어 상자로
            보이지 않는다. 하이엔드 히어로의 표준 수법. */}
        <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden />
        <Moon className={MOON_POSITION[scene]} breathing={scene === "arrival"} />

        {(scene === "arrival" || scene === "altar") && (
          <div
            ref={headlineRef}
            aria-hidden={scene !== "arrival"}
            // pointer-events-none은 마우스만 막고 키보드 Tab 순서는 그대로 둔다.
            // altar 장면(노출 약 1.5s)에서 안의 GoldButton과 "오늘의 하늘" 링크가
            // 여전히 포커스 가능한 채로 aria-hidden 조상 안에 남는 axe
            // aria-hidden-focus 위반을 막기 위해 inert도 함께 건다. 위의 flushSync
            // 콜백이 이 블록을 aria-hidden/inert로 만드는 것과 같은 동기 구간에서
            // ritualRef로 포커스를 명시적으로 옮기므로(주석 참고), 포커스가 body로
            // 새는 창은 생기지 않는다.
            inert={scene !== "arrival"}
            className={`absolute bottom-20 left-6 md:bottom-24 md:left-14 ${
              scene !== "arrival" ? "pointer-events-none" : ""
            }`}
          >
            <h1 className="font-display text-3xl leading-snug text-starlight md:text-6xl">
              <span className="block whitespace-nowrap">당신이 태어난 밤,</span>
              <em className="block whitespace-nowrap not-italic text-gold-soft">
                하늘은 기억하고 있어요
              </em>
            </h1>
            <p className="mt-5 text-sm text-starlight-dim md:text-base">
              태어난 순간의 행성 배치로 읽는 나의 이야기
            </p>
            <div className="mt-8 flex items-center gap-6">
              <GoldButton
                variant="solid"
                onClick={() => openRitual(profile ? "complete" : "ritual")}
              >
                {profileReady && profile ? "내 밤하늘 다시 보기" : "나의 밤하늘 보기"}
              </GoldButton>
              {/* 보조 동선도 "별 사이" 링크로 통일한다(GoldButton outline). */}
              <GoldButton variant="outline" href="/today">
                오늘의 하늘
              </GoldButton>
            </div>
          </div>
        )}
      </div>

      {scene !== "arrival" && (
        <div
          ref={ritualRef}
          tabIndex={-1}
          // -mt-[48dvh]: 무대(100dvh) 위 52dvh 지점에서 시작하도록 끌어올린다.
          // 예전의 `absolute top-[52%]`와 같은 위치지만, 흐름 안에 남아 있어
          // 아래로 자라는 만큼 히어로 섹션의 높이도 함께 자란다.
          className="relative -mt-[48dvh] px-6 pb-24 text-center focus:outline-none"
          id="hero-ritual"
        >
          {/* key를 문구 자체로 두면 문구가 바뀔 때마다 요소가 새로 마운트되어
              CSS 애니메이션이 다시 돈다. 단계가 넘어갈 때 글자가 스르르 갈리는
              느낌을 별도 상태 없이 얻는 방법이다. */}
          <p
            key={promptText}
            className="motion-safe:animate-prompt-in font-display text-2xl text-starlight md:text-3xl"
          >
            {promptText}
          </p>

          {scene === "ritual" && (
            <div className="mt-10">
              {/* 여기가 사이트 전체에서 출생 정보를 받는 유일한 지점이다.
                  받은 즉시 저장해두면 /natal·/today·/synastry·/yearly가 각자
                  다시 묻지 않고 같은 값을 읽어 쓴다. 저장이 실패해도(시크릿
                  모드 등) 이번 세션의 결과 화면은 그대로 진행된다. */}
              <RitualForm
                onStepChange={setRitualStep}
                onComplete={(data) => {
                  setEntered(data);
                  // 히어로는 관심사까지 받으므로 null이 올 수 없다. 타입은 그것을
                  // 모르니 여기서 한 번 확인한다.
                  if (data.concern !== null) saveBirthProfile({ ...data, concern: data.concern });
                  setScene("complete");
                }}
              />
            </div>
          )}

          {scene === "complete" && (() => {
            // 결과의 원본: 저장된 프로필이 있으면 그것, 방금 입력했지만 저장이
            // 실패한 환경에서는 entered. 재방문("다시 보기") 경로는 profile이
            // 항상 있으므로 이 순서면 두 경로 모두 안전하다.
            const birth = profile ?? entered;
            const sign = getSunSign(birth?.date ?? "");
            return (
            <div
              ref={completeRef}
              tabIndex={-1}
              className="mt-10 flex flex-col items-center gap-8 focus:outline-none"
            >
              <p role="status" className="sr-only">
                천궁도 해석이 준비되었습니다
              </p>
              {/* 태양궁 성좌 — 생년월일마다 다른 실제 별자리 형태(lib/zodiac.ts). */}
              <MockChart sign={sign} onDrawn={() => setChartDrawn(true)} />
              <div
                className={`flex flex-col items-center gap-6 transition-opacity duration-700 ${
                  chartDrawn ? "opacity-100" : "opacity-0"
                }`}
                inert={!chartDrawn}
              >
                {/* 부적 이름·문구도 태양궁을 따른다. 태양궁은 날짜만으로 정해지므로
                    프런트에서 즉석 계산이 가능하다. 달 별자리는 천문력 연산이
                    필요해 백엔드가 붙기 전에는 알 수 없고, 틀린 값을 보여주느니
                    비워 둔다 — 두 번째 칩은 확실히 아는 관심사로 채운다. */}
                <SignArchCard sign={sign} />
                <div className="flex flex-wrap justify-center gap-2.5">
                  <TalismanChip symbol="☉" label={`태양 ${sign.ko}`} />
                  {birth?.concern && <TalismanChip symbol="✦" label={birth.concern} />}
                </div>
                {/* 방금 받은 카드를 그대로 들고 나가는 두 갈래 길(스펙 §6.2) —
                    이미지로 간직하거나, 말풍선에 실어 보내거나. */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  <SaveCardButton
                    filename={`byeolsaem-${sign.key}.png`}
                    spec={() => ({
                      name: sign.card,
                      latin: sign.latin,
                      range: sign.range,
                      symbol: SIGN_SYMBOL[sign.key],
                      tagline: sign.tagline,
                      art: signArt(sign),
                    })}
                  />
                  <KakaoShareButton
                    text={`나의 태양은 ${sign.ko} — ${sign.tagline}`}
                    path={`/sign/${sign.key}`}
                    imagePath={`/og/sign/${sign.key}.png`}
                  />
                </div>
                {/* 저장된 정보를 버리고 처음부터 다시 입력하는 유일한 출구.
                    잘못 입력했거나 다른 사람의 하늘을 보려는 경우를 위한 것이다.
                    한 번 눌렀다고 바로 지우지 않는다 — 이 버튼이 지우는 것은
                    사이트 전체가 쓰는 유일한 저장값이고, 실수로 눌러 놓고 알아챌
                    방법이 없다. */}
                <ForgetBirthProfile
                  onForget={() => {
                    clearBirthProfile();
                    setEntered(null);
                    setChartDrawn(false);
                    setRitualStep(0);
                    setResuming(false);
                    pendingTargetRef.current = "ritual";
                    setScene("ritual");
                  }}
                />
              </div>
            </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}

/**
 * 저장된 출생 정보를 지우기 전에 한 번 묻는다.
 *
 * 대화상자를 띄우지 않고 버튼이 그 자리에서 물음으로 바뀐다. 지울 값의 크기에
 * 맞는 무게다 — 값 하나를 지우는 데 화면을 덮는 창은 과하고, 확인 없이 지우는
 * 것은 모자란다. 자리를 옮기지 않으므로 커서도 그대로다.
 */
function ForgetBirthProfile({ onForget }: { onForget: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-meta tracking-wide text-starlight-dim underline underline-offset-4 transition-colors hover:text-starlight"
      >
        다른 정보로 보기
      </button>
    );
  }

  return (
    <div role="alert" className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2">
      <span className="break-keep text-meta text-starlight">
        저장된 출생 정보를 지우고 처음부터 다시 받을까요?
      </span>
      <button
        type="button"
        autoFocus
        onClick={onForget}
        className="text-meta tracking-wide text-gold-soft underline underline-offset-4 transition-colors hover:text-starlight"
      >
        지우기
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-meta tracking-wide text-starlight-dim underline underline-offset-4 transition-colors hover:text-starlight"
      >
        그대로 두기
      </button>
    </div>
  );
}
