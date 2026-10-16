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

for (const { type, closed } of [
  { type: "human", closed: false },
  { type: "human", closed: true },
  { type: "gh:pr", closed: false },
]) {
  test(`${closed ? "닫힌" : "열린"} ${type} gate도 작업과 gate 어느 쪽에서 열든 선행·후속 그래프와 상세에 보인다`, async ({
    page,
    workspace,
    request,
  }, testInfo) => {
    const { epic, work, after } = await workspace.createIssues(
      {
        epic: { title: "gate 검증 에픽", type: "epic" },
        work: { title: "gate를 기다린 작업", parent: "epic", status: closed ? "closed" : "open" },
        after: { title: "gate 사슬 후속 작업", parent: "epic" },
      },
      [["after", "work"]],
    );
    const gate: string = JSON.parse(
      await workspace.bd(
        "gate",
        "create",
        "--type",
        type,
        "--blocks",
        work,
        "--await-id",
        "42",
        "--title",
        "일반 선행 gate",
        "--json",
      ),
    ).id;
    if (closed) await workspace.bd("gate", "resolve", gate, "--reason", "확인 완료");

    const response = await request.get("/api/graph");
    expect(response.ok()).toBe(true);
    const { data } = await response.json();
    expect(data.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: gate,
          issueType: "gate",
          status: closed ? "closed" : "open",
        }),
        expect.objectContaining({ id: work }),
      ]),
    );
    expect(data.dependencies).toContainEqual({ issueId: work, dependsOnId: gate, type: "blocks" });

    await page.goto(`/issues?issue=${work}`);
    await page
      .getByRole("dialog", { name: `${work} 이슈` })
      .getByRole("link", { name: "선행·후속 그래프" })
      .click();
    const canvas = page.getByRole("region", { name: "의존 그래프" });
    const gateNode = canvas.getByRole("link", { name: /일반 선행 gate/ });
    const workNode = canvas.getByRole("link", { name: /gate를 기다린 작업/ });
    const afterNode = canvas.getByRole("link", { name: /gate 사슬 후속 작업/ });
    await expect(gateNode).toBeVisible();
    await expect(afterNode).toBeVisible();
    await expect(canvas.getByLabel(`${gate} 다음에 ${work}`)).toHaveCount(1);
    await expect(canvas.getByLabel(`${work} 다음에 ${after}`)).toHaveCount(1);
    await expect(gateNode).toHaveCSS("opacity", closed ? "0.5" : "1");
    await expect(workNode).toHaveCSS("opacity", closed ? "0.5" : "1");
    expect((await gateNode.boundingBox())!.x).toBeLessThan((await workNode.boundingBox())!.x);
    expect((await workNode.boundingBox())!.x).toBeLessThan((await afterNode.boundingBox())!.x);
    await page.screenshot({
      path: testInfo.outputPath("gate-blocking-chain.png"),
      animations: "disabled",
    });

    await gateNode.click();
    const detail = page.getByRole("region", { name: `${gate} 이슈` });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("button", { name: "일반 선행 gate", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(gateNode).toBeVisible();
    await page.getByRole("dialog").getByRole("link", { name: "닫기", exact: true }).click();
    await expect(page).toHaveURL(`/issues?issue=${work}`);

    await page.goto(`/issues?center=${gate}`);
    await expect(gateNode).toBeVisible();
    await expect(afterNode).toBeVisible();
    await expect(gateNode).toHaveAttribute("aria-current", "true");
    await expect(gateNode).toHaveCSS("opacity", closed ? "0.5" : "1");

    await page.goto(`/graph?epic=${epic}`);
    await expect(workNode).toBeVisible();
    await expect(gateNode).toBeVisible();
    await expect(gateNode).toContainText("에픽 밖");
    await expect(canvas.getByLabel(`${gate} 다음에 ${work}`)).toHaveCount(1);
  });
}

test("실제로 blocks 관계가 없는 이슈를 기준으로 직접 열면 빈 상태를 보인다", async ({
  page,
  workspace,
}) => {
  const alone = await workspace.createIssue("선후행 없는 작업");
  await page.goto(`/issues?center=${alone}`);
  await expect(page.getByText("이 이슈와 blocks 관계로 이어진 이슈가 없습니다.")).toBeVisible();
  await expect(page.getByRole("region", { name: "의존 그래프" })).toHaveCount(0);
});
