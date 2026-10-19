import { expect, test } from "vitest";
import { graphBackHref, graphHref, graphOriginParams, readGraphScope } from "./graphAddress";

const read = (href: string) => readGraphScope(new URL(href, "http://localhost").searchParams);

test.each([
  { kind: "epic", id: "demo-1" },
  { kind: "center", id: "demo-2" },
] as const)("범위를 주소에 담고, 주소에서 그대로 다시 읽는다: %o", (scope) => {
  expect(read(graphHref(scope))).toEqual(scope);
});

test("상세 dialog의 query가 함께 있어도 범위를 읽는다", () => {
  expect(read("/graph?center=demo-2&issue=demo-3&side=demo-4")).toEqual({
    kind: "center",
    id: "demo-2",
  });
});

test("범위가 없으면 null로 읽는다", () => {
  expect(read("/graph")).toBeNull();
  expect(read("/graph?epic=")).toBeNull();
});

const center = { kind: "center", id: "demo-2" } as const;
const epic = { kind: "epic", id: "demo-1" } as const;
const params = (href: string) => new URL(href, "http://localhost").searchParams;

test("출발 화면의 보기·유형·날짜와 상세·옆 패널 query를 보존한다", () => {
  const origin =
    "/issues?view=blocked&type=task&date=created&from=2026-10-01&to=2026-10-17&issue=demo-2&side=demo-3";
  expect(graphBackHref(center, params(graphHref(center, origin)))).toBe(origin);
});

test("그래프를 이어 열면 복귀 주소를 중첩 인코딩하지 않고 순서대로 돌아간다", () => {
  const first = graphHref(epic, "/epics");
  const detail = `${first}&issue=demo-2&side=demo-3`;
  const second = graphHref(center, detail);
  expect(params(second).getAll("returnTo")).toEqual([
    "/epics",
    "/epics?epic=demo-1&issue=demo-2&side=demo-3",
  ]);
  expect([...params(graphBackHref(center, params(second)))].sort()).toEqual(
    [...params(detail)].sort(),
  );
  expect(graphBackHref(epic, params(first))).toBe("/epics");
});

test("같은 그래프를 다시 열면 복귀 순서에 자신을 추가하지 않는다", () => {
  const first = graphHref(center, "/focus?issue=demo-2");
  expect(graphHref(center, `${first}&issue=demo-2`)).toBe(first);
  expect(graphHref(epic, "/graph?epic=demo-1&issue=demo-1")).toBe("/graph?epic=demo-1");
});

test.each([
  "",
  "https://example.com",
  "//example.com/issues",
  "javascript:alert(1)",
  "/api/issues",
  "/missing",
  "/graph",
  "/issues#fragment",
  "/issues%2f",
  "/api/../issues",
  "/issues?issue=%ZZ",
  "/issues?issue=%E0%A4",
  "/issues\\evil",
  "/issues\n",
  "/graph?center=demo-1&returnTo=%2Fissues",
])("직접 진입과 잘못된 복귀 정보는 범위에 맞는 대체 경로로 돌아간다: %s", (address) => {
  const query = new URLSearchParams();
  if (address) query.append("returnTo", address);
  expect(graphBackHref(center, query)).toBe("/issues?issue=demo-2");
  expect(graphBackHref(epic, query)).toBe("/epics");
});

test("복귀 정보 중 하나라도 잘못되면 전체를 버린다", () => {
  const query = new URLSearchParams();
  query.append("returnTo", "https://example.com");
  query.append("returnTo", "/graph?epic=demo-1");
  expect(graphBackHref(center, query)).toBe("/issues?issue=demo-2");
});

test("앱 내부의 각 화면으로 돌아갈 수 있다", () => {
  for (const path of [
    "/focus",
    "/human",
    "/issues",
    "/epics",
    "/hygiene",
    "/board",
    "/decisions",
  ]) {
    expect(graphBackHref(center, params(graphHref(center, path)))).toBe(path);
  }
});

test("그래프를 이어 열어도 처음 출발한 화면의 query를 읽는다", () => {
  const first = graphHref(center, "/issues?view=blocked&issue=demo-2&side=demo-3");
  const second = graphHref(epic, `${first}&issue=demo-4`);
  for (const href of [first, second]) {
    expect(graphOriginParams(params(href), "/issues")?.toString()).toBe(
      "view=blocked&issue=demo-2&side=demo-3",
    );
  }
});

test("출발 주소가 그래프이거나 다른 화면이거나 없으면 출발 화면의 query가 없다", () => {
  expect(graphOriginParams(params(graphHref(epic, "/graph?center=demo-2")), "/graph")).toBeNull();
  expect(graphOriginParams(params(graphHref(center, "/focus?issue=demo-2")), "/issues")).toBeNull();
  expect(graphOriginParams(params(graphHref(center)), "/graph")).toBeNull();
});
