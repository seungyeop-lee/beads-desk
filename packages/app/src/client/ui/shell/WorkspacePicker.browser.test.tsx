import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { enMessages } from "@/client/modules/locale/domain/enMessages";
import { koMessages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { WorkspacePicker } from "./WorkspacePicker";

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "first" }),
  usePathname: () => "/w/first/issues",
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
}));
const FIRST = { root: "/workspaces/first", slug: "first" };
const SECOND = { root: "/workspaces/second", slug: "second" };

/** 테스트마다 서버에 등록된 workspace 목록을 정합니다. 등록한 workspace가 여럿일 때만 선택 상자가 보입니다. */
const reads = vi.hoisted(() => ({ workspaces: [] as { root: string; slug: string }[] }));

vi.mock("@/client/modules/workspace/application/useWorkspaces", () => ({
  useWorkspaces: () => ({ data: { workspaces: reads.workspaces }, error: null, loading: false }),
}));

test.each([
  ["ko", koMessages.shell.workspace],
  ["en", enMessages.shell.workspace],
] as const)("%s 화면에서 workspace 선택 상자를 그 언어의 이름으로 읽는다", async (locale, name) => {
  reads.workspaces = [FIRST, SECOND];
  const screen = await render(
    <LocaleProvider locale={locale}>
      <WorkspacePicker />
    </LocaleProvider>,
  );

  await expect.element(screen.getByRole("combobox", { name, exact: true })).toHaveValue("first");
});

test("등록한 workspace가 하나뿐이면 선택 상자 대신 이 탭의 workspace 이름을 보이고, 전체 경로는 title로 보인다", async () => {
  reads.workspaces = [FIRST];
  const screen = await render(
    <LocaleProvider locale="ko">
      <WorkspacePicker />
    </LocaleProvider>,
  );

  await expect.element(screen.getByTitle(FIRST.root, { exact: true })).toHaveTextContent("first");
  await expect
    .element(screen.getByRole("combobox", { name: koMessages.shell.workspace, exact: true }))
    .not.toBeInTheDocument();
});
