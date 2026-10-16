import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

test("지금 화면이 아닌 화면에서도 상단 판단 기다림 탭 옆에 지금 화면 카드와 같은 개수가 보인다", async ({
  page,
  workspace,
}) => {
  const { work } = await workspace.createIssues({
    question: { title: "인증 방식을 정해 주세요", type: "task", labels: ["human"] },
    answered: { title: "답한 질문", type: "task", status: "closed", labels: ["human"] },
    work: { title: "리뷰 받을 작업", type: "task" },
  });
  await createHumanGate(workspace, work, "화면 확인", { humanLabel: true });

  await page.goto("/focus");
  await expect(page.getByRole("link", { name: "판단 기다림 2", exact: true })).toBeVisible();

  const screens = page.getByRole("navigation", { name: "화면" });
  await screens.getByRole("link", { name: "이슈", exact: true }).click();
  await expect(page).toHaveURL(/\/issues/);
  await expect(screens.getByRole("link", { name: "판단 기다림 2개", exact: true })).toBeVisible();
});

test("판단 기다림 화면에서 하나를 응답하고 닫으면 새로고침하지 않아도 탭의 개수가 하나 줄어든다", async ({
  page,
  workspace,
}) => {
  const { question } = await workspace.createIssues({
    question: { title: "인증 방식을 정해 주세요", type: "task", priority: 1, labels: ["human"] },
    other: { title: "배포 시점을 정해 주세요", type: "task", priority: 2, labels: ["human"] },
  });

  await page.goto("/human");
  const tab = (name: string) =>
    page.getByRole("navigation", { name: "화면" }).getByRole("link", { name, exact: true });
  await expect(tab("판단 기다림 2개")).toBeVisible();

  await page.getByRole("button", { name: /인증 방식을 정해 주세요/ }).click();
  const decision = page.getByRole("region", { name: "인증 방식을 정해 주세요" });
  await decision.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("OAuth2로 진행해 주세요");
  await decision.getByRole("button", { name: "응답하고 닫기" }).click();

  await expect
    .poll(() => workspace.showIssue(question).then((issue) => issue.status), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("closed");
  await expect(tab("판단 기다림 1개")).toBeVisible();
});

test("판단할 일이 없으면 탭에 개수가 없고, bd CLI로 human 라벨을 붙이거나 닫으면 탭의 개수가 따라 바뀐다", async ({
  page,
  workspace,
}) => {
  const plain = await workspace.createIssue("평범한 작업");

  await page.goto("/issues");
  const screens = page.getByRole("navigation", { name: "화면" });
  await expect(page.getByRole("link", { name: "평범한 작업" })).toBeVisible();
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();

  await workspace.bd("label", "add", plain, "human");
  await expect(screens.getByRole("link", { name: "판단 기다림 1개", exact: true })).toBeVisible();

  await workspace.bd("close", plain);
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();
});
