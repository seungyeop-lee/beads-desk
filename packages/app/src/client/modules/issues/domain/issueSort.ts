import type { Issue } from "@beads-desk/bd/issue";

/** status가 order에서 몇 번째인지를 정합니다. order에 없는 status는 어느 status보다 뒤에 옵니다. */
export function statusRank(status: string, order: readonly string[]): number {
  const index = order.indexOf(status);
  return index === -1 ? order.length : index;
}

// bd에서 우선순위를 지정하지 않은 이슈는 기본값인 2(보통)로 취급합니다.
export function byPriority(a: Issue, b: Issue): number {
  return (a.priority ?? 2) - (b.priority ?? 2);
}

export function byPriorityThenCreated(a: Issue, b: Issue): number {
  return byPriority(a, b) || a.createdAt - b.createdAt || byId(a, b);
}

/** 최근에 만든 이슈를 앞에 두고, 만든 시각이 같으면 id 오름차순으로 둡니다. */
export function byNewestThenId(a: Issue, b: Issue): number {
  return b.createdAt - a.createdAt || byId(a, b);
}

export function byClosedDesc(a: Issue, b: Issue): number {
  return (b.closedAt ?? 0) - (a.closedAt ?? 0) || byId(a, b);
}

// id의 숫자 부분은 숫자로 비교해 x.2가 x.10보다 앞에 오게 합니다.
const ID_COLLATOR = new Intl.Collator("en", { numeric: true });

export function byId(a: Issue, b: Issue): number {
  return ID_COLLATOR.compare(a.id, b.id);
}
