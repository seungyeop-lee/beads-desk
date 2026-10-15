import { describe, expect, test } from "vitest";
import { shortIssueId } from "./issueId";

describe("shortIssueId", () => {
  test("prefix에 -가 있어도 hash와 하위 번호만 남긴다", () => {
    expect(shortIssueId("bd-desk-2lj")).toBe("2lj");
    expect(shortIssueId("bd-desk-2lj.1.1")).toBe("2lj.1.1");
  });

  test("-가 없는 ID는 그대로 둔다", () => {
    expect(shortIssueId("2lj")).toBe("2lj");
  });
});
