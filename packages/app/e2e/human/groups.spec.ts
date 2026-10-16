import { expect, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

test("판단 기다림 화면은 human gate를 승인 요청 묶음에, human 라벨 질문을 질문 묶음에 나눠 보이고 각 묶음의 개수를 보인다", async ({
  page,
  workspace,
}) => {
  const { work } = await workspace.createIssues({
    work: { title: "로그인 화면 다시 그리기", type: "task" },
    question: { title: "인증 방식을 정해 주세요", type: "task", labels: ["human"] },
  });
  await createHumanGate(workspace, work, "로그인 화면 수정 결과");

  await page.goto("/human");
  const approvals = page.getByRole("region", { name: "승인 요청", exact: true });
  const questions = page.getByRole("region", { name: "질문", exact: true });
  await expect(approvals.getByRole("heading")).toHaveText("승인 요청1");
  await expect(
    approvals.getByRole("button", { name: new RegExp(`Review: ${work}`) }),
  ).toBeVisible();
  await expect(questions.getByRole("heading")).toHaveText("질문1");
  await expect(questions.getByRole("button", { name: /인증 방식을 정해 주세요/ })).toBeVisible();
});
