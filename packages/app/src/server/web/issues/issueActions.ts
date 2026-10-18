"use server";

import {
  addComment,
  addDependency,
  addLabel,
  claimIssue,
  closeAsReplaced,
  closeIssue,
  createIssue,
  deferIssue,
  deleteIssue,
  dismissHuman,
  removeDependency,
  removeLabel,
  respondToHuman,
  setIssueStatus,
  updateIssueFields,
} from "@beads-desk/bd";
import type { IssueStatus } from "@beads-desk/bd/issue";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type {
  CloseIssueResult,
  DeferUntil,
  IssueChanges,
  LinkableDependencyType,
  NewIssueInput,
  Replacement,
} from "@/shared/contract/issueActions";
import { isIssueStatus } from "@/shared/contract/issueList";
import {
  invalidRequest,
  isDeferUntil,
  isIssueChanges,
  isLinkableDependencyType,
  isNewIssueInput,
  isReplacement,
  isString,
  write,
  writeClose,
} from "./issueActionGuards";

export async function updateIssueAction(
  issueId: string,
  changes: IssueChanges,
): Promise<ApiResponse<null>> {
  if (!isString(issueId) || !isIssueChanges(changes)) return invalidRequest();
  return write((cwd) => updateIssueFields(cwd, issueId, changes));
}

/** 닫힘은 사유를 받는 closeIssueAction으로, 보류는 기한을 받는 deferIssueAction으로 바꿉니다. 보류 기한은 지웁니다. */
export async function setIssueStatusAction(
  issueId: string,
  status: IssueStatus,
): Promise<ApiResponse<null>> {
  if (
    !isString(issueId) ||
    !isIssueStatus(status) ||
    status === "closed" ||
    status === "deferred"
  ) {
    return invalidRequest();
  }
  return write((cwd) => setIssueStatus(cwd, issueId, status));
}

/** 사유가 있으면 메모에 덧붙입니다. */
export async function deferIssueAction(issueId: string, until: DeferUntil, reason: string) {
  if (!isString(issueId) || !isDeferUntil(until) || !isString(reason)) return invalidRequest();
  return write((cwd) => deferIssue(cwd, issueId, { until, reason }));
}

/** 담당자를 bd를 실행한 사람으로 정하고 진행 중으로 바꿉니다. */
export async function claimIssueAction(issueId: string) {
  if (!isString(issueId)) return invalidRequest();
  return write((cwd) => claimIssue(cwd, issueId));
}

/** 사유가 비어 있으면 bd 기본 사유로 닫습니다. */
export async function closeIssueAction(
  issueId: string,
  reason: string,
  force: boolean,
): Promise<CloseIssueResult> {
  if (!isString(issueId) || !isString(reason) || typeof force !== "boolean") {
    return invalidRequest();
  }
  return writeClose((cwd) => closeIssue(cwd, issueId, { reason, force }));
}

/** 이슈를 닫고 대상 이슈로 대체했거나 대상 이슈의 중복이라는 관계를 남깁니다. */
export async function closeAsReplacedAction(
  issueId: string,
  replacement: Replacement,
  targetId: string,
) {
  if (!isString(issueId) || !isReplacement(replacement) || !isString(targetId)) {
    return invalidRequest();
  }
  return write((cwd) => closeAsReplaced(cwd, issueId, replacement, targetId));
}

/** 만든 이슈의 id를 돌려줍니다. */
export async function createIssueAction(input: NewIssueInput): Promise<ApiResponse<string>> {
  if (!isNewIssueInput(input)) return invalidRequest();
  const { title, issueType, priority, description, labels, parent } = input;
  return write((cwd) =>
    createIssue(cwd, {
      title,
      description,
      labels,
      ...(issueType === null ? {} : { issueType }),
      ...(priority === null ? {} : { priority }),
      ...(parent === null ? {} : { parent }),
    }),
  );
}

export async function addCommentAction(issueId: string, text: string) {
  if (!isString(issueId) || !isString(text)) return invalidRequest();
  return write((cwd) => addComment(cwd, issueId, text));
}

export async function addLabelAction(issueId: string, label: string) {
  if (!isString(issueId) || !isString(label)) return invalidRequest();
  return write((cwd) => addLabel(cwd, issueId, label));
}

export async function removeLabelAction(issueId: string, label: string) {
  if (!isString(issueId) || !isString(label)) return invalidRequest();
  return write((cwd) => removeLabel(cwd, issueId, label));
}

/** issueId가 dependsOnId에 의존하게 합니다. parent-child는 issueId가 하위 이슈입니다. */
export async function addDependencyAction(
  issueId: string,
  dependsOnId: string,
  type: LinkableDependencyType,
) {
  if (!isString(issueId) || !isString(dependsOnId) || !isLinkableDependencyType(type)) {
    return invalidRequest();
  }
  return write((cwd) => addDependency(cwd, issueId, dependsOnId, type));
}

export async function removeDependencyAction(issueId: string, dependsOnId: string) {
  if (!isString(issueId) || !isString(dependsOnId)) return invalidRequest();
  return write((cwd) => removeDependency(cwd, issueId, dependsOnId));
}

export async function deleteIssueAction(issueId: string) {
  if (!isString(issueId)) return invalidRequest();
  return write((cwd) => deleteIssue(cwd, issueId));
}

export async function respondToHumanAction(issueId: string, response: string) {
  if (!isString(issueId) || !isString(response)) return invalidRequest();
  return write((cwd) => respondToHuman(cwd, issueId, response));
}

/** 사유는 비워 둘 수 있습니다. */
export async function dismissHumanAction(issueId: string, reason: string) {
  if (!isString(issueId) || !isString(reason)) return invalidRequest();
  return write((cwd) => dismissHuman(cwd, issueId, reason));
}
