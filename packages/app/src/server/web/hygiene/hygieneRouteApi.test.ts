import { staleIssues } from "@beads-desk/bd";
import { beforeEach, expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApiTest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { handleStaleIssuesRequest } from "./hygieneRouteApi";

vi.mock("@beads-desk/bd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beads-desk/bd")>()),
  staleIssues: vi.fn<typeof staleIssues>(),
}));

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

beforeEach(() => {
  vi.mocked(staleIssues).mockResolvedValue({ ok: true, value: [] });
});

function staleRequest(query = ""): Request {
  return routeApiRequest(`/api/hygiene/stale${query}`);
}

test("오래 방치된 이슈는 고른 기준 일수로 따로 읽는다", async () => {
  const stale = [issue("t-1")];
  vi.mocked(staleIssues).mockResolvedValue({ ok: true, value: stale });

  const response = await handleStaleIssuesRequest(staleRequest("?staleDays=7"));

  expect(staleIssues).toHaveBeenCalledWith("/workspace", 7);
  await expectRouteData(response, stale);
});

test("기준 일수를 지정하지 않으면 30일로 읽는다", async () => {
  await handleStaleIssuesRequest(staleRequest());

  expect(staleIssues).toHaveBeenCalledWith("/workspace", 30);
});

test("고를 수 없는 기준 일수는 bd를 실행하지 않고 거부한다", async () => {
  const response = await handleStaleIssuesRequest(staleRequest("?staleDays=3"));

  expect(response.status).toBe(400);
  expect(staleIssues).not.toHaveBeenCalled();
});

test("오래 방치된 이슈를 읽지 못하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(staleIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleStaleIssuesRequest(staleRequest()), "boom");
});
