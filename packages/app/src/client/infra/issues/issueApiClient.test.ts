import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  readIssueDetail,
  readIssueHistory,
  readIssueList,
  readIssueTextMatches,
} from "./issueApiClient";

beforeEach(() => {
  vi.stubGlobal("document", { documentElement: { lang: "ko" } });
  vi.stubGlobal("location", { pathname: "/w/demo/issues" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("조회 조건을 query로 붙여 요청하고 응답을 그대로 돌려준다", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, data: [] }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await readIssueList({ kind: "status", statuses: ["open", "closed"] });

  expect(result).toEqual({ ok: true, data: [] });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/issues?status=open%2Cclosed&workspace=demo");
});

test("workspace 화면이 아니면 workspace를 붙이지 않는다", async () => {
  vi.stubGlobal("location", { pathname: "/" });
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, data: [] }));
  vi.stubGlobal("fetch", fetchMock);

  await readIssueList({ kind: "ready" });

  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/issues?status=ready");
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
    error:
      "beads-desk 서버에 연결하지 못했습니다. 서버가 실행 중인지 확인한 뒤 화면을 새로고침해 주세요.",
  });
});

test("응답 형식이 맞지 않으면 실패 결과를 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response("<html>", { status: 502 })),
  );

  expect(await readIssueList({ kind: "ready" })).toEqual({
    ok: false,
    error: "서버 응답을 해석하지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  });
});

test("이슈 상세는 id를 경로에 넣어 요청한다", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, data: {} }));
  vi.stubGlobal("fetch", fetchMock);

  await readIssueDetail("demo-1/x");

  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/issues/demo-1%2Fx?workspace=demo");
});

test("본문 검색은 검색어를 query로 붙여 요청한다", async () => {
  const data = [{ id: "demo-1", hits: [{ field: "notes", excerpt: "token" }] }];
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, data }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await readIssueTextMatches("token");

  expect(result).toEqual({ ok: true, data });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/issue-search?text=token&workspace=demo");
});

test("이슈 활동은 상세 경로 아래 history로 요청한다", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, data: [] }));
  vi.stubGlobal("fetch", fetchMock);

  await readIssueHistory("demo-1/x");

  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/issues/demo-1%2Fx/history?workspace=demo");
});
