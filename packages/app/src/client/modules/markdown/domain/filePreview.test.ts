import { expect, test } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { filePreviewFormat } from "./filePreview";

test.each([
  ["/tmp/review/a1-0f3c.diff", "diff"],
  ["/tmp/review/fix.PATCH", "diff"],
  ["/Users/me/작업 기록/run.log", "plain"],
  ["C:\\work\\notes.txt", "plain"],
  ["/tmp/왜 실패?#1.log", "plain"],
] as const)("로컬 파일 API 주소의 경로 확장자로 미리보기 형식을 정한다: %s", (path, format) => {
  expect(filePreviewFormat(localFileUrl(path, "demo"))).toBe(format);
});

test.each([
  "/tmp/a.md",
  "/tmp/a.png",
  "/tmp/a.webm",
  "/tmp/diff",
  "/tmp/a.diff.md",
  "/tmp/a.constructor",
])("펼쳐 볼 형식이 아닌 로컬 파일은 null이다: %s", (path) => {
  expect(filePreviewFormat(localFileUrl(path, "demo"))).toBeNull();
});

test.each([
  "https://example.com/a.diff",
  "/w/demo/issues?issue=a.log",
  "/api/local-files.diff",
  "/api/local-files?workspace=demo",
  "relative.txt",
])("로컬 파일 API 주소가 아니면 null이다: %s", (url) => {
  expect(filePreviewFormat(url)).toBeNull();
});
