import type { Issue } from "@beads-desk/bd/issue";
import { readIssueList } from "@/client/infra/issues/issueListClient";
import { subscribeWorkspaceInvalidation } from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { IssueListFilter } from "@/shared/contract/issueList";

/**
 * filter의 이슈 목록을 읽어 onResult로 넘기고, workspace가 바뀔 때마다 다시 읽습니다.
 * 나중에 보낸 요청보다 늦게 도착한 이전 응답은 버립니다. 돌려준 함수를 호출하면 멈춥니다.
 */
export function watchIssueList(
  filter: IssueListFilter,
  onResult: (result: ApiResponse<Issue[]>) => void,
): () => void {
  let latestRequest = 0;
  let stopped = false;

  const load = async () => {
    const request = ++latestRequest;
    const result = await readIssueList(filter);
    if (!stopped && request === latestRequest) onResult(result);
  };

  void load();
  const unsubscribe = subscribeWorkspaceInvalidation(() => void load());
  return () => {
    stopped = true;
    unsubscribe();
  };
}
