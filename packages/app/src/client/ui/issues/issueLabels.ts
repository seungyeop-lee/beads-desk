import type { IssueStatus } from "@beads-desk/bd/issue";

export const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "열림",
  in_progress: "진행 중",
  blocked: "막힘",
  deferred: "보류",
  closed: "닫힘",
};

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
export function statusLabel(status: string): string {
  return STATUS_LABELS[status as IssueStatus] ?? status;
}

export function statusTone(status: string): string {
  return STATUS_TONES[status as IssueStatus] ?? "tone-none";
}

export const READY_LABEL = "바로 작업 가능";
export const READY_TONE = "tone-aqua";

/** bd의 기본 이슈 유형입니다. 설정으로 추가한 유형은 원래 이름 그대로 보입니다. */
export const TYPE_LABELS: Record<string, string> = {
  bug: "버그",
  feature: "기능",
  task: "작업",
  epic: "에픽",
  chore: "잡무",
  decision: "결정",
  spike: "스파이크",
  story: "스토리",
  milestone: "마일스톤",
};

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

export function typeLabel(issueType: string): string {
  return TYPE_LABELS[issueType] ?? issueType;
}

export function typeTone(issueType: string): string {
  return TYPE_TONES[issueType] ?? "tone-none";
}

const PRIORITY_LABELS = ["긴급", "높음", "보통", "낮음", "백로그"];

/** bd가 받는 우선순위입니다. 0이 가장 높습니다. */
export const PRIORITIES = [0, 1, 2, 3, 4];

/** 의존 관계 유형을 보는 쪽에 맞춰 부릅니다. 목록에 없는 유형은 원래 이름 그대로 보입니다. */
export const DEPENDENCY_LABELS: Record<"dependencies" | "dependents", Record<string, string>> = {
  dependencies: {
    blocks: "선행",
    "parent-child": "상위",
    related: "관련",
    "discovered-from": "발견 출처",
  },
  dependents: {
    blocks: "후속",
    "parent-child": "하위",
    related: "관련",
    "discovered-from": "여기서 발견",
  },
};

export function priorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority] ?? `P${priority}`;
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

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("ko-KR");
}
