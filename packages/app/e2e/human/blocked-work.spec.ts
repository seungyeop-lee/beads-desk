import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { commentTexts, createHumanGate } from "../support/humanGates";

test("human gate가 막는 작업은 지금 화면, 목록, 보드에서 사람 확인 기다림과 gate 제목으로 보이고, 상세에서 응답하면 gate만 닫히고 사람 확인 안내가 사라진다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("로그인 화면 다시 그리기");
  const gate = await createHumanGate(workspace, work, "로그인 화면 수정 결과");
  const gateTitle = `Review: ${work}`;

  await page.goto("/focus");
  // 행과 카드의 링크는 위에 겹친 빈 요소라, 보이는 글자는 링크를 품은 목록 항목에서 확인합니다.
  const blockedItem = page
    .getByRole("region", { name: "막힘" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: /로그인 화면 다시 그리기/ }) });
  const focusRow = blockedItem;
  await expect(focusRow).toContainText("사람 확인 기다림");
  await expect(focusRow).toContainText(gateTitle);

  await page.goto("/board");
  const card = blockedItem;
  await expect(card).toContainText("사람 확인 기다림");
  await expect(card).toContainText(gateTitle);

  await page.goto("/issues");
  await page.getByRole("link", { name: `사람 확인 기다림: ${gateTitle}` }).click();
  const dialog = page.getByRole("dialog", { name: `${work} 이슈` });
  const panel = dialog.getByRole("region", { name: "사람의 확인을 기다리는 작업입니다" });
  const item = panel.getByRole("region", { name: gateTitle });
  await expect(item.getByRole("region", { name: "사유" })).toContainText("로그인 화면 수정 결과");

  await item.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("버튼 색을 바꿔 주세요");
  await item.getByRole("button", { name: "응답하고 닫기" }).click();

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Responded");
  expect(await commentTexts(workspace, gate)).toEqual(["Response: 버튼 색을 바꿔 주세요"]);
  expect((await workspace.showIssue(work)).status).toBe("open");
  await expect(panel).toHaveCount(0);
});

test("열린 gate 목록을 받기 전에는 human gate에 막힌 작업에 다른 막는 이슈를 보이지 않고, 받은 뒤 지금 화면, 보드, 목록, 에픽에서 사람 확인 기다림을 보인다", async ({
  page,
  workspace,
}) => {
  const { prior, work } = await workspace.createIssues(
    {
      epic: { title: "묶음 에픽", type: "epic" },
      prior: { title: "선행 작업", type: "task" },
      work: { title: "검토받을 작업", type: "task", parent: "epic" },
    },
    [["work", "prior"]],
  );
  const gate = await createHumanGate(workspace, work, "결과 확인");
  const gateTitle = `Review: ${work}`;

  // 화면마다 열린 gate 목록 응답을 붙잡아 두고, 이슈 목록만 받은 상태의 막힘 표시를 확인한 뒤 풀어 줍니다.
  let heldGates = Promise.resolve();
  await page.route("**/api/human-gates", async (route) => {
    await heldGates;
    await route.continue();
  });
  const screens = page.getByRole("navigation", { name: "화면" });
  const blockedWork = page
    .getByRole("region", { name: "막힘" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: /검토받을 작업/ }) });
  const workRow = page.getByRole("row").filter({ hasText: "검토받을 작업" });

  for (const { href, item } of [
    { href: "/focus", item: blockedWork },
    { href: "/board", item: blockedWork },
    { href: "/issues", item: workRow },
    { href: "/epics", item: workRow },
  ]) {
    let releaseGates = () => {};
    heldGates = new Promise<void>((resolve) => {
      releaseGates = resolve;
    });
    try {
      // 지금 화면 다음부터는 상단 메뉴로 이동합니다. 주소가 바뀌기 전에는 앞 화면의 행이 item에 걸려, 그 행을 검사하게 됩니다.
      if (href === "/focus") await page.goto(href);
      else await screens.locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(item).toBeVisible();
      // 막는 이슈의 순서가 실행마다 달라, gate가 먼저 오면 gate id가 일반 막는 이슈처럼 보일 수 있으므로 두 id를 모두 확인합니다.
      await expect(item).not.toContainText(prior);
      await expect(item).not.toContainText(gate);
      await expect(item).not.toContainText("사람 확인 기다림");
    } finally {
      releaseGates();
    }
    await expect(item).toContainText("사람 확인 기다림");
    await expect(item).toContainText(gateTitle);
  }
});
