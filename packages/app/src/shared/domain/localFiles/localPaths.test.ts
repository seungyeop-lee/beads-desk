import { expect, test } from "vitest";
import { pathName } from "./localPaths";

test("경로의 마지막 이름을 macOS·Linux 경로와 Windows 경로에서 꺼낸다", () => {
  expect(pathName("/Users/me/reports/review.diff")).toBe("review.diff");
  expect(pathName("/Users/me/reports/")).toBe("reports");
  expect(pathName("C:\\Users\\me\\review.patch")).toBe("review.patch");
  expect(pathName("/")).toBe("/");
});
