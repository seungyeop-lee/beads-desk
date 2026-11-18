import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { enMessages } from "@/client/modules/locale/domain/enMessages";
import { jaMessages } from "@/client/modules/locale/domain/jaMessages";
import { koMessages } from "@/client/modules/locale/domain/koMessages";
import { TooltipLayer } from "@/client/ui/designSystem/TooltipLayer";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { WorkspacePicker } from "./WorkspacePicker";

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    workspace: "first",
    screenPath: "/issues",
  }),
);
const FIRST = { root: "/workspaces/first", slug: "first" };
const SECOND = { root: "/workspaces/second", slug: "second" };
const THIRD = { root: "/workspaces/third", slug: "third" };

/** 테스트마다 서버에 등록된 workspace 목록을 정합니다. 등록한 workspace가 여럿일 때만 선택 메뉴가 보입니다. */
const reads = vi.hoisted(() => ({ workspaces: [] as { root: string; slug: string }[] }));

vi.mock("@/client/modules/workspace/application/useWorkspaces", () => ({
  useWorkspaces: () => ({ data: { workspaces: reads.workspaces }, error: null, loading: false }),
}));

// 메뉴의 링크를 누르면 테스트 page가 다른 주소로 옮겨 가므로, 이동만 막고 앱의 클릭 처리는 그대로 실행합니다.
// 실제 이동은 e2e의 header-actions 시나리오가 확인합니다.
beforeEach(() => {
  const stayOnPage = (event: MouseEvent) => event.preventDefault();
  window.addEventListener("click", stayOnPage, true);
  return () => window.removeEventListener("click", stayOnPage, true);
});

function renderPicker(locale: "ko" | "en" | "ja" = "ko") {
  return render(
    <LocaleProvider locale={locale}>
      <TooltipLayer />
      <WorkspacePicker />
    </LocaleProvider>,
  );
}

function pickerButton(screen: Awaited<ReturnType<typeof renderPicker>>) {
  return screen.getByRole("button", { name: koMessages.shell.workspace, exact: true });
}

test.each([
  ["ko", koMessages.shell],
  ["en", enMessages.shell],
  ["ja", jaMessages.shell],
] as const)(
  "%s 화면에서 workspace 선택 메뉴와 새 탭 단추를 그 언어의 이름으로 읽는다",
  async (locale, shell) => {
    reads.workspaces = [FIRST, SECOND];
    const screen = await renderPicker(locale);

    const trigger = screen.getByRole("button", { name: shell.workspace, exact: true });
    await expect.element(trigger).toHaveAttribute("data-tooltip", FIRST.root);
    await expect.element(trigger).toHaveAccessibleDescription(FIRST.root);
    await expect.element(trigger).not.toHaveAttribute("title");
    await userEvent.hover(trigger);
    await expect.element(page.getByRole("tooltip")).toHaveTextContent(FIRST.root);
    await userEvent.unhover(trigger);

    await userEvent.click(trigger);
    for (const workspace of [FIRST, SECOND]) {
      const link = screen.getByRole("link", { name: workspace.slug, exact: true });
      await expect.element(link).toBeVisible();
      await expect.element(link).toHaveAccessibleDescription(workspace.root);
      await expect.element(link).not.toHaveAttribute("title");
    }
    await expect
      .element(
        screen.getByRole("link", { name: shell.openWorkspaceInNewTab(SECOND.slug), exact: true }),
      )
      .toBeVisible();
  },
);

test("지금 탭의 workspace 줄에는 새 탭 단추가 없고, 다른 workspace 줄은 모두 같은 화면을 새 탭에서 연다", async () => {
  reads.workspaces = [FIRST, SECOND, THIRD];
  const screen = await renderPicker();
  await userEvent.click(pickerButton(screen));

  await expect
    .element(screen.getByRole("link", { name: FIRST.slug, exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect
    .element(screen.getByRole("link", { name: koMessages.shell.openWorkspaceInNewTab(FIRST.slug) }))
    .not.toBeInTheDocument();
  for (const workspace of [SECOND, THIRD]) {
    const href = `/w/${workspace.slug}/issues`;
    await expect
      .element(screen.getByRole("link", { name: workspace.slug, exact: true }))
      .toHaveAttribute("href", href);
    const newTab = screen.getByRole("link", {
      name: koMessages.shell.openWorkspaceInNewTab(workspace.slug),
      exact: true,
    });
    await expect.element(newTab).toHaveAttribute("href", href);
    await expect.element(newTab).toHaveAttribute("target", "_blank");
  }
});

test("이름이나 새 탭 단추를 누르거나 메뉴 바깥을 누르면 메뉴가 닫힌다", async () => {
  reads.workspaces = [FIRST, SECOND];
  const screen = await renderPicker();
  const trigger = pickerButton(screen);
  const second = screen.getByRole("link", { name: SECOND.slug, exact: true });
  const newTab = screen.getByRole("link", {
    name: koMessages.shell.openWorkspaceInNewTab(SECOND.slug),
    exact: true,
  });

  await userEvent.click(trigger);
  await userEvent.click(second);
  await expect.element(second).not.toBeInTheDocument();

  await userEvent.click(trigger);
  await userEvent.click(newTab);
  await expect.element(newTab).not.toBeInTheDocument();

  await userEvent.click(trigger);
  await expect.element(second).toBeVisible();
  await userEvent.click(document.body);
  await expect.element(second).not.toBeInTheDocument();
});

test("키보드로 메뉴를 열어 이름과 새 탭 단추로 옮겨 가고, Esc로 닫으면 선택 단추로 돌아온다", async () => {
  reads.workspaces = [FIRST, SECOND];
  const screen = await renderPicker();
  const trigger = pickerButton(screen);
  const second = screen.getByRole("link", { name: SECOND.slug, exact: true });

  await userEvent.tab();
  await expect.element(trigger).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(second).toBeVisible();
  await userEvent.tab();
  await expect.element(screen.getByRole("link", { name: FIRST.slug, exact: true })).toHaveFocus();
  await userEvent.tab();
  await expect.element(second).toHaveFocus();
  await userEvent.tab();
  await expect
    .element(
      screen.getByRole("link", {
        name: koMessages.shell.openWorkspaceInNewTab(SECOND.slug),
        exact: true,
      }),
    )
    .toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(second).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

test("등록한 workspace가 하나뿐이면 선택 메뉴 대신 이 탭의 workspace 이름과 전체 경로 도움말을 보인다", async () => {
  reads.workspaces = [FIRST];
  const screen = await renderPicker();

  const workspace = screen.getByText("first", { exact: true }).element().parentElement!;
  expect(workspace.getAttribute("data-tooltip")).toBe(FIRST.root);
  expect(workspace.hasAttribute("title")).toBe(false);
  await expect
    .element(screen.getByRole("button", { name: koMessages.shell.workspace }))
    .not.toBeInTheDocument();
});
