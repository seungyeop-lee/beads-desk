import type { Locator } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

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
  // 선택 단추는 카드 위에 겹친 빈 요소라, 카드의 제목 글자 위를 가리켜도 그 단추가 받아 pointer를 보입니다.
  const questionTitle = page
    .getByRole("region", { name: "질문", exact: true })
    .getByText("판단할 질문", { exact: true });
  expect(
    await questionTitle.evaluate((title) => {
      const rect = title.getBoundingClientRect();
      const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return target && getComputedStyle(target).cursor;
    }),
  ).toBe("pointer");
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

test("ID가 보이는 화면마다 ID는 copy 커서를 보이고 'ID 복사' 이름을 가진 단추다", async ({
  page,
  workspace,
}) => {
  const { epic, first, second, loose, decision, question, bug } = await workspace.createIssues(
    {
      epic: { title: "복사 에픽", type: "epic" },
      first: { title: "복사 선행 작업", type: "task", parent: "epic" },
      second: { title: "복사 후속 작업", type: "task", parent: "epic" },
      loose: { title: "복사 독립 작업", type: "task", parent: "epic" },
      decision: { title: "복사 결정", type: "decision" },
      question: { title: "복사 질문", type: "task", labels: ["human"] },
      bug: { title: "복사 버그", type: "bug", description: "가끔 실패합니다." },
    },
    [["second", "first"]],
  );
  const gate = await createHumanGate(workspace, second, "복사 확인");
  const expectCopyButton = (scope: Locator, id: string) =>
    expect(scope.getByRole("button", { name: `${id} ID 복사`, exact: true })).toHaveCSS(
      "cursor",
      "copy",
    );
  const main = page.getByRole("main");
  const region = (name: string) => page.getByRole("region", { name, exact: true });

  await page.goto("/epics");
  await expectCopyButton(main, epic);
  await page.goto("/decisions");
  await expectCopyButton(main, decision);
  await page.goto("/focus");
  await expectCopyButton(region("막힘"), second);
  await page.goto("/board");
  await expectCopyButton(region("막힘"), second);
  await page.goto("/hygiene");
  await expectCopyButton(region("권장 섹션이 빠진 이슈"), bug);

  await page.goto(`/graph?epic=${epic}`);
  await expectCopyButton(region("의존 그래프"), first);
  await expectCopyButton(region("선후 관계 없음"), loose);

  await page.goto("/human");
  await expectCopyButton(region("확인 요청"), gate);
  await expectCopyButton(region("질문"), question);
  const gateDecision = region(`Review: ${second}`);
  await expectCopyButton(gateDecision.locator("header"), gate);
  await expectCopyButton(gateDecision.getByRole("region", { name: "막고 있는 작업" }), second);
  await page.getByRole("button", { name: `${question} 복사 질문` }).click();
  await expectCopyButton(region("복사 질문"), question);

  await page.goto(`/issues?issue=${second}&side=${first}`);
  const dialog = page.getByRole("dialog", { name: `${second} 이슈` });
  await expectCopyButton(dialog.locator("header").first(), second);
  await expectCopyButton(
    dialog.getByRole("region", { name: "먼저 끝나야 하는 이슈가 있습니다" }),
    first,
  );
  await expectCopyButton(dialog.getByRole("region", { name: "연결된 이슈" }).first(), first);
  await expectCopyButton(
    dialog.getByRole("region", { name: "사람의 확인을 기다리는 작업입니다" }),
    gate,
  );
  await expectCopyButton(dialog.getByRole("region", { name: `${first} 이슈 옆 패널` }), first);
});
