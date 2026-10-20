import type { EpicSummary } from "@/shared/contract/epics";

/** 에픽 화면의 묶음입니다. 닫히지 않은 모든 상태는 열린 묶음에 들어갑니다. */
export type EpicGroupKind = "open" | "closed";

export type EpicGroup = { kind: EpicGroupKind; epics: EpicSummary[] };

/**
 * 정렬한 에픽 카드를 열린 묶음과 닫힌 묶음으로 나눕니다. 묶음 안에서는 받은 순서를 그대로 두고, 에픽이 없는 묶음은 뺍니다.
 */
export function groupEpics(sorted: EpicSummary[]): EpicGroup[] {
  const groups: EpicGroup[] = [
    { kind: "open", epics: sorted.filter(({ epic }) => epic.status !== "closed") },
    { kind: "closed", epics: sorted.filter(({ epic }) => epic.status === "closed") },
  ];
  return groups.filter(({ epics }) => epics.length > 0);
}
