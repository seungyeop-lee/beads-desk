import { ISSUE_STATUSES } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import { statusChoices } from "./issueStatusChoices";

describe("statusChoices", () => {
  test("decision은 열림과 닫힘만 고를 수 있다", () => {
    expect(statusChoices("decision", "open")).toEqual(["open", "closed"]);
    expect(statusChoices("decision", "closed")).toEqual(["open", "closed"]);
  });

  test("decision이 아닌 유형은 모든 상태를 고를 수 있다", () => {
    expect(statusChoices("task", "in_progress")).toEqual([...ISSUE_STATUSES]);
  });

  test("decision의 현재 상태가 선택지에 없으면 맨 앞에 넣는다", () => {
    expect(statusChoices("decision", "deferred")).toEqual(["deferred", "open", "closed"]);
  });

  test("bd가 새로 만든 상태도 맨 앞에 넣는다", () => {
    expect(statusChoices("task", "pinned")).toEqual(["pinned", ...ISSUE_STATUSES]);
  });
});
