import { humanGates, type HumanGate, type Issue } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleHumanGatesRequest } from "./humanGatesRouteApi";

vi.mock("@beads-desk/bd", () => ({
  humanGates: vi.fn<typeof humanGates>(),
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
    { gate: { id: "g-1" } as Issue, reason: "리뷰 요청", blocks: [{ id: "t-1" } as Issue] },
  ] satisfies HumanGate[];
  vi.mocked(humanGates).mockResolvedValue({ ok: true, value: gates });

  const response = await handleHumanGatesRequest();

  expect(humanGates).toHaveBeenCalledWith("/workspace");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: gates });
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
