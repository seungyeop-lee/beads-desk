export type WaitingIssue = {
  id: string;
  status: string;
  blockedBy?: readonly string[];
};

/**
 * 이슈 id마다 대기 수를 셉니다. 대기 수는 그 이슈가 닫히면 막힘이 풀리는 쪽으로 전이적으로 영향을 받는, 닫히지 않은 이슈의 수입니다.
 * blockedBy를 거꾸로 따라가므로, 막고 있는 이슈의 범위는 bd blocked를 따릅니다. 막힌 상위 이슈의 하위 이슈도 bd blocked가 상위 이슈에 막힌 것으로 돌려주므로 함께 셉니다.
 * 목록 화면에서 유형이나 검색어로 거르기 전의 전체 목록을 넘겨야, 거른 이슈를 거쳐 이어지는 사슬도 셉니다. 대기 수가 0인 이슈는 담지 않습니다.
 */
export function waiterCounts(issues: readonly WaitingIssue[]): ReadonlyMap<string, number> {
  const waitersOf = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.status === "closed") continue;
    for (const blocker of issue.blockedBy ?? []) {
      waitersOf.set(blocker, [...(waitersOf.get(blocker) ?? []), issue.id]);
    }
  }

  const counts = new Map<string, number>();
  for (const id of waitersOf.keys()) {
    const reached = new Set<string>();
    const pending = [id];
    while (pending.length > 0) {
      for (const waiter of waitersOf.get(pending.pop()!) ?? []) {
        // 순환이 있어도 이미 센 이슈는 다시 따라가지 않습니다.
        if (reached.has(waiter)) continue;
        reached.add(waiter);
        pending.push(waiter);
      }
    }
    reached.delete(id);
    if (reached.size > 0) counts.set(id, reached.size);
  }
  return counts;
}
