import { expect, test } from "vitest";
import { canClaim } from "./issueClaim";

test("열린 작업 이슈만 가져갈 수 있고, 기능도 task처럼 작업 이슈로 본다", () => {
  for (const issueType of ["task", "bug", "feature"]) {
    expect(canClaim({ status: "open", issueType })).toBe(true);
  }
});

test("bd가 claim을 거부하는 상태는 가져갈 수 없다", () => {
  for (const status of ["in_progress", "blocked", "deferred", "closed"]) {
    expect(canClaim({ status, issueType: "task" })).toBe(false);
  }
});

test("하위 이슈를 묶는 에픽·molecule과 직접 작업하지 않는 결정·마일스톤은 열려 있어도 가져갈 수 없다", () => {
  for (const issueType of ["epic", "molecule", "decision", "milestone"]) {
    expect(canClaim({ status: "open", issueType })).toBe(false);
  }
});
