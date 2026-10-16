import { readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(APP_DIR, "package.json"), "utf8")) as {
  bin: Record<string, string>;
  files: string[];
};

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

// 배포 tarball에는 files에 적은 경로만 들어가므로, 빠진 파일은 설치한 뒤 실행할 때에야 모듈을 찾지 못해 드러납니다.
test("launcher가 상대 경로로 불러오는 파일은 모두 package.json files에 들어 있다", () => {
  const unpacked = launcherModules().filter((path) => !isPacked(path));
  expect(unpacked).toEqual([]);
});

/** package.json bin의 실행 파일에서 시작해 상대 경로 import를 따라간 파일을 app package 기준 경로로 돌려줍니다. */
function launcherModules(): string[] {
  const found = new Set(Object.values(packageJson.bin).map((path) => posix.normalize(path)));
  for (const path of found) {
    const content = readFileSync(resolve(APP_DIR, path), "utf8");
    for (const [, specifier] of content.matchAll(IMPORT_PATTERN)) {
      if (specifier!.startsWith(".")) found.add(posix.join(posix.dirname(path), specifier!));
    }
  }
  return [...found];
}

function isPacked(path: string): boolean {
  return packageJson.files.some((entry) => {
    const packed = posix.normalize(entry);
    return path === packed || path.startsWith(`${packed}/`);
  });
}
