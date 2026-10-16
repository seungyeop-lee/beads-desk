import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { commentTexts, createHumanGate } from "../support/humanGates";

test("human gate가 막는 작업은 지금 화면, 목록, 보드에서 사람 확인 기다림과 gate 제목으로 보이고, 상세에서 응답하면 gate만 닫히고 사람 확인 안내가 사라진다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("로그인 화면 다시 그리기");
  const gate = await createHumanGate(workspace, work, "로그인 화면 수정 결과");
  const gateTitle = `Review: ${work}`;

  await page.goto("/focus");
  const focusRow = page
    .getByRole("region", { name: "막힘" })
    .getByRole("link", { name: /로그인 화면 다시 그리기/ });
  await expect(focusRow).toContainText("사람 확인 기다림");
  await expect(focusRow).toContainText(gateTitle);

  await page.goto("/board");
  const card = page
    .getByRole("region", { name: "막힘" })
    .getByRole("link", { name: /로그인 화면 다시 그리기/ });
  await expect(card).toContainText("사람 확인 기다림");
  await expect(card).toContainText(gateTitle);

  await page.goto("/issues");
  await page.getByRole("link", { name: `사람 확인 기다림: ${gateTitle}` }).click();
  const dialog = page.getByRole("dialog", { name: `${work} 이슈` });
  const panel = dialog.getByRole("region", { name: "사람의 확인을 기다리는 작업입니다" });
  const item = panel.getByRole("region", { name: gateTitle });
  await expect(item.getByRole("region", { name: "사유" })).toContainText("로그인 화면 수정 결과");

  await item.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("버튼 색을 바꿔 주세요");
  await item.getByRole("button", { name: "응답하고 닫기" }).click();

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Responded");
  expect(await commentTexts(workspace, gate)).toEqual(["Response: 버튼 색을 바꿔 주세요"]);
  expect((await workspace.showIssue(work)).status).toBe("open");
  await expect(panel).toHaveCount(0);
});
