import { expect, test } from "vitest";
import { screenPathOf, workspaceHref, workspaceOfPathname } from "./workspaces";

test("workspace 이름과 화면 경로로 화면 주소를 만든다", () => {
  expect(workspaceHref("beads-desk", "/issues?view=ready")).toBe("/w/beads-desk/issues?view=ready");
  expect(workspaceHref("beads-desk")).toBe("/w/beads-desk");
  expect(workspaceHref("할_일", "/focus")).toBe("/w/%ED%95%A0_%EC%9D%BC/focus");
});

test("화면 주소에서 workspace 이름을 읽는다", () => {
  expect(workspaceOfPathname("/w/beads-desk/issues")).toBe("beads-desk");
  expect(workspaceOfPathname("/w/%ED%95%A0_%EC%9D%BC")).toBe("할_일");
  expect(workspaceOfPathname("/issues")).toBeNull();
  expect(workspaceOfPathname("/w")).toBeNull();
  expect(workspaceOfPathname("/w/%E0")).toBeNull();
});

test("화면 주소에서 workspace 안의 화면 경로를 뗀다", () => {
  expect(screenPathOf("/w/beads-desk/issues")).toBe("/issues");
  expect(screenPathOf("/w/beads-desk")).toBe("/");
  expect(screenPathOf("/w/%ED%95%A0/graph")).toBe("/graph");
});
