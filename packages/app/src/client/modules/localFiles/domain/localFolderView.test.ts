import { expect, test } from "vitest";
import { folderTrail, formatFileSize, pathName } from "./localFolderView";

test("경로 표시줄은 base부터 path까지의 폴더만 담는다", () => {
  expect(folderTrail("/Users/me/reports", "/Users/me/reports/bd-x/shots")).toEqual([
    { name: "reports", path: "/Users/me/reports" },
    { name: "bd-x", path: "/Users/me/reports/bd-x" },
    { name: "shots", path: "/Users/me/reports/bd-x/shots" },
  ]);
  expect(folderTrail("/Users/me/reports", "/Users/me/reports")).toEqual([
    { name: "reports", path: "/Users/me/reports" },
  ]);
});

test("path가 base 아래가 아니면 path 하나만 담는다", () => {
  expect(folderTrail("/Users/me/reports", "/Users/me")).toEqual([
    { name: "me", path: "/Users/me" },
  ]);
  expect(folderTrail("/Users/me/reports", "/Users/me/reports-old")).toEqual([
    { name: "reports-old", path: "/Users/me/reports-old" },
  ]);
});

test("루트에서 시작한 경로와 Windows 경로를 나눈다", () => {
  expect(folderTrail("/", "/tmp")).toEqual([
    { name: "/", path: "/" },
    { name: "tmp", path: "/tmp" },
  ]);
  expect(folderTrail("C:\\Users\\me", "C:\\Users\\me\\bd-x\\shots")).toEqual([
    { name: "me", path: "C:\\Users\\me" },
    { name: "bd-x", path: "C:\\Users\\me\\bd-x" },
    { name: "shots", path: "C:\\Users\\me\\bd-x\\shots" },
  ]);
});

test("macOS·Linux 경로에서는 이름 안의 \\를 구분자로 보지 않는다", () => {
  expect(folderTrail("/tmp", "/tmp/a\\b")).toEqual([
    { name: "tmp", path: "/tmp" },
    { name: "a\\b", path: "/tmp/a\\b" },
  ]);
});

test.each([
  [0, "0 B"],
  [127, "127 B"],
  [1023, "1023 B"],
  [1024, "1.0 KB"],
  [11_776, "11.5 KB"],
  [1024 * 1024 - 1, "1.0 MB"],
  [5 * 1024 ** 3, "5.0 GB"],
])("파일 크기 %d를 %s로 보인다", (bytes, text) => {
  expect(formatFileSize(bytes)).toBe(text);
});

test("경로의 마지막 이름을 macOS·Linux 경로와 Windows 경로에서 꺼낸다", () => {
  expect(pathName("/Users/me/reports/review.diff")).toBe("review.diff");
  expect(pathName("/Users/me/reports/")).toBe("reports");
  expect(pathName("C:\\Users\\me\\review.patch")).toBe("review.patch");
  expect(pathName("/")).toBe("/");
});
