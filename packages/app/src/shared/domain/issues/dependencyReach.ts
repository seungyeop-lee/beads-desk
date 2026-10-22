/**
 * start에서 next가 잇는 id로 한 칸 이상 걸어 닿는 id를 모읍니다.
 * 시작 id 자신은 둡니다. 순환이 있어도 이미 만난 id는 다시 따라가지 않습니다.
 */
export function reachableIssueIds(start: string, next: ReadonlyMap<string, string[]>): Set<string> {
  const reached = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    for (const id of next.get(pending.pop()!) ?? []) {
      if (reached.has(id)) continue;
      reached.add(id);
      pending.push(id);
    }
  }
  reached.delete(start);
  return reached;
}
