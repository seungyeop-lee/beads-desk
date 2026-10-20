import { expect, test } from "../support/bdWorkspace";

test("상세의 선행·후속 그래프를 누르면 그 이슈의 사슬을 그래프로 열고, related 관계만 있는 이슈의 상세에서도 그래프를 연다", async ({
  page,
  workspace,
}) => {
  const { center, note } = await workspace.createIssues(
    {
      root: { title: "사슬 맨 앞" },
      before: { title: "사슬 앞" },
      center: { title: "사슬 가운데" },
      after: { title: "사슬 뒤" },
      note: { title: "related 이슈" },
    },
    [
      ["before", "root"],
      ["center", "before"],
      ["after", "center"],
      ["note", "center", "related"],
    ],
  );

  await page.goto(`issues?issue=${center}`);
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
  await expect(node("사슬 맨 앞")).toBeVisible();
  await expect(node("사슬 뒤")).toBeVisible();
  await expect(node("related 이슈")).toBeVisible();

  await page.goto(`issues?issue=${note}`);
  await page
    .getByRole("dialog", { name: `${note} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  await expect(node("사슬 가운데")).toBeVisible();
  await expect(canvas.locator(".react-flow__node")).toHaveCount(2);
});

test("열린 human gate와 닫힌 gh:pr gate도 작업과 gate 어느 쪽에서 열든 선행·후속 그래프와 상세에 보인다", async ({
  page,
  workspace,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { before, work, after } = await workspace.createIssues(
    {
      before: { title: "gate 사슬 선행 작업" },
      work: { title: "gate를 기다린 작업" },
      after: { title: "gate 사슬 후속 작업" },
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

  await page.goto(`issues?issue=${work}`);
  await page
    .getByRole("dialog", { name: `${work} 이슈` })
    .getByRole("link", { name: "선행·후속 그래프" })
    .click();
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const openGateNode = canvas.getByRole("link", { name: /열린 human 선행 gate/ });
  const closedGateNode = canvas.getByRole("link", { name: /닫힌 gh:pr 선행 gate/ });
  const afterNode = canvas.getByRole("link", { name: /gate 사슬 후속 작업/ });
  await expect(openGateNode).toBeVisible();
  await expect(closedGateNode).toBeVisible();
  await expect(afterNode).toBeVisible();
  for (const gate of [openGate, closedGate])
    await expect(canvas.getByLabel(`${work}의 선행 조건: ${gate} (blocks)`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${work} 다음에 ${after}`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${before} 다음에 ${work}`)).toHaveCount(1);

  await closedGateNode.click();
  const detail = page.getByRole("region", { name: `${closedGate} 이슈` });
  await expect(detail).toBeVisible();
  await expect(
    detail.getByRole("button", { name: "닫힌 gh:pr 선행 gate", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(closedGateNode).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL(`issues?issue=${work}`);

  await page.goto(`issues?center=${closedGate}`);
  await expect(closedGateNode).toBeVisible();
  await expect(afterNode).toBeVisible();
  await expect(closedGateNode).toHaveAttribute("aria-current", "true");
});
