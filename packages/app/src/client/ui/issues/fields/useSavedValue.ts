import { useState } from "react";

type Saved<T> = { value: T; before: T };

/**
 * 저장한 값을 서버에서 다시 읽은 값이 도착할 때까지 대신 보여 줍니다.
 * 쓰기가 끝난 뒤 SSE 알림으로 다시 조회하기 전까지 이전 값이 잠깐 보이지 않게 합니다.
 * 돌려주는 값은 [보여 줄 값, 저장한 값으로 보여 주기, 원래 값으로 되돌리기]입니다.
 */
export function useSavedValue<T>(value: T): [T, (saved: T) => void, () => void] {
  const [saved, setSaved] = useState<Saved<T> | null>(null);
  const { shown, settled } = shownSavedValue(saved, value);
  if (settled) setSaved(null);
  return [shown, (next) => setSaved({ value: next, before: value }), () => setSaved(null)];
}

/**
 * 서버 값이 저장할 때 그대로면 저장한 값을 보입니다.
 * 서버 값이 바뀌었으면 저장이 반영됐거나 다른 곳에서 고친 것이므로 서버 값을 보이고, settled로 저장한 값을 버리게 합니다.
 */
export function shownSavedValue<T>(
  saved: Saved<T> | null,
  value: T,
): { shown: T; settled: boolean } {
  if (!saved) return { shown: value, settled: false };
  return Object.is(saved.before, value)
    ? { shown: saved.value, settled: false }
    : { shown: value, settled: true };
}
