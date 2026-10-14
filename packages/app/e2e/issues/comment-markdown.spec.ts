import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("댓글 본문은 markdown으로 렌더링되고, 원문 HTML은 요소로 렌더링되지 않는다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("댓글 이슈");
  await workspace.bd(
    "comments",
    "add",
    id,
    "## 조사 결과\n\n- 첫 항목\n\n`bd-code`\n\n<b>원문 HTML</b>",
  );

  await page.goto("/issues");
  await page.getByRole("link", { name: "댓글 이슈" }).click();
  const comment = page.getByRole("dialog", { name: `${id} 이슈` }).getByRole("article");

  await expect(comment.getByRole("heading", { name: "조사 결과" })).toBeVisible();
  await expect(comment.getByRole("listitem")).toHaveText("첫 항목");
  await expect(comment.getByRole("code")).toHaveText("bd-code");
  await expect(comment).not.toContainText("##");
  await expect(comment.getByText("원문 HTML")).toBeVisible();
  await expect(comment.locator("b")).toHaveCount(0);
});

test("화면에서 남긴 댓글은 bd에 저장되고 markdown으로 보인다", async ({ page, workspace }) => {
  const id = await workspace.createIssue("새 댓글 이슈");

  await page.goto("/issues");
  await page.getByRole("link", { name: "새 댓글 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("textbox", { name: "새 댓글" }).click();
  await page.keyboard.type("**강조한 댓글**");
  await dialog.getByRole("button", { name: "댓글 남기기" }).click();

  await expect
    .poll(() => commentTexts(workspace, id), { timeout: SAVE_TIMEOUT })
    .toEqual(["**강조한 댓글**"]);
  await expect(dialog.getByRole("article").getByRole("strong")).toHaveText("강조한 댓글");
});

async function commentTexts(workspace: BdWorkspace, id: string): Promise<string[]> {
  const comments: { text: string }[] = JSON.parse(await workspace.bd("comments", id, "--json"));
  return comments.map((comment) => comment.text);
}
