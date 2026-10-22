import { expect, test } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { localMarkdownUrl, opensInNewTab } from "./localMarkdownUrl";

test.each([
  ["/epics", "/w/demo/epics"],
  ["/issues?issue=abc", "/w/demo/issues?issue=abc"],
  ["/graph", "/w/demo/graph"],
  ["/", "/w/demo"],
])("화면 경로는 문서를 보는 workspace의 화면으로 잇는다: %s", (url, href) => {
  expect(localMarkdownUrl(url, "demo")).toBe(href);
});

test.each([
  "/w/other/issues?issue=abc",
  "/api/events",
  "https://example.com/a",
  "http://example.com",
  "//example.com/a",
  "#heading",
  "relative.md",
  "x:y",
  "c:relative.md",
])("기존 URL을 유지한다: %s", (url) => {
  expect(localMarkdownUrl(url, "demo")).toBe(url);
});

test.each(["/Users/me/조사 결과.md", "/tmp/a.png", "/etc/hosts", "/Volumes/작업 트리/result.md"])(
  "절대경로를 파일 API로 연결한다: %s",
  (path) => {
    expect(localMarkdownUrl(path, "demo")).toBe(localFileUrl(path, "demo"));
    expect(localMarkdownUrl(encodeURI(path), "demo")).toBe(localFileUrl(path, "demo"));
  },
);

test.each(["C:\\Users\\me\\조사 결과.md", "C:/tmp/a.png", "d:\\work\\result.md"])(
  "드라이브 문자로 시작하는 Windows 절대경로를 파일 API로 연결한다: %s",
  (path) => {
    expect(localMarkdownUrl(path, "demo")).toBe(localFileUrl(path, "demo"));
    expect(localMarkdownUrl(encodeURI(path), "demo")).toBe(localFileUrl(path, "demo"));
  },
);

test.each([
  "/tmp/a.md",
  "C:\\r\\a.png",
  "https://example.com/a",
  "HTTP://example.com",
  "//example.com/a",
])("로컬 파일과 외부 웹 주소는 새 탭에서 연다: %s", (url) => {
  expect(opensInNewTab(localMarkdownUrl(url, "demo"))).toBe(true);
});

test.each(["/epics", "/issues?issue=abc", "/w/other/issues", "#heading", "mailto:me@example.com"])(
  "앱 화면 주소와 그 밖의 주소는 지금 탭에서 연다: %s",
  (url) => {
    expect(opensInNewTab(localMarkdownUrl(url, "demo"))).toBe(false);
  },
);
