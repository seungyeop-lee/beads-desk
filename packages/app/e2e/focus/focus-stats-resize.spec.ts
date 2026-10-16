import type { Locator } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const WIDE = 1560;

test("창 너비를 여러 번 줄였다 늘여도 흐름 카드는 처음 높이로 돌아오고 아래 섹션과 겹치지 않는다", async ({
  page,
  workspace,
}) => {
  // 처리 시간 카드에 글이 들어 있어야 좁은 너비에서 줄바꿈이 생겨 카드가 높아집니다.
  await workspace.createIssues(
    {
      done: { title: "끝낸 작업", type: "task", status: "closed" },
      doing: { title: "진행 중인 작업", type: "task", status: "in_progress" },
      next: { title: "다음 작업", type: "task" },
      waiting: { title: "기다리는 작업", type: "task" },
      epic: { title: "진행 중인 에픽", type: "epic" },
      child: { title: "에픽의 하위 작업", type: "task", parent: "epic" },
    },
    [["waiting", "next"]],
  );

  await page.setViewportSize({ width: WIDE, height: 1000 });
  await page.goto("/focus");
  const stats = page.getByRole("region", { name: "흐름" });
  await expect(stats.getByText("중앙값 · 1개 기준")).toHaveCount(1);
  // 세 카드에는 접근 가능한 이름이 없는 카드도 있어, 배치를 재려고 카드 테두리를 그리는 class로 찾습니다.
  const cards = stats.locator(".surface");
  await expect(cards).toHaveCount(3);
  const below = ["진행 중", "다음에 할 일", "막힘", "에픽 진행률"].map((name) =>
    page.getByRole("region", { name }),
  );
  const initialHeights = await heightsOf(cards);

  for (const width of [500, WIDE, 400, WIDE, 640, WIDE]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => overlapsBelow(cards, below), { message: `${width}px` }).toEqual([]);
  }
  await expect.poll(() => heightsOf(cards)).toEqual(initialHeights);
});

async function heightsOf(cards: Locator): Promise<number[]> {
  const boxes = await Promise.all((await cards.all()).map((card) => card.boundingBox()));
  return boxes.map((box) => Math.round(box?.height ?? 0));
}

/** 카드 아래쪽 끝보다 위에서 시작하는 아래 섹션의 이름을 모읍니다. */
async function overlapsBelow(cards: Locator, below: Locator[]): Promise<(string | null)[]> {
  const cardBoxes = await Promise.all((await cards.all()).map((card) => card.boundingBox()));
  const cardBottom = Math.max(...cardBoxes.map((box) => (box ? box.y + box.height : 0)));
  const overlapped: (string | null)[] = [];
  for (const section of below) {
    const box = await section.boundingBox();
    if (box && box.y < cardBottom) overlapped.push(await section.getAttribute("aria-label"));
  }
  return overlapped;
}
