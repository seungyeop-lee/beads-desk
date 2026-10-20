import { expect, test } from "../support/bdWorkspace";

test("설명, notes, 댓글에만 있는 낱말로 검색해도 그 이슈가 목록에 보이고, 고른 보기 탭의 개수도 검색 결과만큼 줄어든다", async ({
  page,
  workspace,
}) => {
  const ids = await workspace.createIssues({
    matched: { title: "e2e 로그인 오류", description: "세션 토큰이 만료되면 재발급하지 않는다" },
    other: { title: "e2e 화면 정리", description: "버튼 간격을 맞춘다" },
    noted: { title: "e2e 알림 설정" },
  });
  await workspace.bd("update", ids.noted, "--notes", "푸시 권한을 다시 묻는다");

  await page.goto("issues?view=ready");
  const tabs = page.getByRole("navigation", { name: "보기" });
  const search = page.getByRole("searchbox", { name: "검색" });
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 3" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 화면 정리" })).toBeVisible();
  await search.fill("토큰");

  await expect(tabs.getByRole("link", { name: "바로 작업 가능 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 로그인 오류" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 화면 정리" })).toHaveCount(0);

  await search.fill("권한");
  await expect(page.getByRole("link", { name: "e2e 알림 설정" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 로그인 오류" })).toHaveCount(0);

  // 화면을 연 뒤에 CLI로 남긴 댓글도 찾습니다. 서버는 DB가 바뀌면 bd export를 다시 읽습니다.
  await workspace.bd("comments", "add", ids.other, "여백 기준은 8픽셀로 정했다");
  await search.fill("픽셀");
  await expect(page.getByRole("link", { name: "e2e 화면 정리" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 알림 설정" })).toHaveCount(0);
});
