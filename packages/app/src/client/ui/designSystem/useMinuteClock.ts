import { useSyncExternalStore } from "react";

let now = Date.now();

function subscribe(onChange: () => void): () => void {
  // 다른 화면에 있다가 돌아오면 module을 불러온 시각이 아니라 지금 시각부터 셉니다.
  now = Date.now();
  const timer = setInterval(() => {
    now = Date.now();
    onChange();
  }, 60_000);
  return () => clearInterval(timer);
}

/** 현재 시각(epoch ms)을 1분마다 새로 돌려줍니다. */
export function useMinuteClock(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}
