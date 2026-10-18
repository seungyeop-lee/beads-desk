import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueFilterBar } from "./IssueFilterBar";

test("유형 메뉴, 유형 체크박스, 날짜 기준은 pointer를, 검색 칸은 text 커서를 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueFilterBar
        types={[]}
        onTypesChange={() => {}}
        search=""
        onSearchChange={() => {}}
        dates={{ field: "created", from: null, to: null }}
        onDatesChange={() => {}}
      />
    </LocaleProvider>,
  );
  const cursor = (element: Element) => getComputedStyle(element).cursor;

  // 유형 메뉴의 summary는 접근 가능한 role이 없어 요소로 찾습니다.
  const typeMenu = page.elementLocator(screen.container.querySelector("summary")!);
  expect(cursor(typeMenu.element())).toBe("pointer");
  await typeMenu.click();
  const bug = screen.getByRole("checkbox", { name: messages.issue.types.bug, exact: true });
  await expect.element(bug).toBeVisible();
  expect(cursor(bug.element())).toBe("pointer");
  expect(cursor(screen.getByRole("combobox", { name: messages.issues.dateField }).element())).toBe(
    "pointer",
  );
  expect(cursor(screen.getByRole("searchbox", { name: messages.issues.search }).element())).toBe(
    "text",
  );
});
