import { readFile } from "node:fs/promises";

const HEADING_PATTERN = /^## \[([^\]]+)\](?: - (.*))?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Keep a Changelog 형식의 changelog에서 `## [<version>] - <YYYY-MM-DD>` 절의 본문을 릴리스 노트로 돌려줍니다.
 * 본문은 제목 다음 줄부터 다음 `## ` 제목 앞까지이고, 앞뒤 빈 줄은 뺍니다.
 *
 * 절이 없거나 본문이 비어 있으면 예외를 던집니다. 제목에 날짜 대신 `Unreleased` 같은 문구가 있거나 날짜가 없으면
 * 게시할 수 없는 절로 보고 예외를 던지되, allowUndated이면 본문을 돌려주고 dated를 false로 둡니다.
 *
 * @param {string} changelog
 * @param {string} version
 * @param {{ allowUndated?: boolean }} [options]
 * @returns {{ notes: string, dated: boolean }}
 */
export function releaseNotes(changelog, version, { allowUndated = false } = {}) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => HEADING_PATTERN.exec(line)?.[1] === version);
  if (start === -1) throw new Error(`CHANGELOG.md has no ## [${version}] section.`);

  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const notes = lines
    .slice(start + 1, next === -1 ? undefined : next)
    .join("\n")
    .trim();
  if (!notes) throw new Error(`The CHANGELOG.md ## [${version}] section is empty.`);

  const date = HEADING_PATTERN.exec(lines[start])[2]?.trim() ?? "";
  const dated = DATE_PATTERN.test(date);
  if (!dated && !allowUndated) {
    throw new Error(
      `The CHANGELOG.md ## [${version}] heading must end with " - YYYY-MM-DD", but it ends with "${date}".`,
    );
  }
  return { notes, dated };
}

// 게시 workflow가 `node releaseNotes.mjs <version> [--allow-undated]`로 실행해 stdout을 릴리스 노트 파일로 받습니다.
if (import.meta.main) {
  const [version, ...flags] = process.argv.slice(2);
  try {
    if (!version) throw new Error("Specify the version to read from CHANGELOG.md.");
    const changelog = await readFile(new URL("../../../CHANGELOG.md", import.meta.url), "utf8");
    const { notes, dated } = releaseNotes(changelog, version, {
      allowUndated: flags.includes("--allow-undated"),
    });
    if (!dated)
      console.error(`Warning: the CHANGELOG.md ## [${version}] heading has no release date.`);
    process.stdout.write(`${notes}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
