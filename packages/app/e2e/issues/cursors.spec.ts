import { expect, test } from "../support/bdWorkspace";

test("여러 화면의 활성 버튼·링크·메뉴는 pointer를 보이고 비활성 요소는 조작 대상에서 빠진다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues({
    epic: { title: "에픽 묶음", type: "epic" },
    question: { title: "판단할 질문", type: "task", labels: ["human"] },
  });
  await page.goto("/issues");
  await expect(page.getByRole("link", { name: "이슈", exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  await expect(page.getByRole("button", { name: "설정", exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  const types = page.locator("summary", { hasText: "유형" });
  await expect(types).toHaveCSS("cursor", "pointer");
  await types.click();
  await expect(page.getByRole("checkbox", { name: "버그", exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  await expect(page.getByRole("combobox", { name: "날짜 기준" })).toHaveCSS("cursor", "pointer");

  await page.goto("/epics");
  await expect(page.getByRole("button", { name: new RegExp(`${epic} 하위 이슈`) })).toHaveCSS(
    "cursor",
    "pointer",
  );
  const disabledPicker = page.getByRole("combobox", { name: "기존 이슈를 하위로 넣기" });
  await expect(disabledPicker).toBeDisabled();
  await expect(disabledPicker).not.toHaveCSS("cursor", "pointer");

  await page.goto("/human");
  const question = page.getByRole("button", { name: /판단할 질문/ });
  await expect(question).toHaveCSS("cursor", "pointer");
  await expect(question.locator("span").first()).toHaveCSS("cursor", "pointer");
  const respond = page.getByRole("button", { name: "응답하고 닫기" });
  await expect(respond).toBeDisabled();
  await expect(respond).toHaveCSS("pointer-events", "none");
  await respond.scrollIntoViewIfNeeded();
  expect(
    await respond.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return target && getComputedStyle(target).cursor;
    }),
  ).not.toBe("pointer");
});

test("복사·텍스트 편집·보드 드래그·상세 로딩의 특수 커서는 유지한다", async ({
  page,
  workspace,
}) => {
  const ready = await workspace.createIssue("시작할 작업");
  await page.goto("/issues");
  await expect(page.getByRole("button", { name: `${ready} ID 복사` })).toHaveCSS("cursor", "copy");
  await expect(page.getByRole("searchbox", { name: "검색" })).toHaveCSS("cursor", "text");

  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/issues/${ready}`, async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.getByRole("link", { name: "시작할 작업", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-busy", "");
    await expect(page.getByRole("button", { name: /바로 작업 가능 묶음/ })).toHaveCSS(
      "cursor",
      "progress",
    );
    await expect(page.getByRole("link", { name: "시작할 작업", exact: true })).toHaveCSS(
      "cursor",
      "progress",
    );
  } finally {
    release();
  }
  const dialog = page.getByRole("dialog", { name: `${ready} 이슈` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "시작할 작업", exact: true })).toHaveCSS(
    "cursor",
    "text",
  );
  await page.keyboard.press("Escape");

  await page.goto("/board");
  const card = page.getByRole("link", { name: /시작할 작업/ });
  await expect(card).toHaveCSS("cursor", "grab");
  await card.hover();
  await page.mouse.down();
  try {
    await expect(card).toHaveCSS("cursor", "grabbing");
  } finally {
    await page.mouse.up();
  }
});
