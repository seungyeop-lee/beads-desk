import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { placeCaretAfter } from "../support/editorCaret";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAIAAADmAupWAAAAS0lEQVR4nO3PQQ0AIBDAMFRgFPX8kEGyazIB67pnj2p9PwAGBgYGBgYeE3A94HrA9YDrAdcDrgdcD7gecD3gesD1gOsB1wOuB1zvAbv72g+Aq0cLAAAAAElFTkSuQmCC",
  "base64",
);

test("설명에서 workspace와 외부 worktree의 PNG를 불러오고, 본문 링크로 파일 화면, 재생되는 영상, 외부 주소를 새 탭에 열고 앱 화면은 지금 탭에서 열며, diff와 큰 로그 파일을 칩으로 본문에 펼치며, 편집 후 원문 경로를 유지한다", async ({
  page,
  workspace,
}) => {
  const outside = await mkdtemp(join(tmpdir(), "beads-desk-file-worktree-"));
  const worktree = join(outside, "별도 작업 트리");
  await workspace.commit("로컬 파일 검증 준비");
  execFileSync("git", ["-C", workspace.path, "worktree", "add", "--quiet", "--detach", worktree]);
  const paths = [workspace.path, worktree].map((root) => ({
    md: join(root, "조사 결과.md"),
    png: join(root, "화면 증거.png"),
  }));
  const video = join(workspace.path, "화면 녹화.webm");
  const diff = join(workspace.path, "리뷰 변경.diff");
  const largeLog = join(workspace.path, "큰 실행 로그.log");
  try {
    for (const [index, path] of paths.entries()) {
      await writeFile(path.md, `# 로컬 파일 ${index}\n\n브라우저에서 확인한 내용입니다.`);
      await writeFile(path.png, PNG);
    }
    // 리뷰 보고서가 거는 영상과 같은 Playwright 녹화 파일을 씁니다. 이 파일은 Playwright 1.64.0에서
    // recordVideo 기본 설정으로 연 context에 `<h1>녹화할 화면</h1>`을 띄우고 3초 동안 녹화해 만들었습니다.
    // 재생 위치를 옮겨 보려면 영상이 2초보다 길어야 하므로, 다시 녹화할 때도 3초 안팎으로 녹화합니다.
    await copyFile(join(import.meta.dirname, "playwright-recording.webm"), video);
    await writeFile(diff, "@@ -1 +1 @@\n-이전 줄\n+바뀐 줄\n");
    await writeFile(largeLog, "a".repeat(1024 * 1024 + 1));
    const markdown = [
      `![workspace PNG](<${paths[0]!.png}>) ![worktree PNG](<${paths[1]!.png}>)`,
      "",
      `[에픽 화면](/epics) [외부 문서](https://example.com/doc) [화면 녹화](<${video}>)`,
      "",
      `[workspace 문서](<${paths[0]!.md}>) [worktree 문서](<${paths[1]!.md}>) 편집할 문단`,
      "",
      `[리뷰 변경](<${diff}>) [큰 실행 로그](<${largeLog}>)`,
    ].join("\n");
    const id = await workspace.createIssue("로컬 파일 표시", "--description", markdown);
    await page.goto(`issues?issue=${id}`);
    const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
    // 설명, 댓글, 메모는 같은 읽기 전용 편집기(MarkdownEditor)가 링크와 이미지 주소를 바꾸므로 설명에서만 확인합니다.
    const description = dialog.getByRole("region", { name: "설명", exact: true });
    for (const [index, path] of paths.entries()) {
      const name = index === 0 ? "workspace" : "worktree";
      const image = description.getByRole("img", { name: `${name} PNG` });
      await expect(image).toBeVisible();
      await expect(image).toHaveJSProperty("naturalWidth", 80);
      const opened = await openedTab(description.getByRole("link", { name: `${name} 문서` }));
      await expect(opened.getByText(`# 로컬 파일 ${index}`, { exact: false })).toBeVisible();
      expect(new URL(opened.url()).searchParams.get("path")).toBe(path.md);
      await opened.close();
    }
    await expect(dialog).toBeVisible();

    // 펼친 내용은 서버의 파일 API 응답으로 채웁니다. 배치와 강조, 오류 문구는 localFilePreview.browser.test.tsx가 확인합니다.
    await description.getByRole("button", { name: "리뷰 변경 미리보기" }).click();
    await expect(
      description.getByRole("region", { name: "리뷰 변경 내용" }).getByText("+바뀐 줄"),
    ).toBeVisible();
    await description.getByRole("button", { name: "큰 실행 로그 미리보기" }).click();
    const largeContents = description.getByRole("region", { name: "큰 실행 로그 내용" });
    await expect(largeContents).toContainText("파일이 1 MB보다 커서 미리보기를 생략했습니다.");
    await expect(largeContents.getByRole("link", { name: "파일 열기" })).toBeVisible();

    const videoTab = await openedTab(description.getByRole("link", { name: "화면 녹화" }));
    await expectPlayable(videoTab.locator("video"));
    expect(new URL(videoTab.url()).searchParams.get("path")).toBe(video);
    await videoTab.close();

    await description.getByRole("link", { name: "에픽 화면" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspace.slug}/epics$`));
    await page.goBack();
    await expect(dialog).toBeVisible();

    await description.getByRole("button", { name: "편집", exact: true }).click();
    await placeCaretAfter(description.getByRole("textbox", { name: "설명" }), "편집할 문단");
    await page.keyboard.type(" 고침");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect
      .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
      .toBe(markdown.replace("편집할 문단", "편집할 문단 고침"));
    // 외부 주소는 새 탭에서 열리므로, 그 탭의 요청도 받도록 context에서 가로챕니다.
    await page
      .context()
      .route("https://example.com/doc", (route) =>
        route.fulfill({ contentType: "text/plain; charset=utf-8", body: "외부 문서 화면" }),
      );
    const external = await openedTab(description.getByRole("link", { name: "외부 문서" }));
    await expect(external).toHaveURL("https://example.com/doc");
    await expect(external.getByText("외부 문서 화면")).toBeVisible();
  } finally {
    execFileSync("git", ["-C", workspace.path, "worktree", "remove", "--force", worktree]);
    await rm(outside, { recursive: true, force: true });
  }
});

/** 본문 링크를 눌러 새 탭에 열린 page를 돌려줍니다. 링크를 연 탭은 이슈 화면에 그대로 남습니다. */
async function openedTab(link: Locator): Promise<Page> {
  const opened = link.page().waitForEvent("popup");
  await link.click();
  return opened;
}

/**
 * 파일 API가 보낸 영상을 Chrome이 끝까지 읽고 재생 위치를 옮겨 이어 재생하는지 확인합니다.
 * 응답의 CSP와 Range 처리는 localFilesRouteApi.test.ts가 확인하고, 그 응답으로 실제 브라우저가 재생하는지는 여기서만 확인합니다.
 */
async function expectPlayable(video: Locator) {
  // readyState 4는 HAVE_ENOUGH_DATA로, 끝까지 재생할 수 있을 만큼 영상을 불러온 상태입니다.
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBe(4);
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
}
