import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("human gate는 막고 있는 작업과 함께 판단 기다림 화면에 나오고, 피드백을 남겨도 열린 채로 남는다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue(
    "로그인 화면 다시 그리기",
    "--description",
    "입력란 배치를 바꿉니다.",
  );
  const gate = await createHumanGate(workspace, work, "로그인 화면 수정 결과");

  await page.goto("/focus");
  await page.getByRole("link", { name: "판단 기다림 1", exact: true }).click();
  await expect(page).toHaveURL(/\/human$/);
  const decision = page.getByRole("region", { name: `Review: ${work}` });
  await expect(decision.getByRole("region", { name: "사유" })).toContainText(
    "로그인 화면 수정 결과",
  );
  const blocks = decision.getByRole("region", { name: "막고 있는 작업" });
  await expect(blocks.getByRole("link", { name: "로그인 화면 다시 그리기" })).toBeVisible();
  await expect(blocks).toContainText("입력란 배치를 바꿉니다.");

  await decision.getByRole("textbox", { name: "피드백", exact: true }).click();
  await page.keyboard.type("버튼 색을 바꿔 주세요");
  await decision.getByRole("button", { name: "피드백 남기기" }).click();

  await expect
    .poll(() => commentTexts(workspace, gate), { timeout: SAVE_TIMEOUT })
    .toEqual(["버튼 색을 바꿔 주세요"]);
  await expect(
    decision.getByRole("region", { name: "피드백" }).getByText("버튼 색을 바꿔 주세요"),
  ).toBeVisible();
  expect((await workspace.showIssue(gate)).status).toBe("open");
  await expect(page.getByRole("button", { name: /Review:/ })).toHaveCount(1);
});

test("human gate를 승인하면 gate만 닫히고 막고 있던 작업은 열린 채로 남는다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("회원 가입 화면");
  const gate = await createHumanGate(workspace, work, "회원 가입 화면 결과");

  await page.goto("/human");
  const decision = page.getByRole("region", { name: `Review: ${work}` });
  await decision.getByRole("textbox", { name: "승인 메모" }).fill("배포해도 됩니다");
  await decision.getByRole("button", { name: "승인하고 막힘 풀기" }).click();

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Approved: 배포해도 됩니다");
  expect((await workspace.showIssue(work)).status).toBe("open");
  await expect(page.getByText("판단을 기다리는 이슈가 없습니다.")).toBeVisible();
});

/** bds-multi가 리뷰를 요청할 때처럼 human gate를 만듭니다. human 라벨은 붙이지 않습니다. */
async function createHumanGate(
  workspace: BdWorkspace,
  blocks: string,
  reason: string,
): Promise<string> {
  const created: { id: string } = JSON.parse(
    await workspace.bd(
      "gate",
      "create",
      "--type=human",
      "--blocks",
      blocks,
      "--title",
      `Review: ${blocks}`,
      "--reason",
      reason,
      "--json",
    ),
  );
  return created.id;
}

async function commentTexts(workspace: BdWorkspace, id: string): Promise<string[]> {
  const comments: { text: string }[] | null = JSON.parse(
    await workspace.bd("comments", id, "--json"),
  );
  return (comments ?? []).map((comment) => comment.text);
}
