import type { Locator } from "@playwright/test";

import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { commentTexts, createHumanGate } from "../support/humanGates";

/** 상세 카드 직속 섹션의 접근 가능한 이름을 DOM 순서대로 모읍니다. 응답 섹션은 제목(h3)이 접근 가능한 이름입니다. */
function directSectionNames(decision: Locator) {
  return decision
    .locator(":scope > section")
    .evaluateAll((sections) =>
      sections.map(
        (section) =>
          section.getAttribute("aria-label") ?? section.querySelector("h3")?.textContent ?? "",
      ),
    );
}

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

test("재판단을 기다리는 gate를 고르면 같은 작업을 막았던 닫힌 gate의 피드백이 라운드마다 보이고, 상세는 사유, 응답, 이전 게이트 피드백, 막고 있는 작업 순이며, 목록 행에 이전 라운드 수가 달린다", async ({
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
  const decision = page.getByRole("region", { name: `Review: ${work}`, exact: true });
  const feedback = decision.getByRole("region", { name: "이전 게이트 피드백" });
  await expect(feedback).toBeVisible();
  // 피드백 안 라운드 순서는 같은 초에 만든 라운드가 정렬 동률이라 정해지지 않으므로 여기서는 섹션 순서만 확인한다. 동률 규칙은 packages/bd 단위 테스트가 고정한다.
  expect(await directSectionNames(decision)).toEqual([
    "사유",
    "응답",
    "이전 게이트 피드백",
    "막고 있는 작업",
  ]);
  const rounds = feedback.locator(":scope > article");
  await expect(rounds).toHaveCount(2);
  // 라운드 순서가 정해지지 않으므로 인덱스 대신 게이트 id로 article을 찾는다.
  const firstRound = rounds.filter({ hasText: first });
  await expect(firstRound).toHaveCount(1);
  await expect(firstRound).toContainText("정정: 버튼 색도 함께 바꿔 주세요.");
  const secondRound = rounds.filter({ hasText: second });
  await expect(secondRound).toHaveCount(1);
  await expect(secondRound).toContainText("Response: 간격 조정 요청");
  const firstRoundText = await firstRound.innerText();
  expect(firstRoundText.indexOf("정정:")).toBeLessThan(
    firstRoundText.indexOf("Response: 버튼 색 수정 반영 확인"),
  );
  await firstRound.getByRole("link", { name: `Review: ${work}` }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]issue=${first}`));
  await expect(page.getByRole("dialog", { name: `${first} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: `${first} 이슈` })).toBeHidden();

  await freshRow.click();
  const freshDecision = page.getByRole("region", {
    name: `Review: ${freshWork}`,
    exact: true,
  });
  await expect(freshDecision.getByRole("region", { name: "사유" })).toBeVisible();
  expect(await directSectionNames(freshDecision)).toEqual(["사유", "응답", "막고 있는 작업"]);
  await expect(freshDecision.getByRole("region", { name: "이전 게이트 피드백" })).toHaveCount(0);
});
