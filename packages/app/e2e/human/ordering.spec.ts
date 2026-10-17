import { expect, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

test("확인 요청과 질문 묶음은 각각 늦게 만든 항목부터 맨 위에 보인다", async ({
  page,
  workspace,
}) => {
  const { oldWork, newWork } = await workspace.createIssues({
    oldWork: { title: "오래된 작업", type: "task" },
    newWork: { title: "최근 작업", type: "task" },
  });
  await workspace.createIssues({
    oldQuestion: { title: "오래된 질문", type: "task", labels: ["human"] },
  });
  await createHumanGate(workspace, oldWork, "오래된 확인 요청");
  // bd가 이슈 만든 시각을 초 단위로 기록하므로, 요청 시각이 달라지게 항목을 만드는 사이에 1초 이상 기다립니다.
  const { promise: oneSecondPassed, resolve } = Promise.withResolvers();
  setTimeout(resolve, 1_100);
  await oneSecondPassed;

  await workspace.createIssues({
    newQuestion: { title: "최근 질문", type: "task", labels: ["human"] },
  });
  await createHumanGate(workspace, newWork, "최근 확인 요청");

  await page.goto("/human");
  const gates = page.getByRole("region", { name: "확인 요청", exact: true });
  const questions = page.getByRole("region", { name: "질문", exact: true });
  await expect(gates.getByRole("button")).toHaveText([
    new RegExp(`Review: ${newWork}`),
    new RegExp(`Review: ${oldWork}`),
  ]);
  await expect(questions.getByRole("button")).toHaveText([/최근 질문/, /오래된 질문/]);
});
