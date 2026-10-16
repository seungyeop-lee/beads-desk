import { expect, test } from "../support/bdWorkspace";

test("전체 관계 탭은 blocks, parent-child, related로 이어진 이슈를 한 묶음으로 그리고, 세 관계를 서로 다른 선 모양과 범례로 구분하며, 노드를 누르면 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const { epic, next, note } = await workspace.createIssues(
    {
      epic: { title: "관계 에픽", type: "epic" },
      task: { title: "관계 작업", parent: "epic" },
      next: { title: "관계 다음 작업" },
      note: { title: "관계 참고" },
      alone: { title: "관계 없음" },
    },
    [["next", "task"]],
  );
  await workspace.bd("dep", "add", note, next, "--type", "related");

  await page.goto("/graph?tab=relations");
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("관계 참고")).toBeVisible();
  await expect(node("관계 에픽")).toBeVisible();
  await expect(node("관계 에픽").getByText("에픽", { exact: true })).toBeVisible();
  await expect(node("관계 없음")).toHaveCount(0);
  await expect(page.getByText("관계가 없는 이슈 1개는 그리지 않았습니다.")).toBeVisible();

  const legend = page.getByRole("list", { name: "관계 범례" });
  await expect(legend.getByRole("listitem")).toHaveText(["blocks", "parent-child", "related"]);

  const dash = (type: string) =>
    canvas
      .getByRole("img", { name: new RegExp(`^${type} 관계:`) })
      .locator(".react-flow__edge-path")
      .evaluate((path) => getComputedStyle(path).strokeDasharray);
  const dashes = [await dash("blocks"), await dash("parent-child"), await dash("related")];
  expect(new Set(dashes).size).toBe(3);

  await node("관계 에픽").click();
  await expect(page.getByRole("dialog", { name: `${epic} 이슈` })).toBeVisible();
});
