import { expect, test } from "../support/bdWorkspace";

test("상세의 선행·후속 그래프는 지원하는 관계가 있는 이슈에 보이고, 누르면 그 이슈의 앞뒤 blocks 사슬을 닫힌 이슈까지 그리며 기준 이슈 노드만 강조하고, 관계 없는 이슈를 기준으로 직접 열면 빈 상태를 보인다", async ({
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
  await page.goto(`/issues?center=${alone}`);
  await expect(
    page.getByText("이 이슈와 blocks·related·discovered-from 관계로 이어진 이슈가 없습니다."),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "의존 그래프" })).toHaveCount(0);

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
  await expect(node("related 이슈")).toBeVisible();
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

test("닫힌 이슈의 상세에서 선행·후속 그래프를 열면 닫힌 앞뒤 사슬도 순서대로 보인다", async ({
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
    xs.push((await node(title).boundingBox())!.x);
  }
  expect(xs).toEqual([...xs].sort((a, b) => a - b));
  expect(new Set(xs).size).toBe(xs.length);
  await expect(canvas.locator("[aria-current]")).toHaveCount(1);
  await expect(node("완료한 기준 작업")).toHaveAttribute("aria-current", "true");
  await page.screenshot({ path: testInfo.outputPath("closed-center-chain.png") });
});

test("열린 human gate와 닫힌 gh:pr gate도 작업과 gate 어느 쪽에서 열든 선행·후속 그래프와 상세에 보인다", async ({
  page,
  workspace,
  request,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { epic, before, work, after } = await workspace.createIssues(
    {
      epic: { title: "gate 검증 에픽", type: "epic" },
      before: { title: "gate 사슬 선행 작업", parent: "epic" },
      work: { title: "gate를 기다린 작업", parent: "epic" },
      after: { title: "gate 사슬 후속 작업", parent: "epic" },
    },
    [
      ["work", "before"],
      ["after", "work"],
    ],
  );
  const createGate = async (type: string, title: string) =>
    JSON.parse(
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
        title,
        "--json",
      ),
    ).id as string;
  const openGate = await createGate("human", "열린 human 선행 gate");
  const closedGate = await createGate("gh:pr", "닫힌 gh:pr 선행 gate");
  await workspace.bd("gate", "resolve", closedGate, "--reason", "확인 완료");

  const response = await request.get("/api/graph");
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  expect(data.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: openGate, issueType: "gate", status: "open" }),
      expect.objectContaining({ id: closedGate, issueType: "gate", status: "closed" }),
      expect.objectContaining({ id: work }),
    ]),
  );
  for (const gate of [openGate, closedGate])
    expect(data.dependencies).toContainEqual(
      expect.objectContaining({ issueId: work, dependsOnId: gate, type: "blocks" }),
    );

  await page.goto(`/issues?issue=${work}`);
  await page
    .getByRole("dialog", { name: `${work} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const openGateNode = canvas.getByRole("link", { name: /열린 human 선행 gate/ });
  const closedGateNode = canvas.getByRole("link", { name: /닫힌 gh:pr 선행 gate/ });
  const workNode = canvas.getByRole("link", { name: /gate를 기다린 작업/ });
  const afterNode = canvas.getByRole("link", { name: /gate 사슬 후속 작업/ });
  await expect(openGateNode).toBeVisible();
  await expect(closedGateNode).toBeVisible();
  await expect(afterNode).toBeVisible();
  for (const gate of [openGate, closedGate])
    await expect(canvas.getByLabel(`${work}의 선행 조건: ${gate} (blocks)`)).toHaveCount(1);
  await expect(page.getByLabel("관계 범례")).toContainText("굵은 실선 화살표: gate 대기 조건");
  await expect(page.getByLabel("관계 범례")).toContainText(
    "보라색 굵은 실선 화살표: 사람 판단을 기다리는 gate",
  );
  await expect(canvas.getByLabel(`${work} 다음에 ${after}`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${before} 다음에 ${work}`)).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("gate-blocking-chain.png"),
    animations: "disabled",
  });

  await closedGateNode.click();
  const detail = page.getByRole("region", { name: `${closedGate} 이슈` });
  await expect(detail).toBeVisible();
  await expect(
    detail.getByRole("button", { name: "닫힌 gh:pr 선행 gate", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(closedGateNode).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL(`/issues?issue=${work}`);

  await page.goto(`/issues?center=${closedGate}`);
  await expect(closedGateNode).toBeVisible();
  await expect(afterNode).toBeVisible();
  await expect(closedGateNode).toHaveAttribute("aria-current", "true");

  await page
    .context()
    .addCookies([{ name: "beads-desk-locale", value: "en", url: new URL(page.url()).origin }]);
  await page.reload();
  await expect(page.getByLabel(`${work} DEPENDS ON ${closedGate} (gate condition)`)).toHaveCount(1);
  await expect(page.getByLabel("Relationship legend")).toContainText(
    "Thick solid arrow: gate condition",
  );
  await page.screenshot({
    path: testInfo.outputPath("gate-center-en.png"),
    animations: "disabled",
  });
  await page
    .context()
    .addCookies([{ name: "beads-desk-locale", value: "ko", url: new URL(page.url()).origin }]);

  await page.goto(`/graph?epic=${epic}`);
  await expect(workNode).toBeVisible();
  for (const [gateNode, gate] of [
    [openGateNode, openGate],
    [closedGateNode, closedGate],
  ] as const) {
    await expect(gateNode).toContainText("에픽 밖");
    await expect(canvas.getByLabel(`${gate} 다음에 ${work}`)).toHaveCount(1);
  }
  await expect(page.getByLabel("관계 범례")).toContainText("보라색 굵은 실선 화살표");
});

test("관련·양방향 발견 관계를 사슬과 구분하고, 보조 관계만 있는 이슈의 상세에서도 그 관계를 그래프로 연다", async ({
  page,
  workspace,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { before, center, after, related, origin, found } = await workspace.createIssues(
    {
      before: { title: "주 사슬 선행" },
      center: { title: "보조 관계 기준" },
      after: { title: "주 사슬 후속" },
      related: { title: "직접 관련 이슈" },
      origin: { title: "이슈를 발견한 작업", status: "closed" },
      found: { title: "작업 중 발견한 이슈" },
    },
    [
      ["center", "before"],
      ["after", "center"],
    ],
  );
  for (const [from, to, type] of [
    [center, related, "related"],
    [center, origin, "discovered-from"],
    [found, center, "discovered-from"],
  ]) {
    await workspace.bd("dep", "add", from!, to!, "--type", type!);
  }
  await page.goto(`/issues?center=${center}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  for (const title of [
    "주 사슬 선행",
    "보조 관계 기준",
    "주 사슬 후속",
    "직접 관련 이슈",
    "이슈를 발견한 작업",
    "작업 중 발견한 이슈",
  ])
    await expect(node(title)).toBeVisible();
  await expect(node("보조 관계 기준")).toHaveAttribute("aria-current", "true");
  await expect(canvas.getByLabel(`${before} 다음에 ${center}`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${center} 다음에 ${after}`)).toHaveCount(1);
  await expect(
    canvas.getByLabel(
      `${origin}: 이 작업 중 발견한 이슈 ${center} (${center}: 이 이슈를 발견한 작업 ${origin})`,
    ),
  ).toHaveCount(1);
  await expect(
    canvas.getByLabel(
      `${center}: 이 작업 중 발견한 이슈 ${found} (${found}: 이 이슈를 발견한 작업 ${center})`,
    ),
  ).toHaveCount(1);
  await expect(canvas.locator('path[data-edge="blocks"]')).toHaveCount(2);
  await expect(canvas.locator('path[data-edge="related"]')).toHaveCount(1);
  await expect(canvas.locator('path[data-edge="discovered"]')).toHaveCount(2);
  await expect(page.getByLabel("관계 범례")).toContainText("점선: 관련");
  await expect(page.getByLabel("관계 범례")).toContainText(
    "파선 화살표: 발견한 작업 → 발견한 이슈",
  );
  await expect(page.getByLabel("관계 범례")).not.toContainText("gate");
  await page.screenshot({
    path: testInfo.outputPath("auxiliary-chain.png"),
    animations: "disabled",
  });
  for (const id of [related, origin, found]) {
    await page.goto(`/issues?issue=${id}`);
    await page
      .getByRole("dialog", { name: `${id} 이슈` })
      .getByRole("link", { name: "선행·후속 그래프" })
      .click();
    await expect(node("보조 관계 기준")).toBeVisible();
    await expect(canvas.locator(".react-flow__node")).toHaveCount(2);
  }
});
