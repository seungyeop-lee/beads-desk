import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@beads-desk/bd/issue";
import { focusDeadlines, type FocusDeadlines } from "@/client/modules/focus/domain/focusDeadlines";

/**
 * 마감 목록을 나누고, 이슈가 그대로여도 분류가 바뀌는 시각(다음 자정이나 마감 시각)에 다시 나눕니다.
 * 이슈 목록을 다 읽기 전에는 null입니다.
 */
export function useFocusDeadlines(issues: Issue[] | null): FocusDeadlines | null {
  const [now, setNow] = useState(Date.now);
  const deadlines = useMemo(() => (issues ? focusDeadlines(issues, now) : null), [issues, now]);
  const nextChange = deadlines?.nextChange ?? null;
  useEffect(() => {
    if (nextChange === null) return;
    // timer가 정한 시각보다 조금 일찍 깨어나면 분류와 nextChange가 그대로라 timer를 다시 예약하지 못하므로, 적어도 nextChange 시각으로 나눕니다.
    const timer = setTimeout(
      () => setNow(Math.max(Date.now(), nextChange)),
      nextChange - Date.now(),
    );
    return () => clearTimeout(timer);
  }, [nextChange]);
  return deadlines;
}
