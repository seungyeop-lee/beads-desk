import { afterEach, expect, test, vi } from "vitest";
import { readIssueList } from "./issueListClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("조회 조건을 query로 붙여 요청하고 응답을 그대로 돌려준다", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, data: [] }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await readIssueList({ kind: "status", statuses: ["open", "closed"] });

  expect(result).toEqual({ ok: true, data: [] });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/issues?status=open%2Cclosed");
});

test("서버의 실패 응답은 오류 문구를 그대로 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => Response.json({ ok: false, error: "boom" }, { status: 500 })),
  );

  expect(await readIssueList({ kind: "ready" })).toEqual({ ok: false, error: "boom" });
});

test("서버에 연결하지 못하면 실패 결과를 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    }),
  );

  expect(await readIssueList({ kind: "ready" })).toEqual({
    ok: false,
    error: "beads-desk 서버에 연결하지 못했습니다.",
  });
});

test("응답 형식이 맞지 않으면 실패 결과를 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response("<html>", { status: 502 })),
  );

  expect(await readIssueList({ kind: "ready" })).toEqual({
    ok: false,
    error: "서버 응답을 해석하지 못했습니다.",
  });
});
