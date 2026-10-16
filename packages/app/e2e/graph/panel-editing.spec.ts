import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

const title = "그래프와 상세에서 옆 패널을 읽고 편집하며 관련 이슈로 이동하는 작업";

test.describe("폭 768px 창", () => {
  test.use({ viewport: { width: 768, height: 900 } });
  for (const scope of ["center", "epic", "detail"] as const) {
    test(`${scope}: 상세와 옆 패널을 읽고 편집·이동·닫기를 실행한다`, async ({
      page,
      workspace,
    }) => {
      const ids = await workspace.createIssues(
        {
          epic: { title: `Epic ${title}`, type: "epic" },
          first: {
            title: `First ${title}`,
            parent: "epic",
            description: title,
          },
          second: {
            title: `Second ${title}`,
            parent: "epic",
            description: title,
          },
          alone: { title: `Alone ${title}`, parent: "epic" },
        },
        [["second", "first"]],
      );
      await workspace.bd(
        "comments",
        "add",
        ids.first,
        "패널에서 읽을 댓글입니다.",
        "--author",
        "검토자",
      );
      const origin =
        scope === "epic"
          ? `/epics?issue=${ids.epic}&side=${ids.first}`
          : `/issues?view=blocked&type=task&issue=${ids.second}&side=${ids.first}`;
      await page.goto(origin);
      if (scope !== "detail") {
        const start = page.getByRole("dialog");
        await start
          .getByRole("link", {
            name: scope === "epic" ? messages.graph.epicOrder : messages.graph.blockingChain,
            exact: true,
          })
          .click();
        const graph = page.getByRole("dialog");
        const canvas = graph.getByRole("region", {
          name: messages.graph.canvas,
        });
        await expect(canvas.locator(".react-flow__node")).toHaveCount(2);
        for (const name of [
          messages.graph.zoomIn,
          messages.graph.zoomOut,
          messages.graph.fitView,
        ]) {
          await canvas.getByRole("button", { name, exact: true }).click();
        }
        if (scope === "epic") {
          const unordered = graph.getByRole("region", {
            name: messages.graph.unordered,
            exact: true,
          });
          const toggle = unordered.getByRole("button");
          if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
          await expect(unordered.getByRole("link", { name: new RegExp("Alone") })).toBeVisible();
          await expect(graph).toContainText(messages.graph.progress(1, 2));
          await toggle.click();
        }
        await canvas.scrollIntoViewIfNeeded();
        const viewport = canvas.locator(".react-flow__viewport");
        const beforePan = await viewport.evaluate((element) => getComputedStyle(element).transform);
        const canvasBox = (await canvas.boundingBox())!;
        await page.mouse.move(
          canvasBox.x + canvasBox.width * 0.8,
          canvasBox.y + canvasBox.height * 0.8,
        );
        await page.mouse.down();
        await page.mouse.move(
          canvasBox.x + canvasBox.width * 0.8 - 50,
          canvasBox.y + canvasBox.height * 0.8 - 30,
          { steps: 5 },
        );
        await page.mouse.up();
        await expect(viewport).not.toHaveCSS("transform", beforePan);
        await canvas.getByRole("button", { name: messages.graph.fitView, exact: true }).click();
        await canvas.getByRole("link", { name: new RegExp("Second") }).click();
        const detail = graph.getByRole("region", {
          name: messages.issueDetail.dialog(ids.second),
          exact: true,
        });
        await detail
          .getByRole("region", {
            name: messages.issueDetail.linkedIssues,
            exact: true,
          })
          .getByRole("link", {
            name: `${ids.first} First ${title}`,
            exact: true,
          })
          .click();
      }
      const dialog = page.getByRole("dialog");
      const detail =
        scope === "detail"
          ? dialog
          : dialog.getByRole("region", {
              name: messages.issueDetail.dialog(ids.second),
              exact: true,
            });
      const side = dialog.getByRole("region", {
        name: messages.issueDetail.sidePanel(ids.first),
        exact: true,
      });
      await expect(
        side.getByRole("heading", { name: `First ${title}`, exact: true }),
      ).toBeVisible();
      await expect(side.getByRole("article")).toContainText("패널에서 읽을 댓글입니다.");
      await detail.getByRole("button", { name: `Second ${title}`, exact: true }).click();
      await detail
        .getByRole("textbox", { name: messages.issue.title, exact: true })
        .fill("옆 패널과 함께 고친 제목");
      await detail.getByRole("button", { name: messages.common.save, exact: true }).click();
      await expect
        .poll(() => workspace.showIssue(ids.second).then((issue) => issue.title), {
          timeout: SAVE_TIMEOUT,
        })
        .toBe("옆 패널과 함께 고친 제목");
      const body = detail.getByRole("region", {
        name: messages.issue.bodyFields.description,
        exact: true,
      });
      await body.hover();
      await body.getByRole("button", { name: messages.editable.edit, exact: true }).click();
      const editor = body.getByRole("textbox", {
        name: messages.issue.bodyFields.description,
        exact: true,
      });
      // fill은 DOM 선택만 바꾸고, 편집기는 selectionchange를 받은 뒤에야 그 선택을 읽습니다. 편집기가 focus를 받고 20ms 안에는
      // ProseMirror가 그 전에 선택을 편집기 상태(본문 맨 앞)로 되돌릴 수 있어, 부하가 크면 새 내용이 기존 본문 앞에 붙습니다.
      // 편집기 단축키로 전체를 선택하면 선택이 편집기 상태에 바로 반영되어 되돌려지지 않습니다.
      await editor.press("ControlOrMeta+a");
      await page.keyboard.insertText("옆 패널과 함께 고친 본문");
      await expect(editor).toHaveText("옆 패널과 함께 고친 본문");
      await body.getByRole("button", { name: messages.common.save, exact: true }).click();
      await expect
        .poll(() => workspace.showIssue(ids.second).then((issue) => issue.description), {
          timeout: SAVE_TIMEOUT,
        })
        .toBe("옆 패널과 함께 고친 본문");
      await detail
        .getByRole("textbox", {
          name: messages.comments.newComment,
          exact: true,
        })
        .fill("옆 패널과 함께 남긴 댓글");
      await detail.getByRole("button", { name: messages.comments.submit, exact: true }).click();
      await expect
        .poll(() => workspace.bd("comments", ids.second, "--json"), {
          timeout: SAVE_TIMEOUT,
        })
        .toContain("옆 패널과 함께 남긴 댓글");
      await side
        .getByRole("link", {
          name: messages.issueDetail.openInMain,
          exact: true,
        })
        .click();
      await expect(side).toHaveCount(0);
      const main =
        scope === "detail"
          ? page.getByRole("dialog")
          : dialog.getByRole("region", {
              name: messages.issueDetail.dialog(ids.first),
              exact: true,
            });
      await main.getByRole("button", { name: `First ${title}`, exact: true }).click();
      await main
        .getByRole("textbox", { name: messages.issue.title, exact: true })
        .fill("옆 패널에서 이동해 고친 제목");
      await main.getByRole("button", { name: messages.common.save, exact: true }).click();
      await expect
        .poll(() => workspace.showIssue(ids.first).then((issue) => issue.title), {
          timeout: SAVE_TIMEOUT,
        })
        .toBe("옆 패널에서 이동해 고친 제목");
      await main
        .getByRole("link", {
          name: messages.issueDetail.backTo(ids.second),
          exact: true,
        })
        .click();
      await expect(side).toBeVisible();
      await side
        .getByRole("link", {
          name: messages.issueDetail.closeSidePanel,
          exact: true,
        })
        .click();
      await expect(side).toHaveCount(0);
      await detail
        .getByRole("button", { name: messages.common.close, exact: true })
        .first()
        .click();
      if (scope !== "detail") {
        await expect(dialog.getByRole("region", { name: messages.graph.canvas })).toBeVisible();
        await dialog.getByRole("link", { name: messages.common.close, exact: true }).click();
        await expect(page).toHaveURL(origin);
        await expect(
          page.getByRole("region", {
            name: messages.issueDetail.sidePanel(ids.first),
            exact: true,
          }),
        ).toBeVisible();
        await page
          .getByRole("dialog")
          .getByRole("link", {
            name: scope === "epic" ? messages.graph.epicOrder : messages.graph.blockingChain,
            exact: true,
          })
          .click();
        await expect(page.getByRole("region", { name: messages.graph.canvas })).toBeVisible();
        await page.goBack();
        await expect(page).toHaveURL(origin);
        await page.goForward();
        await expect(page.getByRole("region", { name: messages.graph.canvas })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page).toHaveURL(origin);
      } else await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  }
});
