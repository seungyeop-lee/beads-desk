/**
 * instrumentation과 route handler는 같은 module을 서로 다른 사본으로 불러옵니다.
 * module 변수로는 상태를 공유할 수 없으므로 process 전역에 상태를 두고, 처음 접근할 때 init이 값을 만듭니다.
 */
export function globalState<T>(key: symbol, init: () => T): T {
  const holder = globalThis as Record<symbol, T | undefined>;
  return (holder[key] ??= init());
}
