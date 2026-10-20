import { expect, test } from "../support/bdWorkspace";

test("선후 관계 없음 목록에서 사용자가 펼친 상태는 bd로 이슈를 바꿔 다시 조회해도 유지되고, 행을 누르면 상세를 열고 Escape로 닫는다", async ({
  page,
  workspace,
}) => {
  const { epic, alone } = await workspace.createIssues(
    {
      epic: { title: "패널 공간 확인", type: "epic" },
      first: { title: "패널 첫 단계", parent: "epic" },
      second: { title: "패널 둘째 단계", parent: "epic" },
      third: { title: "패널 셋째 단계", parent: "epic" },
      fourth: { title: "패널 넷째 단계", parent: "epic" },
      alone: { title: "패널 독립 작업", parent: "epic" },
    },
    [
      ["second", "first"],
      ["third", "second"],
      ["fourth", "third"],
    ],
  );
  await page.goto(`graph?epic=${epic}`);
  const panel = page.getByRole("region", { name: "선후 관계 없음" });
  // 4단계 에픽은 기본 창 폭(1280px)에서 그래프와 펼친 목록이 함께 들어가지 않아 목록이 접힌 채로 시작합니다.
  // 처음에 접히는 조건은 GraphScreen 컴포넌트 테스트가 확인합니다.
  const expand = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" });
  await expand.focus();
  await page.keyboard.press("Enter");
  const collapse = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 접기" });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(panel.getByRole("link", { name: /패널 독립 작업/ })).toBeVisible();
  await workspace.bd("update", alone, "--title", "갱신한 독립 작업");
  const row = panel.getByRole("link", { name: /갱신한 독립 작업/ });
  await expect(row).toBeVisible();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");

  await row.click();
  await expect(page.getByRole("region", { name: `${alone} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL((url) => !url.searchParams.has("issue"));
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
});
