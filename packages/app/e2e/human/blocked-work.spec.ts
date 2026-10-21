import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

test("목록의 gate 링크로 human gate가 막는 작업의 상세를 응답 칸 주소로 열어 응답하면 gate가 닫히고 사람 확인 안내가 사라지며, 상세를 닫으면 주소에서 응답 칸 표시도 지운다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("로그인 화면 다시 그리기");
  const gate = await createHumanGate(workspace, work, "로그인 화면 수정 결과");
  const gateTitle = `Review: ${work}`;

  await page.goto("issues");
  await page.getByRole("link", { name: `사람 확인 기다림: ${gateTitle}` }).click();
  const dialog = page.getByRole("dialog", { name: `${work} 이슈` });
  // gate 링크로 연 상세만 응답 칸까지 스크롤합니다. 스크롤 위치는 IssueDetailDialog 컴포넌트 테스트가 확인합니다.
  await expect(page).toHaveURL(new RegExp(`[?&]issue=${work}&section=human-gate$`));
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
  await expect(panel).toHaveCount(0);

  await dialog.getByRole("button", { name: "닫기", exact: true }).first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page).not.toHaveURL(/section=/);
});
