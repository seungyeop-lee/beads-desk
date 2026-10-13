import { byPriorityThenCreated } from "@/client/modules/issues/domain/issueListView";
import type { EpicSummary } from "@/shared/contract/epics";

/** 지금 진행 중인 epic을 먼저 보입니다. */
const STATUS_ORDER = ["in_progress", "open", "blocked", "deferred", "closed"];

/** 상태로 묶어 진행 중 → 열림 → 막힘 → 보류 → 닫힘 순으로 보이고, 묶음 안에서는 우선순위와 만든 시각 순으로 정렬합니다. */
export function sortEpics(epics: EpicSummary[]): EpicSummary[] {
  return [...epics].sort(
    (a, b) =>
      statusRank(a.epic.status) - statusRank(b.epic.status) ||
      byPriorityThenCreated(a.epic, b.epic),
  );
}

function statusRank(status: string): number {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

/**
 * 펼쳐 둘 epic을 정합니다. 바꿀 필요가 없으면 expanded를 그대로 돌려줍니다.
 * 처음 받았거나 펼쳐 둔 epic이 모두 목록에서 사라졌으면(다른 workspace로 바꾼 경우) 정렬한 목록의 맨 위 epic만 펼칩니다.
 * 사용자가 모두 접었으면 그대로 둡니다.
 *
 * @param expanded 아직 정하지 않았으면 null입니다.
 */
export function settleExpandedEpics(
  sorted: EpicSummary[],
  expanded: ReadonlySet<string> | null,
): ReadonlySet<string> | null {
  const stale =
    expanded === null || (expanded.size > 0 && !sorted.some(({ epic }) => expanded.has(epic.id)));
  if (!stale || sorted.length === 0) return expanded;
  return new Set([sorted[0]!.epic.id]);
}
