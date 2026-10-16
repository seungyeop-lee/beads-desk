import { expect, test } from "../support/bdWorkspace";

test("human 라벨 질문은 지금 화면의 작업 묶음과 보드 열에 나오지 않고, 이슈 목록에서는 판단 기다림 묶음에 나온다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    question: { title: "인증 방식을 정해 주세요", type: "task", labels: ["human"] },
    asking: {
      title: "배포 시점을 정해 주세요",
      type: "task",
      status: "in_progress",
      labels: ["human"],
    },
    plain: { title: "평범한 작업", type: "task" },
  });

  await page.goto("/focus");
  await expect(page.getByRole("link", { name: "판단 기다림 2", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "진행 중 0", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "바로 작업 가능 1", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "다음에 할 일" })).toContainText("평범한 작업");
  await expect(page.getByRole("link", { name: /인증 방식을 정해 주세요/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /배포 시점을 정해 주세요/ })).toHaveCount(0);

  await page.goto("/board");
  await expect(page.getByRole("link", { name: /평범한 작업/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /인증 방식을 정해 주세요/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /배포 시점을 정해 주세요/ })).toHaveCount(0);

  await page.goto("/issues");
  const tabs = page.getByRole("navigation", { name: "보기" });
  await expect(tabs.getByRole("link", { name: "전체 3" })).toHaveAttribute("aria-current", "page");
  const awaiting = page.getByRole("region", { name: "판단 기다림" });
  await expect(awaiting.getByRole("link", { name: "인증 방식을 정해 주세요" })).toBeVisible();
  await expect(awaiting.getByRole("link", { name: "배포 시점을 정해 주세요" })).toBeVisible();
  await expect(page.getByRole("region", { name: "바로 작업 가능" })).not.toContainText(
    "인증 방식을 정해 주세요",
  );
});
