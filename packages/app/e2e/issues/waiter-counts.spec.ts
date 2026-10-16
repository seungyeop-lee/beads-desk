import { expect, test } from "../support/bdWorkspace";

const WAITERS = /\d+개 대기/;

test("지금 화면과 이슈 목록의 행에 대기 수를 보이고, 같은 우선순위의 바로 작업 가능 이슈는 대기 수가 많은 것부터 보인다", async ({
  page,
  workspace,
}) => {
  // 우선순위와 만든 시각(초 단위)이 모두 같아, 대기 수가 아니면 병목 작업이 맨 위에 온다는 보장이 없습니다.
  await workspace.createIssues(
    {
      plainOne: { title: "평범한 작업 하나", type: "task" },
      plainTwo: { title: "평범한 작업 둘", type: "task" },
      plainThree: { title: "평범한 작업 셋", type: "task" },
      bottleneck: { title: "병목 작업", type: "task" },
      middle: { title: "중간 작업", type: "task" },
      last: { title: "마지막 작업", type: "task" },
      doing: { title: "진행하는 작업", type: "task", status: "in_progress" },
      afterDoing: { title: "진행 뒤 작업", type: "task" },
    },
    [
      ["middle", "bottleneck"],
      ["last", "middle"],
      ["afterDoing", "doing"],
    ],
  );

  await page.goto("/focus");
  const nextUp = page.getByRole("region", { name: "다음에 할 일" }).getByRole("listitem");
  await expect(nextUp).toHaveCount(4);
  await expect(nextUp.first()).toContainText("병목 작업");
  await expect(nextUp.first()).toContainText("2개 대기");
  await expect(nextUp.filter({ hasText: "평범한 작업" })).toHaveCount(3);
  for (const row of await nextUp.filter({ hasText: "평범한 작업" }).all()) {
    await expect(row).not.toContainText(WAITERS);
  }
  await expect(page.getByRole("region", { name: "진행 중", exact: true })).toContainText(
    "1개 대기",
  );
  const blocked = page.getByRole("region", { name: "막힘", exact: true }).getByRole("listitem");
  // 막힌 행에는 기다리는 이슈의 제목도 함께 보이므로, 제목 칸의 글자가 정확히 같은 행을 고릅니다.
  const blockedRow = (title: string) =>
    blocked.filter({ has: page.getByText(title, { exact: true }) });
  await expect(blockedRow("중간 작업")).toContainText("1개 대기");
  await expect(blockedRow("마지막 작업")).not.toContainText(WAITERS);

  await page.goto("/issues");
  const readyRows = page
    .getByRole("region", { name: "바로 작업 가능" })
    .getByRole("row")
    .filter({ has: page.getByRole("link") });
  await expect(readyRows).toHaveCount(4);
  await expect(readyRows.first()).toContainText("병목 작업");
  await expect(readyRows.first()).toContainText("2개 대기");
  for (const row of await readyRows.filter({ hasText: "평범한 작업" }).all()) {
    await expect(row).not.toContainText(WAITERS);
  }
  const doingRow = page
    .getByRole("region", { name: "진행 중" })
    .getByRole("row")
    .filter({ hasText: "진행하는 작업" });
  await expect(doingRow).toContainText("1개 대기");
});
