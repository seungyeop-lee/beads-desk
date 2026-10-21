import type { Page } from "@playwright/test";

/** 본문 표에서 제목 링크가 title과 정확히 같은 행을 찾습니다. */
export function titleRow(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}
