import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { ALL_STATUSES, type IssueListFilter } from "@/shared/contract/issueList";
import { issue } from "@/shared/domain/issues/issueFixture";
import { useIssueCandidates, useIssueList } from "./useIssueList";

const readIssueList = vi.hoisted(() =>
  vi.fn<(filter: IssueListFilter) => Promise<ApiResponse<Issue[]>>>(),
);

vi.mock("@/client/infra/issues/issueApiClient", () => ({ readIssueList }));
vi.mock("@/client/infra/workspaceEvents/workspaceEventSource", () => ({
  awaitFirstInvalidation: () => Promise.resolve(),
  subscribeWorkspaceInvalidation: () => () => {},
}));

function ListLength() {
  const { data } = useIssueList();
  return <span>{data?.length ?? "읽는 중"}</span>;
}

function CandidatesLength() {
  const { data } = useIssueCandidates(true);
  return <span>{data?.length ?? "읽는 중"}</span>;
}

test("한 화면의 여러 component가 같은 이슈 목록을 한 번만 읽어 나눠 쓴다", async () => {
  readIssueList.mockResolvedValue({ ok: true, data: [issue("demo-1")] });

  const screen = await render(
    <div>
      <ListLength />
      <ListLength />
      <CandidatesLength />
    </div>,
  );

  await vi.waitFor(() => {
    expect(readIssueList).toHaveBeenCalledTimes(1);
    expect([...screen.container.querySelectorAll("span")].map((span) => span.textContent)).toEqual([
      "1",
      "1",
      "1",
    ]);
  });
  expect(readIssueList).toHaveBeenCalledWith(ALL_STATUSES);
});
