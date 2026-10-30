import type { ExportedIssue } from "@beads-desk/bd/issue";
import { BODY_FIELDS } from "./bodyFields";

/** 활동 기록이 이름을 붙여 보이는 필드입니다. 활동 화면은 이 필드의 변경만 수정 기록에 담고, 상세 활동 탭은 이 밖의 필드를 필드 이름 그대로 보입니다. */
export const UPDATE_FIELDS = [
  "title",
  ...BODY_FIELDS,
  "status",
  "priority",
  "issueType",
  "assignee",
  "labels",
  "deferUntil",
  "dueAt",
] as const satisfies readonly (keyof ExportedIssue)[];

export type UpdateField = (typeof UPDATE_FIELDS)[number];
