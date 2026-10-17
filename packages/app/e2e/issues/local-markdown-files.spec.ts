import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localFileUrl } from "../../src/shared/contract/localFiles";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { placeCaretAfter } from "../support/editorCaret";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAIAAADmAupWAAAAS0lEQVR4nO3PQQ0AIBDAMFRgFPX8kEGyazIB67pnj2p9PwAGBgYGBgYeE3A94HrA9YDrAdcDrgdcD7gecD3gesD1gOsB1wOuB1zvAbv72g+Aq0cLAAAAAElFTkSuQmCC",
  "base64",
);

test("설명·댓글·메모에서 workspace와 외부 worktree의 파일을 열고 PNG를 표시하며 편집 후 원문 경로를 유지한다", async ({
  page,
  workspace,
}, testInfo) => {
  const outside = await mkdtemp(join(tmpdir(), "beads-desk-file-worktree-"));
  const worktree = join(outside, "별도 작업 트리");
  await workspace.commit("로컬 파일 검증 준비");
  execFileSync("git", ["-C", workspace.path, "worktree", "add", "--quiet", "--detach", worktree]);
  const paths = [workspace.path, worktree].map((root) => ({
    md: join(root, "조사 결과.md"),
    png: join(root, "화면 증거.png"),
  }));
  try {
    for (const [index, path] of paths.entries()) {
      await writeFile(path.md, `# 로컬 파일 ${index}\n\n브라우저에서 확인한 내용입니다.`);
      await writeFile(path.png, PNG);
    }
    const markdown = [
      `![workspace PNG](<${paths[0]!.png}>) ![worktree PNG](<${paths[1]!.png}>)`,
      "",
      "[에픽 화면](/epics) [외부 문서](https://example.com/doc)",
      "",
      `[workspace 문서](<${paths[0]!.md}>) [worktree 문서](<${paths[1]!.md}>) 편집할 문단`,
    ].join("\n");
    const id = await workspace.createIssue("로컬 파일 표시", "--description", markdown);
    await workspace.bd("update", id, "--notes", markdown);
    await workspace.bd("comments", "add", id, markdown);
    await page.goto(`/issues?issue=${id}`);
    const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
    const fields = [
      dialog.getByRole("region", { name: "설명", exact: true }),
      dialog.getByRole("article"),
      dialog.getByRole("region", { name: "메모", exact: true }),
    ];
    for (const field of fields) {
      for (const [index, path] of paths.entries()) {
        const name = index === 0 ? "workspace" : "worktree";
        const image = field.getByRole("img", { name: `${name} PNG` });
        await expect(image).toBeVisible();
        await expect(image).toHaveJSProperty("naturalWidth", 80);
        await expect(image).toHaveAttribute("src", localFileUrl(path.png));
        const link = field.getByRole("link", { name: `${name} 문서` });
        await expect(link).toHaveAttribute("href", localFileUrl(path.md));
        await link.click();
        await expect(page.getByText(`# 로컬 파일 ${index}`, { exact: false })).toBeVisible();
        expect(new URL(page.url()).searchParams.get("path")).toBe(path.md);
        await page.goBack();
        await expect(dialog).toBeVisible();
      }
      await expect(field.getByRole("link", { name: "에픽 화면" })).toHaveAttribute(
        "href",
        "/epics",
      );
      await expect(field.getByRole("link", { name: "외부 문서" })).toHaveAttribute(
        "href",
        "https://example.com/doc",
      );
    }
    await page.screenshot({ path: testInfo.outputPath("local-files.png"), fullPage: true });
    await testInfo.attach("local-files", {
      path: testInfo.outputPath("local-files.png"),
      contentType: "image/png",
    });
    for (const [field, key] of [
      ["설명", "description"],
      ["메모", "notes"],
    ] as const) {
      const region = dialog.getByRole("region", { name: field, exact: true });
      await region.getByRole("button", { name: "편집", exact: true }).click();
      const editor = region.getByRole("textbox", { name: field });
      await expect(editor.getByRole("link", { name: "workspace 문서" })).toBeVisible();
      await placeCaretAfter(editor, "편집할 문단");
      await page.keyboard.type(" 고침");
      await expect(editor).toContainText("편집할 문단 고침");
      await page.keyboard.press("ControlOrMeta+Enter");
      await expect
        .poll(async () => (await workspace.showIssue(id))[key], { timeout: SAVE_TIMEOUT })
        .toContain("편집할 문단 고침");
      const saved = (await workspace.showIssue(id))[key]!;
      expect(saved).toContain(paths[0]!.md);
      expect(saved).toContain(paths[1]!.md);
      expect(saved).not.toContain("/api/local-files");
    }
    const comments: { text: string }[] = JSON.parse(await workspace.bd("comments", id, "--json"));
    expect(comments[0]!.text).toBe(markdown);
    await page.route("https://example.com/doc", (route) =>
      route.fulfill({ contentType: "text/plain; charset=utf-8", body: "외부 문서 화면" }),
    );
    await fields[0]!.getByRole("link", { name: "외부 문서" }).click();
    await expect(page).toHaveURL("https://example.com/doc");
    await expect(page.getByText("외부 문서 화면")).toBeVisible();
  } finally {
    execFileSync("git", ["-C", workspace.path, "worktree", "remove", "--force", worktree]);
    await rm(outside, { recursive: true, force: true });
  }
});

test("로컬 HTML과 SVG를 열어도 스크립트가 실행되지 않고 원문이 표시된다", async ({
  page,
  workspace,
}) => {
  const source = '<script>document.title = "실행됨"</script><h1>원문 콘텐츠</h1>';
  for (const extension of ["html", "svg"]) {
    const path = join(workspace.path, `실행 검증.${extension}`);
    await writeFile(path, source);
    await page.goto(localFileUrl(path));
    await expect(page.getByText(source, { exact: true })).toBeVisible();
    await expect(page).not.toHaveTitle("실행됨");
    await expect(page.getByRole("heading")).toHaveCount(0);
  }
});
