import { expect, test } from "vitest";
import { MESSAGES } from "@/client/modules/locale/domain/messages";
import { formatTime } from "../issueTime";
import { activityLineText } from "./activityText";

const ko = (line: Parameters<typeof activityLineText>[2]) =>
  activityLineText(MESSAGES.ko, "ko", line);
const field = (name: string, before: unknown, after: unknown) =>
  ko({ kind: "field", change: { field: name, before, after } });

test("상태, 우선순위, 유형, 담당자 변경은 화면에서 쓰는 이름으로 바꾸고, 값이 없으면 없음으로 보인다", () => {
  expect(field("status", "open", "in_progress")).toBe("상태: 열림 → 진행 중");
  expect(field("priority", 2, 1)).toBe("우선순위: P2 보통 → P1 높음");
  expect(field("issueType", "task", "bug")).toBe("유형: 작업 → 버그");
  expect(field("assignee", null, "tester")).toBe("담당자: 없음 → tester");
});

test("보류 기한은 시각으로, 라벨 목록은 쉼표로 이어 보이고, 모르는 필드는 이름 그대로 보인다", () => {
  const until = "2026-11-30T15:00:00Z";

  expect(field("deferUntil", null, until)).toBe(
    `보류 기한: 없음 → ${formatTime("ko", Date.parse(until))}`,
  );
  // 활동 피드는 bd export와 같은 epoch ms로 보류 기한을 담습니다.
  expect(field("deferUntil", Date.parse(until), null)).toBe(
    `보류 기한: ${formatTime("ko", Date.parse(until))} → 없음`,
  );
  expect(field("labels", ["a"], ["a", "b"])).toBe("라벨: a → a, b");
  expect(field("labels", [], ["a"])).toBe("라벨: 없음 → a");
  expect(field("customField", "x", "")).toBe("customField: x → 없음");
});

test("설명처럼 긴 본문 필드는 값 없이 고쳤다는 사실만 보인다", () => {
  expect(field("description", "긴 글", "더 긴 글")).toBe("설명 내용을 고쳤습니다.");
  expect(field("acceptanceCriteria", "", "기준")).toBe("수용 기준 내용을 고쳤습니다.");
});

test("생성, 닫기, 다시 열기, 관계, 라벨, 모르는 이벤트를 문장으로 바꾼다", () => {
  expect(ko({ kind: "created" })).toBe("이슈를 만들었습니다.");
  expect(ko({ kind: "closed", reason: "끝" })).toBe("이슈를 닫았습니다: 끝");
  expect(ko({ kind: "closed", reason: null })).toBe("이슈를 닫았습니다.");
  expect(ko({ kind: "reopened" })).toBe("이슈를 다시 열었습니다.");
  expect(ko({ kind: "dependencyAdded", dependsOnId: "demo-b", dependencyType: "blocks" })).toBe(
    "선행 관계로 demo-b을(를) 연결했습니다.",
  );
  expect(ko({ kind: "dependencyRemoved", dependsOnId: "demo-b" })).toBe(
    "demo-b과(와)의 관계를 지웠습니다.",
  );
  expect(ko({ kind: "labelAdded", label: "ui" })).toBe("라벨 ui을(를) 붙였습니다.");
  expect(ko({ kind: "labelRemoved", label: "ui" })).toBe("라벨 ui을(를) 뗐습니다.");
  expect(ko({ kind: "other", eventType: "compacted", text: "level 1" })).toBe("compacted: level 1");
  expect(ko({ kind: "other", eventType: "lease_reclaimed", text: null })).toBe("lease_reclaimed");
});

test("영어 사전으로도 같은 규칙을 따른다", () => {
  expect(activityLineText(MESSAGES.en, "en", { kind: "reopened" })).toBe("Reopened the issue.");
  expect(
    activityLineText(MESSAGES.en, "en", {
      kind: "field",
      change: { field: "status", before: "open", after: "closed" },
    }),
  ).toBe(
    `${MESSAGES.en.issue.status}: ${MESSAGES.en.issue.statuses.open} → ${MESSAGES.en.issue.statuses.closed}`,
  );
});
