import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parseIssues } from "./issue";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
}

describe("parseIssues", () => {
  test("bd list 출력을 Issue 목록으로 바꾼다", async () => {
    const issues = parseIssues(await fixture("list.json"));

    expect(issues.map((issue) => issue.id)).toEqual([
      "demo-x2e",
      "demo-8g0",
      "demo-cy2",
      "demo-8g0.1",
    ]);
    expect(issues[3]).toEqual({
      id: "demo-8g0.1",
      title: "Child task",
      status: "open",
      priority: 2,
      issueType: "task",
      assignee: "alice",
      labels: ["ui"],
      parent: "demo-8g0",
      dependencyCount: 1,
      dependentCount: 0,
      createdAt: Date.parse("2026-10-13T12:04:51Z"),
      updatedAt: Date.parse("2026-10-13T12:07:18Z"),
      closedAt: null,
    });
  });

  test("닫힌 이슈는 closedAt을 epoch ms로 담는다", async () => {
    const closed = parseIssues(await fixture("list.json")).find((issue) => issue.id === "demo-cy2");

    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeTypeOf("number");
  });

  test("id가 없는 항목은 건너뛰고, 없는 필드는 빈 값으로 채운다", () => {
    const issues = parseIssues([{ title: "no id" }, { id: "x-1" }]);

    expect(issues).toEqual([
      {
        id: "x-1",
        title: "",
        status: "",
        priority: null,
        issueType: "",
        assignee: null,
        labels: [],
        parent: null,
        dependencyCount: 0,
        dependentCount: 0,
        createdAt: 0,
        updatedAt: 0,
        closedAt: null,
      },
    ]);
  });

  test("배열이 아니면 빈 목록을 돌려준다", () => {
    expect(parseIssues({ error: "no issues" })).toEqual([]);
  });
});
