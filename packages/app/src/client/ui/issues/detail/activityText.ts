import type { IssueFieldChange } from "@beads-desk/bd/issue";
import type { ActivityLine } from "@/client/modules/issues/domain/issueActivity";
import type { Messages } from "@/client/modules/locale/domain/messages";
import type { Locale } from "@/shared/contract/locale";
import { dependencyLabel, priorityLabel, statusLabel, typeLabel } from "../issueLabels";
import { dueAtLabel, formatTime } from "../issueTime";
import { BODY_FIELDS } from "@/shared/domain/issues/bodyFields";
import { UPDATE_FIELDS, type UpdateField } from "@/shared/domain/issues/updateFields";

/** 활동 기록의 한 줄을 화면 문장으로 바꿉니다. */
export function activityLineText(messages: Messages, locale: Locale, line: ActivityLine): string {
  const text = messages.activity;
  switch (line.kind) {
    case "created":
      return text.created;
    case "closed":
      return line.reason ? text.closedWithReason(line.reason) : text.closed;
    case "reopened":
      return text.reopened;
    case "field":
      return fieldChangeText(messages, locale, line.change);
    case "dependencyAdded":
      // bd는 이 이슈가 상대 이슈에 의존하는 방향으로 기록하므로, 상세의 의존하는 쪽 이름으로 부릅니다.
      return text.dependencyAdded(
        dependencyLabel(messages, "dependencies", line.dependencyType ?? ""),
        line.dependsOnId,
      );
    case "dependencyRemoved":
      return text.dependencyRemoved(line.dependsOnId);
    case "labelAdded":
      return text.labelAdded(line.label);
    case "labelRemoved":
      return text.labelRemoved(line.label);
    case "other":
      return line.text ? `${line.eventType}: ${line.text}` : line.eventType;
  }
}

/** 바뀐 필드 하나를 화면 문장으로 바꿉니다. 활동 피드의 수정 기록도 이 문장을 씁니다. */
export function fieldChangeText(
  messages: Messages,
  locale: Locale,
  change: IssueFieldChange,
): string {
  const bodyField = BODY_FIELDS.find((field) => field === change.field);
  if (bodyField) {
    // 본문은 길어서 한 줄에 담지 않고 고친 사실만 알립니다.
    return messages.activity.bodyChanged(messages.issue.bodyFields[bodyField]);
  }
  const value = (raw: unknown) => fieldValue(messages, locale, change.field, raw);
  return messages.activity.fieldChanged(
    fieldName(messages, change.field),
    value(change.before),
    value(change.after),
  );
}

function fieldName(messages: Messages, field: string): string {
  const names: Record<UpdateField, string> = {
    title: messages.issue.title,
    ...messages.issue.bodyFields,
    status: messages.issue.status,
    priority: messages.issue.priority,
    issueType: messages.issue.type,
    assignee: messages.issue.assignee,
    labels: messages.issue.labels,
    deferUntil: messages.deferral.until,
    dueAt: messages.issue.dueAt,
  };
  const updateField = UPDATE_FIELDS.find((name) => name === field);
  return updateField ? names[updateField] : field;
}

function fieldValue(messages: Messages, locale: Locale, field: string, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return messages.common.none;
  }
  if (field === "status" && typeof raw === "string") return statusLabel(messages, raw);
  if (field === "issueType" && typeof raw === "string") return typeLabel(messages, raw);
  if (field === "priority" && typeof raw === "number")
    return `P${raw} ${priorityLabel(messages, raw)}`;
  if (field === "deferUntil" || field === "dueAt") {
    // bd history는 ISO 문자열로, 활동 피드는 bd export와 같은 epoch ms로 담습니다.
    const at = typeof raw === "string" ? Date.parse(raw) : raw;
    if (typeof at === "number" && Number.isFinite(at)) {
      return field === "dueAt" ? dueAtLabel(locale, at) : formatTime(locale, at);
    }
  }
  if (Array.isArray(raw)) return raw.join(", ");
  return typeof raw === "object" ? JSON.stringify(raw) : String(raw);
}
