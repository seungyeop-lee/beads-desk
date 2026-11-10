import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { NO_LABEL } from "@/client/modules/issues/domain/issueLabelFilter";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { enMessages } from "@/client/modules/locale/domain/enMessages";
import { jaMessages } from "@/client/modules/locale/domain/jaMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueFilterBar } from "./IssueFilterBar";

test("유형 메뉴, 유형 체크박스, 날짜 기준은 pointer를, 검색 칸은 text 커서를 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueFilterBar
        types={[]}
        onTypesChange={() => {}}
        labels={[]}
        labelChoices={[NO_LABEL]}
        onLabelsChange={() => {}}
        search=""
        onSearchChange={() => {}}
        dates={{ field: "created", from: null, to: null }}
        onDatesChange={() => {}}
        noEpic={false}
        onNoEpicChange={() => {}}
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

test("라벨 메뉴는 라벨 없음과 선택지의 라벨을 보이고, 고른 라벨을 더해 알린다", async () => {
  const onLabelsChange = vi.fn<(labels: string[]) => void>();
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueFilterBar
        types={[]}
        onTypesChange={() => {}}
        labels={["triage"]}
        labelChoices={[NO_LABEL, "api", "triage"]}
        onLabelsChange={onLabelsChange}
        search=""
        onSearchChange={() => {}}
        dates={{ field: "created", from: null, to: null }}
        onDatesChange={() => {}}
        noEpic={false}
        onNoEpicChange={() => {}}
      />
    </LocaleProvider>,
  );

  // 라벨 메뉴의 summary는 접근 가능한 role이 없어 요소로 찾습니다.
  const labelMenu = page.elementLocator(
    [...screen.container.querySelectorAll("summary")].find((summary) =>
      summary.textContent?.startsWith(messages.issue.labels),
    )!,
  );
  expect(labelMenu.element().textContent).toContain(messages.issues.labelCount(1));
  await labelMenu.click();
  await expect
    .element(screen.getByRole("checkbox", { name: messages.issues.noLabel }))
    .not.toBeChecked();
  await expect.element(screen.getByRole("checkbox", { name: "triage" })).toBeChecked();
  await screen.getByRole("checkbox", { name: "api" }).click();

  expect(onLabelsChange).toHaveBeenCalledWith(["triage", "api"]);
});

test("날짜 범위를 지워도 날짜 기준은 그대로 유지한다", async () => {
  const onDatesChange = vi.fn<ComponentProps<typeof IssueFilterBar>["onDatesChange"]>();
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueFilterBar
        types={[]}
        onTypesChange={() => {}}
        labels={[]}
        labelChoices={[]}
        onLabelsChange={() => {}}
        search=""
        onSearchChange={() => {}}
        dates={{ field: "closed", from: "2026-01-01", to: "2026-02-01" }}
        onDatesChange={onDatesChange}
        noEpic={false}
        onNoEpicChange={() => {}}
      />
    </LocaleProvider>,
  );
  await screen.getByRole("button", { name: messages.issues.clearDates }).click();
  expect(onDatesChange).toHaveBeenCalledWith({ field: "closed", from: null, to: null });
});

for (const [locale, catalog] of [
  ["ko", messages],
  ["en", enMessages],
  ["ja", jaMessages],
] as const) {
  test(`${locale} 미소속 체크박스는 선택을 바꿔 알린다`, async () => {
    const onNoEpicChange = vi.fn<(checked: boolean) => void>();
    const screen = await render(
      <LocaleProvider locale={locale}>
        <IssueFilterBar
          types={[]}
          onTypesChange={() => {}}
          labels={[]}
          labelChoices={[]}
          onLabelsChange={() => {}}
          search=""
          onSearchChange={() => {}}
          dates={{ field: "created", from: null, to: null }}
          onDatesChange={() => {}}
          noEpic={false}
          onNoEpicChange={onNoEpicChange}
        />
      </LocaleProvider>,
    );
    await screen.getByRole("checkbox", { name: catalog.issues.noEpicOnly }).click();
    expect(onNoEpicChange).toHaveBeenCalledWith(true);
  });
}
