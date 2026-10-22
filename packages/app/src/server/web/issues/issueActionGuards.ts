import { ISSUE_TEXT_FIELDS, type IssueTextField } from "@beads-desk/bd";
import { serverMessages } from "@/server/web/locale/serverMessages";
import type { ApiFailure } from "@/shared/contract/apiResponse";
import {
  DEFER_PERIODS,
  LINKABLE_DEPENDENCY_TYPES,
  PRIORITIES,
  REPLACEMENTS,
  type DeferUntil,
  type IssueChanges,
  type LinkableDependencyType,
  type NewIssueInput,
  type Replacement,
} from "@/shared/contract/issueActions";

// Server Action은 화면을 거치지 않은 POST 요청으로도 호출되므로, TypeScript 타입과 상관없이 모든 입력을 다시 검사합니다.

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isPriority(value: unknown): value is number {
  return (PRIORITIES as readonly unknown[]).includes(value);
}

// 문자열 필드는 bd의 목록을 따릅니다. IssueChanges에 문자열이 아닌 필드가 생기면 그 검사를 여기에 더해야 typecheck를 통과합니다.
const FIELD_CHECKS = new Map<string, (value: unknown) => boolean>([
  ...ISSUE_TEXT_FIELDS.map((field) => [field, isString] as const),
  ...Object.entries({ priority: isPriority } satisfies Record<
    Exclude<keyof IssueChanges, IssueTextField>,
    (value: unknown) => boolean
  >),
]);

export function isIssueChanges(value: unknown): value is IssueChanges {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([field, fieldValue]) => FIELD_CHECKS.get(field)?.(fieldValue) === true,
  );
}

export function isNewIssueInput(value: unknown): value is NewIssueInput {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  return (
    isString(input.title) &&
    (input.issueType === null || isString(input.issueType)) &&
    (input.priority === null || isPriority(input.priority)) &&
    isString(input.description) &&
    Array.isArray(input.labels) &&
    input.labels.every(isString) &&
    (input.parent === null || isString(input.parent))
  );
}

export function isLinkableDependencyType(value: unknown): value is LinkableDependencyType {
  return (LINKABLE_DEPENDENCY_TYPES as readonly unknown[]).includes(value);
}

export function isDeferUntil(value: unknown): value is DeferUntil {
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length === 1 && isString((value as { date?: unknown }).date);
  }
  return (DEFER_PERIODS as readonly unknown[]).includes(value);
}

export function isReplacement(value: unknown): value is Replacement {
  return (REPLACEMENTS as readonly unknown[]).includes(value);
}

export async function invalidRequest(): Promise<ApiFailure> {
  return { ok: false, error: (await serverMessages()).invalidRequest };
}
