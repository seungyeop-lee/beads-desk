import { expect, test } from "../support/bdWorkspace";

// bd는 blocks 순환을 만드는 의존 추가를 모두 거절하므로, 순환 경고는 화면에서 만들 수 없어 unit test(epicPlan, executionOrder)로 확인합니다.
test("에픽 순서 보기는 열마다 단계 이름과 위쪽의 진행 요약을 보이고, 후손 이슈를 막는 에픽 밖 이슈를 점선 노드로, 노드마다 대기 수를 보인다", async ({
  page,
  workspace,
}) => {
  const {
    epic,
    first,
    third,
    outside: outsideId,
  } = await workspace.createIssues(
    {
      epic: { title: "계획 에픽", type: "epic" },
      first: { title: "계획 첫째", parent: "epic", status: "closed" },
      second: { title: "계획 둘째", parent: "epic" },
      third: { title: "계획 셋째", parent: "epic" },
      fourth: { title: "계획 넷째", parent: "epic" },
      outside: { title: "계획 밖 선행" },
      loose: { title: "계획 순서 없음", parent: "epic" },
    },
    [
      ["second", "first"],
      ["third", "second"],
      ["fourth", "third"],
      ["outside", "first"],
      ["third", "outside"],
    ],
  );

  await page.goto(`/graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("계획 넷째")).toBeVisible();

  await expect(page.getByText("전체 4단계 중 2단계 진행 중")).toBeVisible();
  await expect(canvas.getByText("1단계 · 완료")).toBeVisible();
  const current = canvas.getByText("2단계 · 진행 중");
  await expect(current).toBeVisible();
  await expect(canvas.getByText("3단계", { exact: true })).toBeVisible();
  await expect(canvas.getByText("4단계", { exact: true })).toBeVisible();
  expect((await current.boundingBox())!.x).toBeCloseTo(
    (await node("계획 둘째").boundingBox())!.x,
    0,
  );

  const outside = node("계획 밖 선행");
  await expect(outside).toContainText("에픽 밖");
  await expect(outside).toHaveCSS("border-top-style", "dashed");
  await expect(node("계획 둘째")).not.toContainText("에픽 밖");
  await expect(canvas.getByLabel(`${first} 다음에 ${outsideId}`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${outsideId} 다음에 ${third}`)).toHaveCount(1);

  await expect(node("계획 둘째")).toContainText("2개 대기");
  await expect(outside).toContainText("2개 대기");
  await expect(node("계획 넷째")).not.toContainText("대기");

  const unordered = page.getByRole("region", { name: "순서 미정" });
  await expect(unordered.getByRole("link", { name: /계획 순서 없음/ })).toBeVisible();
  await expect(node("계획 순서 없음")).toHaveCount(0);
});
