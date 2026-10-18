import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

const title = "그래프와 상세에서 옆 패널을 읽고 편집하며 관련 이슈로 이동하는 작업";

test.describe("폭 768px 창", () => {
  test.use({ viewport: { width: 768, height: 900 } });
  test("선행·후속 그래프의 상세와 옆 패널을 읽고 편집·이동·닫기를 실행한다", async ({
    page,
    workspace,
  }) => {
    const ids = await workspace.createIssues(
      {
        first: { title: `First ${title}` },
        second: { title: `Second ${title}` },
      },
      [["second", "first"]],
    );
    await workspace.bd(
      "comments",
      "add",
      ids.first,
      "패널에서 읽을 댓글입니다.",
      "--author",
      "검토자",
    );
    await page.goto(`/issues?issue=${ids.second}`);
    await page
      .getByRole("dialog")
      .getByRole("link", { name: messages.graph.blockingChain, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const canvas = dialog.getByRole("region", { name: messages.graph.canvas });
    await expect(canvas.locator(".react-flow__node")).toHaveCount(2);
    await canvas.getByRole("link", { name: new RegExp("Second") }).click();
    const detail = dialog.getByRole("region", {
      name: messages.issueDetail.dialog(ids.second),
      exact: true,
    });
    await detail
      .getByRole("region", { name: messages.issueDetail.linkedIssues, exact: true })
      .getByRole("link", { name: `${ids.first} First ${title}`, exact: true })
      .click();

    const side = dialog.getByRole("region", {
      name: messages.issueDetail.sidePanel(ids.first),
      exact: true,
    });
    await expect(side.getByRole("heading", { name: `First ${title}`, exact: true })).toBeVisible();
    await expect(side.getByRole("article")).toContainText("패널에서 읽을 댓글입니다.");
    await detail.getByRole("button", { name: `Second ${title}`, exact: true }).click();
    await detail
      .getByRole("textbox", { name: messages.issue.title, exact: true })
      .fill("옆 패널과 함께 고친 제목");
    await detail.getByRole("button", { name: messages.common.save, exact: true }).click();
    await expect
      .poll(() => workspace.showIssue(ids.second).then((issue) => issue.title), {
        timeout: SAVE_TIMEOUT,
      })
      .toBe("옆 패널과 함께 고친 제목");
    await expect(canvas.getByRole("link", { name: /옆 패널과 함께 고친 제목/ })).toBeVisible();

    await side.getByRole("link", { name: messages.issueDetail.openInMain, exact: true }).click();
    await expect(side).toHaveCount(0);
    const main = dialog.getByRole("region", {
      name: messages.issueDetail.dialog(ids.first),
      exact: true,
    });
    await expect(main.getByRole("button", { name: `First ${title}`, exact: true })).toBeVisible();
    await main
      .getByRole("link", { name: messages.issueDetail.backTo(ids.second), exact: true })
      .click();
    await expect(side).toBeVisible();
    await side
      .getByRole("link", { name: messages.issueDetail.closeSidePanel, exact: true })
      .click();
    await expect(side).toHaveCount(0);
    await detail.getByRole("button", { name: messages.common.close, exact: true }).first().click();

    await expect(dialog.getByRole("region", { name: messages.graph.canvas })).toBeVisible();
  });
});
