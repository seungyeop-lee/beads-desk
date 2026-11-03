import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { LocalFolderEntry, LocalFolderPage } from "@/shared/contract/localFiles";
import { LocalFolderScreen } from "./LocalFolderScreen";

const BASE = "/data/reports";
const FOLDER = `${BASE}/bd-x`;
const PAGE_SIZE = 200;

// 주소의 query와 서버가 돌려줄 폴더 항목을 테스트마다 바꿉니다. 서버는 cursor로 받은 위치부터 200개씩 돌려줍니다.
const folder = vi.hoisted(() => ({
  query: "",
  entries: [] as LocalFolderEntry[],
  error: null as string | null,
}));

vi.mock("@/client/infra/localFiles/localFolderApiClient", () => ({
  readLocalFolder: async (
    _path: string,
    cursor: string | null,
  ): Promise<ApiResponse<LocalFolderPage>> => {
    if (folder.error) return { ok: false, error: folder.error };
    const start = cursor === null ? 0 : Number(cursor);
    const end = start + PAGE_SIZE;
    return {
      ok: true,
      data: {
        entries: folder.entries.slice(start, end),
        total: folder.entries.length,
        next: end < folder.entries.length ? String(end) : null,
      },
    };
  },
}));
vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/files",
    search: () => new URLSearchParams(folder.query),
  }),
);

const MODIFIED_AT = new Date("2026-11-03T10:00:00").getTime();

function file(name: string): LocalFolderEntry {
  return { kind: "file", name, path: `${FOLDER}/${name}`, size: 11_776, modifiedAt: MODIFIED_AT };
}

beforeEach(() => {
  folder.query = new URLSearchParams({ base: BASE, path: FOLDER }).toString();
  folder.entries = [];
  folder.error = null;
});

async function openScreen() {
  return render(
    <LocaleProvider locale="ko">
      <LocalFolderScreen />
    </LocaleProvider>,
  );
}

const entriesTable = () => page.getByRole("table", { name: messages.localFolder.entries });

test("파일은 새 탭에서 파일 API로, diff 파일은 새 탭의 diff 화면으로, 하위 폴더는 이 탭의 폴더 화면으로 열고, 열 수 없는 링크는 링크 없이 표시한다", async () => {
  folder.entries = [
    { kind: "folder", name: "shots", path: `${FOLDER}/shots`, modifiedAt: MODIFIED_AT },
    file("review.diff"),
    file("run.log"),
    { kind: "blocked", name: "outside", modifiedAt: MODIFIED_AT },
  ];
  await openScreen();

  const table = entriesTable();
  await expect
    .element(table.getByRole("link", { name: "run.log" }))
    .toHaveAttribute(
      "href",
      `/api/local-files?${new URLSearchParams({ path: `${FOLDER}/run.log`, workspace: "demo" })}`,
    );
  await expect
    .element(table.getByRole("link", { name: "review.diff" }))
    .toHaveAttribute(
      "href",
      `/w/demo/diff?${new URLSearchParams({ path: `${FOLDER}/review.diff` })}`,
    );
  for (const name of ["run.log", "review.diff"]) {
    await expect.element(table.getByRole("link", { name })).toHaveAttribute("target", "_blank");
  }
  await expect
    .element(table.getByRole("link", { name: "shots" }))
    .toHaveAttribute(
      "href",
      `/w/demo/files?${new URLSearchParams({ base: BASE, path: `${FOLDER}/shots` })}`,
    );
  await expect.element(table.getByRole("link", { name: "shots" })).not.toHaveAttribute("target");
  const blocked = table.getByRole("row").filter({ hasText: "outside" });
  await expect.element(blocked.getByText(messages.localFolder.blocked)).toBeVisible();
  expect(blocked.getByRole("link").elements()).toHaveLength(0);
  await expect
    .element(table.getByRole("row").filter({ hasText: "review.diff" }).getByText("11.5 KB"))
    .toBeVisible();
  await expect.element(page.getByRole("heading", { name: "bd-x" })).toBeVisible();
});

test("경로 표시줄은 처음 링크한 폴더의 전체 경로부터 지금 폴더까지만 보이고, 지금 폴더는 링크가 아니다", async () => {
  folder.query = new URLSearchParams({ base: BASE, path: `${FOLDER}/shots` }).toString();
  await openScreen();

  const trail = page.getByRole("navigation", { name: messages.localFolder.trail });
  await expect.element(trail).toHaveTextContent("/data/reports/bd-x/shots");
  // base 위의 폴더(/data)로 가는 링크가 없습니다.
  expect(
    trail
      .getByRole("link")
      .elements()
      .map((link) => link.textContent),
  ).toEqual([BASE, "bd-x"]);
  await expect
    .element(trail.getByRole("link", { name: BASE }))
    .toHaveAttribute("href", `/w/demo/files?${new URLSearchParams({ base: BASE, path: BASE })}`);
  await expect.element(trail.getByText("shots")).toHaveAttribute("aria-current", "page");
});

test("200개를 넘는 폴더는 더 보기로 다음 200개를 이어 붙이고, 마지막 묶음 뒤에는 더 보기가 없다", async () => {
  folder.entries = Array.from({ length: 450 }, (_, index) => file(`log-${index}.txt`));
  await openScreen();

  const rows = entriesTable().getByRole("row");
  const more = page.getByRole("button", { name: messages.localFolder.showMore });
  // 머리 줄 하나를 더해 셉니다.
  await expect.poll(() => rows.elements().length).toBe(201);
  await expect
    .element(page.getByRole("heading", { name: "bd-x" }))
    .toHaveAccessibleDescription("450");
  await more.click();
  await expect.poll(() => rows.elements().length).toBe(401);
  await expect.element(entriesTable().getByText("log-0.txt", { exact: true })).toBeVisible();
  await more.click();
  await expect.poll(() => rows.elements().length).toBe(451);
  await expect.element(entriesTable().getByText("log-449.txt", { exact: true })).toBeVisible();
  await expect.element(more).not.toBeInTheDocument();
});

test("빈 폴더이면 빈 폴더 안내를, 읽지 못하면 서버가 알린 상태를 화면 안에 보인다", async () => {
  const empty = await openScreen();
  await expect.element(page.getByText(messages.localFolder.empty)).toBeVisible();
  await empty.unmount();

  folder.error = "허용 범위 밖의 폴더입니다.";
  await openScreen();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(messages.localFolder.loadFailed("허용 범위 밖의 폴더입니다."));
  await expect.element(entriesTable()).not.toBeInTheDocument();
});
