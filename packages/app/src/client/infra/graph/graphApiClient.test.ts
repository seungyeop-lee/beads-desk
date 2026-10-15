import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readGraph } from "./graphApiClient";

beforeEach(() => {
  vi.stubGlobal("document", { documentElement: { lang: "ko" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("닫힌 이슈 포함 여부를 query로 붙여 그래프 데이터를 요청한다", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    Response.json({ ok: true, data: { issues: [], dependencies: [] } }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await readGraph(true);

  expect(result).toEqual({ ok: true, data: { issues: [], dependencies: [] } });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/graph?closed=1");
});
