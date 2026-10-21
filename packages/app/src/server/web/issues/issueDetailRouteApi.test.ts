import { issueEvents, showIssue } from "@beads-desk/bd";
import type { IssueEvent } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApi.testkit";
import { issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { handleIssueDetailRequest, handleIssueHistoryRequest } from "./issueDetailRouteApi";

vi.mock("@beads-desk/bd", () => ({
  showIssue: vi.fn<typeof showIssue>(),
  issueEvents: vi.fn<typeof issueEvents>(),
}));
// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("en"),
}));

test("workspace에서 이슈 상세를 조회해 돌려준다", async () => {
  const detail = issueDetail("demo-1", { title: "첫 이슈" });
  vi.mocked(showIssue).mockResolvedValue({ ok: true, value: detail });

  const response = await handleIssueDetailRequest(routeApiRequest(), "demo-1");

  expect(showIssue).toHaveBeenCalledWith("/workspace", "demo-1");
  await expectRouteData(response, detail);
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(showIssue).mockResolvedValue({
    ok: false,
    error: { message: "Issue demo-9 not found\n", exitCode: 1 },
  });

  await expectRouteBdError(
    await handleIssueDetailRequest(routeApiRequest(), "demo-9"),
    "Issue demo-9 not found",
  );
});

test("bd adapter가 입력을 거부하면 오류 종류를 요청 언어의 문구로 바꿔 돌려준다", async () => {
  vi.mocked(showIssue).mockResolvedValue({
    ok: false,
    error: { kind: "emptyIssueId", exitCode: null },
  });

  await expectRouteBdError(
    await handleIssueDetailRequest(routeApiRequest(), " "),
    "The issue ID is empty.",
  );
});

test("workspace에서 이슈의 변경 이벤트를 읽어 돌려준다", async () => {
  const events = [{ id: "e-1", type: "created" } as IssueEvent];
  vi.mocked(issueEvents).mockResolvedValue({ ok: true, value: events });

  const response = await handleIssueHistoryRequest(routeApiRequest(), "demo-1");

  expect(issueEvents).toHaveBeenCalledWith("/workspace", "demo-1");
  await expectRouteData(response, events);
});

test("변경 이벤트를 읽지 못하면 bd의 메시지와 500을 돌려준다", async () => {
  vi.mocked(issueEvents).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleIssueHistoryRequest(routeApiRequest(), "demo-1"), "boom");
});
