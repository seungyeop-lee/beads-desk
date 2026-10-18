import type { IssueDetail } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issueDetail } from "@/shared/domain/issues/issueFixture";
import { HumanDecisionPanel } from "./HumanDecisionPanel";

const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write(),
};

test("판단을 기다리는 이슈의 상세에만 응답 영역이 있다", async () => {
  const screen = await render(<Panel issue={issueDetail("desk-plain")} />);
  expect(screen.getByRole("region").elements()).toHaveLength(0);

  await screen.rerender(<Panel issue={issueDetail("desk-question", { labels: ["human"] })} />);
  await expect
    .element(screen.getByRole("region", { name: messages.humanDecision.panelTitle }))
    .toBeVisible();
});

function Panel({ issue }: { issue: IssueDetail }) {
  return (
    <LocaleProvider locale="ko">
      <HumanDecisionPanel issue={issue} writes={WRITES} />
    </LocaleProvider>
  );
}
