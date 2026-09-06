import { afterEach, describe, expect, it } from "vitest";
import { onceInSession } from "@/lib/once";

function fakeStorage(throwing = false) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => { if (throwing) throw new Error("denied"); return map.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (throwing) throw new Error("denied"); map.set(k, v); },
  };
}

describe("세션당 한 번", () => {
  afterEach(() => { delete (globalThis as { sessionStorage?: unknown }).sessionStorage; });

  it("처음은 true, 두 번째는 false", () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = fakeStorage();
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(true);
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(false);
  });

  it("저장소가 던지면 연출을 허용한다", () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = fakeStorage(true);
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(true);
  });

  it("저장소가 없으면(서버) true", () => {
    expect(onceInSession("byeolsaem:wheel-entrance")).toBe(true);
  });
});
