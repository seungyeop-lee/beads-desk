import type { IssueLink } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { addDependencyAction } from "@/server/web/issues/issueActions";
import { issue, issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { RelationAddForm } from "./RelationAddForm";

// 후보는 최근에 고친 순서로 보이므로, desk-3이 첫째, desk-4가 둘째 후보입니다.
vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueCandidates: () => ({
    data: [
      issue("desk-1", { title: "키보드 주 작업", updatedAt: 5 }),
      issue("desk-2", { title: "키보드 선행 작업", updatedAt: 4 }),
      issue("desk-5", { title: "키보드 후속 작업", updatedAt: 3 }),
      issue("desk-3", { title: "키보드 후보 하나", updatedAt: 2 }),
      issue("desk-4", { title: "키보드 후보 둘", updatedAt: 1 }),
    ],
    error: null,
    loading: false,
  }),
}));
vi.mock("@/server/web/issues/issueActions", () => ({
  addDependencyAction: vi.fn<typeof addDependencyAction>(async () => ({ ok: true, data: null })),
}));

/** Server Action 대신 mock을 부르고, 그 결과를 그대로 돌려줍니다. */
const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write("demo"),
};

function link(id: string): IssueLink {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    dependencyType: "blocks",
    awaitType: "",
  };
}

test("관계를 고르고 키보드만으로 둘째 후보를 골라 연결하며, 자기 자신과 이미 연결한 이슈는 후보에 없고 완료 알림에는 관계 이름만 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <RelationAddForm
        issue={issueDetail("desk-1", {
          dependencies: [link("desk-2")],
          dependents: [link("desk-5")],
        })}
        writes={WRITES}
      />
      <ToastRegion />
    </LocaleProvider>,
  );
  const search = screen.getByRole("combobox", { name: messages.relations.search });
  const options = screen
    .getByRole("listbox", { name: messages.relations.search })
    .getByRole("option");

  await screen
    .getByRole("combobox", { name: messages.relations.kind })
    .selectOptions(`${messages.relations.kinds.blocks} (${messages.relations.kindHints.blocks})`);
  await search.fill("키보드");
  await expect
    .poll(() => options.elements().map((option) => option.textContent))
    .toEqual([expect.stringContaining("desk-3"), expect.stringContaining("desk-4")]);

  await userEvent.keyboard("{ArrowDown}");
  await expect.element(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{Enter}");
  await expect
    .element(screen.getByRole("button", { name: messages.relations.linkConfirm }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  // 후속 이슈를 맺으면 고른 이슈가 지금 이슈에 막힙니다.
  await expect
    .poll(() => vi.mocked(addDependencyAction).mock.calls)
    .toEqual([["demo", "desk-4", "desk-1", "blocks"]]);
  // 알림 문구는 관계 선택지에 붙은 설명 없이 관계 이름만 씁니다.
  await expect
    .poll(() => screen.getByRole("status").element().textContent)
    .toBe(messages.relations.linked("desk-4", messages.relations.kinds.blocks));
});
