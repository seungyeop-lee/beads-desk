import {
  humanGates,
  type HumanGate,
  previousGateRounds,
  type PreviousGateRound,
} from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import { expectRouteBdError, expectRouteData } from "@/server/web/http/routeApiTest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { handleHumanGatesRequest, handlePreviousGateRoundsRequest } from "./humanGatesRouteApi";

vi.mock("@beads-desk/bd", () => ({
  humanGates: vi.fn<typeof humanGates>(),
  previousGateRounds: vi.fn<typeof previousGateRounds>(),
}));

test("workspace의 열린 human gate와 막고 있는 이슈를 돌려준다", async () => {
  const gates = [
    {
      gate: issue("g-1"),
      reason: "리뷰 요청",
      blocks: [issue("t-1")],
      previousGateCount: 0,
    },
  ] satisfies HumanGate[];
  vi.mocked(humanGates).mockResolvedValue({ ok: true, value: gates });

  const response = await handleHumanGatesRequest();

  expect(humanGates).toHaveBeenCalledWith("/workspace");
  await expectRouteData(response, gates);
});

test("고른 gate의 이전 라운드 기록을 돌려준다", async () => {
  const rounds = [
    {
      gate: issue("g-0"),
      closeReason: "Responded",
      comments: [{ id: "c-1", author: "seungyeop", text: "Response: 승인", createdAt: 0 }],
    },
  ] satisfies PreviousGateRound[];
  vi.mocked(previousGateRounds).mockResolvedValue({ ok: true, value: rounds });

  const response = await handlePreviousGateRoundsRequest("g-1");

  expect(previousGateRounds).toHaveBeenCalledWith("/workspace", "g-1");
  await expectRouteData(response, rounds);
});

test("이전 라운드 조회가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(previousGateRounds).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handlePreviousGateRoundsRequest("g-1"), "boom");
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(humanGates).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  await expectRouteBdError(await handleHumanGatesRequest(), "boom");
});
