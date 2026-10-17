import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { commentTexts, createHumanGate } from "../support/humanGates";

test("human gate는 막고 있는 작업과 함께 판단 기다림 화면에 나오고, 응답하면 gate만 닫히고 응답이 gate 댓글로 남는다", async ({
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
  await expect(page).toHaveURL(/\/human/);
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

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Responded");
  expect(await commentTexts(workspace, gate)).toEqual(["Response: 버튼 색을 바꿔 주세요"]);
  expect((await workspace.showIssue(work)).status).toBe("open");
  await expect(page.getByText("판단을 기다리는 이슈가 없습니다.")).toBeVisible();
});

test("human 라벨이 붙은 human gate를 응답 없이 닫으면 적은 사유가 닫은 사유로 남고 막고 있던 작업은 열린 채로 남는다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("회원 가입 화면");
  const gate = await createHumanGate(workspace, work, "회원 가입 화면 결과", { humanLabel: true });

  await page.goto("/human");
  const decision = page.getByRole("region", { name: `Review: ${work}` });
  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();
  await decision.getByRole("textbox", { name: "닫는 사유" }).fill("작업을 그만둠");
  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Dismissed: 작업을 그만둠");
  expect((await workspace.showIssue(work)).status).toBe("open");
  await expect(page.getByText("판단을 기다리는 이슈가 없습니다.")).toBeVisible();
});

test("재판단을 기다리는 gate를 고르면 같은 작업을 막았던 닫힌 gate의 피드백이 오래된 라운드부터 보이고, 목록 행에 이전 라운드 수가 달린다", async ({
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

  const freshWork = await workspace.createIssue("회원 가입 화면 그리기");
  await createHumanGate(workspace, freshWork, "회원 가입 결과 확인");

  await page.goto("/human");
  const row = page.getByRole("button", { name: new RegExp(`Review: ${work}\\b`) });
  await expect(row.getByLabel("이전 게이트 라운드 2개")).toBeVisible();
  const freshRow = page.getByRole("button", { name: new RegExp(`Review: ${freshWork}\\b`) });
  await expect(freshRow.getByLabel(/이전 게이트 라운드/)).toHaveCount(0);

  await row.click();
  const feedback = page
    .getByRole("region", { name: `Review: ${work}`, exact: true })
    .getByRole("region", { name: "이전 게이트 피드백" });
  await expect(feedback).toBeVisible();
  const rounds = feedback.locator(":scope > article");
  await expect(rounds).toHaveCount(2);
  await expect(rounds.nth(0)).toContainText(first);
  await expect(rounds.nth(0)).toContainText("정정: 버튼 색도 함께 바꿔 주세요.");
  await expect(rounds.nth(1)).toContainText(second);
  await expect(rounds.nth(1)).toContainText("Response: 간격 조정 요청");
  const firstRound = await rounds.nth(0).innerText();
  expect(firstRound.indexOf("정정:")).toBeLessThan(
    firstRound.indexOf("Response: 버튼 색 수정 반영 확인"),
  );

  await freshRow.click();
  const freshDecision = page.getByRole("region", {
    name: `Review: ${freshWork}`,
    exact: true,
  });
  await expect(freshDecision.getByRole("region", { name: "이전 게이트 피드백" })).toHaveCount(0);
});
