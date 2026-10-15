import type { IssueStatus } from "@beads-desk/bd/issue";
import {
  closeIssueAction,
  deferIssueAction,
  setIssueStatusAction,
  updateIssueAction,
} from "@/server/web/issues/issueActions";
import type { DeferUntil, IssueChanges, UnblockedIssue } from "@/shared/contract/issueActions";
import type { IssueWrites } from "./useIssueWrites";

/** 보류할 때 고른 기한과 사유입니다. 빈 사유는 남기지 않습니다. */
export type Deferral = { until: DeferUntil; reason: string };

/** 닫힘이나 보류로 바꿀 때 화면이 사용자에게 묻고 알리는 방법입니다. */
export type StatusPrompts = {
  /** 닫는 사유를 묻습니다. 취소하면 null입니다. */
  askReason: (issueId: string) => Promise<string | null>;
  /** bd가 알려 준 거부 사유를 보이고 강제로 닫을지 묻습니다. */
  confirmForce: (reason: string) => boolean;
  /** 닫아서 막힘이 풀린 이슈를 알립니다. 풀린 이슈가 없으면 부르지 않습니다. */
  announceUnblocked: (issues: UnblockedIssue[]) => void;
  /** 보류 기한과 사유를 묻습니다. 취소하면 null입니다. */
  askDeferral: (issueId: string) => Promise<Deferral | null>;
};

/** 목록과 상세 화면이 함께 쓰는 이슈 수정입니다. 모두 성공하면 true를 돌려줍니다. */
export function issueEdits(writes: IssueWrites, issueId: string) {
  /**
   * 열린 하위 이슈나 닫히지 않은 선행 이슈 때문에 bd가 닫기를 거부하면,
   * bd가 알려 준 첫 줄 사유로 confirmForce에 묻고 확인하면 같은 사유로 강제로 닫습니다.
   */
  const close = async (prompts: StatusPrompts) => {
    const reason = await prompts.askReason(issueId);
    if (reason === null) return false;
    let result = await writes.run(() => closeIssueAction(issueId, reason, false));
    if (!result.ok && "closeBlocked" in result) {
      writes.dismissError();
      if (!prompts.confirmForce(result.error.split("\n")[0])) return false;
      result = await writes.run(() => closeIssueAction(issueId, reason, true));
    }
    if (result.ok && result.data.length > 0) prompts.announceUnblocked(result.data);
    return result.ok;
  };

  const defer = async (prompts: StatusPrompts) => {
    const deferral = await prompts.askDeferral(issueId);
    if (deferral === null) return false;
    const { until, reason } = deferral;
    return (await writes.run(() => deferIssueAction(issueId, until, reason))).ok;
  };

  return {
    update: async (changes: IssueChanges) =>
      (await writes.run(() => updateIssueAction(issueId, changes))).ok,

    changeStatus: async (status: IssueStatus, prompts: StatusPrompts) => {
      if (status === "closed") return close(prompts);
      if (status === "deferred") return defer(prompts);
      return (await writes.run(() => setIssueStatusAction(issueId, status))).ok;
    },
  };
}
