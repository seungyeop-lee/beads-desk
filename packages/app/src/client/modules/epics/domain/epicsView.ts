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
