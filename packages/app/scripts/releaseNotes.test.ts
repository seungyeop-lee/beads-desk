import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { releaseNotes } from "./releaseNotes.mjs";

const REPO_ROOT = new URL("../../../", import.meta.url);
const APP_VERSION = (
  JSON.parse(readFileSync(new URL("packages/app/package.json", REPO_ROOT), "utf8")) as {
    version: string;
  }
).version;

const CHANGELOG = `# Changelog

Intro.

## [0.2.0] - 2026-11-02

### Fixed

- Second fix.

## [0.1.10] - Unreleased

- Undated.

## [0.1.1] - 2026-10-20

### Added

- First feature.

  More detail.

## [0.1.0] - 2026-10-18

- Initial release.
`;

test("version 절의 제목 아래부터 다음 version 제목 앞까지를 앞뒤 빈 줄 없이 돌려준다", () => {
  expect(releaseNotes(CHANGELOG, "0.1.1")).toEqual({
    notes: "### Added\n\n- First feature.\n\n  More detail.",
    dated: true,
  });
});

test("마지막 절은 파일 끝까지를 돌려준다", () => {
  expect(releaseNotes(CHANGELOG, "0.1.0").notes).toBe("- Initial release.");
});

test("version은 제목의 대괄호 안 문자열과 정확히 같아야 한다", () => {
  expect(() => releaseNotes(CHANGELOG, "0.1")).toThrow("no ## [0.1] section");
  expect(() => releaseNotes(CHANGELOG, "0.2.0-beta.1")).toThrow("no ## [0.2.0-beta.1] section");
});

test("본문이 비어 있는 절은 릴리스 노트로 쓰지 않는다", () => {
  expect(() =>
    releaseNotes("## [1.0.0] - 2026-10-18\n\n## [0.9.0] - 2026-10-01\n- x\n", "1.0.0"),
  ).toThrow("## [1.0.0] section is empty");
});

test("제목에 YYYY-MM-DD 날짜가 없으면 allowUndated일 때만 본문을 돌려준다", () => {
  expect(() => releaseNotes(CHANGELOG, "0.1.10")).toThrow(
    'must end with " - YYYY-MM-DD", but it ends with "Unreleased"',
  );
  expect(releaseNotes(CHANGELOG, "0.1.10", { allowUndated: true })).toEqual({
    notes: "- Undated.",
    dated: false,
  });
});

// 버전을 올린 커밋이 곧 릴리스이므로, 게시 workflow보다 먼저 PR 검사에서 CHANGELOG 절이 빠진 것을 알립니다.
test.skipIf(APP_VERSION === "0.0.0")(
  "CHANGELOG.md에 packages/app/package.json version의 날짜가 적힌 절이 있다",
  () => {
    const changelog = readFileSync(new URL("CHANGELOG.md", REPO_ROOT), "utf8");
    expect(() => releaseNotes(changelog, APP_VERSION)).not.toThrow();
  },
);
