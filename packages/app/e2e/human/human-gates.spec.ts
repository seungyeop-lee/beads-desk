import type { Locator } from "@playwright/test";

import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { createHumanGate, expectRowGoneWhenNotified } from "../support/humanGates";

test("human gate는 막고 있는 작업과 함께 판단 기다림 화면에 나오고, 응답하면 gate가 닫히고 화면에서 빠진다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue(
    "로그인 화면 다시 그리기",
    "--description",
    "입력란 배치를 바꿉니다.",
  );
  const gate = await createHumanGate(workspace, work, "로그인 화면 수정 결과");

  await page.goto("/human");
  const decision = page.getByRole("region", { name: `Review: ${work}` });
  await expect(decision.getByRole("region", { name: "사유" })).toContainText(
    "로그인 화면 수정 결과",
  );
  const blocks = decision.getByRole("region", { name: "막고 있는 작업" });
  await expect(blocks.getByRole("link", { name: "로그인 화면 다시 그리기" })).toBeVisible();
  await expect(blocks).toContainText("입력란 배치를 바꿉니다.");

  await decision.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("버튼 색을 바꿔 주세요");
  await decision.getByRole("button", { name: "응답하고 닫기" }).click();
  await expectRowGoneWhenNotified(
    page,
    `${gate}에 응답하고 닫았습니다`,
    page.getByRole("button", { name: new RegExp(`Review: ${work}`) }),
  );

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Responded");
  await expect(page.getByText("판단을 기다리는 이슈가 없습니다.")).toBeVisible();
});

test("재판단을 기다리는 gate는 목록 행에 이전 라운드 수가 달리고, 고르면 같은 작업을 막았던 닫힌 gate의 피드백이 라운드마다 보이며, 라운드 제목으로 그 gate의 상세를 연다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("로그인 화면 다시 그리기");
  const first = await createHumanGate(workspace, work, "1차 결과 확인");
  await workspace.bd("comments", "add", first, "정정: 버튼 색도 함께 바꿔 주세요.");
  await workspace.bd("human", "respond", first, "버튼 색 수정 반영 확인");
  const second = await createHumanGate(workspace, work, "2차 결과 확인");
  await workspace.bd("human", "respond", second, "간격 조정 요청");
  await createHumanGate(workspace, work, "3차 결과 확인");

  await page.goto("/human");
  const row = page.getByRole("button", { name: new RegExp(`Review: ${work}\\b`) });
  // 선택 단추는 카드 위에 겹친 빈 요소라, 카드에 달린 표시는 단추를 품은 목록 항목에서 확인합니다.
  const card = (button: Locator) => page.getByRole("listitem").filter({ has: button });
  await expect(card(row).getByLabel("이전 게이트 라운드 2개")).toBeVisible();

  await row.click();
  const decision = page.getByRole("region", { name: `Review: ${work}`, exact: true });
  const feedback = decision.getByRole("region", { name: "이전 게이트 피드백" });
  await expect(feedback).toBeVisible();
  const rounds = feedback.locator(":scope > article");
  await expect(rounds).toHaveCount(2);
  // 라운드 순서가 정해지지 않으므로 인덱스 대신 게이트 id로 article을 찾는다.
  const firstRound = rounds.filter({ hasText: first });
  await expect(firstRound).toHaveCount(1);
  await expect(firstRound).toContainText("정정: 버튼 색도 함께 바꿔 주세요.");
  const secondRound = rounds.filter({ hasText: second });
  await expect(secondRound).toHaveCount(1);
  await expect(secondRound).toContainText("Response: 간격 조정 요청");
  await firstRound.getByRole("link", { name: `Review: ${work}` }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]issue=${first}`));
  await expect(page.getByRole("dialog", { name: `${first} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: `${first} 이슈` })).toBeHidden();
});
