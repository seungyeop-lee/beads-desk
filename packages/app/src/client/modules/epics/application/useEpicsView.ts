import { useDeferredValue, useState } from "react";
import {
  groupEpics,
  type EpicGroup,
  type EpicGroupKind,
} from "@/client/modules/epics/domain/epicGroups";
import {
  epicExpanded,
  groupExpanded,
  noSearchToggles,
  searchEpics,
  settleExpandedEpics,
  sortEpics,
  toggled,
  topLevelEpics,
  type EpicSearch,
  type SearchToggles,
} from "@/client/modules/epics/domain/epicsView";
import type { EpicSummary } from "@/shared/contract/epics";
import { useEpics } from "./useEpics";

/** 검색하지 않을 때는 펼칠 하위 에픽이 없음을 나타내는 빈 모음입니다. */
const NOTHING_REVEALED: ReadonlySet<string> = new Set();

/**
 * 에픽 화면이 보일 목록과 펼침 상태를 다룹니다. 열린 에픽과 닫힌 에픽을 묶음으로 나누고, 처음에는 닫힌 묶음만 접어 둡니다.
 * 검색하는 동안에는 맞은 에픽만 보이고, 묶음과 맞은 하위 에픽이 속한 카드를 펼칩니다. 이때 접고 편 것은 그 검색어에서만 유지하므로,
 * 검색어를 지우면 사용자가 검색 전에 정해 둔 펼침 상태로 돌아갑니다.
 */
export function useEpicsView(): {
  search: string;
  setSearch: (search: string) => void;
  error: string | null;
  loading: boolean;
  /** 검색어로 좁힌 카드 에픽입니다. 읽기 전에는 null입니다. */
  cards: EpicSummary[] | null;
  /** 카드 에픽을 묶음으로 나눈 것입니다. 카드가 없으면 빈 목록입니다. */
  groups: EpicGroup[];
  /** 워크스페이스에 카드로 보일 에픽이 하나도 없으면 true입니다. */
  empty: boolean;
  /** 검색 중인데 맞은 에픽이 없으면 true입니다. */
  noMatches: boolean;
  /** 검색어에 맞은 하위 에픽이 보이도록 펼칠 에픽의 id입니다. */
  revealed: ReadonlySet<string>;
  epicExpanded: (epicId: string) => boolean;
  groupExpanded: (kind: EpicGroupKind) => boolean;
  toggle: (epicId: string) => void;
  toggleGroup: (kind: EpicGroupKind) => void;
} {
  const { data, error, loading } = useEpics();
  const [expanded, setExpanded] = useState<ReadonlySet<string> | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<EpicGroupKind>>(
    new Set(["closed"]),
  );
  const [search, setSearch] = useState("");
  // 에픽이 많으면 카드를 다시 그리는 데 시간이 걸려, 검색어 입력이 먼저 보이도록 목록은 늦춰 갱신합니다.
  const deferredSearch = useDeferredValue(search);
  const [searchToggles, setSearchToggles] = useState<SearchToggles>(noSearchToggles(""));
  const sorted = data ? sortEpics(topLevelEpics(data)) : null;
  const settled = sorted ? settleExpandedEpics(sorted, expanded) : expanded;
  if (settled !== expanded) setExpanded(settled);
  const open = settled ?? new Set<string>();
  const found: EpicSearch | null = data ? searchEpics(data, deferredSearch) : null;
  const cards = found ? (sorted?.filter(({ epic }) => found.cards.has(epic.id)) ?? null) : sorted;
  const groups = cards ? groupEpics(cards) : [];
  const toggles =
    searchToggles.query === deferredSearch ? searchToggles : noSearchToggles(deferredSearch);
  return {
    search,
    setSearch,
    error,
    loading,
    cards,
    groups,
    empty: sorted?.length === 0,
    noMatches: found !== null && cards?.length === 0,
    revealed: found?.expand ?? NOTHING_REVEALED,
    epicExpanded: (epicId) => epicExpanded(found, open, toggles, epicId),
    groupExpanded: (kind) => groupExpanded(found, toggles, collapsedGroups, kind),
    toggle: (epicId) => {
      if (found) setSearchToggles({ ...toggles, epics: toggled(toggles.epics, epicId) });
      else setExpanded(toggled(open, epicId));
    },
    toggleGroup: (kind) => {
      if (found) setSearchToggles({ ...toggles, groups: toggled(toggles.groups, kind) });
      else setCollapsedGroups(toggled(collapsedGroups, kind));
    },
  };
}
