import { useState } from "react";

/**
 * 저장한 값을 서버에서 다시 읽은 값이 도착할 때까지 대신 보여 줍니다.
 * 쓰기가 끝난 뒤 SSE 알림으로 다시 조회하기 전까지 이전 값이 잠깐 보이지 않게 합니다.
 * 돌려주는 값은 [보여 줄 값, 저장한 값으로 보여 주기, 원래 값으로 되돌리기]입니다.
 */
export function useSavedValue<T>(value: T): [T, (saved: T) => void, () => void] {
  const [saved, setSaved] = useState<{ value: T; before: T } | null>(null);
  // 서버 값이 바뀌었으면 저장한 값이 반영됐거나 다른 곳에서 고친 것이므로 서버 값을 따릅니다.
  if (saved && !Object.is(saved.before, value)) setSaved(null);
  const shown = saved && Object.is(saved.before, value) ? saved.value : value;
  return [shown, (next) => setSaved({ value: next, before: value }), () => setSaved(null)];
}
