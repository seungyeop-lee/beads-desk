import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { enMessages } from "../../src/client/modules/locale/domain/enMessages";
import { koMessages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { answerNextConfirm } from "../support/confirmDialog";
import { dragAcrossScroll } from "../support/dragAndDrop";
import { createHumanGate } from "../support/humanGates";

const TITLE =
  "긴 한국어 제목과 담당자 및 의존 관계를 가진 이슈를 구별하고 좁은 창에서도 핵심 조작을 실행합니다 ".repeat(
    3,
  );
const ENGLISH =
  "A long English title keeps the issue distinguishable while filters and editing controls remain accessible. ".repeat(
    3,
  );
const WIDTHS = [480, 500, 768, 1024, 1440, 480, 1440, 768];
const ROUTES = ["issues", "human", "epics", "hygiene", "board", "decisions"] as const;

for (const locale of ["ko", "en"] as const) {
  test.describe(locale, () => {
    test.use({ locale: locale === "ko" ? "ko-KR" : "en-US" });
    const messages = locale === "ko" ? koMessages : enMessages;
    for (const route of ROUTES) {
      test(`${route}: 다섯 너비와 반복 변경에서도 제목과 핵심 조작을 유지한다`, async ({
        page,
        workspace,
      }) => {
        test.setTimeout(120_000);
        const title = locale === "ko" ? TITLE : ENGLISH;
        const ids = await workspace.createIssues(
          {
            epic: { title: `Epic ${title}`, type: "epic" },
            first: {
              title: `First ${title}`,
              parent: "epic",
              assignee: "아주긴담당자계정이름",
              type: "task",
            },
            second: { title: `Second ${title}`, parent: "epic", type: "task" },
            candidate: { title: "Existing candidate", type: "task" },
            question: {
              title: `Question ${title}`,
              labels: ["human"],
              description: `Description ${title}`,
              priority: 1,
              type: "task",
            },
            otherQuestion: { title: "Another question", labels: ["human"], type: "task" },
            duplicate: { title: `Duplicate ${title}`, description: title, type: "task" },
            canonical: { title: `Duplicate ${title}`, description: title, type: "task" },
            bug: { title: `Bug ${title}`, description: "오류가 발생합니다.", type: "bug" },
            closable: { title: `Finished epic ${title}`, type: "epic" },
            done: { title: "Finished child", parent: "closable", status: "closed" },
            decision: { title: `Current ${title}`, type: "decision" },
            retired: { title: `Retired ${title}`, type: "decision" },
            ...Object.fromEntries(
              Array.from({ length: route === "board" ? 8 : 0 }, (_, i) => [
                `many${i}`,
                { title: `Many ${i} ${title}`, type: "task" },
              ]),
            ),
          },
          [["second", "first"]],
        );
        if (route === "decisions")
          await workspace.bd("supersede", ids.retired!, "--with", ids.decision!);
        const directory = resolve("../../tmp/8mh-evidence");
        await mkdir(directory, { recursive: true });
        await page.goto(`/${route}`);
        const main = page.getByRole("main");
        if (route === "human") {
          await main.getByRole("button", { name: /Another question/ }).click();
          await expect(
            main.getByRole("region", { name: "Another question", exact: true }),
          ).toBeVisible();
          await main.getByRole("button", { name: /Question / }).click();
          await expect(
            main.getByRole("region", { name: `Question ${title}`, exact: true }),
          ).toContainText(`Description ${title.trim()}`);
        } else if (route === "hygiene") {
          await expect(
            main
              .getByRole("region", { name: messages.hygiene.lint.title, exact: true })
              .getByRole("link", { name: new RegExp(ids.bug!) }),
          ).toBeVisible();
          await expect(
            main
              .getByRole("region", { name: messages.hygiene.duplicates.title, exact: true })
              .getByRole("link", { name: new RegExp(ids.duplicate!) })
              .first(),
          ).toBeVisible();
          await expect(
            main
              .getByRole("region", { name: messages.hygiene.closableEpics.title, exact: true })
              .getByRole("link", { name: new RegExp(ids.closable!) }),
          ).toBeVisible();
        } else
          await expect(
            main.getByRole("link", {
              name: `${route === "epics" ? "Epic" : route === "decisions" ? "Current" : "First"} ${title}`,
              exact: route !== "board",
            }),
          ).toBeVisible();
        const epic = main
          .locator("section.surface")
          .filter({ has: page.getByRole("link", { name: `Epic ${title}`, exact: true }) });
        if (route === "epics") {
          const toggle = epic.getByRole("button", { name: new RegExp(ids.epic!) });
          if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
          await expect(
            epic.getByRole("link", { name: `First ${title}`, exact: true }),
          ).toBeVisible();
        }
        const measurements = [];
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          await expect
            .poll(
              () =>
                page.evaluate(
                  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
                ),
              { message: `${route} ${locale} ${width}px 페이지 가로 넘침` },
            )
            .toBe(0);
          if (route === "issues" || route === "epics" || route === "decisions") {
            const titleLink = main.getByRole("link", {
              name: `${route === "decisions" ? "Current" : "First"} ${title}`,
              exact: true,
            });
            expect(
              await titleLink.evaluate(
                (element) => element.closest("td")!.getBoundingClientRect().width,
              ),
            ).toBeGreaterThanOrEqual(280);
            if (route === "epics")
              expect(
                (await epic
                  .getByRole("link", { name: `Epic ${title}`, exact: true })
                  .boundingBox())!.width,
              ).toBeGreaterThanOrEqual(180);
          }
          if (route === "issues") {
            const tabs = main.getByRole("navigation", { name: messages.issues.views });
            expect(
              await tabs
                .getByRole("link")
                .evaluateAll((links) =>
                  links.every((link) => link.getBoundingClientRect().height < 45),
                ),
            ).toBe(true);
          }
          if (route === "board" && width >= 768) {
            for (const name of Object.values(messages.board.columns)) {
              await expect(
                main.getByRole("region", { name, exact: true }).getByRole("heading"),
              ).toBeVisible();
            }
          }
          measurements.push({
            width,
            ...(await main.evaluate((element) => ({
              pageWidth: document.documentElement.scrollWidth,
              viewport: document.documentElement.clientWidth,
              pageHeight: document.documentElement.scrollHeight,
              main: element.getBoundingClientRect().toJSON(),
              titles: [...element.querySelectorAll("td a")].map((link) => ({
                text: link.textContent,
                cell: link.closest("td")!.getBoundingClientRect().width,
              })),
              grids: [...element.querySelectorAll(".grid")].map((grid) => ({
                width: grid.getBoundingClientRect().width,
                columns: getComputedStyle(grid).gridTemplateColumns,
              })),
            }))),
          });
          if ([480, 768, 1440].includes(width)) {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({
              path: resolve(directory, `after-${locale}-${route}-${width}.png`),
            });
          }
        }
        await writeFile(
          resolve(directory, `after-${locale}-${route}.json`),
          JSON.stringify(measurements, null, 2),
        );
        await page.setViewportSize({ width: 480, height: 900 });
        if (route === "issues") {
          const tabs = main.getByRole("navigation", { name: messages.issues.views });
          for (const tab of await tabs.getByRole("link").all()) {
            await tab.click();
            await expect(tab).toHaveAttribute("aria-current", "page");
          }
          await tabs.getByRole("link").first().click();
          await page.locator("summary", { hasText: messages.issue.type }).click();
          await page
            .getByRole("checkbox", { name: messages.issue.types.decision, exact: true })
            .check();
          await page.locator("summary", { hasText: messages.issue.type }).click();
          await main
            .getByRole("combobox", { name: messages.issues.dateField })
            .selectOption("created");
          await main.getByLabel(messages.issues.dateFrom, { exact: true }).fill("2000-01-01");
          await main.getByLabel(messages.issues.dateTo, { exact: true }).fill("2099-12-31");
          await main.getByRole("button", { name: messages.issues.clearDates }).click();
          const search = main.getByRole("searchbox", { name: messages.issues.search });
          await search.fill("First");
          const row = main.getByRole("row", { name: new RegExp(`First ${title.slice(0, 20)}`) });
          const status = row.getByRole("combobox", {
            name: messages.issueTable.statusOf(ids.first!),
          });
          await status.selectOption("in_progress");
          await expect
            .poll(() => workspace.showIssue(ids.first!).then((issue) => issue.status), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe("in_progress");
          await row
            .getByRole("combobox", { name: messages.issueTable.priorityOf(ids.first!) })
            .selectOption("1");
          await expect
            .poll(() => workspace.showIssue(ids.first!).then((issue) => issue.priority), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe(1);
          await row.getByRole("link", { name: `First ${title}`, exact: true }).click();
          await expect(
            page.getByRole("dialog", { name: messages.issueDetail.dialog(ids.first!) }),
          ).toBeVisible();
        } else if (route === "human") {
          const selected = main.getByRole("region", { name: `Question ${title}`, exact: true });
          await expect(selected).toContainText(`Description ${title.trim()}`);
          await selected
            .getByRole("textbox", { name: messages.humanDecision.response, exact: true })
            .fill("좁은 창에서 남긴 응답");
          const submit = selected.getByRole("button", { name: messages.humanDecision.respond });
          await accessible(submit, page);
          await submit.click();
          await expect
            .poll(() => workspace.showIssue(ids.question!).then((issue) => issue.status), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe("closed");
          expect(await workspace.bd("comments", ids.question!, "--json")).toContain(
            "Response: 좁은 창에서 남긴 응답",
          );
          const other = main.getByRole("region", { name: "Another question", exact: true });
          await other.getByRole("button", { name: messages.humanDecision.dismiss }).click();
          await other
            .getByRole("textbox", { name: messages.humanDecision.dismissReason })
            .fill("질문 취소");
          await other.getByRole("button", { name: messages.humanDecision.dismiss }).click();
          await expect
            .poll(
              () => workspace.showIssue(ids.otherQuestion!).then((issue) => issue.close_reason),
              { timeout: SAVE_TIMEOUT },
            )
            .toBe("Dismissed: 질문 취소");
        } else if (route === "epics") {
          const toggle = epic.getByRole("button", { name: new RegExp(ids.epic!) });
          await toggle.click();
          await expect(toggle).toHaveAttribute("aria-expanded", "false");
          await toggle.click();
          await expect(
            epic.getByRole("link", { name: `First ${title}`, exact: true }),
          ).toBeVisible();
          await epic.getByRole("link", { name: `Epic ${title}`, exact: true }).click();
          const epicDetail = page.getByRole("dialog", {
            name: messages.issueDetail.dialog(ids.epic!),
          });
          await expect(epicDetail).toBeVisible();
          await epicDetail
            .getByRole("button", { name: messages.common.close, exact: true })
            .first()
            .click();
          const order = epic.getByRole("link", { name: messages.graph.epicOrder });
          await accessible(order, page);
          await order.click();
          const graph = page.getByRole("dialog");
          await expect(
            graph.getByRole("region", { name: messages.graph.canvas }).locator(".react-flow__node"),
          ).toHaveCount(2);
          await graph.getByRole("link", { name: messages.common.close, exact: true }).click();
          await expect(page).toHaveURL(/\/epics$/);
          await expect(epic.getByLabel(messages.epics.progress(ids.epic!))).toHaveAttribute(
            "max",
            "2",
          );
          await epic
            .getByRole("combobox", { name: messages.epics.addExistingChild })
            .fill("Existing candidate");
          await epic.getByRole("option", { name: new RegExp(ids.candidate!) }).click();
          await expect
            .poll(() => workspace.showIssue(ids.candidate!).then((issue) => issue.parent), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe(ids.epic);
          await epic.getByRole("button", { name: messages.epics.newChild }).click();
          const dialog = page.getByRole("dialog", { name: messages.newIssue.title });
          await dialog
            .getByRole("textbox", { name: messages.issue.title, exact: true })
            .fill("좁은 창에서 만든 하위 이슈");
          await dialog.getByRole("button", { name: messages.newIssue.create, exact: true }).click();
          await expect(page).toHaveURL(/[?&]issue=/);
          const created = new URL(page.url()).searchParams.get("issue")!;
          await expect
            .poll(() => workspace.showIssue(created).then((issue) => issue.parent), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe(ids.epic);
        } else if (route === "hygiene") {
          await main
            .getByRole("region", { name: messages.hygiene.lint.title, exact: true })
            .getByRole("link", { name: new RegExp(ids.bug!) })
            .click();
          const issue = page.getByRole("dialog", { name: messages.issueDetail.dialog(ids.bug!) });
          await expect(issue).toBeVisible();
          await issue
            .getByRole("button", { name: messages.common.close, exact: true })
            .first()
            .click();
          const duplicate = main.getByRole("region", {
            name: messages.hygiene.duplicates.title,
            exact: true,
          });
          const close = duplicate.getByRole("button", {
            name: messages.hygiene.duplicates.closeAs(ids.duplicate!, ids.canonical!),
          });
          await accessible(close, page);
          const confirm = answerNextConfirm(page, true);
          await close.click();
          await confirm;
          await expect
            .poll(() => workspace.showIssue(ids.duplicate!).then((issue) => issue.status), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe("closed");
        } else if (route === "board") {
          await main
            .getByRole("combobox", { name: messages.board.closedWindow })
            .selectOption("7d");
          for (const name of Object.values(messages.board.columns))
            await accessible(
              main.getByRole("region", { name, exact: true }).getByRole("heading"),
              page,
            );
          await page.setViewportSize({ width: 768, height: 900 });
          await dragAcrossScroll(
            main
              .getByRole("region", { name: messages.board.columns.ready })
              .getByRole("link", { name: /Existing candidate/ }),
            main.getByRole("region", { name: messages.board.columns.in_progress }),
          );
          await expect
            .poll(() => workspace.showIssue(ids.candidate!).then((issue) => issue.status), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe("in_progress");
        } else {
          const retired = main.getByRole("row", {
            name: new RegExp(`Retired ${title.slice(0, 20)}`),
          });
          await expect(retired).toContainText(messages.decisions.supersededBy);
          await accessible(retired.getByRole("link", { name: ids.decision!, exact: true }), page);
          const status = main.getByRole("combobox", {
            name: messages.issueTable.statusOf(ids.decision!),
          });
          await status.selectOption("closed");
          await page
            .getByRole("dialog", { name: messages.closeIssue.title, exact: true })
            .getByRole("button", { name: messages.closeIssue.submit, exact: true })
            .click();
          await expect
            .poll(() => workspace.showIssue(ids.decision!).then((issue) => issue.status), {
              timeout: SAVE_TIMEOUT,
            })
            .toBe("closed");
          await main.getByRole("link", { name: `Current ${title}`, exact: true }).click();
          await expect(
            page.getByRole("dialog", { name: messages.issueDetail.dialog(ids.decision!) }),
          ).toBeVisible();
        }
      });
    }
    test("긴 사유와 막고 있는 작업이 있는 확인 요청도 좁은 창에서 응답한다", async ({
      page,
      workspace,
    }) => {
      const title = locale === "ko" ? TITLE : ENGLISH;
      const work = await workspace.createIssue(title, "--description", `Work description ${title}`);
      const gate = await createHumanGate(workspace, work, title);
      await page.goto("/human");
      const selected = page.getByRole("region", { name: `Review: ${work}`, exact: true });
      await expect(
        selected.getByRole("region", { name: messages.humanGate.blocks, exact: true }),
      ).toContainText(`Work description ${title.trim()}`);
      await expect(
        selected.getByRole("region", { name: messages.humanGate.reason, exact: true }),
      ).toContainText(title.trim());
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          )
          .toBe(0);
        await accessible(
          selected.getByRole("button", { name: messages.humanDecision.dismiss, exact: true }),
          page,
        );
      }
      await page.setViewportSize({ width: 480, height: 900 });
      await selected
        .getByRole("textbox", { name: messages.humanDecision.response, exact: true })
        .fill("확인했습니다");
      await selected
        .getByRole("button", { name: messages.humanDecision.respond, exact: true })
        .click();
      await expect
        .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
          timeout: SAVE_TIMEOUT,
        })
        .toBe("Responded");
      expect((await workspace.showIssue(work)).status).toBe("open");
    });

    test("빈 목록도 다섯 너비에서 넘치지 않는다", async ({ page }) => {
      for (const route of ROUTES) {
        await page.goto(`/${route}`);
        await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
        for (const width of WIDTHS.slice(0, 5)) {
          await page.setViewportSize({ width, height: 900 });
          await expect
            .poll(() =>
              page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
              ),
            )
            .toBe(0);
        }
      }
    });
  });
}

async function accessible(control: Locator, page: Page) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport({ ratio: 1 });
  const box = (await control.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}
