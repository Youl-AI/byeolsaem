"""
별샘 백엔드(FastAPI)의 /analyze 엔드포인트 응답 시간을 잰다.

이 엔드포인트는 구 사이트(Star Sync)가 쓰던 경로다. 리뉴얼된 byeolsaem.com은
차트를 브라우저에서 계산하므로 이 백엔드를 호출하지 않는다. 스크립트를 남겨 둔
이유는 두 가지다 — 백엔드가 살아 있는지 확인할 수단이고, 이력서에 적은
"평균 응답 14.7초"가 어떻게 나온 숫자인지 보여주는 근거다.

Render 무료 플랜은 비활성 15분 뒤 인스턴스가 잠든다. 첫 요청은 서버가
깨어나는 시간까지 포함해 수십 초가 걸리므로, 그 값을 평균에 넣으면
숫자가 완전히 왜곡된다. 이 스크립트는 콜드 스타트를 따로 재서 버리고,
웜 상태에서만 통계를 낸다.

입력은 매번 다르게 만든다. 같은 도시를 반복하면 Kerykeion 의 geonames
캐시에 걸려 좌표 변환 단계가 빨라지기 때문이다.

사용법
    python measure_latency.py              # 웜 20회
    python measure_latency.py -n 30        # 횟수 지정
    python measure_latency.py --no-warmup  # 이미 깨어 있을 때

주의: 1회당 Gemini API 가 1번 호출된다. 무료 할당량을 소모하므로
      필요 이상으로 크게 돌리지 말 것.
"""

import argparse
import json
import random
import statistics as st
import sys
import time
import urllib.error
import urllib.request

# Render 서비스 이름은 아직 star-sync 다. 대시보드에서 바꾸면 여기를 고친다.
# 예전에는 ../byeolsaem-keepalive/worker.js도 같이 고쳐야 했지만 그 워커는
# 2026-09-14에 삭제했다(HANDOFF.md의 "콜드 스타트 제거" 항목).
#
# 이 서비스는 2026-09-05부터 suspend 상태다 — 지금 이 스크립트를 돌리면 503만
# 나온다. 되살린 뒤에 쓴다.
URL = "https://star-sync.onrender.com/analyze"

CITIES = [("Seoul", "KR"), ("Busan", "KR"), ("Incheon", "KR"),
          ("Daegu", "KR"), ("Gwangju", "KR"), ("Daejeon", "KR")]
CONCERNS = ["올해 커리어 방향이 궁금합니다", "이직을 고민 중입니다",
            "새로운 도전을 앞두고 있습니다", "인간관계가 고민입니다"]


def payload(i):
    city, country = CITIES[i % len(CITIES)]
    return {
        "name": f"테스트{i:02d}",
        "year": random.randint(1985, 2003),
        "month": random.randint(1, 12),
        "day": random.randint(1, 28),
        "hour": random.randint(0, 23),
        "minute": random.choice([0, 15, 30, 45]),
        "country": country,
        "city": city,
        "concern": random.choice(CONCERNS),
        "lang": "ko",
    }


def call(body, timeout=180):
    """(경과초, 성공여부, 비고) 를 돌려준다."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        URL, data=data,
        headers={"Content-Type": "application/json",
                 "User-Agent": "byeolsaem-latency-probe"},
        method="POST")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            dt = time.perf_counter() - t0
            try:
                j = json.loads(raw)
                ok = bool(j.get("ai_message"))
                note = "" if ok else "응답에 ai_message 없음"
            except Exception:
                ok, note = False, "JSON 파싱 실패"
            return dt, ok, note
    except urllib.error.HTTPError as e:
        return time.perf_counter() - t0, False, f"HTTP {e.code}"
    except Exception as e:
        return time.perf_counter() - t0, False, f"{type(e).__name__}: {e}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", type=int, default=20, help="웜 상태 측정 횟수 (기본 20)")
    ap.add_argument("--no-warmup", action="store_true", help="콜드 스타트 단계 건너뛰기")
    ap.add_argument("--gap", type=float, default=2.0, help="요청 간 대기 초 (기본 2)")
    args = ap.parse_args()

    print(f"대상: {URL}")
    print(f"Gemini API 를 {args.n + (0 if args.no_warmup else 1)}회 호출합니다.\n")

    cold = None
    if not args.no_warmup:
        print("① 서버 깨우기 (이 값은 평균에서 제외)")
        cold, ok, note = call(payload(0))
        print(f"   콜드 스타트: {cold:.2f}초  {'성공' if ok else '실패 - ' + note}")
        if not ok:
            print("   ⚠️ 첫 요청이 실패했습니다. 서비스 상태를 먼저 확인하세요.")
        print("   30초 대기 후 측정 시작…\n")
        time.sleep(30)

    print(f"② 웜 상태 {args.n}회 측정")
    times, fails = [], []
    for i in range(1, args.n + 1):
        dt, ok, note = call(payload(i))
        if ok:
            times.append(dt)
            print(f"   {i:>3}/{args.n}  {dt:6.2f}초")
        else:
            fails.append(note)
            print(f"   {i:>3}/{args.n}  실패 - {note}")
        if i < args.n:
            time.sleep(args.gap)

    if not times:
        print("\n❌ 성공한 요청이 없습니다. 서비스가 내려갔거나 API 키 문제일 수 있습니다.")
        sys.exit(1)

    times.sort()
    p95 = times[min(len(times) - 1, int(len(times) * 0.95))]

    print("\n" + "=" * 46)
    print(f"  성공        {len(times)}/{args.n}회")
    if cold is not None:
        print(f"  콜드 스타트  {cold:.2f}초  (참고용, 평균 제외)")
    print(f"  평균        {st.mean(times):.2f}초")
    print(f"  중앙값      {st.median(times):.2f}초")
    print(f"  최소 / 최대 {min(times):.2f} / {max(times):.2f}초")
    print(f"  p95         {p95:.2f}초")
    if len(times) > 1:
        print(f"  표준편차     {st.stdev(times):.2f}초")
    print("=" * 46)
    if fails:
        print(f"  실패 사유: {set(fails)}")

    print("\n이력서에 쓸 문장:")
    print(f'  평균 응답 {st.mean(times):.1f}초 (웜 상태 {len(times)}회 측정 평균, Gemini 호출 포함)')
    if cold is not None:
        print(f"\n면접에서 콜드 스타트를 물으면: Render 무료 플랜은 15분 비활성 후")
        print(f"슬립되며, 첫 요청은 {cold:.0f}초가량 걸린다고 답하면 됩니다.")


if __name__ == "__main__":
    main()
