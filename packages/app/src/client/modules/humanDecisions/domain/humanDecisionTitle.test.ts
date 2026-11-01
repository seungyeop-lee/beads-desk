import { expect, test } from "vitest";
import { titleWithHumanDecisionCount } from "./humanDecisionTitle";

test("판단 기다림이 있으면 개수를 괄호로 묶어 제목 맨 앞에 붙인다", () => {
  expect(titleWithHumanDecisionCount("beads-desk · beads-desk", 2)).toBe(
    "(2) beads-desk · beads-desk",
  );
});

test("판단 기다림이 없으면 제목을 그대로 둔다", () => {
  expect(titleWithHumanDecisionCount("beads-desk · beads-desk", 0)).toBe("beads-desk · beads-desk");
});
