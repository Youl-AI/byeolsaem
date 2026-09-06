/**
 * 이 탭에서 처음인가. 등장 연출을 세션당 한 번만 돌리는 데 쓴다.
 *
 * 결과 화면은 하루에 여러 번 열 수 있다. 두 번째부터 다시 그려지는 등장은
 * 연출이 아니라 지연이다. 그래서 첫 방문에만 돌고, 그 뒤는 완성 상태로 뜬다.
 *
 * sessionStorage인 이유는 signMorph.ts와 같다 — 탭 안에서만 유효해야 한다.
 * 저장소 접근이 던지는 환경(사파리 프라이빗 등)에서는 표식을 못 남기니
 * 매번 처음으로 본다. 연출이 한 번 더 도는 쪽이 아예 안 도는 쪽보다 낫다.
 */
export function onceInSession(key: string): boolean {
  try {
    if (typeof sessionStorage === "undefined") return true;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}
