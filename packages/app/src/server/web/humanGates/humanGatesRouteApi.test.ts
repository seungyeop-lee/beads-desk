import {
  humanGates,
  type HumanGate,
  type Issue,
  previousGateRounds,
  type PreviousGateRound,
} from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleHumanGatesRequest, handlePreviousGateRoundsRequest } from "./humanGatesRouteApi";

vi.mock("@beads-desk/bd", () => ({
  humanGates: vi.fn<typeof humanGates>(),
  previousGateRounds: vi.fn<typeof previousGateRounds>(),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

test("workspace의 열린 human gate와 막고 있는 이슈를 돌려준다", async () => {
  const gates = [
    {
      gate: { id: "g-1" } as Issue,
      reason: "리뷰 요청",
      blocks: [{ id: "t-1" } as Issue],
      previousGateCount: 0,
    },
  ] satisfies HumanGate[];
  vi.mocked(humanGates).mockResolvedValue({ ok: true, value: gates });

  const response = await handleHumanGatesRequest();

  expect(humanGates).toHaveBeenCalledWith("/workspace");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: gates });
});

test("고른 gate의 이전 라운드 기록을 돌려준다", async () => {
  const rounds = [
    {
      gate: { id: "g-0" } as Issue,
      closeReason: "Responded",
      comments: [{ id: "c-1", author: "seungyeop", text: "Response: 승인", createdAt: 0 }],
    },
  ] satisfies PreviousGateRound[];
  vi.mocked(previousGateRounds).mockResolvedValue({ ok: true, value: rounds });

  const response = await handlePreviousGateRoundsRequest("g-1");

  expect(previousGateRounds).toHaveBeenCalledWith("/workspace", "g-1");
  expect(await response.json()).toEqual({ ok: true, data: rounds });
});

test("이전 라운드 조회가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(previousGateRounds).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handlePreviousGateRoundsRequest("g-1");

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(humanGates).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleHumanGatesRequest();

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
