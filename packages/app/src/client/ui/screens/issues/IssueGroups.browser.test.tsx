import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issue } from "@/shared/domain/issues/issueFixture";
import { IssueGroups } from "./IssueGroups";

const GROUPS: WorkStateGroup[] = [
  { state: "in_progress", issues: [issue("desk-doing", { title: "진행하는 작업" })] },
  { state: "ready", issues: [issue("desk-ready", { title: "시작할 작업" })] },
  { state: "closed", issues: [issue("desk-done", { title: "끝난 작업", status: "closed" })] },
];

const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write("demo"),
};

test("작업 상태 묶음은 접기 단추와 그 안의 글자·아이콘에만 pointer를 보이고, 묶음 설명에는 보이지 않는다", async () => {
  const screen = await renderGroups();

  for (const { state } of GROUPS) {
    const label = messages.workStates.labels[state];
    const group = screen.getByRole("region", { name: label, exact: true }).element();
    const toggle = group.querySelector("h2 > button")!;
    for (const element of [toggle, ...toggle.querySelectorAll("svg, span")])
      expect(getComputedStyle(element).cursor, `${label} ${element.tagName}`).toBe("pointer");
    expect(getComputedStyle(group.querySelector("h2 > span")!).cursor, `${label} 설명`).not.toBe(
      "pointer",
    );
  }
});

test("작업 상태 묶음은 처음에 닫힘만 접혀 있고, 누르거나 Enter·Space로 접고 펼친다", async () => {
  const screen = await renderGroups();
  const toggle = (label: string, expanded: boolean) =>
    screen.getByRole("button", { name: messages.issues.toggleGroup(label, expanded) });
  const doing = screen.getByRole("link", { name: "진행하는 작업" });
  const done = screen.getByRole("link", { name: "끝난 작업" });

  await expect.element(doing).toBeVisible();
  await expect.element(toggle("닫힘", false)).toHaveAttribute("aria-expanded", "false");
  await expect.element(done).not.toBeInTheDocument();

  await toggle("진행 중", true).click();
  await expect.element(toggle("진행 중", false)).toHaveAttribute("aria-expanded", "false");
  await expect.element(doing).not.toBeInTheDocument();
  await userEvent.keyboard("{Enter}");
  await expect.element(toggle("진행 중", true)).toHaveAttribute("aria-expanded", "true");
  await expect.element(doing).toBeVisible();

  (toggle("닫힘", false).element() as HTMLElement).focus();
  await userEvent.keyboard(" ");
  await expect.element(toggle("닫힘", true)).toHaveAttribute("aria-expanded", "true");
  await expect.element(done).toBeVisible();
});

function renderGroups() {
  return render(
    <LocaleProvider locale="ko">
      <IssueGroups
        groups={GROUPS}
        titleSource={GROUPS.flatMap((group) => group.issues)}
        gateTitles={new Map()}
        waiters={new Map()}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
      />
    </LocaleProvider>,
  );
}
