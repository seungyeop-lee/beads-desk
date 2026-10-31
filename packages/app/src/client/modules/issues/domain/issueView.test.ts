import { expect, test } from "vitest";
import { parseIssueView } from "./issueView";

test("주소의 view 값은 보기 탭의 작업 상태와 병목만 받고, 그 밖의 값은 전체 보기(null)로 읽는다", () => {
  expect(parseIssueView("blocked")).toBe("blocked");
  expect(parseIssueView("bottleneck")).toBe("bottleneck");
  expect(parseIssueView("other")).toBeNull();
  expect(parseIssueView("bogus")).toBeNull();
  expect(parseIssueView(null)).toBeNull();
});
