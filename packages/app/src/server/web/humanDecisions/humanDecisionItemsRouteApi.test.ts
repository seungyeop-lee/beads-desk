import { humanDecisionIssues } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import {
  expectRouteBdError,
  expectRouteData,
  routeApiRequest,
} from "@/server/web/http/routeApiTest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { handleHumanDecisionItemsRequest } from "./humanDecisionItemsRouteApi";

vi.mock("@beads-desk/bd", () => ({
  humanDecisionIssues: vi.fn<typeof humanDecisionIssues>(),
}));

test("열린 human gate와 닫히지 않은 human 라벨 이슈의 id와 제목을 돌려준다", async () => {
  vi.mocked(humanDecisionIssues).mockResolvedValue({
    ok: true,
    value: {
      gates: [issue("g-1", { title: "배포 승인" })],
      labeled: [
        issue("q-1", { title: "어느 방식으로 할까요", status: "open", labels: ["human"] }),
        issue("q-2", { title: "이미 답한 질문", status: "closed", labels: ["human"] }),
      ],
    },
  });

  const response = await handleHumanDecisionItemsRequest(routeApiRequest());

  expect(humanDecisionIssues).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, [
    { id: "g-1", title: "배포 승인" },
    { id: "q-1", title: "어느 방식으로 할까요" },
  ]);
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(humanDecisionIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleHumanDecisionItemsRequest(routeApiRequest()), "boom");
});
