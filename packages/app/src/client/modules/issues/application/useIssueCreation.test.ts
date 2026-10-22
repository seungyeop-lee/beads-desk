import { beforeEach, expect, test, vi } from "vitest";
import { createIssueAction } from "@/server/web/issues/issueActions";
import type { NewIssueInput } from "@/shared/contract/issueActions";
import { createIssueAndOpen } from "./useIssueCreation";
import type { IssueWrites } from "./useIssueWrites";

vi.mock("@/server/web/issues/issueActions", () => ({
  createIssueAction: vi.fn<typeof createIssueAction>(),
}));

const writes: IssueWrites = {
  pending: false,
  error: null,
  dismissError: vi.fn<() => void>(),
  run: (write) => write("demo"),
};

const INPUT: NewIssueInput = {
  title: "새 이슈",
  issueType: null,
  priority: null,
  description: "",
  labels: [],
  parent: null,
};

beforeEach(() => {
  vi.resetAllMocks();
});

test("만들기에 성공하면 쓴 뒤에 만든 이슈 id로 이동한다", async () => {
  const order: string[] = [];
  vi.mocked(createIssueAction).mockImplementation(async () => {
    order.push("write");
    return { ok: true, data: "demo-9" };
  });

  const created = await createIssueAndOpen(writes, INPUT, (issueId) => {
    order.push(`open:${issueId}`);
  });

  expect(createIssueAction).toHaveBeenCalledWith("demo", INPUT);
  expect(order).toEqual(["write", "open:demo-9"]);
  expect(created).toBe(true);
});

test("만들기에 실패하면 이동하지 않고 실패를 돌려준다", async () => {
  vi.mocked(createIssueAction).mockResolvedValue({ ok: false, error: "거부" });
  const open = vi.fn<(issueId: string) => void>();

  const created = await createIssueAndOpen(writes, INPUT, open);

  expect(open).not.toHaveBeenCalled();
  expect(created).toBe(false);
});
