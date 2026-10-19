import type { Issue } from "@beads-desk/bd/issue";
import {
  byId,
  byPriorityThenCreated,
  issueTree,
  type IssueTreeRow,
} from "@/client/modules/issues/domain/issueListView";
import type { EpicSummary } from "@/shared/contract/epics";

/** 지금 진행 중인 epic을 먼저 보입니다. */
const STATUS_ORDER = ["in_progress", "open", "blocked", "deferred", "closed"];

/**
 * 에픽 화면에 카드로 보일 에픽을 고릅니다. 상위 이슈가 에픽인 에픽은 그 상위 에픽을 펼친 하위 목록에서 보이므로,
 * 상위 에픽이 닫혀 있어도 카드로 보이지 않습니다.
 *
 * @param epics 워크스페이스의 모든 에픽입니다. 상위 이슈가 에픽인지는 이 목록에 그 이슈가 있는지로 판단합니다.
 */
export function topLevelEpics(epics: EpicSummary[]): EpicSummary[] {
  const epicIds = new Set(epics.map(({ epic }) => epic.id));
  return epics.filter(({ epic }) => epic.parent === null || !epicIds.has(epic.parent));
}

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
 * 처음 받았거나 펼쳐 둔 epic이 모두 목록에서 사라졌으면(다른 workspace로 바꾼 경우) 정렬한 목록에서 닫히지 않은 맨 위 epic만 펼칩니다.
 * 닫힌 epic의 하위 이슈는 이미 끝난 작업이라 처음부터 펼치지 않습니다. 사용자가 모두 접었으면 그대로 둡니다.
 *
 * @param expanded 아직 정하지 않았으면 null입니다.
 */
export function settleExpandedEpics(
  sorted: EpicSummary[],
  expanded: ReadonlySet<string> | null,
): ReadonlySet<string> | null {
  const stale =
    expanded === null || (expanded.size > 0 && !sorted.some(({ epic }) => expanded.has(epic.id)));
  const first = sorted.find(({ epic }) => epic.status !== "closed");
  if (!stale || !first) return expanded;
  return new Set([first.epic.id]);
}

/**
 * 에픽에 기존 이슈를 하위로 넣을 때 후보에서 뺄 이슈를 고릅니다. 에픽 자신과 이미 그 에픽에 속한 후손 이슈입니다.
 * bd는 다른 에픽과 결정도 하위로 받습니다. 에픽의 조상을 넣어 생기는 순환은 bd가 거부합니다.
 */
export function notChildCandidate(
  epicId: string,
  descendants: readonly Issue[],
): (issue: Issue) => boolean {
  const unavailable = new Set([epicId, ...descendants.map((issue) => issue.id)]);
  return (issue) => unavailable.has(issue.id);
}

/**
 * 펼친 에픽의 후손 이슈를 상태나 우선순위와 관계없이 ID 오름차순으로 정렬하고, 하위 이슈는 상위 이슈 바로 아래에 둡니다.
 * 계층 ID는 만든 순서대로 붙으므로 작업을 계획한 순서로 읽히고, 상태가 바뀌어도 행이 자리를 옮기지 않습니다.
 */
export function epicDescendantRows(descendants: readonly Issue[]): IssueTreeRow[] {
  return issueTree([...descendants].sort(byId));
}
