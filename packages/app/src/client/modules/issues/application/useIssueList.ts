import type { Issue } from "@beads-desk/bd/issue";
import { useSyncExternalStore } from "react";
import { readIssueList } from "@/client/infra/issues/issueApiClient";
import { shareWorkspaceRead } from "@/client/modules/workspace/application/shareWorkspaceRead";
import type { WorkspaceReadState } from "@/client/modules/workspace/application/useWorkspaceRead";
import { ALL_STATUSES } from "@/shared/contract/issueList";

// 이 hook을 쓰는 component가 한 화면에 여럿이어도 알림 한 번에 한 번만 읽도록 결과를 나눠 씁니다.
const issueList = shareWorkspaceRead(() => readIssueList(ALL_STATUSES));

/** 모든 상태를 담은 이슈 목록입니다. 목록 화면과 이슈 찾기 후보가 같은 목록을 나눠 씁니다. */
export function useIssueList(): WorkspaceReadState<Issue[]> {
  return useSyncExternalStore(
    issueList.subscribe,
    issueList.getSnapshot,
    issueList.getServerSnapshot,
  );
}

// 입력을 처음 쓰기 전에는 조회를 구독하지도 않습니다.
const NOT_SEARCHING: WorkspaceReadState<Issue[] | null> = {
  data: null,
  error: null,
  loading: true,
};
const subscribeNever = () => () => {};

/**
 * 이슈 찾기 입력의 후보로 모든 이슈를 읽습니다. active가 false이면 bd를 실행하지 않습니다.
 * 상세를 열 때마다 목록 전체를 읽으면 bd 실행 줄이 길어지므로, 입력을 처음 쓸 때부터 읽습니다.
 */
export function useIssueCandidates(active: boolean): WorkspaceReadState<Issue[] | null> {
  return useSyncExternalStore(
    active ? issueList.subscribe : subscribeNever,
    active ? issueList.getSnapshot : () => NOT_SEARCHING,
    issueList.getServerSnapshot,
  );
}
