import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const WINDOWS = [
  { name: "110% 좁은 창", deviceScaleFactor: 1.1, viewport: { width: 455, height: 700 } },
  { name: "100% 넓은 창", deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } },
] as const;

const QUESTION = "배포 전에 확인할 항목을 정해 주세요";
const QUESTION_BODY = Array.from(
  { length: 8 },
  (_, i) => `문단 ${i + 1}: 배포 전에 확인할 항목과 담당자, 되돌리는 절차를 문단마다 적어 둡니다.`,
).join("\n\n");

for (const colorScheme of ["light", "dark"] as const) {
  for (const windowSize of WINDOWS) {
    test.describe(`${colorScheme} ${windowSize.name}`, () => {
      test.use({
        colorScheme,
        deviceScaleFactor: windowSize.deviceScaleFactor,
        viewport: windowSize.viewport,
      });

      test("지금·정리·판단 기다림 화면을 끝까지 스크롤해도 페이지 바탕색이 이어진다", async ({
        page,
        workspace,
      }, testInfo) => {
        const narrow = windowSize.viewport.width < 768;
        const { first, second } = await workspace.createIssues({
          first: { title: "서버 조회 성능 분석", status: "in_progress" },
          second: { title: "테마 대비 접근성 확인", status: "in_progress" },
        });
        // 관련 관계는 두 이슈를 막지 않으면서 상세에 선행·후속 그래프 링크를 보이게 합니다.
        await workspace.bd("dep", "add", first, second, "--type", "related");
        await page.goto("/focus");
        await expectContinuousBackground(
          page.getByText("진행 중이거나 열린 에픽이 없습니다.", { exact: true }),
          narrow,
          testInfo,
        );
        await page.goto("/hygiene");
        await expectContinuousBackground(
          page.getByText("커밋 메시지에 ID가 나오는 열린 이슈가 없습니다.", { exact: true }),
          narrow,
          testInfo,
        );
        // 판단 기다림 이슈는 지금 화면의 목록을 바꾸므로 앞의 두 화면을 확인한 뒤에 만듭니다.
        await workspace.createIssue(QUESTION, "--labels", "human", "--description", QUESTION_BODY);
        await page.goto("/human");
        await expectContinuousBackground(
          page.getByRole("region", { name: QUESTION }).getByText(/^문단 8:/),
          narrow,
          testInfo,
        );

        // 그래프 modal은 열려 있는 동안 페이지 스크롤을 잠그고 바탕을 어둡게 합니다. 닫은 뒤에는 원래 바탕색으로 돌아와야 합니다.
        await page.goto(`/focus?issue=${first}`);
        const detail = page.getByRole("dialog", { name: `${first} 이슈`, exact: true });
        await detail.getByRole("link", { name: "선행·후속 그래프", exact: true }).click();
        const graph = page.getByRole("dialog", { name: /선행·후속/ });
        await expect(graph.getByRole("region", { name: "의존 그래프" })).toBeVisible();
        await graph.getByRole("link", { name: "닫기", exact: true }).click();
        await expect(graph).toHaveCount(0);
        await detail.getByRole("button", { name: "닫기", exact: true }).first().click();
        await expect(page).toHaveURL(/\/focus$/);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        expect(await pageEdgeColors(page, testInfo.outputPath("focus-after-graph.png"))).toEqual(
          Array(4).fill(await pageBackground(page)),
        );
      });
    });
  }
}

/**
 * 화면 맨 아래 요소가 보이면 맨 위와 맨 아래로 스크롤해, 왼쪽 여백이 모두 페이지 바탕색인지 확인합니다.
 * 좁은 창에서는 본문이 창보다 길어 실제로 스크롤됐는지도 확인합니다.
 */
async function expectContinuousBackground(last: Locator, narrow: boolean, testInfo: TestInfo) {
  const page = last.page();
  await expect(last).toBeVisible();
  const background = await pageBackground(page);
  const screen = new URL(page.url()).pathname.slice(1);
  for (const position of ["top", "bottom"] as const) {
    await page.evaluate((bottom) => {
      scrollTo(0, bottom ? document.documentElement.scrollHeight : 0);
    }, position === "bottom");
    expect(await pageEdgeColors(page, testInfo.outputPath(`${screen}-${position}.png`))).toEqual(
      Array(4).fill(background),
    );
  }
  if (narrow) expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
}

/** 현재 테마의 base-200 색을 RGB로 돌려줍니다. */
async function pageBackground(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.background = "var(--color-base-200)";
    document.body.append(probe);
    const rgb = getComputedStyle(probe).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number);
    probe.remove();
    return rgb;
  });
}

/** 화면 왼쪽 가장자리의 페이지 여백에서 세로 여러 위치의 RGB 색을 읽습니다. */
async function pageEdgeColors(page: Page, path: string) {
  const screenshot = await page.screenshot({ path });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return [0.3, 0.5, 0.75, 0.99].map((ratio) =>
      Array.from(context.getImageData(2, Math.floor(image.height * ratio), 1, 1).data).slice(0, 3),
    );
  }, screenshot.toString("base64"));
}
