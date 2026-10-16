import { expect, test } from "../support/bdWorkspace";

test("계층 탭은 에픽, 기능, 작업을 깊이마다 오른쪽 열에 두고, 노드에 유형을 보이며, 노드를 누르면 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const { task } = await workspace.createIssues({
    epic: { title: "계층 에픽", type: "epic" },
    feature: { title: "계층 기능", type: "feature", parent: "epic" },
    task: { title: "계층 작업", parent: "feature" },
    alone: { title: "계층 관계 없음" },
  });

  await page.goto("/graph");
  await page.getByRole("tab", { name: "계층" }).click();
  await expect(page).toHaveURL(/tab=hierarchy/);

  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("계층 작업")).toBeVisible();
  await expect(node("계층 에픽").getByText("에픽", { exact: true })).toBeVisible();
  await expect(node("계층 기능").getByText("기능", { exact: true })).toBeVisible();
  await expect(node("계층 작업").getByText("작업", { exact: true })).toBeVisible();
  await expect(node("계층 관계 없음")).toHaveCount(0);
  await expect(page.getByText("상하위 관계가 없는 이슈 1개는 그리지 않았습니다.")).toBeVisible();

  const left = async (title: string) => (await node(title).boundingBox())!.x;
  const [epicX, featureX, taskX] = [
    await left("계층 에픽"),
    await left("계층 기능"),
    await left("계층 작업"),
  ];
  expect(epicX).toBeLessThan(featureX);
  expect(featureX).toBeLessThan(taskX);

  await node("계층 작업").click();
  await expect(page.getByRole("dialog", { name: `${task} 이슈` })).toBeVisible();
});
