import { expect, test } from "../support/bdWorkspace";

test("지금 화면은 ID 길이에 맞춰 제목 공간을 남기고 하위 ID도 오른쪽에 정렬한다", async ({
  page,
  workspace,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await workspace.bd("rename-prefix", "long-workspace-prefix-");
  const ids = await workspace.createIssues({
    short: {
      title:
        "일반 작업: 긴 제목을 끝까지 읽기 위해 ID 칸의 빈 공간을 제목에 돌려주고 더 많은 내용을 한 줄에서 확인합니다",
      type: "task",
      status: "in_progress",
    },
    parent: {
      title:
        "상위 작업: 여러 행의 ID가 오른쪽 끝에서 같은 위치에 놓이는지 확인하고 제목에 남은 공간을 최대한 사용합니다",
      type: "task",
      status: "in_progress",
    },
  });
  const child = await workspace.createIssue(
    "하위 작업: 접미사가 붙은 긴 ID도 줄이거나 생략하지 않고 보여 주며 긴 작업 제목도 더 넓게 표시합니다",
    "--id",
    "long-workspace-prefix-abc.1.1",
    "--status",
    "in_progress",
  );
  const grandchild = await workspace.createIssue(
    "손자 작업: ID가 더 길어져도 생략하지 않고 마지막 숫자까지 보여 주며 제목에 남은 공간을 사용합니다",
    "--id",
    "long-workspace-prefix-abc123.123.45",
    "--status",
    "in_progress",
  );

  await page.goto("/focus");
  const section = page.getByRole("region", { name: "진행 중", exact: true });
  await expect(section.getByRole("listitem")).toHaveCount(4);
  const measurements = [];
  for (const id of [...Object.values(ids), child, grandchild]) {
    const row = section.getByRole("link").filter({ has: page.getByTitle(id, { exact: true }) });
    const label = row.getByTitle(id, { exact: true });
    await expect(label).toHaveText(id.slice(id.lastIndexOf("-") + 1));
    measurements.push(
      await label.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const title = element.parentElement!.children[1];
        return {
          id: element.textContent,
          idWidth: rect.width,
          right: rect.right,
          clipped: element.scrollWidth > element.clientWidth,
          titleWidth: title.getBoundingClientRect().width,
        };
      }),
    );
  }
  expect(measurements[0].idWidth).toBeLessThan(80);
  expect(measurements[0].titleWidth).toBeGreaterThan(500);
  for (const measurement of measurements) {
    expect(measurement.clipped).toBe(false);
    expect(measurement.right).toBeCloseTo(measurements[0].right, 1);
  }
  await testInfo.attach("행별 ID와 제목 폭", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({ path: testInfo.outputPath("focus-row-layout.png"), fullPage: true });
});
