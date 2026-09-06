// 히어로의 달 — 채워진 원반이 아니라 "달무리(halo)"다.
// 얇은 금색 테두리 + 은은한 발광 + 안쪽 작은 동심원 하나뿐이라 배경 별하늘이
// 안쪽으로 그대로 비쳐 보인다. absolute 배치는 부모(HeroSequence의 section)를 기준으로 하고,
// id="hero-moon"은 GSAP 장면 전환이 이동 애니메이션 대상으로 참조한다.
//
// breathing이면 바깥 링이 3.4초에 한 번 숨쉰다(globals.css .hero-halo). 도착
// 장면에서만 켠다 — 의식이 시작되면 HeroSequence가 끈다.
export function Moon({ className = "", breathing = false }: { className?: string; breathing?: boolean }) {
  return (
    <div id="hero-moon" className={`pointer-events-none absolute ${className}`} aria-hidden>
      <div className="relative">
        <div
          className="hero-halo size-[260px] rounded-full border border-gold/50 md:size-[400px]"
          data-breathing={breathing ? "true" : "false"}
          style={{
            boxShadow: `0 0 90px 14px color-mix(in srgb, var(--color-gold) 16%, transparent), inset 0 0 60px color-mix(in srgb, var(--color-gold) 12%, transparent)`,
          }}
        />
        <div className="absolute inset-[18%] rounded-full border border-gold/25" />
      </div>
    </div>
  );
}
