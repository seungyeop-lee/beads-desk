import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("지금 화면의 판단 기다림 카드로 판단 기다림 화면에 가서 응답하면, 이슈가 닫히고 응답 댓글이 남는다", async ({
  page,
  workspace,
}) => {
  const { question } = await workspace.createIssues({
    question: {
      title: "인증 방식을 정해 주세요",
      type: "task",
      description: "OAuth2와 세션 쿠키 중 무엇으로 할까요?",
      labels: ["human"],
    },
    plain: { title: "평범한 작업", type: "task" },
  });

  await page.goto("/focus");
  await page.getByRole("link", { name: "판단 기다림 1", exact: true }).click();
  await expect(page).toHaveURL(/\/human$/);
  const decision = page.getByRole("region", { name: "인증 방식을 정해 주세요" });
  await expect(decision).toContainText("OAuth2와 세션 쿠키 중 무엇으로 할까요?");

  await decision.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("OAuth2로 진행해 주세요");
  await decision.getByRole("button", { name: "응답하고 닫기" }).click();

  await expect
    .poll(() => workspace.showIssue(question).then((issue) => issue.status), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("closed");
  expect(await commentTexts(workspace, question)).toEqual(["Response: OAuth2로 진행해 주세요"]);
  await expect(page.getByText("판단을 기다리는 이슈가 없습니다.")).toBeVisible();
});

test("응답 없이 닫는 동안에는 응답 편집기가 감춰지고 취소하면 적어 둔 응답이 남으며, 닫은 이슈는 판단 기다림 화면에서 사라지고 적은 사유가 닫은 사유로 남는다", async ({
  page,
  workspace,
}) => {
  const { stale } = await workspace.createIssues({
    stale: { title: "더는 필요 없는 질문", type: "task", priority: 1, labels: ["human"] },
    other: { title: "남은 질문", type: "task", priority: 2, labels: ["human"] },
  });

  await page.goto("/human");
  await page.getByRole("button", { name: /더는 필요 없는 질문/ }).click();
  const decision = page.getByRole("region", { name: "더는 필요 없는 질문" });
  const response = decision.getByRole("textbox", { name: "응답", exact: true });
  await response.click();
  await page.keyboard.type("아직 정하지 못했습니다");
  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();
  await expect(response).toBeHidden();
  await decision.getByRole("button", { name: "취소" }).click();
  await expect(response).toHaveText("아직 정하지 못했습니다");

  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();
  await decision.getByRole("textbox", { name: "닫는 사유" }).fill("요구 사항이 바뀜");
  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();

  await expect
    .poll(() => workspace.showIssue(stale).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Dismissed: 요구 사항이 바뀜");
  await expect(page.getByRole("button", { name: /더는 필요 없는 질문/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "남은 질문" })).toBeVisible();
});

test("이슈 목록에서는 판단을 기다리는 이슈에만 표시가 붙고, 그렇지 않은 이슈의 상세에는 응답 영역이 없다", async ({
  page,
  workspace,
}) => {
  const { plain } = await workspace.createIssues({
    question: { title: "판단이 필요한 작업", type: "task", labels: ["human"] },
    plain: { title: "평범한 작업", type: "task" },
  });

  await page.goto("/issues");
  await expect(page.getByRole("row", { name: /판단이 필요한 작업/ })).toContainText("판단 기다림");
  await expect(page.getByRole("row", { name: /평범한 작업/ })).not.toContainText("판단 기다림");

  await page.getByRole("link", { name: "평범한 작업" }).click();
  const dialog = page.getByRole("dialog", { name: `${plain} 이슈` });
  await expect(dialog.getByRole("textbox", { name: "새 댓글" })).toBeVisible();
  await expect(
    dialog.getByRole("region", { name: "사람의 판단을 기다리는 이슈입니다" }),
  ).toHaveCount(0);
});

async function commentTexts(workspace: BdWorkspace, id: string): Promise<string[]> {
  const comments: { text: string }[] = JSON.parse(await workspace.bd("comments", id, "--json"));
  return comments.map((comment) => comment.text);
}
