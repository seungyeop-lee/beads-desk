import { expect, test } from "../support/bdWorkspace";

test("상세의 선행·후속 그래프는 blocks 관계가 있는 이슈에만 보이고, 누르면 그 이슈의 앞뒤 blocks 사슬을 닫힌 이슈까지 그리며 기준 이슈 노드만 강조한다", async ({
  page,
  workspace,
}, testInfo) => {
  const { center, alone, before, note } = await workspace.createIssues(
    {
      root: { title: "사슬 맨 앞" },
      before: { title: "사슬 앞" },
      center: { title: "사슬 가운데" },
      after: { title: "사슬 뒤" },
      last: { title: "사슬 맨 뒤" },
      side: { title: "사슬 옆 갈래" },
      done: { title: "닫힌 선행", status: "closed" },
      note: { title: "related 이슈" },
      alone: { title: "관계 없는 이슈" },
    },
    [
      ["before", "root"],
      ["center", "before"],
      ["after", "center"],
      ["last", "after"],
      ["side", "before"],
      ["center", "done"],
    ],
  );
  await workspace.bd("dep", "add", note, center, "--type", "related");

  await page.goto(`/issues?issue=${alone}`);
  const aloneDialog = page.getByRole("dialog", { name: `${alone} 이슈` });
  await expect(aloneDialog.getByText("연결된 이슈")).toBeVisible();
  await expect(aloneDialog.getByRole("link", { name: "선행·후속 그래프" })).toHaveCount(0);

  await page.goto(`/issues?issue=${center}`);
  await page
    .getByRole("dialog", { name: `${center} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/issues\\?center=${center}(?:&returnTo=[^&]+)?$`));
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "사슬 가운데 · 선행·후속",
  );

  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("사슬 맨 뒤")).toBeVisible();
  const left = async (title: string) => (await node(title).boundingBox())!.x;
  const xs: number[] = [];
  for (const title of ["사슬 맨 앞", "사슬 앞", "사슬 가운데", "사슬 뒤", "사슬 맨 뒤"]) {
    xs.push(await left(title));
  }
  expect(xs).toEqual([...xs].sort((a, b) => a - b));
  expect(new Set(xs).size).toBe(xs.length);
  await expect(node("사슬 옆 갈래")).toHaveCount(0);
  await expect(node("닫힌 선행")).toBeVisible();
  await expect(node("닫힌 선행")).toHaveCSS("opacity", "0.5");
  await expect(node("사슬 가운데")).toHaveCSS("opacity", "1");
  await expect(node("related 이슈")).toHaveCount(0);
  await expect(node("관계 없는 이슈")).toHaveCount(0);

  await expect(canvas.locator("[aria-current]")).toHaveCount(1);
  await expect(node("사슬 가운데")).toHaveAttribute("aria-current", "true");
  await expect(node("사슬 가운데")).not.toHaveCSS("box-shadow", "none");
  await expect(node("사슬 앞")).toHaveCSS("box-shadow", "none");

  await page.screenshot({ path: testInfo.outputPath("open-center-closed-blocker.png") });

  await node("사슬 앞").click();
  await expect(page.getByRole("region", { name: `${before} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`center=${center}(?:&returnTo=[^&]+)?&issue=${before}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`/issues\\?center=${center}(?:&returnTo=[^&]+)?$`));
  await expect(node("사슬 맨 뒤")).toBeVisible();
});

test("닫힌 이슈의 상세에서 선행·후속 그래프를 열면 닫힌 앞뒤 사슬도 흐리게 보인다", async ({
  page,
  workspace,
}, testInfo) => {
  const { center } = await workspace.createIssues(
    {
      before: { title: "완료한 선행 작업", status: "closed" },
      center: { title: "완료한 기준 작업", status: "closed" },
      after: { title: "완료한 후속 작업", status: "closed" },
    },
    [
      ["center", "before"],
      ["after", "center"],
    ],
  );

  await page.goto(`/issues?issue=${center}`);
  await page
    .getByRole("dialog", { name: `${center} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/issues\\?center=${center}(?:&returnTo=[^&]+)?$`));
  await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toHaveText(
    "완료한 기준 작업 · 선행·후속",
  );

  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  const xs: number[] = [];
  for (const title of ["완료한 선행 작업", "완료한 기준 작업", "완료한 후속 작업"]) {
    await expect(node(title)).toBeVisible();
    await expect(node(title)).toHaveCSS("opacity", "0.5");
    xs.push((await node(title).boundingBox())!.x);
  }
  expect(xs).toEqual([...xs].sort((a, b) => a - b));
  expect(new Set(xs).size).toBe(xs.length);
  await expect(canvas.locator("[aria-current]")).toHaveCount(1);
  await expect(node("완료한 기준 작업")).toHaveAttribute("aria-current", "true");
  await page.screenshot({ path: testInfo.outputPath("closed-center-chain.png") });
});
