import type { Issue } from "@beads-desk/bd/issue";
import { readIssueList } from "@/client/infra/issues/issueApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { ALL_STATUSES, type IssueListFilter } from "@/shared/contract/issueList";

/**
 * 이슈 찾기 입력의 후보로 모든 이슈를 읽습니다. active가 false이면 bd를 실행하지 않습니다.
 * 상세를 열 때마다 목록 전체를 읽으면 bd 실행 줄이 길어지므로, 입력을 처음 쓸 때부터 읽습니다.
 */
export function useIssueCandidates(active: boolean): WorkspaceReadState<Issue[] | null> {
  return useWorkspaceRead(active ? ALL_STATUSES : null, readCandidates);
}

function readCandidates(filter: IssueListFilter | null): Promise<ApiResponse<Issue[] | null>> {
  return filter ? readIssueList(filter) : Promise.resolve({ ok: true, data: null });
}
