import type { IssueStatus } from "@beads-desk/bd/issue";
import {
  dependencyToAdd,
  type LinkedIssue,
  type RelationKind,
} from "@/client/modules/issues/domain/issueRelations";
import {
  addCommentAction,
  addDependencyAction,
  addLabelAction,
  closeAsReplacedAction,
  closeIssueAction,
  deferIssueAction,
  deleteIssueAction,
  removeDependencyAction,
  removeLabelAction,
  setIssueStatusAction,
  updateIssueAction,
} from "@/server/web/issues/issueActions";
import type {
  DeferUntil,
  IssueChanges,
  Replacement,
  UnblockedIssue,
} from "@/shared/contract/issueActions";
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

/** 대체·중복으로 닫을 때 화면이 사용자에게 묻고 알리는 방법입니다. */
export type CloseAsReplacedPrompts = {
  /** 닫기 전에 물어봅니다. 취소하면 false입니다. */
  confirm: (replacement: Replacement, issueId: string, targetId: string) => boolean;
  /** 닫은 뒤에 알립니다. 쓰기가 실패하면 부르지 않습니다. */
  announce: (replacement: Replacement, issueId: string, targetId: string) => void;
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
    let result = await writes.run((workspace) =>
      closeIssueAction(workspace, issueId, reason, false),
    );
    if (!result.ok && "closeBlocked" in result) {
      writes.dismissError();
      if (!prompts.confirmForce(result.error.split("\n")[0])) return false;
      result = await writes.run((workspace) => closeIssueAction(workspace, issueId, reason, true));
    }
    if (result.ok && result.data.length > 0) prompts.announceUnblocked(result.data);
    return result.ok;
  };

  const defer = async (prompts: StatusPrompts) => {
    const deferral = await prompts.askDeferral(issueId);
    if (deferral === null) return false;
    const { until, reason } = deferral;
    return (await writes.run((workspace) => deferIssueAction(workspace, issueId, until, reason)))
      .ok;
  };

  /** 대체·중복으로 닫기는 확인을 받은 뒤에 닫고, 성공하면 안내합니다. */
  const closeAsReplaced = async (
    replacement: Replacement,
    targetId: string,
    prompts: CloseAsReplacedPrompts,
  ) => {
    if (!prompts.confirm(replacement, issueId, targetId)) return false;
    const result = await writes.run((workspace) =>
      closeAsReplacedAction(workspace, issueId, replacement, targetId),
    );
    if (result.ok) prompts.announce(replacement, issueId, targetId);
    return result.ok;
  };

  /** 고른 관계의 방향을 domain이 정하는 대로 연결하고, 성공하면 안내합니다. */
  const addRelation = async (kind: RelationKind, otherId: string, announce: () => void) => {
    const dependency = dependencyToAdd(kind, issueId, otherId);
    const result = await writes.run((workspace) =>
      addDependencyAction(workspace, dependency.issueId, dependency.dependsOnId, dependency.type),
    );
    if (result.ok) announce();
    return result.ok;
  };

  /** 연결 끊기는 확인을 받은 뒤에, 이 이슈가 선행이면 앞의 id를, 후속이면 뒤의 id를 끊습니다. */
  const removeDependency = async (linked: LinkedIssue, confirm: () => boolean) => {
    if (!confirm()) return false;
    const { side, link } = linked;
    return (
      await writes.run((workspace) =>
        side === "dependencies"
          ? removeDependencyAction(workspace, issueId, link.id)
          : removeDependencyAction(workspace, link.id, issueId),
      )
    ).ok;
  };

  /** 지우기는 확인을 받은 뒤에 지우고, 성공하면 화면이 넘긴 일을 합니다. */
  const remove = async (confirm: () => boolean, onDeleted: () => void) => {
    if (!confirm()) return false;
    const result = await writes.run((workspace) => deleteIssueAction(workspace, issueId));
    if (result.ok) onDeleted();
    return result.ok;
  };

  return {
    update: async (changes: IssueChanges) =>
      (await writes.run((workspace) => updateIssueAction(workspace, issueId, changes))).ok,

    changeStatus: async (status: IssueStatus, prompts: StatusPrompts) => {
      if (status === "closed") return close(prompts);
      if (status === "deferred") return defer(prompts);
      return (await writes.run((workspace) => setIssueStatusAction(workspace, issueId, status))).ok;
    },

    closeAsReplaced,

    addRelation,

    removeDependency,

    remove,

    addComment: async (text: string) =>
      (await writes.run((workspace) => addCommentAction(workspace, issueId, text))).ok,

    addLabel: async (label: string) =>
      (await writes.run((workspace) => addLabelAction(workspace, issueId, label))).ok,

    removeLabel: async (label: string) => {
      await writes.run((workspace) => removeLabelAction(workspace, issueId, label));
    },
  };
}
