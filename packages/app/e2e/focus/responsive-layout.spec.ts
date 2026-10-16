import { resolve } from "node:path";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

for (const singleWorkspace of [true, false]) {
  test(`480px 이상에서 헤더와 지금 화면이 넘치지 않고 조작할 수 있다: workspace ${singleWorkspace ? "하나" : "여러 개"}`, async ({
    page,
    workspace,
  }, testInfo) => {
    const ids = await workspace.createIssues(
      {
        doing: {
          title: "진행 중인 긴 제목과 담당자 및 우선순위가 있는 작업의 배치를 확인합니다 ".repeat(
            3,
          ),
          type: "task",
          status: "in_progress",
          assignee: "매우긴이름의담당자계정",
          priority: 1,
        },
        next: {
          title: "다음에 할 일의 긴 제목이 화면 가로 폭을 늘리지 않는지 확인합니다 ".repeat(4),
          type: "task",
        },
        waiting: { title: "다음 작업을 기다리는 작업", type: "task" },
        waitingDoing: { title: "진행 중 작업을 기다리는 작업", type: "task" },
        human: { title: "판단할 작업", type: "task", labels: ["human"] },
        done: { title: "끝낸 작업", type: "task", status: "closed" },
      },
      [
        ["waiting", "next"],
        ["waitingDoing", "doing"],
      ],
    );
    if (singleWorkspace) {
      await page.route("**/api/workspaces", async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        body.data.workspaces = [body.data.current];
        await route.fulfill({ response, json: body });
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expect(page).toHaveURL(/\/focus$/);
    const next = page.getByRole("region", { name: "다음에 할 일" });
    await expect(next.getByRole("listitem")).toHaveCount(1);
    const screens = page.getByRole("navigation", { name: "화면" });
    await expect(screens.getByRole("link", { name: "판단 기다림 1개", exact: true })).toBeVisible();
    const picker = page.getByRole("combobox", { name: "workspace", exact: true });
    await expect(picker).toHaveCount(singleWorkspace ? 0 : 1);
    const measurements = [];
    for (const width of [480, 500, 768, 1024, 1440, 480, 1440, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
          message: `${width}px에서 페이지 가로 넘침`,
        })
        .toBe(width);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const stats = document
              .querySelector('section[aria-label="흐름"]')!
              .getBoundingClientRect();
            return ["진행 중", "다음에 할 일", "막힘", "에픽 진행률"].filter(
              (name) =>
                document.querySelector(`section[aria-label="${name}"]`)!.getBoundingClientRect()
                  .top < stats.bottom,
            );
          }),
        )
        .toEqual([]);
      const tabs = await screens.getByRole("link").evaluateAll((links) =>
        links.map((link) => {
          const text = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)!;
          const range = document.createRange();
          range.selectNodeContents(text);
          return {
            name: text.textContent,
            lines: new Set([...range.getClientRects()].map((rect) => rect.top)).size,
          };
        }),
      );
      expect(
        tabs.every((tab) => tab.lines === 1),
        `${width}px 탭 줄바꿈`,
      ).toBe(true);
      const doing = page.getByRole("region", { name: "진행 중", exact: true });
      await expect(doing.getByTitle(ids.doing, { exact: true })).toBeVisible();
      await expect(doing.getByText("1개 대기", { exact: true })).toBeVisible();
      await expect(
        doing.getByTitle("담당자: 매우긴이름의담당자계정", { exact: true }),
      ).toBeVisible();
      expect(
        await doing
          .getByRole("link")
          .evaluate((row) => row.querySelector(".truncate")!.getBoundingClientRect().width),
      ).toBeGreaterThan(0);
      for (const control of [
        page.getByRole("button", { name: "설정", exact: true }),
        page.getByRole("button", { name: "새 이슈", exact: true }),
      ]) {
        await expect(control).toBeInViewport({ ratio: 1 });
      }
      measurements.push({ width, tabs });
      if ([480, 768, 1440].includes(width)) {
        await page.screenshot({
          path: resolve(
            `../../tmp/bd-desk-5np/after-${singleWorkspace ? "single" : "multiple"}-${width}.png`,
          ),
          fullPage: true,
        });
      }
    }
    await testInfo.attach("너비별 탭 줄 수", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
    await page.setViewportSize({ width: 480, height: 1000 });
    for (const href of [
      "/human",
      "/issues",
      "/epics",
      "/hygiene",
      "/board",
      "/decisions",
      "/focus",
    ]) {
      await screens.locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect
        .poll(() => page.getByRole("banner").evaluate((header) => header.scrollWidth))
        .toBe(480);
    }
    await page.getByRole("button", { name: "설정", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "설정" })).toBeVisible();
    await page.keyboard.press("Escape");
    if (!singleWorkspace) {
      const roots = await picker
        .locator("option")
        .evaluateAll((options) => options.map((option) => option.getAttribute("value")!));
      const other = roots.find((root) => root !== workspace.path)!;
      await picker.selectOption(other);
      await expect
        .poll(async () => (await (await page.request.get("/api/workspaces")).json()).data.current)
        .toBe(other);
      await picker.selectOption(workspace.path);
      await expect(next.getByRole("listitem")).toHaveCount(1);
    }
    await page.getByRole("button", { name: "새 이슈", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "새 이슈" });
    await dialog
      .getByRole("textbox", { name: "제목", exact: true })
      .fill("좁은 화면에서 만든 작업");
    await dialog.getByRole("button", { name: "만들기", exact: true }).click();
    await expect(page).toHaveURL(/\/focus\?issue=/);
    const created = new URL(page.url()).searchParams.get("issue")!;
    await expect
      .poll(() => workspace.showIssue(created).then((issue) => issue.title), {
        timeout: SAVE_TIMEOUT,
      })
      .toBe("좁은 화면에서 만든 작업");
  });
}
