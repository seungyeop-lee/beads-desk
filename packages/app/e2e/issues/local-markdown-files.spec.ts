import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { placeCaretAfter } from "../support/editorCaret";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAIAAADmAupWAAAAS0lEQVR4nO3PQQ0AIBDAMFRgFPX8kEGyazIB67pnj2p9PwAGBgYGBgYeE3A94HrA9YDrAdcDrgdcD7gecD3gesD1gOsB1wOuB1zvAbv72g+Aq0cLAAAAAElFTkSuQmCC",
  "base64",
);

test("설명에서 workspace와 외부 worktree의 PNG를 불러오고, 본문 링크로 마크다운을 렌더링한 텍스트 화면, 폴더 화면, 재생되는 영상, 외부 주소를 새 탭에 열고 앱 화면은 지금 탭에서 열며, 폴더 화면에서 연 마크다운 파일의 상대 경로 그림과 링크를 그 파일의 폴더 기준으로 열고, 폴더 화면에서 하위 폴더로 옮기면 탭 제목이 그 폴더 이름으로 바뀌고, diff 링크는 어떻게 눌러도 새 탭의 diff 화면으로 열고, diff와 큰 로그 파일을 펼치기 버튼으로 본문에 펼치며, 편집 후 원문 경로를 유지하고, diff 화면에서 파일 트리로 파일 위치에 가고 원문을 내려받는다", async ({
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
  const patch = join(workspace.path, "리뷰 변경.patch");
  const largeLog = join(workspace.path, "큰 실행 로그.log");
  const folder = join(workspace.path, "리뷰 산출물");
  const shot = join(folder, "화면", "결과.png");
  const json = join(folder, "데이터.JsOn");
  const jsonl = join(folder, "레코드.JSONL");
  const jsonText =
    String.raw` {"a":[9007199254740993123,true,null],"a":"\u0061\n<script>alert(1)</script>"} ` +
    "\r\n";
  const jsonlText = '{"a":[1]}\r\n[true,null]\r\n42\r\n bad \r\n';
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
    // 첫 파일을 길게 두어, diff 화면을 처음 열었을 때 둘째 파일이 보이는 영역 밖에 있게 합니다.
    const patchText = [
      "From 3f9c2a1 Mon Sep 17 00:00:00 2001",
      "Subject: [PATCH] Show inline card errors",
      "",
      "diff --git a/src/checkout/PaymentForm.tsx b/src/checkout/PaymentForm.tsx",
      "--- a/src/checkout/PaymentForm.tsx",
      "+++ b/src/checkout/PaymentForm.tsx",
      "@@ -0,0 +1,150 @@",
      ...Array.from({ length: 150 }, (_, index) => `+const line${index} = ${index};`),
      "diff --git a/src/checkout/CardField.tsx b/src/checkout/CardField.tsx",
      "--- a/src/checkout/CardField.tsx",
      "+++ b/src/checkout/CardField.tsx",
      "@@ -1 +1 @@",
      "-export const label = 1;",
      "+export const label = 2;",
      "-- ",
      "2.47.0",
      "",
    ].join("\n");
    await writeFile(patch, patchText);
    await writeFile(largeLog, "a".repeat(1024 * 1024 + 1));
    await mkdir(join(folder, "화면"), { recursive: true });
    await writeFile(
      join(folder, "요약.md"),
      "# 요약\n\n![결과 화면](화면/결과.png)\n\n[실행 메모](./메모.txt) [상대 JSON](./데이터.JsOn) [상대 JSONL](./레코드.JSONL)",
    );
    await writeFile(join(folder, "메모.txt"), "# 제목이 아닌 메모");
    await writeFile(shot, PNG);
    await writeFile(json, jsonText);
    await writeFile(jsonl, jsonlText);
    const markdown = [
      `![workspace PNG](<${paths[0]!.png}>) ![worktree PNG](<${paths[1]!.png}>)`,
      "",
      `[에픽 화면](/epics) [외부 문서](https://example.com/doc) [화면 녹화](<${video}>)`,
      "",
      `[workspace 문서](<${paths[0]!.md}>) [worktree 문서](<${paths[1]!.md}>) 편집할 문단`,
      "",
      `[리뷰 변경](<${diff}>) [큰 실행 로그](<${largeLog}>)`,
      "",
      `[JSON](<${json}>) [JSONL](<${jsonl}>)`,
      "",
      `[리뷰 산출물](<${folder}/>)`,
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
      const opened = await openedTab(
        description.getByRole("link", { name: `${name} 문서`, exact: true }),
      );
      await expect(opened.getByRole("heading", { name: `로컬 파일 ${index}` })).toBeVisible();
      expect(new URL(opened.url()).pathname).toBe(`/w/${workspace.slug}/text`);
      expect(new URL(opened.url()).searchParams.get("path")).toBe(path.md);
      await opened.close();
    }
    await expect(dialog).toBeVisible();

    // 브라우저가 새 탭을 여는 세 가지 클릭 모두 diff 화면을 엽니다. 화면 내용은 아래 patch 단계와 LocalDiffScreen.browser.test.tsx가 확인합니다.
    const clicks: LinkClick[] = [{}, { modifiers: ["ControlOrMeta"] }, { button: "middle" }];
    for (const click of clicks) {
      const diffTab = await openedTab(description.getByRole("link", { name: "리뷰 변경" }), click);
      await expect(diffTab).toHaveURL(
        (url) =>
          url.pathname === `/w/${workspace.slug}/diff` && url.searchParams.get("path") === diff,
      );
      await expect(diffTab.getByText("바뀐 줄", { exact: true })).toBeVisible();
      await diffTab.close();
    }

    // 펼친 내용은 서버의 파일 API 응답으로 채웁니다. 배치와 강조, 오류 문구는 localFilePreview.browser.test.tsx가 확인합니다.
    await description.getByRole("button", { name: "리뷰 변경 미리보기" }).click();
    await expect(
      description
        .getByRole("region", { name: "리뷰 변경 내용" })
        .getByText("바뀐 줄", { exact: true }),
    ).toBeVisible();
    await description.getByRole("button", { name: "큰 실행 로그 미리보기" }).click();
    const largeContents = description.getByRole("region", { name: "큰 실행 로그 내용" });
    await expect(largeContents).toContainText("파일이 1 MB보다 커서 미리보기를 생략했습니다.");
    await expect(largeContents.getByRole("link", { name: "파일 열기" })).toBeVisible();
    for (const [name, path] of [
      ["JSON", json],
      ["JSONL", jsonl],
    ]) {
      const opened = await openedTab(description.getByRole("link", { name, exact: true }));
      await expect(opened).toHaveURL(
        (url) =>
          url.pathname === `/w/${workspace.slug}/text` && url.searchParams.get("path") === path,
      );
      await expect(opened.getByRole("button", { name: "원문 보기", exact: true })).toBeVisible();
      const raw = await openedTab(opened.getByRole("link", { name: "원문 열기", exact: true }));
      await expect(raw).toHaveURL(
        (url) => url.pathname === "/api/local-files" && url.searchParams.get("path") === path,
      );
      expect(await (await raw.request.get(raw.url())).text()).toBe(
        path === json ? jsonText : jsonlText,
      );
      await raw.close();
      await opened.close();
      await description.getByRole("button", { name: `${name} 미리보기`, exact: true }).click();
      await expect(
        description
          .getByRole("region", { name: `${name} 내용`, exact: true })
          .getByRole("button", { name: "원문 보기", exact: true }),
      ).toBeVisible();
    }

    const videoTab = await openedTab(description.getByRole("link", { name: "화면 녹화" }));
    await expectPlayable(videoTab.locator("video"));
    expect(new URL(videoTab.url()).searchParams.get("path")).toBe(video);
    await videoTab.close();

    // 폴더 링크는 파일 API가 폴더 화면으로 보냅니다. 링크 모양, 경로 표시줄, 더 보기는 LocalFolderScreen.browser.test.tsx가 확인합니다.
    const folderTab = await openedTab(description.getByRole("link", { name: "리뷰 산출물" }));
    await expect(folderTab).toHaveURL(
      (url) =>
        url.pathname === `/w/${workspace.slug}/files` &&
        url.searchParams.get("base") === folder &&
        url.searchParams.get("path") === folder,
    );
    const entries = folderTab.getByRole("table", { name: "폴더 항목" });
    for (const name of ["데이터.JsOn", "레코드.JSONL"]) {
      const opened = await openedTab(entries.getByRole("link", { name, exact: true }));
      await expect(opened.getByRole("button", { name: "원문 보기", exact: true })).toBeVisible();
      expect(new URL(opened.url()).pathname).toBe(`/w/${workspace.slug}/text`);
      await opened.close();
    }
    // 상대 경로를 푸는 규칙, 텍스트 화면의 상한·빈 파일·오류 안내는 documentRelativeUrl.test.ts와 LocalTextScreen.browser.test.tsx가 확인합니다.
    const summaryTab = await openedTab(entries.getByRole("link", { name: "요약.md" }));
    await expect(summaryTab).toHaveTitle(`요약.md · ${workspace.slug} · beads-desk`);
    const summary = summaryTab.getByRole("region", { name: "파일 내용" });
    await expect(summary.getByRole("heading", { name: "요약" })).toBeVisible();
    await expect(summary.getByRole("img", { name: "결과 화면" })).toHaveJSProperty(
      "naturalWidth",
      80,
    );
    const memoTab = await openedTab(summary.getByRole("link", { name: "실행 메모" }));
    await expect(memoTab).toHaveURL(
      (url) =>
        url.pathname === `/w/${workspace.slug}/text` &&
        url.searchParams.get("path") === join(folder, "메모.txt"),
    );
    await expect(memoTab.getByText("# 제목이 아닌 메모", { exact: true })).toBeVisible();
    await memoTab.close();
    for (const name of ["상대 JSON", "상대 JSONL"]) {
      const opened = await openedTab(summary.getByRole("link", { name, exact: true }));
      await expect(opened.getByRole("button", { name: "원문 보기", exact: true })).toBeVisible();
      expect(new URL(opened.url()).pathname).toBe(`/w/${workspace.slug}/text`);
      await opened.close();
    }
    await summaryTab.close();
    await entries.getByRole("link", { name: "화면" }).click();
    await expect
      .poll(() => new URL(folderTab.url()).searchParams.get("path"))
      .toBe(join(folder, "화면"));
    await expect(folderTab).toHaveTitle(`화면 · ${workspace.slug} · beads-desk`);
    const shotTab = await openedTab(entries.getByRole("link", { name: "결과.png" }));
    expect(new URL(shotTab.url()).searchParams.get("path")).toBe(shot);
    await shotTab.close();
    await folderTab.close();

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

    // diff 화면은 파일 API가 보낸 원문으로 그립니다. 트리 모양, 커밋 메시지, 줄바꿈, 상한 안내는 LocalDiffScreen.browser.test.tsx가 확인합니다.
    await page.goto(`diff?${new URLSearchParams({ path: patch })}`);
    const changes = page.getByRole("region", { name: "변경 내용" });
    const cardField = changes
      .getByRole("group", { name: "src/checkout/CardField.tsx" })
      .getByText("src/checkout/CardField.tsx", { exact: true });
    await expect(changes.getByText("const line0 = 0;", { exact: true })).toBeVisible();
    await expect(cardField).not.toBeInViewport();
    await page
      .getByRole("navigation", { name: "변경 파일" })
      .getByRole("button", { name: "CardField.tsx" })
      .click();
    await expect(cardField).toBeInViewport();
    // 파일 API 응답에는 sandbox CSP가 붙으므로, 그 응답이 내려받기로 저장되는지 실제 브라우저에서 확인합니다.
    const downloading = page.waitForEvent("download");
    await page.getByRole("link", { name: "내려받기" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("리뷰 변경.patch");
    expect(await readFile(await download.path(), "utf8")).toBe(patchText);
    expect(await readFile(json, "utf8")).toBe(jsonText);
    expect(await readFile(jsonl, "utf8")).toBe(jsonlText);
  } finally {
    execFileSync("git", ["-C", workspace.path, "worktree", "remove", "--force", worktree]);
    await rm(outside, { recursive: true, force: true });
  }
});

type LinkClick = Parameters<Locator["click"]>[0];

/**
 * 본문 링크를 눌러 새 탭에 열린 page를 돌려줍니다. 링크를 연 탭은 이슈 화면에 그대로 남습니다.
 * Cmd/Ctrl 클릭과 가운데 버튼 클릭으로 연 탭도 받도록 popup이 아니라 context의 새 page를 기다립니다.
 */
async function openedTab(link: Locator, click?: LinkClick): Promise<Page> {
  const opened = link.page().context().waitForEvent("page");
  await link.click(click);
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
