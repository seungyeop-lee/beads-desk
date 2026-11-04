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

test("파일은 새 탭에서 파일 API로, diff 파일은 새 탭의 diff 화면으로, 마크다운·텍스트 파일은 새 탭의 텍스트 화면으로, 하위 폴더는 이 탭의 폴더 화면으로 열고, 열 수 없는 링크는 링크 없이 표시한다", async () => {
  folder.entries = [
    { kind: "folder", name: "shots", path: `${FOLDER}/shots`, modifiedAt: MODIFIED_AT },
    file("review.diff"),
    file("run.log"),
    file("notes.txt"),
    file("shot.png"),
    { kind: "blocked", name: "outside", modifiedAt: MODIFIED_AT },
  ];
  await openScreen();

  const table = entriesTable();
  await expect
    .element(table.getByRole("link", { name: "shot.png" }))
    .toHaveAttribute(
      "href",
      `/api/local-files?${new URLSearchParams({ path: `${FOLDER}/shot.png`, workspace: "demo" })}`,
    );
  for (const name of ["run.log", "notes.txt"]) {
    await expect
      .element(table.getByRole("link", { name }))
      .toHaveAttribute(
        "href",
        `/w/demo/text?${new URLSearchParams({ path: `${FOLDER}/${name}` })}`,
      );
  }
  await expect
    .element(table.getByRole("link", { name: "review.diff" }))
    .toHaveAttribute(
      "href",
      `/w/demo/diff?${new URLSearchParams({ path: `${FOLDER}/review.diff` })}`,
    );
  for (const name of ["shot.png", "run.log", "notes.txt", "review.diff"]) {
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

/** 휴대전화 폭(390px)부터 넓은 창까지입니다. 창 폭에서 화면 좌우 여백 64px을 뺀 값이 표 영역 폭입니다. */
const WIDTHS = [390, 454, 768, 1024, 1440];
/** 이름이 몇 글자씩 세로로 갈라지지 않는 이름 칸의 최소 폭입니다. 이슈 표의 제목 칸과 같은 기준입니다. */
const MIN_NAME_WIDTH = 240;
const LONG_NAME = "bd-desk-sqa8-folder-viewer-narrow-window-screenshot.png";

for (const width of WIDTHS) {
  test(`창 폭 ${width}px에서 이름 칸은 가로 스크롤 없이 표 영역 안에 다 보이고, 크기·수정 시각은 표 안에서 스크롤하면 영역 안에 다 보인다`, async () => {
    await page.viewport(width, 900);
    folder.entries = [
      { kind: "folder", name: "shots", path: `${FOLDER}/shots`, modifiedAt: MODIFIED_AT },
      file(LONG_NAME),
    ];
    const screen = await openScreen();
    await expect.element(entriesTable().getByRole("link", { name: LONG_NAME })).toBeVisible();

    expect(document.documentElement.scrollWidth, `${width}px 페이지 가로 넘침`).toBe(
      document.documentElement.clientWidth,
    );
    const scroller = screen.container.querySelector("table")!.parentElement!;
    const area = scroller.getBoundingClientRect();
    for (const name of ["shots", LONG_NAME]) {
      const row = entriesTable().getByRole("link", { name }).element().closest("tr")!;
      const nameCell = row.cells[0]!.getBoundingClientRect();
      expect(nameCell.width, `${width}px ${name} 이름 칸 폭`).toBeGreaterThanOrEqual(
        MIN_NAME_WIDTH,
      );
      expect(nameCell.right, `${width}px ${name} 이름 칸 오른쪽 끝`).toBeLessThanOrEqual(
        area.right,
      );

      const modifiedAt = row.querySelector("time")!;
      modifiedAt.scrollIntoView({ block: "nearest", inline: "nearest" });
      const box = modifiedAt.getBoundingClientRect();
      expect(box.left, `${width}px ${name} 수정 시각 왼쪽 끝`).toBeGreaterThanOrEqual(area.left);
      expect(box.right, `${width}px ${name} 수정 시각 오른쪽 끝`).toBeLessThanOrEqual(area.right);
      scroller.scrollLeft = 0;
    }
  });
}

// 창 폭 768px과 1440px의 표 영역 폭은 704px과 1376px입니다.
// 표 영역은 좌우 테두리가 1px씩이라, 표가 차지할 수 있는 폭은 영역 폭보다 2px 좁습니다.
for (const [width, tableWidth] of [
  [768, 702],
  [1440, 1374],
] as const) {
  test(`창 폭 ${width}px에서 항목 표는 표 영역을 꽉 채운 ${tableWidth}px이고, 크기 열은 112px, 수정 시각 열은 208px이다`, async () => {
    await page.viewport(width, 900);
    folder.entries = [file("run.log")];
    const screen = await openScreen();
    await expect.element(entriesTable()).toBeVisible();

    const table = screen.container.querySelector("table")!;
    expect(table.getBoundingClientRect().width, "표 폭").toBe(tableWidth);
    const [, size, modifiedAt] = Array.from(table.tHead!.rows[0]!.cells);
    expect(size!.getBoundingClientRect().width, "크기 열 폭").toBe(112);
    expect(modifiedAt!.getBoundingClientRect().width, "수정 시각 열 폭").toBe(208);
  });
}

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
