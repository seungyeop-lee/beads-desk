import { expect, test } from "vitest";
import { plainSectionTitle } from "./lintSections";

test("markdown 제목 기호와 그 뒤 공백을 지우고 제목을 그대로 둔다", () => {
  expect(plainSectionTitle("## Acceptance Criteria")).toBe("Acceptance Criteria");
  expect(plainSectionTitle("# Overview")).toBe("Overview");
});

test("제목 기호가 없으면 그대로 돌려준다", () => {
  expect(plainSectionTitle("Steps to Reproduce")).toBe("Steps to Reproduce");
});
