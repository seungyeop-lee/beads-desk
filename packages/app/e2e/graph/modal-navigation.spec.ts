import type { Locator } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const KOREAN_TITLE =
  "여러 단계와 여러 묶음으로 나눈 작업에서도 긴 한국어 제목의 마지막 글자까지 읽고 다음 작업으로 이어지는 선행 관계를 확인하도록 표시합니다";
const ENGLISH_TITLE =
  "Read every word of this long English issue title without opening its detail or hovering, while keeping different node heights and all dependency edges readable";

// 그래프를 닫았을 때 출발 화면의 주소와 옆 패널로 돌아가는지는 이 시나리오에서만 확인합니다. 다른 그래프 시나리오에 같은 확인을 더하지 않습니다.
test("상세에서 연 그래프를 상세 위에 겹쳐 열고, 닫기·바깥 클릭·Escape·브라우저 뒤로가기로 닫으면 출발 목록과 상세, 옆 패널이 다시 열리지 않고 그대로 보인다", async ({
  page,
  workspace,
}) => {
  const { first, second } = await workspace.createIssues(
    { first: { title: "모달 출발 선행" }, second: { title: "모달 출발 기준" } },
    [["second", "first"]],
  );
  const origin = `/issues?view=blocked&type=task&issue=${second}&side=${first}`;
  const screenDetail = page.getByRole("dialog", { name: `${second} 이슈` });
  const side = screenDetail.getByRole("region", { name: `${first} 이슈 옆 패널` });
  const graph = page.getByRole("dialog", { name: "모달 출발 기준 · 선행·후속" });
  const canvas = graph.getByRole("region", { name: "의존 그래프" });
  const openGraph = async () => {
    await screenDetail.getByRole("link", { name: "선행·후속 그래프" }).click();
    await expect(canvas).toBeVisible();
    await expect(screenDetail).toBeVisible();
  };
  const expectOriginKept = async () => {
    await expect(page).toHaveURL(`.${origin}`);
    await expect(graph).toHaveCount(0);
    await expect(side).toBeVisible();
    await expectDetailKept(screenDetail);
  };

  await page.goto(`.${origin}`);
  await watchDetail(screenDetail);
  await openGraph();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === `/w/${workspace.slug}/issues` && url.searchParams.get("view") === "blocked",
  );
  await graph.getByRole("link", { name: "닫기", exact: true }).click();
  await expectOriginKept();

  await openGraph();
  // 바깥 영역은 그래프 modal-box의 바깥, 즉 화면 가장자리입니다.
  await graph
    .getByRole("button", { name: "닫기", exact: true })
    .click({ position: { x: 4, y: 4 } });
  await expectOriginKept();

  await openGraph();
  await page.goBack();
  await expectOriginKept();
  await page.goForward();
  await expect(canvas).toBeVisible();

  await page.reload();
  await expect(canvas.getByRole("link", { name: /모달 출발 선행/ })).toBeVisible();
  await expect(side).toBeVisible();
  await watchDetail(screenDetail);
  await canvas.getByRole("link", { name: /모달 출발 선행/ }).click();
  const detail = graph.getByRole("region", { name: `${first} 이슈`, exact: true });
  await expect(detail).toBeVisible();
  await expect(graph.getByRole("dialog")).toHaveCount(0);
  await detail.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await page.keyboard.press("Escape");
  await expectOriginKept();
});

test("그래프 안 상세에 옆 패널을 연 뒤 Escape를 누를 때마다 옆 패널, 상세, 그래프 순으로 하나씩 닫힌다", async ({
  page,
  workspace,
}) => {
  const { first, second } = await workspace.createIssues(
    { first: { title: "단계 닫기 선행" }, second: { title: "단계 닫기 기준" } },
    [["second", "first"]],
  );
  await page.goto(`issues?center=${second}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await canvas.getByRole("link", { name: /단계 닫기 기준/ }).click();
  const detail = page.getByRole("region", { name: `${second} 이슈`, exact: true });
  await detail
    .getByRole("region", { name: "연결된 이슈", exact: true })
    .getByRole("link", { name: `${first} 단계 닫기 선행`, exact: true })
    .click();
  const side = page.getByRole("region", { name: `${first} 이슈 옆 패널` });
  await expect(side).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(side).toHaveCount(0);
  await expect(detail).toBeVisible();
  await expect(page).toHaveURL(`issues?center=${second}&issue=${second}`);

  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await expect(page).toHaveURL(`issues?center=${second}`);

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveCount(0);
  await expect(page).toHaveURL(`issues?issue=${second}`);
});

test("상세 위에 겹쳐 연 그래프 안에 상세와 옆 패널이 열린 주소로 들어와 페이지를 누르지 않고 Escape를 누를 때마다 옆 패널, 상세, 그래프 순으로 하나씩 닫힌다", async ({
  page,
  workspace,
}) => {
  const { first, second } = await workspace.createIssues(
    { first: { title: "누르지 않고 닫기 선행" }, second: { title: "누르지 않고 닫기 기준" } },
    [["second", "first"]],
  );
  const origin = `/issues?issue=${second}`;
  const returnTo = `returnTo=${encodeURIComponent(origin)}`;
  await page.goto(`issues?center=${second}&issue=${second}&side=${first}&${returnTo}`);
  const screenDetail = page.getByRole("dialog", { name: `${second} 이슈` });
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const detail = page.getByRole("region", { name: `${second} 이슈`, exact: true });
  const side = page.getByRole("region", { name: `${first} 이슈 옆 패널` });
  await expect(canvas.getByRole("link", { name: /누르지 않고 닫기 기준/ })).toBeVisible();
  await expect(side).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(side).toHaveCount(0);
  await expect(detail).toBeVisible();
  await expect(page).toHaveURL(`issues?center=${second}&issue=${second}&${returnTo}`);

  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await expect(page).toHaveURL(`issues?center=${second}&${returnTo}`);

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveCount(0);
  await expect(page).toHaveURL(`.${origin}`);
  await expect(screenDetail).toBeVisible();
});

test("에픽 상세에서 연 그래프의 머리글 제목은 에픽 상세를 열고, 그 상세의 순서 보기로 같은 그래프를 다시 열어도 닫기는 출발 화면으로 돌아가며, 닫은 그래프를 다시 열면 다시 그린다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "다시 여는 에픽", type: "epic" },
      first: { title: KOREAN_TITLE, parent: "epic" },
      second: { title: ENGLISH_TITLE, parent: "epic" },
    },
    [["second", "first"]],
  );
  const origin = `/epics?issue=${epic}`;
  await page.goto(`.${origin}`);
  const openGraph = () =>
    page
      .getByRole("dialog", { name: `${epic} 이슈` })
      .getByRole("link", { name: "순서 보기" })
      .click();
  const graph = page.getByRole("dialog");
  const secondNode = graph
    .getByRole("region", { name: "의존 그래프" })
    .getByRole("link", { name: new RegExp(ENGLISH_TITLE) });
  const close = graph.getByRole("link", { name: "닫기", exact: true });

  await openGraph();
  await expect(secondNode).toBeVisible();
  await graph
    .getByRole("heading", { level: 1 })
    .getByRole("link", { name: "다시 여는 에픽" })
    .click();
  const detail = graph.getByRole("region", { name: `${epic} 이슈` });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("link", { name: "선행·후속 그래프" })).toHaveCount(0);
  await detail.getByRole("link", { name: "순서 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`/epics\\?epic=${epic}(?:&returnTo=[^&]+)?$`));
  await expect(detail).toHaveCount(0);
  await expect(secondNode).toBeVisible();
  await expect(close).toHaveAttribute("href", `/w/${workspace.slug}${origin}`);
  await close.click();
  await expect(page).toHaveURL(`.${origin}`);

  await openGraph();
  await expect(secondNode).toBeVisible();
  await close.click();
  await expect(page).toHaveURL(`.${origin}`);
});

test("이슈 갱신으로 선후 관계 없음 패널이 나타나도 사용자가 고른 pan·zoom을 유지한다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues(
    {
      epic: { title: "갱신 중 위치 유지", type: "epic" },
      first: { title: "위치 유지 먼저", parent: "epic" },
      second: { title: "위치 유지 다음", parent: "epic" },
    },
    [["second", "first"]],
  );
  await page.goto(`graph?epic=${epic}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /위치 유지 다음/ })).toBeVisible();
  const viewport = canvas.locator(".react-flow__viewport");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 70, box.y + box.height * 0.8 - 40, { steps: 5 });
  await page.mouse.up();
  const before = await viewport.evaluate((element) => getComputedStyle(element).transform);
  await workspace.createIssue("갱신으로 나타난 독립 작업", "--parent", epic);
  await expect(
    page
      .getByRole("region", { name: "선후 관계 없음" })
      .getByRole("link", { name: /갱신으로 나타난 독립 작업/ }),
  ).toBeVisible();
  await expect(viewport).toHaveCSS("transform", before);
});

declare global {
  interface Window {
    detailWatch?: { dialog: HTMLDialogElement; loadingBarShown: boolean };
  }
}

/** 지금 열린 상세 dialog element를 기억하고, 이후 상세를 다시 받는 loading bar가 나타나는지 기록합니다. */
async function watchDetail(dialog: Locator) {
  await dialog.evaluate((element: HTMLDialogElement) => {
    const watch = { dialog: element, loadingBarShown: false };
    new MutationObserver(() => {
      watch.loadingBarShown ||= document.querySelector(".loading-bar") !== null;
    }).observe(document.body, { childList: true, subtree: true });
    window.detailWatch = watch;
  });
}

/** 상세 dialog가 watchDetail로 기억한 element 그대로 열려 있고, 그동안 loading bar가 나타나지 않았는지 확인합니다. */
async function expectDetailKept(dialog: Locator) {
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element: HTMLDialogElement) => ({
      sameOpenDialog: element === window.detailWatch?.dialog && element.matches(":modal"),
      loadingBarShown: window.detailWatch?.loadingBarShown,
    })),
  ).toEqual({ sameOpenDialog: true, loadingBarShown: false });
}
