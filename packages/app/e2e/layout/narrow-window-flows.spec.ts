import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { answerNextConfirm } from "../support/confirmDialog";
import { dragAcrossScroll } from "../support/dragAndDrop";
import { createHumanGate } from "../support/humanGates";

const title =
  "긴 한국어 제목과 담당자 및 의존 관계를 가진 이슈를 구별하고 좁은 창에서도 핵심 조작을 실행합니다";
const ROUTES = ["issues", "human", "epics", "hygiene", "board", "decisions"] as const;

for (const route of ROUTES) {
  test(`${route}: 좁은 창에서 목록을 읽고 핵심 조작을 실행한다`, async ({ page, workspace }) => {
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
    // 보드는 카드를 끌어 옮길 열들이 한 화면에 함께 보이는 너비에서 확인합니다.
    await page.setViewportSize({ width: route === "board" ? 768 : 480, height: 900 });
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
      await expect(epic.getByRole("link", { name: `First ${title}`, exact: true })).toBeVisible();
    }
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
      await main.getByRole("combobox", { name: messages.issues.dateField }).selectOption("created");
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
      await selected.getByRole("button", { name: messages.humanDecision.respond }).click();
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
        .poll(() => workspace.showIssue(ids.otherQuestion!).then((issue) => issue.close_reason), {
          timeout: SAVE_TIMEOUT,
        })
        .toBe("Dismissed: 질문 취소");
    } else if (route === "epics") {
      const toggle = epic.getByRole("button", { name: new RegExp(ids.epic!) });
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(epic.getByRole("link", { name: `First ${title}`, exact: true })).toBeVisible();
      await epic.getByRole("link", { name: `Epic ${title}`, exact: true }).click();
      const epicDetail = page.getByRole("dialog", {
        name: messages.issueDetail.dialog(ids.epic!),
      });
      await expect(epicDetail).toBeVisible();
      await epicDetail
        .getByRole("button", { name: messages.common.close, exact: true })
        .first()
        .click();
      await epic.getByRole("link", { name: messages.graph.epicOrder }).click();
      const graph = page.getByRole("dialog");
      await expect(
        graph.getByRole("region", { name: messages.graph.canvas }).locator(".react-flow__node"),
      ).toHaveCount(2);
      await graph.getByRole("link", { name: messages.common.close, exact: true }).click();
      await expect(page).toHaveURL(/\/epics$/);
      await expect(epic.getByLabel(messages.epics.progress(ids.epic!))).toHaveAttribute("max", "2");
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
      await issue.getByRole("button", { name: messages.common.close, exact: true }).first().click();
      const duplicate = main.getByRole("region", {
        name: messages.hygiene.duplicates.title,
        exact: true,
      });
      const close = duplicate.getByRole("button", {
        name: messages.hygiene.duplicates.closeAs(ids.duplicate!, ids.canonical!),
      });
      const confirm = answerNextConfirm(page, true);
      await close.click();
      await confirm;
      await expect
        .poll(() => workspace.showIssue(ids.duplicate!).then((issue) => issue.status), {
          timeout: SAVE_TIMEOUT,
        })
        .toBe("closed");
    } else if (route === "board") {
      await main.getByRole("combobox", { name: messages.board.closedWindow }).selectOption("7d");
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
      await expect(retired.getByRole("link", { name: ids.decision!, exact: true })).toBeVisible();
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
  await page.setViewportSize({ width: 480, height: 900 });
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
  await selected
    .getByRole("textbox", { name: messages.humanDecision.response, exact: true })
    .fill("확인했습니다");
  await selected.getByRole("button", { name: messages.humanDecision.respond, exact: true }).click();
  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Responded");
  expect((await workspace.showIssue(work)).status).toBe("open");
});
