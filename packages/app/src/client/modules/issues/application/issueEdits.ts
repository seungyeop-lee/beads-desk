import type { IssueStatus } from "@beads-desk/bd/issue";
import { setIssueStatusAction, updateIssueAction } from "@/server/web/issues/issueActions";
import type { IssueChanges } from "@/shared/contract/issueActions";
import type { IssueWrites } from "./useIssueWrites";

/** 목록과 상세 화면이 함께 쓰는 이슈 수정입니다. 모두 성공하면 true를 돌려줍니다. */
export function issueEdits(writes: IssueWrites, issueId: string) {
  return {
    update: async (changes: IssueChanges) =>
      (await writes.run(() => updateIssueAction(issueId, changes))).ok,

    /**
     * 열린 하위 이슈나 닫히지 않은 선행 이슈 때문에 bd가 닫기를 거부하면,
     * bd가 알려 준 첫 줄 사유로 confirmForce에 묻고 확인하면 강제로 닫습니다.
     */
    changeStatus: async (status: IssueStatus, confirmForce: (reason: string) => boolean) => {
      let result = await writes.run(() => setIssueStatusAction(issueId, status, false));
      if (!result.ok && "closeBlocked" in result) {
        writes.dismissError();
        if (!confirmForce(result.error.split("\n")[0])) return false;
        result = await writes.run(() => setIssueStatusAction(issueId, status, true));
      }
      return result.ok;
    },
  };
}
