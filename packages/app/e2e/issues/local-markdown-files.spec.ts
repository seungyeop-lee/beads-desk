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

test("설명·댓글·메모에서 workspace와 외부 worktree의 파일 링크와 PNG를 표시하고, 본문 링크로 파일과 앱 화면과 외부 주소를 열며 편집 후 원문 경로를 유지한다", async ({
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
    const id = await workspace.createIssue(
      "로컬 파일 표시",
      "--description",
      markdown,
      "--notes",
      markdown,
    );
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
        await expect(field.getByRole("link", { name: `${name} 문서` })).toHaveAttribute(
          "href",
          localFileUrl(path.md),
        );
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
    // 세 필드가 같은 읽기 전용 편집기로 그려지므로, 링크를 눌러 여는 흐름은 설명에서만 확인합니다.
    const description = fields[0]!;
    for (const [index, path] of paths.entries()) {
      const name = index === 0 ? "workspace" : "worktree";
      await description.getByRole("link", { name: `${name} 문서` }).click();
      await expect(page.getByText(`# 로컬 파일 ${index}`, { exact: false })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("path")).toBe(path.md);
      await page.goBack();
      await expect(dialog).toBeVisible();
    }
    await description.getByRole("link", { name: "에픽 화면" }).click();
    await expect(page).toHaveURL(/\/epics$/);
    await page.goBack();
    await expect(dialog).toBeVisible();

    await description.getByRole("button", { name: "편집", exact: true }).click();
    const editor = description.getByRole("textbox", { name: "설명" });
    await expect(editor.getByRole("link", { name: "workspace 문서" })).toBeVisible();
    await placeCaretAfter(editor, "편집할 문단");
    await page.keyboard.type(" 고침");
    await expect(editor).toContainText("편집할 문단 고침");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect
      .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
      .toBe(markdown.replace("편집할 문단", "편집할 문단 고침"));
    const comments: { text: string }[] = JSON.parse(await workspace.bd("comments", id, "--json"));
    expect(comments[0]!.text).toBe(markdown);
    await page.route("https://example.com/doc", (route) =>
      route.fulfill({ contentType: "text/plain; charset=utf-8", body: "외부 문서 화면" }),
    );
    await description.getByRole("link", { name: "외부 문서" }).click();
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

test("본문의 로컬 webm 링크를 열면 영상이 재생되고 재생 위치를 옮길 수 있다", async ({
  browser,
  page,
  workspace,
}) => {
  // 리뷰 보고서가 거는 영상과 같은 Playwright 녹화 파일을 시나리오 안에서 만듭니다.
  // 재생 위치를 옮겨 볼 수 있도록 몇 초 동안 녹화합니다.
  const path = join(workspace.path, "화면 녹화.webm");
  const recorder = await browser.newContext({ recordVideo: { dir: workspace.path } });
  const recording = await recorder.newPage();
  await recording.setContent("<h1>녹화할 화면</h1>");
  await recording.waitForTimeout(3_000);
  await recorder.close();
  await recording.video()!.saveAs(path);
  const id = await workspace.createIssue("영상 링크", "--description", `[화면 녹화](<${path}>)`);

  await page.goto(`/issues?issue=${id}`);
  await page
    .getByRole("dialog", { name: `${id} 이슈` })
    .getByRole("link", { name: "화면 녹화" })
    .click();
  const video = page.locator("video");
  // readyState 4는 HAVE_ENOUGH_DATA로, 끝까지 재생할 수 있을 만큼 영상을 불러온 상태입니다.
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBe(4);
  expect(new URL(page.url()).searchParams.get("path")).toBe(path);

  const { duration, seekable } = await video.evaluate((element: HTMLVideoElement) => ({
    duration: element.duration,
    seekable: Array.from({ length: element.seekable.length }, (_, index) => [
      element.seekable.start(index),
      element.seekable.end(index),
    ]),
  }));
  expect(duration).toBeGreaterThan(2);
  expect(seekable).toEqual([[0, duration]]);
  const target = duration / 2;
  const seekedAt = await video.evaluate(
    (element: HTMLVideoElement, time) =>
      new Promise<number>((resolve) => {
        element.addEventListener("seeked", () => resolve(element.currentTime), { once: true });
        element.currentTime = time;
      }),
    target,
  );
  expect(seekedAt).toBeCloseTo(target, 1);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(seekedAt);
});
