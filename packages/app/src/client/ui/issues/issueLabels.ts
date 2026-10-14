import type { IssueStatus } from "@beads-desk/bd/issue";
import type { Messages } from "@/client/modules/locale/domain/messages";
import type { Locale } from "@/shared/contract/locale";

/*
 * 아래 tone-*은 styles/components.css의 파스텔이고, tone-none은 색이 없다는 뜻입니다.
 * 같은 줄에 나란히 보이는 상태와 우선순위는 서로 구별되는 색을 씁니다.
 */
const STATUS_TONES: Record<IssueStatus, string> = {
  open: "tone-azure",
  in_progress: "tone-pear",
  blocked: "tone-coral",
  deferred: "tone-lilac",
  closed: "tone-sage",
};

/** bd에 새 상태가 생겨도 원래 이름 그대로, 색 없이 보입니다. */
export function statusLabel(messages: Messages, status: string): string {
  return labelOf(messages.issue.statuses, status);
}

export function statusTone(status: string): string {
  return STATUS_TONES[status as IssueStatus] ?? "tone-none";
}

export const READY_TONE = "tone-aqua";

const TYPE_TONES: Record<string, string> = {
  bug: "tone-coral",
  feature: "tone-lavender",
  task: "tone-sky",
  epic: "tone-lilac",
  chore: "tone-sand",
  decision: "tone-mint",
  spike: "tone-aqua",
  story: "tone-blossom",
  milestone: "tone-pear",
};

/** bd의 기본 이슈 유형입니다. 설정으로 추가한 유형은 원래 이름 그대로 보입니다. */
export const ISSUE_TYPES = Object.keys(TYPE_TONES);

export function typeLabel(messages: Messages, issueType: string): string {
  return labelOf(messages.issue.types, issueType);
}

export function typeTone(issueType: string): string {
  return TYPE_TONES[issueType] ?? "tone-none";
}

/** bd가 받는 우선순위입니다. 0이 가장 높습니다. */
export const PRIORITIES = [0, 1, 2, 3, 4];

/** 의존 관계 유형을 보는 쪽에 맞춰 부릅니다. 목록에 없는 유형은 원래 이름 그대로 보입니다. */
export function dependencyLabel(
  messages: Messages,
  side: "dependencies" | "dependents",
  dependencyType: string,
): string {
  return labelOf(messages.issue.dependencyTypes[side], dependencyType);
}

export function priorityLabel(messages: Messages, priority: number): string {
  return messages.issue.priorities[priority] ?? `P${priority}`;
}

function labelOf(labels: object, name: string): string {
  return (labels as Partial<Record<string, string>>)[name] ?? name;
}

/** 긴급과 높음만 색으로 눈에 띄게 하고, 나머지는 색 없이 둡니다. */
export function priorityTone(priority: number | null): string {
  if (priority === 0) return "tone-coral";
  if (priority === 1) return "tone-peach";
  return "tone-none";
}

const NAME_TONES = [
  "tone-coral",
  "tone-sand",
  "tone-sage",
  "tone-aqua",
  "tone-azure",
  "tone-lilac",
  "tone-peach",
  "tone-pear",
  "tone-mint",
  "tone-sky",
  "tone-lavender",
  "tone-blossom",
];

/** 라벨과 댓글 작성자처럼 같은 이름은 어디서나 같은 색으로 보이도록 이름으로 색을 고릅니다. */
export function nameTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return NAME_TONES[hash % NAME_TONES.length];
}

export function formatTime(locale: Locale, ms: number): string {
  return new Date(ms).toLocaleString(locale);
}
