import type { Issue } from "@beads-desk/bd/issue";
import { issueTree, type IssueTreeRow } from "@/client/modules/issues/domain/issueListView";
import { matchesQuery, normalizeQuery } from "@/client/modules/issues/domain/issueSearch";
import {
  byClosedDesc,
  byId,
  byNewestThenId,
  byPriority,
  statusRank,
} from "@/client/modules/issues/domain/issueSort";
import type { EpicGroupKind } from "./epicGroups";
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

/** 에픽 화면에서 검색어로 찾은 결과입니다. */
export type EpicSearch = {
  /** 검색어에 맞은 카드 에픽과, 검색어에 맞은 하위 에픽이 속한 카드 에픽의 id입니다. */
  cards: ReadonlySet<string>;
  /** 검색어에 맞은 하위 에픽이 보이도록 펼칠 에픽의 id입니다. 카드 에픽과, 하위 목록에서 그 하위 에픽을 품은 에픽이 들어갑니다. */
  expand: ReadonlySet<string>;
};

/**
 * 이슈 화면의 검색처럼 에픽의 id와 제목에서 대소문자를 가리지 않고 검색어를 찾습니다. 검색어가 비었으면 null을 돌려줍니다.
 * 하위 에픽이 맞으면 상위 에픽을 따라 올라가 그 하위 에픽이 속한 카드 에픽을 고르고, 지나온 상위 에픽을 모두 펼칠 대상으로 둡니다.
 *
 * @param epics 워크스페이스의 모든 에픽입니다. topLevelEpics에 넘기는 목록과 같아야 카드 에픽이 같게 정해집니다.
 */
export function searchEpics(epics: EpicSummary[], query: string): EpicSearch | null {
  const search = normalizeQuery(query);
  if (search === "") return null;
  const epicsById = new Map(epics.map(({ epic }) => [epic.id, epic]));
  const parentEpic = (epic: Issue) =>
    epic.parent === null ? undefined : epicsById.get(epic.parent);
  const cards = new Set<string>();
  const expand = new Set<string>();
  for (const { epic } of epics) {
    if (!matchesQuery(epic, search)) continue;
    let card = epic;
    // 상위 관계가 순환하는 데이터를 받아도 멈추도록, 이미 지나온 에픽에 다시 닿으면 올라가지 않습니다.
    const visited = new Set([epic.id]);
    for (
      let parent = parentEpic(epic);
      parent && !visited.has(parent.id);
      parent = parentEpic(parent)
    ) {
      visited.add(parent.id);
      expand.add(parent.id);
      card = parent;
    }
    cards.add(card.id);
  }
  return { cards, expand };
}

/**
 * 상태로 묶어 진행 중 → 열림 → 막힘 → 보류 → 닫힘 순으로 보입니다.
 * 닫히지 않은 묶음 안에서는 우선순위가 높은 에픽을, 우선순위가 같으면 최근에 만든 에픽을 앞에 둡니다.
 * 닫힌 묶음 안에서는 최근에 닫은 에픽을 앞에 둡니다.
 */
export function sortEpics(epics: EpicSummary[]): EpicSummary[] {
  return [...epics].sort(
    ({ epic: a }, { epic: b }) =>
      statusRank(a.status, STATUS_ORDER) - statusRank(b.status, STATUS_ORDER) ||
      (a.status === "closed" ? byClosedDesc(a, b) : byPriorityThenNewest(a, b)),
  );
}

function byPriorityThenNewest(a: Issue, b: Issue): number {
  return byPriority(a, b) || byNewestThenId(a, b);
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

/** 검색하는 동안 사용자가 접거나 편 에픽 카드와 묶음입니다. query가 지금 검색어와 다르면 무시합니다. */
export type SearchToggles = {
  query: string;
  epics: ReadonlySet<string>;
  groups: ReadonlySet<EpicGroupKind>;
};

/** 검색어를 바꾸면 접고 편 것을 초기화합니다. 검색어마다 토글을 따로 두면, 검색어를 지웠을 때 검색 전의 펼침으로 돌아갑니다. */
export function noSearchToggles(query: string): SearchToggles {
  return { query, epics: new Set(), groups: new Set() };
}

/** 모음에서 값을 빼거나, 없으면 넣습니다. */
export function toggled<T>(values: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(values);
  if (!next.delete(value)) next.add(value);
  return next;
}

/**
 * 에픽 카드가 펼쳐 보이는지 정합니다.
 * 검색하는 동안에는 검색어가 펼칼 카드와 사용자가 접은 카드를 반전(XOR)해 정하고, 그렇지 않으면 사용자가 펼쳐 둔 카드를 그대로 둡니다.
 */
export function epicExpanded(
  found: EpicSearch | null,
  open: ReadonlySet<string>,
  toggles: SearchToggles,
  epicId: string,
): boolean {
  return found
    ? (open.has(epicId) || found.expand.has(epicId)) !== toggles.epics.has(epicId)
    : open.has(epicId);
}

/** 묶음이 펼쳐 보이는지 정합니다. 검색하는 동안에는 맞은 카드가 있는 묶음을 모두 펼치고 사용자가 접은 묶음만 접습니다. */
export function groupExpanded(
  found: EpicSearch | null,
  toggles: SearchToggles,
  collapsedGroups: ReadonlySet<EpicGroupKind>,
  kind: EpicGroupKind,
): boolean {
  return found ? !toggles.groups.has(kind) : !collapsedGroups.has(kind);
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

/** 이슈 하나의 직접 하위 이슈 수와 그중 닫힌 수입니다. */
export type ChildProgress = { closed: number; total: number };

/**
 * 펼친 에픽의 후손 이슈마다 직접 하위 이슈 수와 닫힌 수를 셉니다. 에픽 카드의 진행률과 같은 기준입니다.
 * 하위 이슈가 없는 이슈는 담지 않습니다.
 */
export function childProgress(descendants: readonly Issue[]): ReadonlyMap<string, ChildProgress> {
  const progress = new Map<string, ChildProgress>();
  for (const { parent, status } of descendants) {
    if (parent === null) continue;
    const counted = progress.get(parent) ?? { closed: 0, total: 0 };
    progress.set(parent, {
      closed: counted.closed + (status === "closed" ? 1 : 0),
      total: counted.total + 1,
    });
  }
  return progress;
}

/** 닫힌 하위 이슈 비율을 정수로 반올림합니다. 하위 이슈가 없는 에픽은 0%로 봅니다. */
export function epicPercent(closed: number, total: number): number {
  return total === 0 ? 0 : Math.round((closed / total) * 100);
}
