import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fakeBdWorkspace } from "@beads-desk/bd/fakeBd.testkit";
import { fakeBdRouteApiRequest } from "@/server/web/http/fakeBdRouteApi.testkit";
import { handleActivityFeedRequest } from "./activityFeedRouteApi";

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

const fakeBd = fakeBdWorkspace("beads-desk-activity-");

// workspace 디렉터리가 테스트마다 바뀌므로, 서버 전역의 등록 목록도 새 디렉터리로 다시 만들게 지웁니다.
beforeEach(() => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("beads-desk.serverRuntime")];
  vi.stubEnv("BEADS_DESK_WORKSPACE", fakeBd.workDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("bd export 레코드에서 조회 범위 안의 기록을 새것부터 limit건까지 돌려주고, gate의 기록은 뺀다", async () => {
  const exported = [
    {
      id: "demo-1",
      title: "첫 이슈",
      issue_type: "task",
      created_at: "2026-10-20T01:00:00Z",
      created_by: "alice",
      closed_at: "2026-10-20T03:00:00Z",
      close_reason: "끝냄",
    },
    {
      id: "demo-gate",
      title: "Review",
      issue_type: "gate",
      created_at: "2026-10-20T02:00:00Z",
      comments: [{ id: "c-1", author: "human", text: "승인", created_at: "2026-10-20T02:30:00Z" }],
    },
  ];
  await fakeBd.useFakeBd({
    "dolt show --json": { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
    "sql SELECT DOLT_HASHOF_DB() AS h --json": { stdout: JSON.stringify([{ h: "hash-1" }]) },
    export: { stdout: exported.map((record) => JSON.stringify(record)).join("\n") },
  });
  const since = Date.parse("2026-10-20T00:00:00Z");
  const until = Date.parse("2026-10-21T00:00:00Z");

  const response = await handleActivityFeedRequest(
    fakeBdRouteApiRequest(fakeBd.workDir, `/api/activity?since=${since}&until=${until}&limit=1`),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    data: {
      entries: [
        {
          key: "demo-1:closed",
          kind: "closed",
          at: Date.parse("2026-10-20T03:00:00Z"),
          issueId: "demo-1",
          title: "첫 이슈",
          actor: null,
          text: "끝냄",
        },
      ],
      hasMore: true,
    },
  });
});

test.each(["limit=0", "limit=abc", "since=x&limit=10", "until=&limit=10"])(
  "조회 조건 %s처럼 limit이 1 이상의 정수가 아니거나 범위가 정수가 아니면 bd를 실행하지 않고 400을 돌려준다",
  async (query) => {
    await fakeBd.useFakeBd({});

    const response = await handleActivityFeedRequest(
      fakeBdRouteApiRequest(fakeBd.workDir, `/api/activity?${query}`),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
    await expect(fakeBd.callsLog()).rejects.toThrow("ENOENT");
  },
);
