import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

const KOREAN_TITLE =
  "여러 단계와 여러 묶음으로 나눈 작업에서도 긴 한국어 제목의 마지막 글자까지 읽고 다음 작업으로 이어지는 선행 관계를 확인하도록 표시합니다";
const ENGLISH_TITLE =
  "Read every word of this long English issue title without opening its detail or hovering, while keeping different node heights and all dependency edges readable";

// 그래프를 닫았을 때 출발 화면의 주소와 옆 패널로 돌아가는지는 이 시나리오에서만 확인합니다. 다른 그래프 시나리오에 같은 확인을 더하지 않습니다.
test("출발 목록을 유지하고 그래프 상세를 편집하며 Escape·닫기·브라우저 뒤로가기로 원래 상세와 옆 패널을 복원한다", async ({
  page,
  workspace,
}) => {
  const { first, second } = await workspace.createIssues(
    { first: { title: "모달 출발 선행" }, second: { title: "모달 출발 기준" } },
    [["second", "first"]],
  );
  const origin = `/issues?view=blocked&type=task&issue=${second}&side=${first}`;
  await page.goto(origin);
  await page
    .getByRole("dialog", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  const graph = page.getByRole("dialog");
  const canvas = graph.getByRole("region", { name: "의존 그래프" });
  await expect(graph.getByRole("heading", { level: 1 })).toHaveText("모달 출발 기준 · 선행·후속");
  await expect(page).toHaveURL(
    (url) => url.pathname === "/issues" && url.searchParams.get("view") === "blocked",
  );
  await page.goBack();
  await expect(page).toHaveURL(origin);
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
  await page.goForward();
  await expect(canvas).toBeVisible();
  await page.reload();
  await expect(canvas.getByRole("link", { name: /모달 출발 선행/ })).toBeVisible();
  await canvas.getByRole("link", { name: /모달 출발 선행/ }).click();
  const detail = graph.getByRole("region", { name: `${first} 이슈`, exact: true });
  await expect(detail).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await detail.getByRole("button", { name: "모달 출발 선행", exact: true }).click();
  await detail.getByRole("textbox", { name: "제목", exact: true }).fill("그래프에서 수정한 제목");
  await detail.getByRole("button", { name: "저장", exact: true }).click();
  await expect
    .poll(async () => (await workspace.showIssue(first)).title, { timeout: SAVE_TIMEOUT })
    .toBe("그래프에서 수정한 제목");
  await detail.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(canvas.getByRole("link", { name: /그래프에서 수정한 제목/ })).toBeVisible();
  const viewport = canvas.locator(".react-flow__viewport");
  const originalZoom = await viewport.evaluate(
    (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
  );
  await canvas.getByRole("button", { name: "축소", exact: true }).click();
  await expect
    .poll(() =>
      viewport.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a),
    )
    .toBeLessThan(originalZoom);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height * 0.8 - 40, { steps: 5 });
  await page.mouse.up();
  const before = await viewport.evaluate((element) => getComputedStyle(element).transform);
  await workspace.bd("update", first, "--title", KOREAN_TITLE);
  await expect(canvas.getByRole("link", { name: new RegExp(KOREAN_TITLE) })).toBeVisible();
  await expect(viewport).toHaveCSS("transform", before);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(origin);
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
  await page
    .getByRole("dialog", { name: `${second} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(canvas).toBeVisible();
  await graph.getByRole("link", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL(origin);
  await expect(page.getByRole("region", { name: `${first} 이슈 옆 패널` })).toBeVisible();
});

test("에픽 상세에서 연 그래프를 닫고 다시 열거나 기존 주소를 새로고침해도 그래프를 다시 그린다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "다시 여는 에픽", type: "epic" },
      first: { title: KOREAN_TITLE, parent: "epic" },
      second: { title: ENGLISH_TITLE, parent: "epic" },
    },
    [["second", "first"]],
  );
  const origin = `/epics?issue=${epic}`;
  await page.goto(origin);
  for (let visit = 0; visit < 2; visit++) {
    await page
      .getByRole("dialog", { name: `${epic} 이슈` })
      .getByRole("link", { name: "순서 보기" })
      .click();
    const graph = page.getByRole("dialog");
    const canvas = graph.getByRole("region", { name: "의존 그래프" });
    await expect(canvas.getByRole("link", { name: new RegExp(ENGLISH_TITLE) })).toBeVisible();
    await graph.getByRole("link", { name: "닫기", exact: true }).click();
    await expect(page).toHaveURL(origin);
  }
  await page.goto(`/graph?epic=${epic}`);
  await page.reload();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("region", { name: "의존 그래프" })
      .getByRole("link", { name: new RegExp(ENGLISH_TITLE) }),
  ).toBeVisible();
});

test("이슈 갱신으로 선후 관계 없음 패널이 나타나도 사용자가 고른 pan·zoom을 유지한다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "갱신 중 위치 유지", type: "epic" },
      first: { title: "위치 유지 먼저", parent: "epic" },
      second: { title: "위치 유지 다음", parent: "epic" },
    },
    [["second", "first"]],
  );
  await page.goto(`/graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /위치 유지 다음/ })).toBeVisible();
  const viewport = canvas.locator(".react-flow__viewport");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 70, box.y + box.height * 0.8 - 40, { steps: 5 });
  await page.mouse.up();
  const before = await viewport.evaluate((element) => getComputedStyle(element).transform);
  await workspace.createIssue("갱신으로 나타난 독립 작업", "--parent", epic);
  await expect(
    page
      .getByRole("region", { name: "선후 관계 없음" })
      .getByRole("link", { name: /갱신으로 나타난 독립 작업/ }),
  ).toBeVisible();
  await expect(viewport).toHaveCSS("transform", before);
});
