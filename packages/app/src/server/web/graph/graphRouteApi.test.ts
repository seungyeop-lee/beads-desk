import { dependencyGraph } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApiTest";
import { handleGraphRequest } from "./graphRouteApi";

vi.mock("@beads-desk/bd", () => ({ dependencyGraph: vi.fn<typeof dependencyGraph>() }));

test("닫힌 이슈까지 읽은 그래프 데이터를 돌려준다", async () => {
  const graph = { issues: [], dependencies: [], ancestorEpics: {} };
  vi.mocked(dependencyGraph).mockResolvedValue({ ok: true, value: graph });

  const response = await handleGraphRequest(routeApiRequest());

  expect(vi.mocked(dependencyGraph).mock.calls).toEqual([["/workspace"]]);
  await expectRouteData(response, graph);
});

test("bd가 실패하면 bd의 메시지와 500을 돌려준다", async () => {
  vi.mocked(dependencyGraph).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleGraphRequest(routeApiRequest()), "boom");
});
