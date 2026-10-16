import { dependencyGraph } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleGraphRequest } from "./graphRouteApi";

vi.mock("@beads-desk/bd", () => ({ dependencyGraph: vi.fn<typeof dependencyGraph>() }));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.mocked(dependencyGraph).mockReset();
});

test("query에 따라 닫힌 이슈를 포함하거나 빼고 그래프 데이터를 읽어 돌려준다", async () => {
  const graph = { issues: [], dependencies: [], ancestorEpics: {} };
  vi.mocked(dependencyGraph).mockResolvedValue({ ok: true, value: graph });

  const response = await handleGraphRequest(new Request("http://localhost/api/graph?closed=1"));
  await handleGraphRequest(new Request("http://localhost/api/graph"));

  expect(vi.mocked(dependencyGraph).mock.calls).toEqual([
    ["/workspace", true],
    ["/workspace", false],
  ]);
  expect(await response.json()).toEqual({ ok: true, data: graph });
});

test("bd가 실패하면 bd의 메시지와 500을 돌려준다", async () => {
  vi.mocked(dependencyGraph).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleGraphRequest(new Request("http://localhost/api/graph"));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
