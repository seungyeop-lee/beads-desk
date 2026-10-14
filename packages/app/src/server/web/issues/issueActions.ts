"use server";

import {
  addComment,
  addDependency,
  addLabel,
  createIssue,
  deleteIssue,
  removeDependency,
  removeLabel,
  setIssueStatus,
  updateIssueFields,
  type BdOutcome,
} from "@beads-desk/bd";
import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { checkWorkspaceChangesNow } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { serverMessages } from "@/server/web/locale/serverMessages";
import type { ApiFailure, ApiResponse } from "@/shared/contract/apiResponse";
import {
  LINKABLE_DEPENDENCY_TYPES,
  type IssueChanges,
  type LinkableDependencyType,
  type NewIssueInput,
  type StatusChangeResult,
} from "@/shared/contract/issueActions";

// Server Action은 화면을 거치지 않은 POST 요청으로도 호출되므로, TypeScript 타입과 상관없이 모든 입력을 다시 검사합니다.

const TEXT_FIELDS = new Set([
  "title",
  "description",
  "design",
  "acceptanceCriteria",
  "notes",
  "assignee",
]);

export async function updateIssueAction(
  issueId: string,
  changes: IssueChanges,
): Promise<ApiResponse<null>> {
  if (!isString(issueId) || !isIssueChanges(changes)) return invalidRequest();
  return write((cwd) => updateIssueFields(cwd, issueId, changes));
}

export async function setIssueStatusAction(
  issueId: string,
  status: IssueStatus,
  force: boolean,
): Promise<StatusChangeResult> {
  if (!isString(issueId) || !isIssueStatus(status) || typeof force !== "boolean") {
    return invalidRequest();
  }
  const cwd = currentWorkspaceRoot();
  const result = await setIssueStatus(cwd, issueId, status, { force });
  if (!result.ok && "closeBlocked" in result) {
    return { ok: false, closeBlocked: true, error: result.error.message.trim() };
  }
  return finish(cwd, result);
}

/** 만든 이슈의 id를 돌려줍니다. */
export async function createIssueAction(input: NewIssueInput): Promise<ApiResponse<string>> {
  if (!isNewIssueInput(input)) return invalidRequest();
  const { title, issueType, priority, description, labels } = input;
  return write((cwd) =>
    createIssue(cwd, {
      title,
      description,
      labels,
      ...(issueType === null ? {} : { issueType }),
      ...(priority === null ? {} : { priority }),
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

async function write<T>(run: (cwd: string) => Promise<BdOutcome<T>>): Promise<ApiResponse<T>> {
  const cwd = currentWorkspaceRoot();
  return finish(cwd, await run(cwd));
}

// 쓰기가 성공하면 다음 polling 주기를 기다리지 않고 SSE로 다른 화면과 탭에 알립니다.
async function finish<T>(cwd: string, result: BdOutcome<T>): Promise<ApiResponse<T>> {
  if (!result.ok) return { ok: false, error: result.error.message.trim() };
  await checkWorkspaceChangesNow(cwd);
  return { ok: true, data: result.value };
}

async function invalidRequest(): Promise<ApiFailure> {
  return { ok: false, error: (await serverMessages()).invalidRequest };
}

function isIssueChanges(value: unknown): value is IssueChanges {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([field, fieldValue]) =>
    field === "priority" ? isPriority(fieldValue) : TEXT_FIELDS.has(field) && isString(fieldValue),
  );
}

function isNewIssueInput(value: unknown): value is NewIssueInput {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  return (
    isString(input.title) &&
    (input.issueType === null || isString(input.issueType)) &&
    (input.priority === null || isPriority(input.priority)) &&
    isString(input.description) &&
    Array.isArray(input.labels) &&
    input.labels.every(isString)
  );
}

function isIssueStatus(value: unknown): value is IssueStatus {
  return (ISSUE_STATUSES as readonly unknown[]).includes(value);
}

function isLinkableDependencyType(value: unknown): value is LinkableDependencyType {
  return (LINKABLE_DEPENDENCY_TYPES as readonly unknown[]).includes(value);
}

function isPriority(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 4;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
