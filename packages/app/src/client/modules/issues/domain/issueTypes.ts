/** bd의 기본 이슈 유형입니다. 설정으로 추가한 유형은 여기에 없고 화면에서 원래 이름 그대로 보입니다. */
export const ISSUE_TYPES = [
  "bug",
  "feature",
  "task",
  "epic",
  "chore",
  "decision",
  "spike",
  "story",
  "milestone",
] as const;

/** bd의 기본 이슈 유형 중 하나입니다. */
export type IssueType = (typeof ISSUE_TYPES)[number];
