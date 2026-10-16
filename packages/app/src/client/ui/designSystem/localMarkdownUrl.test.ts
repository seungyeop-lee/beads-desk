import { expect, test } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { localMarkdownUrl } from "./localMarkdownUrl";

test.each([
  "/epics",
  "/issues?issue=abc",
  "/graph",
  "/",
  "/api/events",
  "https://example.com/a",
  "http://example.com",
  "//example.com/a",
  "#heading",
  "relative.md",
])("기존 URL을 유지한다: %s", (url) => {
  expect(localMarkdownUrl(url)).toBe(url);
});
test.each(["/Users/me/조사 결과.md", "/tmp/a.png", "/etc/hosts", "/Volumes/작업 트리/result.md"])(
  "절대경로를 파일 API로 연결한다: %s",
  (path) => {
    expect(localMarkdownUrl(path)).toBe(localFileUrl(path));
    expect(localMarkdownUrl(encodeURI(path))).toBe(localFileUrl(path));
  },
);
