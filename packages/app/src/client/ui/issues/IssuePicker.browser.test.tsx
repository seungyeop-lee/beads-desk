import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { IssuePicker } from "./IssuePicker";

// 후보는 최근에 고친 순서로 보이므로 desk-1, desk-2, desk-3 순서입니다.
vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueCandidates: () => ({
    data: [
      issue("desk-1", { title: "후보 하나", updatedAt: 3 }),
      issue("desk-2", { title: "후보 둘", updatedAt: 2 }),
      issue("desk-3", { title: "후보 셋", updatedAt: 1 }),
    ],
    error: null,
    loading: false,
  }),
}));

const LABEL = messages.relations.search;

async function renderPicker() {
  const onPick = vi.fn<(issue: Issue) => Promise<boolean>>(async () => true);
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssuePicker label={LABEL} onPick={onPick} />
    </LocaleProvider>,
  );
  const search = screen.getByRole("combobox", { name: LABEL });
  const options = screen.getByRole("listbox", { name: LABEL }).getByRole("option");
  return { onPick, search, options };
}

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

test("멈춘 커서 아래에 후보 목록이 열려도 선택은 키보드만 따라, 첫째 후보에서 ArrowDown으로 둘째 후보로 간다", async () => {
  const { search, options } = await renderPicker();
  // expect.element는 기대한 값이 될 때까지 기다리므로, 선택이 바뀌지 않았는지는 지금 그려진 값을 바로 읽어 확인합니다.
  const selectedIds = () =>
    options
      .elements()
      .filter((option) => option.getAttribute("aria-selected") === "true")
      .map((option) => option.id.slice(option.id.lastIndexOf("desk-")));

  // 셋째 후보 자리에 커서를 둔 채로 목록을 닫습니다.
  await search.fill("후보");
  await userEvent.hover(options.nth(2));
  // 닫힌 목록은 role로 찾을 수 없으므로, 닫기 전에 셋째 후보 요소를 잡아 둡니다.
  const third = options.nth(2).element();
  await userEvent.keyboard("{Escape}");
  await expect.element(search).toHaveAttribute("aria-expanded", "false");

  // 커서를 움직이지 않고 키보드로 검색어를 고쳐 목록을 다시 엽니다. chromium은 커서 아래에 나타난 후보에
  // pointerover를 보내므로, 이 이벤트가 온 뒤에 그려진 선택을 확인합니다.
  const pointerOver = new Promise((resolve) =>
    third.addEventListener("pointerover", resolve, { once: true }),
  );
  await userEvent.keyboard("{Backspace}");
  await expect.element(search).toHaveAttribute("aria-expanded", "true");
  await pointerOver;
  await nextFrame();
  expect(selectedIds()).toEqual(["desk-1"]);

  await userEvent.keyboard("{ArrowDown}");
  await nextFrame();
  expect(selectedIds()).toEqual(["desk-2"]);
});

test("마우스를 움직여 가리킨 후보가 선택되고, 그 후보를 눌러 고른다", async () => {
  const { onPick, search, options } = await renderPicker();

  await search.fill("후보");
  await userEvent.hover(options.nth(1));
  await expect.element(options.nth(1)).toHaveAttribute("aria-selected", "true");

  await options.nth(1).click();
  await expect.poll(() => onPick.mock.calls.map(([picked]) => picked.id)).toEqual(["desk-2"]);
});
