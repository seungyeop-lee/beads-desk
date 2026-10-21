import { expect, test } from "vitest";
import { routeApiWorkspaceSlug } from "@/server/web/http/routeApi.testkit";
import { findRegisteredWorkspace } from "./registeredWorkspaces";

const registered = { root: "/workspace", slug: routeApiWorkspaceSlug };

test.each([
  ["등록한 이름", routeApiWorkspaceSlug],
  ["percent-encoding된 등록한 이름", "%77orkspace"],
])("%s이면 그 workspace를 돌려준다", (_case, segment) => {
  expect(findRegisteredWorkspace(segment)).toEqual(registered);
});

test.each([
  ["등록하지 않은 이름", "other"],
  ["decode할 수 없는 segment", "workspace%E0%A4%A"],
])("%s이면 null을 돌려준다", (_case, segment) => {
  expect(findRegisteredWorkspace(segment)).toBeNull();
});
