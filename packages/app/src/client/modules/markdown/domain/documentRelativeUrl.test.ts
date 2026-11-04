import { expect, test } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { documentRelativeUrl } from "./documentRelativeUrl";
import { localMarkdownUrl } from "./localMarkdownUrl";

const DOCUMENT = "/repo/docs/guide.md";

test.each([
  ["img/a.png", "/repo/docs/img/a.png"],
  ["./b.md", "/repo/docs/b.md"],
  ["../README.md", "/repo/README.md"],
  ["../../../../a.md", "/a.md"],
  ["./img/../c.txt", "/repo/docs/c.txt"],
  ["my%20file.md", "/repo/docs/my file.md"],
  ["<내 문서>.md", "/repo/docs/<내 문서>.md"],
  ["100%25.md", "/repo/docs/100%.md"],
  ["a%23b.md", "/repo/docs/a#b.md"],
  ["b.md#섹션", "/repo/docs/b.md"],
  ["b.md?raw=1", "/repo/docs/b.md"],
  ["sub/", "/repo/docs/sub"],
])(
  "문서가 든 폴더를 기준으로 상대 경로를 풀어, 그 경로의 파일 API 주소가 되게 한다: %s",
  (url, path) => {
    expect(localMarkdownUrl(documentRelativeUrl(url, DOCUMENT), "demo")).toBe(
      localFileUrl(path, "demo"),
    );
  },
);

test.each([
  ["img/a.png", "C:\\repo\\docs\\img\\a.png"],
  ["..\\README.md", "C:\\repo\\README.md"],
  ["../조사 결과.md", "C:\\repo\\조사 결과.md"],
  ["../../..", "C:\\"],
])("기준 문서가 Windows 경로여도 상대 경로를 푼다: %s", (url, path) => {
  for (const document of ["C:\\repo\\docs\\guide.md", "C:/repo/docs/guide.md"]) {
    expect(localMarkdownUrl(documentRelativeUrl(url, document), "demo")).toBe(
      localFileUrl(path, "demo"),
    );
  }
});

test.each([
  "https://example.com/a.md",
  "mailto:me@example.com",
  "//example.com/a.png",
  "#섹션",
  "/repo/other.md",
  "/epics",
  "C:\\work\\a.md",
  "C:/work/a.md",
  "",
])("상대 경로가 아닌 주소는 그대로 둔다: %s", (url) => {
  expect(documentRelativeUrl(url, DOCUMENT)).toBe(url);
});
