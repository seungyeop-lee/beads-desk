import { expect, test } from "../support/bdWorkspace";

test("설명에만 있는 낱말로 검색해도 그 이슈가 목록에 보이고, 고른 보기 탭의 개수도 검색 결과만큼 줄어든다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    matched: { title: "e2e 로그인 오류", description: "세션 토큰이 만료되면 재발급하지 않는다" },
    other: { title: "e2e 화면 정리", description: "버튼 간격을 맞춘다" },
  });

  await page.goto("issues?view=ready");
  const tabs = page.getByRole("navigation", { name: "보기" });
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 화면 정리" })).toBeVisible();
  await page.getByRole("searchbox", { name: "검색" }).fill("토큰");

  await expect(tabs.getByRole("link", { name: "바로 작업 가능 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 로그인 오류" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 화면 정리" })).toHaveCount(0);
});
