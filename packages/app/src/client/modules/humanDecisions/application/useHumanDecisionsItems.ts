import { useMemo } from "react";
import type { Issue } from "@beads-desk/bd/issue";
import { useHumanGates } from "@/client/modules/humanGates/application/useHumanGates";
import {
  pendingItems,
  sortByRequestedAt,
  type PendingItem,
} from "@/client/modules/humanDecisions/domain/humanDecisionsView";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { awaitingHuman } from "@/shared/domain/issues/awaitingHuman";

/** 판단 기다림 화면이 그리는 데 필요한, 조회하고 조립한 항목입니다. */
export type HumanDecisionsItems = {
  /** 화면 순서로 늘어놓은 확인 요청과 질문입니다. */
  pending: PendingItem[];
  /** 상세 dialog가 목록의 이슈를 id로 찾는 표입니다. */
  listedIssues: ReadonlyMap<string, Issue>;
  /** 두 조회가 모두 끝났는지입니다. 한쪽만 먼저 보이면 고른 항목이 다른 쪽이 도착할 때 바뀌므로, gate 조회가 끝난 뒤(실패 포함) 함께 보입니다. */
  loaded: boolean;
  /** 중복을 뺀 조회 오류입니다. bd 실행 자체가 실패하면 두 조회가 같은 오류를 받습니다. */
  errors: string[];
  /** 어느 한쪽이라도 읽는 중인지입니다. */
  loading: boolean;
};

/** 판단 기다림 화면의 목록을 이슈 목록과 human gate 조회를 합쳐 조립합니다. */
export function useHumanDecisionsItems(): HumanDecisionsItems {
  const { data: issues, error, loading } = useIssueList();
  const { data: gates, error: gatesError, loading: gatesLoading } = useHumanGates();
  const loaded = issues !== null && (gates !== null || gatesError !== null);
  const awaiting = useMemo(
    () => sortByRequestedAt(awaitingHuman(gates ?? [], issues ?? [])),
    [gates, issues],
  );
  const pending = useMemo(() => pendingItems(awaiting), [awaiting]);
  const listedIssues = useMemo(
    () =>
      new Map(
        pending.map((item) => [item.id, item.kind === "gate" ? item.summary.gate : item.issue]),
      ),
    [pending],
  );
  const errors = useMemo(
    () =>
      [...new Set([error, gatesError])].filter((message): message is string => message !== null),
    [error, gatesError],
  );
  return { pending, listedIssues, loaded, errors, loading: loading || gatesLoading };
}
