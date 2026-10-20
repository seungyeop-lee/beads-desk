import { expect, test } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { localMarkdownUrl } from "./localMarkdownUrl";

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
