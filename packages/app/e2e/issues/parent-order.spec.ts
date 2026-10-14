import { expect, test } from "../support/bdWorkspace";

test("이슈 목록은 같은 묶음 안에서 하위 이슈를 우선순위와 관계없이 상위 이슈 바로 아래에 보인다", async ({
  page,
  workspace,
}) => {
  // bd의 만든 시각은 초 단위라 한 번에 만든 이슈는 우선순위로만 순서가 정해지게 합니다.
  await workspace.createIssues({
    urgent: { title: "급한 단독 작업", type: "task", priority: 0 },
    featureA: { title: "기능 가", type: "feature", priority: 1 },
    featureB: { title: "기능 나", type: "feature", priority: 2 },
    taskA1: { title: "기능 가의 첫 작업", type: "task", priority: 2, parent: "featureA" },
    taskA2: { title: "기능 가의 둘째 작업", type: "task", priority: 3, parent: "featureA" },
    taskB1: { title: "기능 나의 급한 작업", type: "task", priority: 0, parent: "featureB" },
  });

  await page.goto("/issues?view=ready");
  const issueRows = page.getByRole("row").filter({ has: page.getByRole("link") });
  await expect(issueRows).toHaveText([
    /급한 단독 작업/,
    /기능 가/,
    /기능 가의 첫 작업/,
    /기능 가의 둘째 작업/,
    /기능 나/,
    /기능 나의 급한 작업/,
  ]);
});
