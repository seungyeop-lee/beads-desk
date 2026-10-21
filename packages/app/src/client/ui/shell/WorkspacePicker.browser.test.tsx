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
// 등록한 workspace가 여럿일 때만 선택 상자가 보입니다.
vi.mock("@/client/modules/workspace/application/useWorkspaces", () => ({
  useWorkspaces: () => ({
    data: {
      workspaces: [
        { root: "/workspaces/first", slug: "first" },
        { root: "/workspaces/second", slug: "second" },
      ],
    },
    error: null,
    loading: false,
  }),
}));

test.each([
  ["ko", koMessages.shell.workspace],
  ["en", enMessages.shell.workspace],
] as const)("%s 화면에서 workspace 선택 상자를 그 언어의 이름으로 읽는다", async (locale, name) => {
  const screen = await render(
    <LocaleProvider locale={locale}>
      <WorkspacePicker />
    </LocaleProvider>,
  );

  await expect.element(screen.getByRole("combobox", { name, exact: true })).toHaveValue("first");
});
