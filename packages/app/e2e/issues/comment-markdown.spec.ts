import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("화면에서 남긴 댓글은 bd에 저장되고 markdown으로 보인다", async ({ page, workspace }) => {
  const id = await workspace.createIssue("새 댓글 이슈");

  await page.goto("issues");
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
